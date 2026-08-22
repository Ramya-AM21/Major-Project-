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
    private final VolunteerRouteRepository volunteerRouteRepository;

    @org.springframework.beans.factory.annotation.Value("${app.pickup.arrival-radius-meters:100.0}")
    private double pickupArrivalRadiusMeters;

    @org.springframework.beans.factory.annotation.Value("${app.destination.arrival-radius-meters:100.0}")
    private double destinationArrivalRadiusMeters;

    @org.springframework.beans.factory.annotation.Value("${app.matching.gps-accuracy-threshold-meters:50.0}")
    private double gpsAccuracyThresholdMeters;

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
                               com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler,
                               VolunteerRouteRepository volunteerRouteRepository) {
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
        this.volunteerRouteRepository = volunteerRouteRepository;
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
            String s = t.getStatus();
            if ("ACCEPTED".equals(s) || "NAVIGATING_TO_PICKUP".equals(s) || "ARRIVED_AT_PICKUP".equals(s) || 
                "PICKED_UP".equals(s) || "NAVIGATING_TO_DESTINATION".equals(s) || "ARRIVED_AT_DESTINATION".equals(s) || 
                "PROOF_SUBMISSION".equals(s) || "PHOTO_PENDING".equals(s) || "AI_VALIDATION".equals(s) || 
                "ML_VALIDATION_PENDING".equals(s) || "IN_TRANSIT".equals(s) || "ARRIVED".equals(s) || "PHOTO_REJECTED".equals(s)) {
                throw new IllegalArgumentException("You already have another active delivery task. Complete or release it before accepting a new one.");
            }
        }

        // Acquire Pessimistic Lock on FoodListing to guarantee concurrent safety
        final UUID foodId = task.getFoodListing().getId();
        FoodListing food = foodListingRepository.findByIdForUpdate(foodId)
                .orElseThrow(() -> new ResourceNotFoundException("Food listing not found: " + foodId));

        if (!"AVAILABLE".equals(food.getStatus())) {
            throw new IllegalArgumentException("This delivery task has already been accepted by another volunteer.");
        }

        // Recheck expiry and session timings
        java.time.Instant now = java.time.Instant.now();
        if (food.getEffectiveAvailableUntil() == null || now.isAfter(food.getEffectiveAvailableUntil())) {
            throw new IllegalArgumentException("This food listing has expired or its session has closed.");
        }

        // Volunteer eligibility: must have valid location
        Double volLat = volunteer.getLatitude();
        Double volLng = volunteer.getLongitude();
        if (volLat == null || volLng == null) {
            List<VolunteerRoute> routes = volunteerRouteRepository.findByVolunteerId(volunteer.getId());
            VolunteerRoute r = routes.stream()
                    .filter(rt -> rt.getStatus() == null || "ACTIVE".equalsIgnoreCase(rt.getStatus()))
                    .findFirst()
                    .orElse(null);
            if (r != null) {
                volLat = r.getCurrentLatitude() != null ? r.getCurrentLatitude() : r.getStartLatitude();
                volLng = r.getCurrentLongitude() != null ? r.getCurrentLongitude() : r.getStartLongitude();
            }
        }

        if (volLat == null || volLng == null) {
            throw new IllegalArgumentException("Your current GPS location is required to calculate travel ETA.");
        }

        // Destination eligibility: must have valid destination coordinates
        if (food.getDestinationLatitude() == null || food.getDestinationLongitude() == null) {
            throw new IllegalArgumentException("The target destination zone has invalid geolocations.");
        }

        // Calculate travel ETAs using OSRM duration (in minutes)
        double volunteerToPickupDuration = matchingService.getOsrmRoadDuration(new double[][]{
            {volLat, volLng},
            {food.getPickupLatitude(), food.getPickupLongitude()}
        });

        double pickupToDestinationDuration = matchingService.getOsrmRoadDuration(new double[][]{
            {food.getPickupLatitude(), food.getPickupLongitude()},
            {food.getDestinationLatitude(), food.getDestinationLongitude()}
        });

        double verificationBuffer = 15.0; // 15 minutes buffer
        double totalRequiredTimeMins = volunteerToPickupDuration + pickupToDestinationDuration + verificationBuffer;

        double remainingAvailableTimeMins = java.time.Duration.between(now, food.getEffectiveAvailableUntil()).toMinutes();

        if (remainingAvailableTimeMins < totalRequiredTimeMins) {
            throw new IllegalArgumentException("This delivery cannot be accepted because there is insufficient time remaining for pickup, delivery, and verification.");
        }

        // Database-level conditional update using conditional update to double check
        int updatedRows = deliveryTaskRepository.assignVolunteerAtomic(taskId, volunteer);
        if (updatedRows == 0) {
            throw new IllegalArgumentException("This delivery task has already been accepted by another volunteer.");
        }

        // Re-read task to get updated state
        task = getById(taskId);

        // Update food status to ACCEPTED (lifecycle update!)
        food.setStatus("ACCEPTED");
        foodListingRepository.save(food);

        // Audit log
        auditLogService.log(volunteer.getUser().getEmail(), "VOLUNTEER", "TASK_ACCEPTED", "DeliveryTask", taskId.toString(), "Task accepted successfully with OSRM validation");

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
        return verifyPickup(taskId, otp, latitude, longitude, null, null, null);
    }

    @Transactional
    public DeliveryTask verifyPickup(UUID taskId, String otp, double latitude, double longitude, Double accuracy, String timestamp, String volunteerEmail) {
        DeliveryTask task = getById(taskId);
        Verification verification = verificationRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Verification record not found for task: " + taskId));

        // 1. Validate volunteer identity & active task ownership
        if (volunteerEmail != null) {
            if (task.getVolunteer() == null || !task.getVolunteer().getUser().getEmail().equals(volunteerEmail)) {
                throw new IllegalArgumentException("You are not authorized for this delivery task.");
            }
        }

        // 2. Validate GPS coordinates bounds
        if (latitude < -90.0 || latitude > 90.0 || longitude < -180.0 || longitude > 180.0) {
            throw new IllegalArgumentException("Invalid GPS coordinates bounds.");
        }

        // 3. Validate GPS accuracy
        if (accuracy != null && accuracy > gpsAccuracyThresholdMeters) {
            throw new IllegalArgumentException("Cannot verify location. GPS accuracy is too poor (" + Math.round(accuracy) + "m). Please try again in an area with a clearer GPS signal.");
        }

        // 4. Validate timestamp freshness (max 10 minutes stale)
        if (timestamp != null && !timestamp.trim().isEmpty()) {
            try {
                java.time.LocalDateTime parsedTime = java.time.LocalDateTime.parse(timestamp.replace("Z", ""));
                if (java.time.Duration.between(parsedTime, java.time.LocalDateTime.now()).abs().toMinutes() > 10) {
                    throw new IllegalArgumentException("Location timestamp is stale. Please submit a fresh GPS reading.");
                }
            } catch (Exception e) {
                // Ignore parse errors, fallback
            }
        }

        // 5. State checking
        if (!"ACCEPTED".equals(task.getStatus()) && !"NAVIGATING_TO_PICKUP".equals(task.getStatus()) && !"ARRIVED_AT_PICKUP".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task must be at pickup location before verification. Current status: " + task.getStatus());
        }

        // 6. Expiry check
        if (verification.getPickupOtpExpiry() != null && LocalDateTime.now().isAfter(verification.getPickupOtpExpiry())) {
            throw new IllegalArgumentException("Pickup OTP code has expired.");
        }

        // 7. OTP Reuse check
        if (verification.getPickupTimestamp() != null) {
            throw new IllegalArgumentException("Pickup OTP has already been verified and cannot be reused.");
        }

        // 8. Attempt limit check
        if (verification.getPickupOtpAttempts() != null && verification.getPickupOtpAttempts() >= 3) {
            throw new IllegalArgumentException("Too many invalid OTP attempts. Handover verification locked.");
        }

        // 9. OTP Verification
        if (!verification.getPickupOtp().equals(otp)) {
            verification.setPickupOtpAttempts((verification.getPickupOtpAttempts() != null ? verification.getPickupOtpAttempts() : 0) + 1);
            verificationRepository.save(verification);
            throw new IllegalArgumentException("Invalid Pickup OTP code. Attempts remaining: " + (3 - verification.getPickupOtpAttempts()));
        }

        // 10. Geofence validation
        FoodListing food = task.getFoodListing();
        double distanceToPickupKm = matchingService.calculateDistance(latitude, longitude, food.getPickupLatitude(), food.getPickupLongitude());
        double allowedRadiusKm = pickupArrivalRadiusMeters / 1000.0;
        if (distanceToPickupKm > allowedRadiusKm) {
            throw new IllegalArgumentException("Location validation failed. You're still " + Math.round(distanceToPickupKm * 1000) + "m away from the pickup location. You must be within " + (int)pickupArrivalRadiusMeters + "m to verify.");
        }

        verification.setPickupTimestamp(LocalDateTime.now());
        verification.setPickupLatitude(latitude);
        verification.setPickupLongitude(longitude);
        verificationRepository.save(verification);

        task.setStatus("PICKED_UP");
        
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
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "PICKED_UP"));

        return saved;
    }

    @Transactional
    public DeliveryTask verifyDelivery(UUID taskId, String otp, double latitude, double longitude, String proofImageUrl) {
        return verifyDelivery(taskId, otp, latitude, longitude, null, null, proofImageUrl, null);
    }

    @Transactional
    public DeliveryTask verifyDelivery(UUID taskId, String otp, double latitude, double longitude, Double accuracy, String timestamp, String proofImageUrl, String volunteerEmail) {
        DeliveryTask task = getById(taskId);
        Verification verification = verificationRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Verification record not found for task: " + taskId));

        // 1. Validate volunteer identity & active task ownership
        if (volunteerEmail != null) {
            if (task.getVolunteer() == null || !task.getVolunteer().getUser().getEmail().equals(volunteerEmail)) {
                throw new IllegalArgumentException("You are not authorized for this delivery task.");
            }
        }

        // 2. Validate GPS coordinates bounds
        if (latitude < -90.0 || latitude > 90.0 || longitude < -180.0 || longitude > 180.0) {
            throw new IllegalArgumentException("Invalid GPS coordinates bounds.");
        }

        // 3. Validate GPS accuracy
        if (accuracy != null && accuracy > gpsAccuracyThresholdMeters) {
            throw new IllegalArgumentException("Cannot verify location. GPS accuracy is too poor (" + Math.round(accuracy) + "m). Please try again in an area with a clearer GPS signal.");
        }

        // 4. Validate timestamp freshness (max 10 minutes stale)
        if (timestamp != null && !timestamp.trim().isEmpty()) {
            try {
                java.time.LocalDateTime parsedTime = java.time.LocalDateTime.parse(timestamp.replace("Z", ""));
                if (java.time.Duration.between(parsedTime, java.time.LocalDateTime.now()).abs().toMinutes() > 10) {
                    throw new IllegalArgumentException("Location timestamp is stale. Please submit a fresh GPS reading.");
                }
            } catch (Exception e) {
                // Ignore parse errors, fallback
            }
        }

        // 5. State checking
        if (!"ARRIVED_AT_DESTINATION".equals(task.getStatus()) && !"NAVIGATING_TO_DESTINATION".equals(task.getStatus()) && !"IN_TRANSIT".equals(task.getStatus()) && !"ARRIVED".equals(task.getStatus()) && !"PICKED_UP".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task must be at destination location before verification. Current status: " + task.getStatus());
        }

        // 6. Expiry check
        if (verification.getDeliveryOtpExpiry() != null && LocalDateTime.now().isAfter(verification.getDeliveryOtpExpiry())) {
            throw new IllegalArgumentException("Delivery OTP code has expired.");
        }

        // 7. OTP Reuse check
        if (verification.getDeliveryTimestamp() != null) {
            throw new IllegalArgumentException("Delivery OTP has already been verified and cannot be reused.");
        }

        // 8. Attempt limit check
        if (verification.getDeliveryOtpAttempts() != null && verification.getDeliveryOtpAttempts() >= 3) {
            throw new IllegalArgumentException("Too many invalid OTP attempts. Delivery verification locked.");
        }

        // 9. OTP Verification
        if (!verification.getDeliveryOtp().equals(otp)) {
            verification.setDeliveryOtpAttempts((verification.getDeliveryOtpAttempts() != null ? verification.getDeliveryOtpAttempts() : 0) + 1);
            verificationRepository.save(verification);
            throw new IllegalArgumentException("Invalid Destination OTP code. Attempts remaining: " + (3 - verification.getDeliveryOtpAttempts()));
        }

        // 10. Geofence validation
        Zone zone = task.getZone();
        double distanceToZoneKm = matchingService.calculateDistance(latitude, longitude, zone.getLatitude(), zone.getLongitude());
        double allowedDestRadiusKm = destinationArrivalRadiusMeters / 1000.0;
        if (distanceToZoneKm > allowedDestRadiusKm) {
            throw new IllegalArgumentException("Location validation failed. You are " + Math.round(distanceToZoneKm * 1000) + "m away from the destination. You must be within " + (int)destinationArrivalRadiusMeters + "m to verify.");
        }

        verification.setDeliveryTimestamp(LocalDateTime.now());
        verification.setDeliveryLatitude(latitude);
        verification.setDeliveryLongitude(longitude);
        verification.setDeliveryRadiusVerified(true);
        if (proofImageUrl != null && !proofImageUrl.trim().isEmpty()) {
            verification.setProofImageUrl(proofImageUrl);
        }
        verificationRepository.save(verification);

        task.setStatus("PROOF_SUBMISSION");
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
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "PROOF_SUBMISSION"));

        return saved;
    }

    @Transactional
    public DeliveryTask processDeliveryProof(UUID taskId, byte[] imageBytes, String filename, double latitude, double longitude) {
        return processDeliveryProof(taskId, imageBytes, filename, latitude, longitude, null, null);
    }

    @Transactional
    public DeliveryTask processDeliveryProof(UUID taskId, byte[] imageBytes, String filename, double latitude, double longitude, Double accuracy, String volunteerEmail) {
        DeliveryTask task = getById(taskId);

        // 1. Validate volunteer identity & active task ownership
        if (volunteerEmail != null) {
            if (task.getVolunteer() == null || !task.getVolunteer().getUser().getEmail().equals(volunteerEmail)) {
                throw new IllegalArgumentException("You are not authorized for this delivery task.");
            }
        }

        // 2. Validate GPS coordinates bounds
        if (latitude < -90.0 || latitude > 90.0 || longitude < -180.0 || longitude > 180.0) {
            throw new IllegalArgumentException("Invalid GPS coordinates bounds.");
        }

        // 3. Validate GPS accuracy
        if (accuracy != null && accuracy > gpsAccuracyThresholdMeters) {
            throw new IllegalArgumentException("Cannot verify photo capture location. GPS accuracy is too poor (" + Math.round(accuracy) + "m). Please capture coordinates in a clearer spot.");
        }

        // 4. Idempotency checks to prevent duplicate rewards
        if ("COMPLETED".equals(task.getStatus()) || "REWARD_CREDITED".equals(task.getStatus())) {
            log.warn("Delivery task {} is already completed or rewarded. Skipping reward crediting.", taskId);
            return task;
        }
        List<TokenTransaction> existingTransactions = tokenTransactionRepository.findByTaskId(taskId);
        if (!existingTransactions.isEmpty()) {
            log.warn("Reward transaction already exists for task {}. Skipping reward crediting.", taskId);
            task.setStatus("COMPLETED");
            deliveryTaskRepository.save(task);
            return task;
        }

        if (!"PROOF_SUBMISSION".equals(task.getStatus()) && !"PHOTO_PENDING".equals(task.getStatus()) && !"ML_VALIDATION_PENDING".equals(task.getStatus()) && !"PHOTO_REJECTED".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task cannot accept proof photos in current status: " + task.getStatus());
        }

        // Set status to AI_VALIDATION during processing
        task.setStatus("AI_VALIDATION");
        deliveryTaskRepository.save(task);
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "AI_VALIDATION"));

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
            return task;
        }

        // 5. Geofence verification for image capture point
        Zone zone = task.getZone();
        double distanceToZoneKm = matchingService.calculateDistance(latitude, longitude, zone.getLatitude(), zone.getLongitude());
        double allowedDestRadiusKm = destinationArrivalRadiusMeters / 1000.0;
        if (distanceToZoneKm > allowedDestRadiusKm) {
            task.setStatus("PHOTO_REJECTED");
            deliveryTaskRepository.save(task);
            return task;
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
        boolean isOffline = (boolean) mlResult.getOrDefault("isOffline", false);
        boolean isValid = (boolean) mlResult.getOrDefault("valid", false);
        double confidence = ((Number) mlResult.getOrDefault("confidence", 0.0)).doubleValue();
        String reason = (String) mlResult.getOrDefault("reason", "Inference details unavailable");

        proof.setMlConfidence(confidence);
        proof.setMlReason(reason);

        Volunteer volunteer = task.getVolunteer();
        FoodListing food = task.getFoodListing();

        if (isOffline) {
            proof.setMlStatus("PENDING_REVIEW");
            proof.setStatus("PENDING");
            deliveryProofRepository.save(proof);

            task.setStatus("PENDING_VERIFICATION");
            deliveryTaskRepository.save(task);

            auditLogService.log(volunteer.getUser().getEmail(), "VOLUNTEER", "ML_OFFLINE", "DeliveryTask", taskId.toString(), "AI service offline. Payout pending manual review.");

            notificationService.sendNotification(
                volunteer.getUser().getEmail(),
                "Proof validation offline",
                "Proof validation unavailable. Reward is pending verification."
            );

            return task;
        }

        if (!isValid) {
            // Check if it is uncertain instead of completely failed
            if (confidence >= 0.30 && confidence < 0.70) {
                proof.setMlStatus("UNCERTAIN");
                proof.setStatus("PENDING");
                deliveryProofRepository.save(proof);

                task.setStatus("PENDING_VERIFICATION");
                deliveryTaskRepository.save(task);

                auditLogService.log(volunteer.getUser().getEmail(), "VOLUNTEER", "ML_UNCERTAIN", "DeliveryTask", taskId.toString(), "AI validation uncertain (confidence: " + confidence + "). Payout pending verification.");

                notificationService.sendNotification(
                    volunteer.getUser().getEmail(),
                    "Proof verification pending",
                    "Proof validation uncertain. Reward is pending verification."
                );

                return task;
            } else {
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

                return task;
            }
        }

        // If proof is verified
        proof.setMlStatus("SUCCESS");
        proof.setStatus("APPROVED");
        deliveryProofRepository.save(proof);

        task.setStatus("VERIFIED");
        deliveryTaskRepository.save(task);
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "VERIFIED"));

        // Record successful delivery metric updates
        volunteer.setSuccessfulDeliveries(volunteer.getSuccessfulDeliveries() + 1);
        volunteer.setTotalDeliveries(volunteer.getTotalDeliveries() + 1);
        volunteer.setRating(Math.min(5.0, Math.round((volunteer.getRating() + 0.1) * 10.0) / 10.0));
        
        // Compute dynamic points reward
        int rewardedCoins = calculateReward(task, proof);
        volunteer.setBalanceTokens((volunteer.getBalanceTokens() != null ? volunteer.getBalanceTokens() : 0) + rewardedCoins);
        volunteerRepository.save(volunteer);

        task.setStatus("REWARD_CREDITED");
        deliveryTaskRepository.save(task);
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "REWARD_CREDITED"));

        task.setStatus("COMPLETED");
        food.setStatus("DELIVERED");
        deliveryTaskRepository.save(task);
        foodListingRepository.save(food);

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
            "Coins Credited! ",
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
            long minutesLeft = java.time.Duration.between(java.time.Instant.now(), food.getExpiryTime()).toMinutes();
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
        return updateTaskLocation(taskId, latitude, longitude, null, null, null);
    }

    @Transactional
    public DeliveryTask updateTaskLocation(UUID taskId, Double latitude, Double longitude, Double accuracy, String timestamp) {
        return updateTaskLocation(taskId, latitude, longitude, accuracy, timestamp, null);
    }

    @Transactional
    public DeliveryTask updateTaskLocation(UUID taskId, Double latitude, Double longitude, Double accuracy, String timestamp, String volunteerEmail) {
        DeliveryTask task = getById(taskId);

        // 1. Volunteer identity & Active task ownership
        if (volunteerEmail != null) {
            if (task.getVolunteer() == null || !task.getVolunteer().getUser().getEmail().equals(volunteerEmail)) {
                throw new IllegalArgumentException("You are not authorized for this delivery task.");
            }
        }

        // 2. Latitude and Longitude range validation
        if (latitude == null || latitude < -90.0 || latitude > 90.0 || longitude == null || longitude < -180.0 || longitude > 180.0) {
            throw new IllegalArgumentException("Invalid GPS coordinates bounds.");
        }

        // 3. Accuracy threshold check
        if (accuracy != null && accuracy > gpsAccuracyThresholdMeters) {
            log.warn("Ignoring task location update due to low accuracy: {} meters (threshold: {})", accuracy, gpsAccuracyThresholdMeters);
            return task;
        }

        // 4. Timestamp validity and freshness (max 10 minutes stale)
        java.time.LocalDateTime updateTime = java.time.LocalDateTime.now();
        if (timestamp != null && !timestamp.trim().isEmpty()) {
            try {
                java.time.LocalDateTime parsedTime = java.time.LocalDateTime.parse(timestamp.replace("Z", ""));
                if (java.time.Duration.between(parsedTime, java.time.LocalDateTime.now()).abs().toMinutes() > 10) {
                    log.warn("Ignoring stale location update (older than 10 minutes): {}", timestamp);
                    return task;
                }
                updateTime = parsedTime;
            } catch (Exception e) {
                // Fallback to current server time
            }
        }

        // 5. Anti-spoofing Speed check
        List<LocationTracking> history = locationTrackingRepository.findByDeliveryTaskIdOrderByTimestampAsc(taskId);
        if (!history.isEmpty()) {
            LocationTracking last = history.get(history.size() - 1);
            double distKm = matchingService.calculateDistance(last.getLatitude(), last.getLongitude(), latitude, longitude);
            long timeDiffSecs = java.time.Duration.between(last.getTimestamp(), updateTime).abs().getSeconds();
            if (timeDiffSecs > 0) {
                double speedKmh = (distKm / timeDiffSecs) * 3600.0;
                if (speedKmh > 120.0) { // Reject impossible city transit speeds (> 120 km/h)
                    log.warn("Suspicious location jump detected for task {}: {} km/h (dist: {} km, time: {} s)", taskId, speedKmh, distKm, timeDiffSecs);
                    return task;
                }
            }
        }

        task.setCurrentLatitude(latitude);
        task.setCurrentLongitude(longitude);
        task.setLastLocationUpdate(updateTime);

        Zone zone = task.getZone();
        double remainingDistance = matchingService.calculateDistance(latitude, longitude, zone.getLatitude(), zone.getLongitude());

        // 6. Stage-specific geofencing check (using configurable pickup / destination radius)
        if ("NAVIGATING_TO_PICKUP".equals(task.getStatus())) {
            double distanceToPickup = matchingService.calculateDistance(
                latitude, longitude, 
                task.getFoodListing().getPickupLatitude(), task.getFoodListing().getPickupLongitude()
            );
            double allowedRadiusKm = pickupArrivalRadiusMeters / 1000.0;
            if (distanceToPickup <= allowedRadiusKm) {
                task.setStatus("ARRIVED_AT_PICKUP");
                auditLogService.log(
                    task.getVolunteer().getUser().getEmail(),
                    "VOLUNTEER", "ARRIVED_AT_PICKUP", "DeliveryTask", taskId.toString(),
                    "Coordinates tracking verified arrival at provider location within " + (int)pickupArrivalRadiusMeters + "m"
                );
                notificationService.sendNotification(
                    task.getVolunteer().getUser().getEmail(),
                    "Kitchen Reached",
                    "You reached the provider kitchen " + task.getFoodListing().getProvider().getBusinessName() + ". Request the pickup OTP code."
                );
                webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "ARRIVED_AT_PICKUP"));
            }
        }

        double allowedDestRadiusKm = destinationArrivalRadiusMeters / 1000.0;
        if (("IN_TRANSIT".equals(task.getStatus()) || "PICKED_UP".equals(task.getStatus()) || "NAVIGATING_TO_DESTINATION".equals(task.getStatus())) && remainingDistance <= allowedDestRadiusKm) {
            task.setStatus("ARRIVED_AT_DESTINATION");
            auditLogService.log(
                task.getVolunteer().getUser().getEmail(),
                "VOLUNTEER",
                "ARRIVED_AT_DESTINATION",
                "DeliveryTask",
                taskId.toString(),
                "Coordinates tracking verified arrival within zone range of " + (int)destinationArrivalRadiusMeters + "m"
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
            
            webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "ARRIVED_AT_DESTINATION"));
        }

        DeliveryTask saved = deliveryTaskRepository.save(task);

        // 7. Rate-limit location history storage: save only if moved > 15m or time elapsed > 30s
        boolean shouldSaveHistory = true;
        if (!history.isEmpty()) {
            LocationTracking last = history.get(history.size() - 1);
            double distMeters = matchingService.calculateDistance(last.getLatitude(), last.getLongitude(), latitude, longitude) * 1000.0;
            long timeDiffSecs = java.time.Duration.between(last.getTimestamp(), updateTime).abs().getSeconds();
            if (distMeters < 15.0 && timeDiffSecs < 30) {
                shouldSaveHistory = false;
            }
        }

        if (shouldSaveHistory) {
            LocationTracking tracking = new LocationTracking(task, latitude, longitude);
            tracking.setTimestamp(updateTime);
            locationTrackingRepository.save(tracking);
        }

        // Broadcast telemetry details
        String telemetryData = String.format(
            "{\"taskId\":\"%s\",\"status\":\"%s\",\"latitude\":%f,\"longitude\":%f,\"remainingDistance\":%f,\"accuracy\":%f,\"timestamp\":\"%s\"}",
            taskId, task.getStatus(), latitude, longitude, remainingDistance, (accuracy != null ? accuracy : 0.0), updateTime.toString()
        );
        webSocketHandler.broadcastUpdate("LOCATION_UPDATE", telemetryData);

        return saved;
    }

    @Transactional
    public DeliveryTask startPickup(UUID taskId, String volunteerEmail) {
        DeliveryTask task = getById(taskId);
        if (!"ACCEPTED".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task must be accepted before starting pickup route. Current status: " + task.getStatus());
        }
        task.setStatus("NAVIGATING_TO_PICKUP");
        DeliveryTask saved = deliveryTaskRepository.save(task);
        auditLogService.log(volunteerEmail, "VOLUNTEER", "START_PICKUP_ROUTE", "DeliveryTask", taskId.toString(), "Started route journey to provider kitchen");
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "NAVIGATING_TO_PICKUP"));
        return saved;
    }

    @Transactional
    public DeliveryTask arrivePickup(UUID taskId, String volunteerEmail) {
        DeliveryTask task = getById(taskId);
        if (!"NAVIGATING_TO_PICKUP".equals(task.getStatus()) && !"ACCEPTED".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task must be in navigating or accepted state to arrive at pickup. Current status: " + task.getStatus());
        }
        task.setStatus("ARRIVED_AT_PICKUP");
        DeliveryTask saved = deliveryTaskRepository.save(task);
        auditLogService.log(volunteerEmail, "VOLUNTEER", "ARRIVED_AT_PICKUP", "DeliveryTask", taskId.toString(), "Arrived at provider kitchen location");
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "ARRIVED_AT_PICKUP"));
        return saved;
    }

    @Transactional
    public DeliveryTask startDelivery(UUID taskId, String volunteerEmail) {
        DeliveryTask task = getById(taskId);
        if (!"PICKED_UP".equals(task.getStatus()) && !"IN_TRANSIT".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task must be picked up before starting delivery route. Current status: " + task.getStatus());
        }
        task.setStatus("NAVIGATING_TO_DESTINATION");
        DeliveryTask saved = deliveryTaskRepository.save(task);
        auditLogService.log(volunteerEmail, "VOLUNTEER", "START_DELIVERY_ROUTE", "DeliveryTask", taskId.toString(), "Started route journey to destination shelter");
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "NAVIGATING_TO_DESTINATION"));
        return saved;
    }

    @Transactional
    public DeliveryTask arriveDelivery(UUID taskId, String volunteerEmail) {
        DeliveryTask task = getById(taskId);
        if (!"NAVIGATING_TO_DESTINATION".equals(task.getStatus()) && !"PICKED_UP".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task must be navigating or picked up to arrive at delivery. Current status: " + task.getStatus());
        }
        task.setStatus("ARRIVED_AT_DESTINATION");
        DeliveryTask saved = deliveryTaskRepository.save(task);
        auditLogService.log(volunteerEmail, "VOLUNTEER", "ARRIVED_AT_DESTINATION", "DeliveryTask", taskId.toString(), "Arrived at destination shelter location");
        webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", taskId, "ARRIVED_AT_DESTINATION"));
        return saved;
    }

    public List<LocationTracking> getTaskLocationHistory(UUID taskId) {
        return locationTrackingRepository.findByDeliveryTaskIdOrderByTimestampAsc(taskId);
    }
}
