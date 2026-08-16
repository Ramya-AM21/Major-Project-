package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.*;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
public class DeliveryTaskService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DeliveryTaskService.class);

    private final DeliveryTaskRepository deliveryTaskRepository;
    private final FoodListingRepository foodListingRepository;
    private final ZoneRepository zoneRepository;
    private final VolunteerRepository volunteerRepository;
    private final VerificationRepository verificationRepository;
    private final MatchingService matchingService;
    private final TokenTransactionRepository tokenTransactionRepository;
    private final AiIntegrationService aiIntegrationService;
    private final LocationTrackingRepository locationTrackingRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final DeliveryProofRepository deliveryProofRepository;
    private final com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler;

    public DeliveryTaskService(DeliveryTaskRepository deliveryTaskRepository,
                               FoodListingRepository foodListingRepository,
                               ZoneRepository zoneRepository,
                               VolunteerRepository volunteerRepository,
                               VerificationRepository verificationRepository,
                               MatchingService matchingService,
                               TokenTransactionRepository tokenTransactionRepository,
                               AiIntegrationService aiIntegrationService,
                               LocationTrackingRepository locationTrackingRepository,
                               AuditLogService auditLogService,
                               NotificationService notificationService,
                               DeliveryProofRepository deliveryProofRepository,
                               com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler) {
        this.deliveryTaskRepository = deliveryTaskRepository;
        this.foodListingRepository = foodListingRepository;
        this.zoneRepository = zoneRepository;
        this.volunteerRepository = volunteerRepository;
        this.verificationRepository = verificationRepository;
        this.matchingService = matchingService;
        this.tokenTransactionRepository = tokenTransactionRepository;
        this.aiIntegrationService = aiIntegrationService;
        this.locationTrackingRepository = locationTrackingRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
        this.deliveryProofRepository = deliveryProofRepository;
        this.webSocketHandler = webSocketHandler;
    }

    public List<DeliveryTask> getAllTasks() {
        return deliveryTaskRepository.findAll();
    }

    public List<DeliveryTask> getTasksByStatus(String status) {
        return deliveryTaskRepository.findByStatus(status);
    }

    public List<DeliveryTask> getVolunteerTasks(String volunteerEmail) {
        return deliveryTaskRepository.findByVolunteerUserEmail(volunteerEmail);
    }

    public List<DeliveryTask> getProviderTasks(String providerEmail) {
        return deliveryTaskRepository.findByFoodListingProviderUserEmail(providerEmail);
    }

    public List<DeliveryTask> getZoneTasks(UUID zoneId) {
        return deliveryTaskRepository.findByZoneId(zoneId);
    }

    public DeliveryTask getById(UUID id) {
        return deliveryTaskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery task not found: " + id));
    }

    @Transactional
    public DeliveryTask createProposedTask(UUID foodListingId, UUID zoneId, UUID routeId, double deviation, double matchingScore) {
        // Return existing task if one already exists for this food listing
        java.util.Optional<DeliveryTask> existing = deliveryTaskRepository.findByFoodListingId(foodListingId);
        if (existing.isPresent()) {
            return existing.get();
        }

        FoodListing foodListing = foodListingRepository.findById(foodListingId)
                .orElseThrow(() -> new ResourceNotFoundException("Food listing not found: " + foodListingId));
        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + zoneId));

        // Create Task
        DeliveryTask task = new DeliveryTask();
        task.setFoodListing(foodListing);
        task.setZone(zone);
        task.setRouteDistance(matchingService.calculateDistance(
                foodListing.getPickupLatitude(), foodListing.getPickupLongitude(),
                zone.getLatitude(), zone.getLongitude()
        ));
        task.setRouteDeviation(deviation);
        task.setMatchingScore(matchingScore);
        task.setStatus("CREATED");
        task.setCreatedAt(LocalDateTime.now());

        task = deliveryTaskRepository.save(task);

        // Pre-create Verification record
        Verification verification = new Verification();
        verification.setTask(task);
        verification.setPickupOtp(generateOtp());
        verification.setDeliveryOtp(generateOtp());
        verification.setVerificationConfidence(1.0);
        verificationRepository.save(verification);

        return task;
    }

    @Transactional
    public DeliveryTask acceptTask(UUID taskId, String volunteerEmail) {
        DeliveryTask task = getById(taskId);
        Volunteer volunteer = volunteerRepository.findByUserEmail(volunteerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Volunteer not found: " + volunteerEmail));

        // Enforce volunteer doesn't already have another active task
        List<DeliveryTask> activeTasks = deliveryTaskRepository.findByVolunteerUserEmail(volunteerEmail);
        for (DeliveryTask t : activeTasks) {
            if ("ACCEPTED".equals(t.getStatus()) || "IN_TRANSIT".equals(t.getStatus()) || 
                "ARRIVED".equals(t.getStatus()) || "PHOTO_PENDING".equals(t.getStatus()) || 
                "ML_VALIDATION_PENDING".equals(t.getStatus())) {
                throw new IllegalArgumentException("You already have another active delivery task. Complete or release it before accepting a new one.");
            }
        }

        if (!"CREATED".equals(task.getStatus()) && !"MATCHED".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task is already accepted or in progress");
        }

        // Database-level atomic check-and-set to prevent double assignment
        int updatedRows = deliveryTaskRepository.assignVolunteerAtomic(taskId, volunteer);
        if (updatedRows == 0) {
            throw new IllegalArgumentException("Delivery already accepted by another volunteer.");
        }

        // Re-read task to get updated state
        task = getById(taskId);

        FoodListing food = task.getFoodListing();
        food.setStatus("MATCHED");
        foodListingRepository.save(food);

        // Audit log
        auditLogService.log(volunteer.getUser().getEmail(), "VOLUNTEER", "TASK_ACCEPTED", "DeliveryTask", taskId.toString(), "Task accepted");

        // Broadcast WS state changes
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "ACCEPTED"));
        webSocketHandler.broadcastUpdate("TASK_ACCEPTED", String.format("{\"id\":\"%s\",\"volunteerId\":\"%s\"}", taskId, volunteer.getId()));

        return task;
    }

    @Transactional
    public synchronized DeliveryTask cancelTask(UUID taskId, String volunteerEmail) {
        DeliveryTask task = getById(taskId);
        Volunteer volunteer = volunteerRepository.findByUserEmail(volunteerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Volunteer not found: " + volunteerEmail));

        if (task.getVolunteer() == null || !task.getVolunteer().getId().equals(volunteer.getId())) {
            throw new IllegalArgumentException("You are not assigned to this task");
        }

        task.setVolunteer(null);
        task.setStatus("CREATED");
        
        FoodListing food = task.getFoodListing();
        food.setStatus("AVAILABLE");
        foodListingRepository.save(food);

        DeliveryTask saved = deliveryTaskRepository.save(task);

        // Reset verification timestamps
        Optional<Verification> oVer = verificationRepository.findByTaskId(taskId);
        if (oVer.isPresent()) {
            Verification verification = oVer.get();
            verification.setPickupTimestamp(null);
            verification.setDeliveryTimestamp(null);
            verification.setPickupLatitude(null);
            verification.setPickupLongitude(null);
            verification.setDeliveryLatitude(null);
            verification.setDeliveryLongitude(null);
            verification.setDeliveryRadiusVerified(null);
            verificationRepository.save(verification);
        }

        // Audit Log
        auditLogService.log(volunteer.getUser().getEmail(), "VOLUNTEER", "TASK_CANCELLED", "DeliveryTask", taskId.toString(), "Task cancelled/released by volunteer");

        // Broadcast WS state change
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "CANCELLED"));

        return saved;
    }

    @Transactional
    public DeliveryTask verifyPickup(UUID taskId, String otp, double latitude, double longitude) {
        DeliveryTask task = getById(taskId);
        Verification verification = verificationRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Verification record not found for task: " + taskId));

        if (!"ACCEPTED".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task must be accepted before pickup verification");
        }

        if (!verification.getPickupOtp().equals(otp)) {
            throw new IllegalArgumentException("Invalid Pickup OTP code");
        }

        verification.setPickupTimestamp(LocalDateTime.now());
        verification.setPickupLatitude(latitude);
        verification.setPickupLongitude(longitude);
        verificationRepository.save(verification);

        task.setStatus("IN_TRANSIT");
        
        FoodListing food = task.getFoodListing();
        food.setStatus("IN_TRANSIT");
        foodListingRepository.save(food);

        DeliveryTask saved = deliveryTaskRepository.save(task);
        Volunteer volunteer = task.getVolunteer();

        // Audit Log
        auditLogService.log(volunteer.getUser().getEmail(), "VOLUNTEER", "PICKUP_VERIFIED", "DeliveryTask", taskId.toString(), "Pickup verified successfully");

        // System Notification
        notificationService.sendNotification(
            food.getProvider().getUser().getEmail(),
            "Food Picked Up",
            "Volunteer " + volunteer.getUser().getName() + " has picked up food listing " + food.getFoodName()
        );
        notificationService.sendNotification(
            volunteer.getUser().getEmail(),
            "Pickup verified",
            "Pickup OTP verified. Active real-time GPS tracking has started."
        );

        // Broadcast WS
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "IN_TRANSIT"));

        return saved;
    }

    @Transactional
    public DeliveryTask verifyDelivery(UUID taskId, String otp, double latitude, double longitude, String proofImageUrl) {
        // Dropoff OTP verify -> updates state to PHOTO_PENDING
        DeliveryTask task = getById(taskId);
        Verification verification = verificationRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Verification record not found for task: " + taskId));

        if (!"IN_TRANSIT".equals(task.getStatus()) && !"ARRIVED".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task must be in transit or arrived before delivery verification");
        }

        if (!verification.getDeliveryOtp().equals(otp)) {
            throw new IllegalArgumentException("Invalid Destination OTP code. Verification failed.");
        }

        Zone zone = task.getZone();
        double distanceToZoneKm = matchingService.calculateDistance(latitude, longitude, zone.getLatitude(), zone.getLongitude());
        boolean radiusVerified = distanceToZoneKm <= 0.25; // 250m

        if (!radiusVerified) {
            throw new IllegalArgumentException("Location validation failed. You are " + Math.round(distanceToZoneKm * 1000) + "m away from the zone. Must be within 250m to verify.");
        }

        verification.setDeliveryTimestamp(LocalDateTime.now());
        verification.setDeliveryLatitude(latitude);
        verification.setDeliveryLongitude(longitude);
        verification.setDeliveryRadiusVerified(true);
        verificationRepository.save(verification);

        task.setStatus("PHOTO_PENDING");
        DeliveryTask saved = deliveryTaskRepository.save(task);

        // Audit log
        auditLogService.log(task.getVolunteer().getUser().getEmail(), "VOLUNTEER", "OTP_VERIFIED", "DeliveryTask", taskId.toString(), "Destination OTP Code verified");

        // Notification
        notificationService.sendNotification(
            task.getVolunteer().getUser().getEmail(),
            "OTP Accepted - Upload Photo",
            "OTP verification passed. Please take and upload a delivery proof photo to trigger ML audit and claim rewards."
        );

        // Broadcast state change
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "PHOTO_PENDING"));

        return saved;
    }

    @Transactional
    public DeliveryTask processDeliveryProof(UUID taskId, byte[] imageBytes, String filename, double latitude, double longitude) {
        DeliveryTask task = getById(taskId);
        if (!"PHOTO_PENDING".equals(task.getStatus()) && !"ML_VALIDATION_PENDING".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task cannot accept proof photos in current status: " + task.getStatus());
        }

        // Calculate Image Hash to prevent double token rewards and copy-cat submissions
        String imageHash = "";
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(imageBytes);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            imageHash = hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to evaluate digital image hash", e);
        }

        // Prevent Duplicate rewards on same picture
        if (deliveryProofRepository.existsByImageHashAndTaskIdNot(imageHash, taskId)) {
            task.setStatus("PHOTO_REJECTED");
            deliveryTaskRepository.save(task);
            
            auditLogService.log(
                task.getVolunteer().getUser().getEmail(), "VOLUNTEER", "PHOTO_REJECTED", "DeliveryTask", taskId.toString(), "Duplicate image hash match against database entries"
            );
            
            notificationService.sendNotification(
                task.getVolunteer().getUser().getEmail(),
                "Delivery proof photo rejected",
                "Your photo proof was rejected as a duplicate copy of another delivery evidence context. Points withheld."
            );
            throw new IllegalArgumentException("This image signature has already been uploaded for another task!");
        }

        // Validate Coordinates for image capture point
        Zone zone = task.getZone();
        double distanceToZoneKm = matchingService.calculateDistance(latitude, longitude, zone.getLatitude(), zone.getLongitude());
        boolean radiusVerified = distanceToZoneKm <= 0.25;
        if (!radiusVerified) {
            task.setStatus("PHOTO_REJECTED");
            deliveryTaskRepository.save(task);
            throw new IllegalArgumentException("Coordinate check failed: verification photo must be captured within 250m radius of the shelter.");
        }

        // Save delivery proof meta node
        String imageUrl = "/uploads/" + UUID.randomUUID().toString() + "_" + filename;
        DeliveryProof proof = new DeliveryProof(
            taskId,
            task.getVolunteer().getId(),
            imageUrl,
            imageHash,
            latitude,
            longitude,
            LocalDateTime.now()
        );
        proof.setMlStatus("VALIDATING");
        
        // Log start
        auditLogService.log(task.getVolunteer().getUser().getEmail(), "VOLUNTEER", "ML_VALIDATION_STARTED", "DeliveryTask", taskId.toString(), "Triggering ML anomaly analytics");

        // Invoke FastAPI ML Model Service
        Map<String, Object> mlResult = aiIntegrationService.validateDeliveryProof(taskId, imageBytes, filename, latitude, longitude);
        boolean isValid = (boolean) mlResult.getOrDefault("valid", false);
        double confidence = (double) mlResult.getOrDefault("confidence", 0.0);
        String reason = (String) mlResult.getOrDefault("reason", "Inference details unavailable");

        proof.setMlConfidence(confidence);
        proof.setMlReason(reason);

        Volunteer volunteer = task.getVolunteer();
        FoodListing food = task.getFoodListing();

        if (!isValid) {
            proof.setMlStatus("FAILED");
            proof.setStatus("REJECTED");
            deliveryProofRepository.save(proof);

            task.setStatus("PHOTO_REJECTED");
            deliveryTaskRepository.save(task);

            auditLogService.log(volunteer.getUser().getEmail(), "VOLUNTEER", "PHOTO_REJECTED", "DeliveryTask", taskId.toString(), "ML Verification failed: " + reason);

            notificationService.sendNotification(
                volunteer.getUser().getEmail(),
                "ML Photo validation failed",
                "ML model flagged photo evidence: " + reason + ". Points withheld."
            );

            throw new IllegalArgumentException("ML model validation failed: " + reason);
        }

        // If proof is verified
        proof.setMlStatus("SUCCESS");
        proof.setStatus("APPROVED");
        deliveryProofRepository.save(proof);

        task.setStatus("COMPLETED");
        food.setStatus("DELIVERED");
        deliveryTaskRepository.save(task);
        foodListingRepository.save(food);

        // Record successful delivery metric updates
        volunteer.setSuccessfulDeliveries(volunteer.getSuccessfulDeliveries() + 1);
        volunteer.setTotalDeliveries(volunteer.getTotalDeliveries() + 1);
        volunteer.setRating(Math.min(5.0, Math.round((volunteer.getRating() + 0.1) * 10.0) / 10.0));
        
        // Compute dynamic points reward
        int rewardedCoins = calculateReward(task, proof);
        volunteer.setBalanceTokens((volunteer.getBalanceTokens() != null ? volunteer.getBalanceTokens() : 0) + rewardedCoins);
        volunteerRepository.save(volunteer);

        // Save wallet transaction log
        TokenTransaction transaction = new TokenTransaction(
            volunteer.getId(),
            taskId,
            rewardedCoins,
            "EARNED_DELIVERY",
            "Dynamic verified dropoff payout (Base=10, Confidence=" + Math.round(confidence*100) + "%)"
        );
        tokenTransactionRepository.save(transaction);

        // Audit Logs
        auditLogService.log(volunteer.getUser().getEmail(), "VOLUNTEER", "ML_VALIDATION_COMPLETED", "DeliveryTask", taskId.toString(), "ML verification success confidence: " + confidence);
        auditLogService.log(volunteer.getUser().getEmail(), "VOLUNTEER", "DELIVERY_COMPLETED", "DeliveryTask", taskId.toString(), "Task status became COMPLETED");
        auditLogService.log(volunteer.getUser().getEmail(), "VOLUNTEER", "REWARD_CREDITED", "TokenTransaction", transaction.getId().toString(), "Credited " + rewardedCoins + " reward coins");

        // Send notifications
        notificationService.sendNotification(
            volunteer.getUser().getEmail(),
            "Coins Credited! 🎉",
            "Your delivery proof was verified. +" + rewardedCoins + " coins have been credited to your wallet!"
        );
        notificationService.sendNotification(
            food.getProvider().getUser().getEmail(),
            "Delivery Completed",
            "Volunteer " + volunteer.getUser().getName() + " completed delivery verification. Food safely delivered!"
        );

        // Broadcast Websocket frames
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "COMPLETED"));
        webSocketHandler.broadcastUpdate("WALLET_UPDATE", String.format("{\"volunteerId\":\"%s\",\"totalAwarded\":%d,\"newBalance\":%d}",
                volunteer.getId().toString(), rewardedCoins, volunteer.getBalanceTokens()));

        return task;
    }

    private int calculateReward(DeliveryTask task, DeliveryProof proof) {
        int baseTokens = 10;
        int qtyBonus = 0;
        FoodListing food = task.getFoodListing();
        double quantity = food.getQuantity() != null ? food.getQuantity() : 0.0;
        if (quantity >= 50) {
            qtyBonus = 5;
        } else if (quantity >= 30) {
            qtyBonus = 3;
        } else if (quantity >= 10) {
            qtyBonus = 2;
        } else {
            qtyBonus = 1;
        }

        int urgencyBonus = 0;
        if (food.getExpiryTime() != null) {
            long minutesLeft = java.time.Duration.between(LocalDateTime.now(), food.getExpiryTime()).toMinutes();
            if (minutesLeft <= 60 && minutesLeft > 0) {
                urgencyBonus = 5;
            } else if (minutesLeft <= 120 && minutesLeft > 0) {
                urgencyBonus = 3;
            } else {
                urgencyBonus = 1;
            }
        }

        int deviationBonus = 0;
        double routeDeviation = task.getRouteDeviation() != null ? task.getRouteDeviation() : 0.0;
        if (routeDeviation < 2.0) {
            deviationBonus = 3;
        } else if (routeDeviation < 5.0) {
            deviationBonus = 2;
        } else {
            deviationBonus = 1;
        }

        int verificationBonus = (proof.getMlConfidence() != null && proof.getMlConfidence() >= 0.90) ? 3 : 1;
        return baseTokens + qtyBonus + urgencyBonus + deviationBonus + verificationBonus;
    }

    private String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    @Transactional
    public DeliveryTask updateTaskLocation(UUID taskId, Double latitude, Double longitude) {
        DeliveryTask task = getById(taskId);
        task.setCurrentLatitude(latitude);
        task.setCurrentLongitude(longitude);
        task.setLastLocationUpdate(LocalDateTime.now());
        
        Zone zone = task.getZone();
        double remainingDistance = matchingService.calculateDistance(latitude, longitude, zone.getLatitude(), zone.getLongitude());

        // If volunteer enters within 250m radius and state is IN_TRANSIT, automatically flag ARRIVED
        if ("IN_TRANSIT".equals(task.getStatus()) && remainingDistance <= 0.25) {
            task.setStatus("ARRIVED");
            auditLogService.log(
                task.getVolunteer().getUser().getEmail(),
                "VOLUNTEER",
                "ARRIVED",
                "DeliveryTask",
                taskId.toString(),
                "Coordinates tracking verified arrival within zone range"
            );
            notificationService.sendNotification(
                task.getVolunteer().getUser().getEmail(),
                "Destination Reached",
                "You reached " + zone.getName() + " zone. Please request the Drop-off OTP code from the coordinator."
            );
            notificationService.sendNotification(
                task.getFoodListing().getProvider().getUser().getEmail(),
                "Volunteer Arrived",
                "Volunteer has reached the community destination."
            );
            
            // Broadcast state update
            webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "ARRIVED"));
        }

        DeliveryTask saved = deliveryTaskRepository.save(task);

        LocationTracking tracking = new LocationTracking(task, latitude, longitude);
        locationTrackingRepository.save(tracking);

        // Broadcast telemetry details
        String telemetryData = String.format(
            "{\"taskId\":\"%s\",\"status\":\"%s\",\"latitude\":%f,\"longitude\":%f,\"remainingDistance\":%f}",
            taskId, task.getStatus(), latitude, longitude, remainingDistance
        );
        webSocketHandler.broadcastUpdate("LOCATION_UPDATE", telemetryData);

        return saved;
    }

    public List<LocationTracking> getTaskLocationHistory(UUID taskId) {
        return locationTrackingRepository.findByDeliveryTaskIdOrderByTimestampAsc(taskId);
    }
}
