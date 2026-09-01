package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.*;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ShelterDeliveryService {

    private final ShelterRepository shelterRepository;
    private final FoodRequirementRepository foodRequirementRepository;
    private final DeliveryAssignmentRepository deliveryAssignmentRepository;
    private final UserRepository userRepository;
    private final VolunteerRepository volunteerRepository;
    private final ZoneRepository zoneRepository;
    private final MatchingService matchingService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final Logger logger = LoggerFactory.getLogger(ShelterDeliveryService.class);

    @Value("${app.delivery.geofence-radius-meters:100.0}")
    private double geofenceRadiusMeters;

    public ShelterDeliveryService(ShelterRepository shelterRepository,
                                  FoodRequirementRepository foodRequirementRepository,
                                  DeliveryAssignmentRepository deliveryAssignmentRepository,
                                  UserRepository userRepository,
                                  VolunteerRepository volunteerRepository,
                                  ZoneRepository zoneRepository,
                                  MatchingService matchingService,
                                  AuditLogService auditLogService,
                                  NotificationService notificationService) {
        this.shelterRepository = shelterRepository;
        this.foodRequirementRepository = foodRequirementRepository;
        this.deliveryAssignmentRepository = deliveryAssignmentRepository;
        this.userRepository = userRepository;
        this.volunteerRepository = volunteerRepository;
        this.zoneRepository = zoneRepository;
        this.matchingService = matchingService;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    private String saveUploadedFile(byte[] bytes, String filename) throws IOException {
        File uploadDir = new File("uploads");
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        String cleanFilename = filename.replaceAll("[^a-zA-Z0-9\\.\\-]", "_");
        String uniqueName = UUID.randomUUID().toString() + "_" + cleanFilename;
        File destFile = new File(uploadDir, uniqueName);
        Files.write(destFile.toPath(), bytes);
        return "/uploads/" + uniqueName;
    }

    @Transactional
    public Shelter createShelter(String name, String shelterType, String city, String area, String address,
                                 String contactName, String contactPhone, Double latitude, Double longitude,
                                 byte[] proofBytes, String proofFilename, String coordinatorEmail) throws IOException {
        User coordinator = userRepository.findByEmail(coordinatorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + coordinatorEmail));

        Shelter shelter = new Shelter();
        shelter.setName(name);
        shelter.setShelterType(shelterType);
        shelter.setCity(city);
        shelter.setArea(area);
        shelter.setAddress(address);
        shelter.setContactName(contactName);
        shelter.setContactPhone(contactPhone);
        shelter.setLatitude(latitude);
        shelter.setLongitude(longitude);
        shelter.setCoordinator(coordinator);
        shelter.setVerificationStatus("PENDING_VERIFICATION");

        if (proofBytes != null && proofBytes.length > 0) {
            String fileUrl = saveUploadedFile(proofBytes, proofFilename);
            shelter.setDocumentUrl(fileUrl);
            shelter.setDocumentUploadedAt(LocalDateTime.now());
        }

        Shelter saved = shelterRepository.save(shelter);
        auditLogService.log(coordinatorEmail, "COORDINATOR", "SHELTER_CREATED", "Shelter", saved.getId().toString(), "Shelter created pending verification");
        return saved;
    }

    public List<Shelter> getPendingShelters() {
        List<Shelter> list = shelterRepository.findByVerificationStatus("PENDING_VERIFICATION");
        List<Shelter> realList = new ArrayList<>();
        for (Shelter s : list) {
            if (s.getName() != null && s.getName().matches(".*\\d{9,}.*")) {
                continue;
            }
            if (s.getCoordinator() != null && s.getCoordinator().getEmail() != null &&
                    s.getCoordinator().getEmail().matches(".*coordinator_\\d{9,}.*")) {
                continue;
            }
            realList.add(s);
        }
        return realList;
    }

    public Map<String, Object> getShelterDocumentFile(UUID shelterId) throws IOException {
        Shelter shelter = shelterRepository.findById(shelterId)
                .orElseThrow(() -> new ResourceNotFoundException("Shelter not found: " + shelterId));
        if (shelter.getDocumentUrl() == null || shelter.getDocumentUrl().trim().isEmpty()) {
            throw new ResourceNotFoundException("No document attached to shelter: " + shelterId);
        }
        String relativePath = shelter.getDocumentUrl();
        if (relativePath.startsWith("/")) {
            relativePath = relativePath.substring(1);
        }
        File file = new File(relativePath);
        if (!file.exists() || !file.isFile()) {
            throw new ResourceNotFoundException("Uploaded file does not exist on disk: " + relativePath);
        }
        byte[] bytes = Files.readAllBytes(file.toPath());
        String contentType = Files.probeContentType(file.toPath());
        if (contentType == null) {
            if (file.getName().toLowerCase().endsWith(".png")) contentType = "image/png";
            else if (file.getName().toLowerCase().endsWith(".jpg") || file.getName().toLowerCase().endsWith(".jpeg")) contentType = "image/jpeg";
            else if (file.getName().toLowerCase().endsWith(".pdf")) contentType = "application/pdf";
            else contentType = "application/octet-stream";
        }
        Map<String, Object> result = new HashMap<>();
        result.put("bytes", bytes);
        result.put("contentType", contentType);
        result.put("filename", file.getName());
        return result;
    }

    @Transactional
    public Shelter verifyShelter(UUID shelterId, String adminEmail) {
        logger.info("APPROVAL START - Submission ID: {}", shelterId);
        Shelter shelter = shelterRepository.findById(shelterId)
                .orElseThrow(() -> new ResourceNotFoundException("Shelter submission not found: " + shelterId));

        logger.info("SUBMISSION FOUND - Name: {}, Current Status: {}", shelter.getName(), shelter.getVerificationStatus());

        if ("VERIFIED".equalsIgnoreCase(shelter.getVerificationStatus())) {
            logger.warn("APPROVAL REJECTED - Submission {} has already been approved.", shelterId);
            throw new IllegalStateException("Shelter submission has already been approved.");
        }

        if ("REJECTED".equalsIgnoreCase(shelter.getVerificationStatus())) {
            logger.warn("APPROVAL REJECTED - Submission {} was previously rejected.", shelterId);
            throw new IllegalStateException("Cannot approve a rejected shelter submission.");
        }

        // Validate coordinates
        if (shelter.getLatitude() == null || shelter.getLongitude() == null ||
                shelter.getLatitude() < -90.0 || shelter.getLatitude() > 90.0 ||
                shelter.getLongitude() < -180.0 || shelter.getLongitude() > 180.0) {
            throw new IllegalArgumentException("Invalid shelter GPS coordinates for approval.");
        }

        // Update Shelter Verification Status
        shelter.setVerificationStatus("VERIFIED");
        shelter.setUpdatedAt(LocalDateTime.now());
        Shelter savedShelter = shelterRepository.save(shelter);
        logger.info("SUBMISSION STATUS UPDATED - Status: VERIFIED");

        // Sync/Persist to Shelter Zone database table
        logger.info("CREATING/UPDATING SHELTER ZONE IN DATABASE...");
        Optional<Zone> existingZoneOpt = zoneRepository.findByNameIgnoreCaseAndCityIgnoreCase(shelter.getName(), shelter.getCity());
        Zone zone;
        if (existingZoneOpt.isPresent()) {
            zone = existingZoneOpt.get();
            logger.info("EXISTING ZONE FOUND - Updating Zone ID: {}", zone.getId());
        } else {
            zone = new Zone();
            zone.setCreatedAt(LocalDateTime.now());
        }

        zone.setName(shelter.getName());
        zone.setLatitude(shelter.getLatitude());
        zone.setLongitude(shelter.getLongitude());
        zone.setAddress(shelter.getAddress() + (shelter.getArea() != null ? ", " + shelter.getArea() : "") + (shelter.getCity() != null ? ", " + shelter.getCity() : ""));
        zone.setCity(shelter.getCity() != null ? shelter.getCity() : "Bengaluru");
        zone.setState("Karnataka");
        zone.setCountry("India");
        zone.setCapacity(200);
        zone.setStatus("ACTIVE");
        zone.setVerificationStatus("VERIFIED");
        zone.setType(shelter.getShelterType() != null ? shelter.getShelterType() : "VERIFIED_SHELTER");
        zone.setSource("VERIFIED_COORDINATOR");
        zone.setEvidenceUrl(shelter.getDocumentUrl());
        zone.setReportedBy(shelter.getCoordinator());
        zone.setPriorityScore(1.0);
        zone.setLastVerifiedAt(LocalDateTime.now());
        zone.setValidFrom(LocalDateTime.now());
        zone.setValidUntil(LocalDateTime.now().plusDays(30));
        zone.setUpdatedAt(LocalDateTime.now());

        Zone savedZone = zoneRepository.save(zone);
        logger.info("SHELTER ZONE SAVED IN DATABASE - Zone ID: {}, Status: ACTIVE, Coordinates: {}, {}", savedZone.getId(), savedZone.getLatitude(), savedZone.getLongitude());

        // Auto verify associated requirements
        List<FoodRequirement> requirements = foodRequirementRepository.findByStatus("PENDING_VERIFICATION");
        for (FoodRequirement req : requirements) {
            if (req.getShelter().getId().equals(shelterId)) {
                req.setStatus("VERIFIED");
                foodRequirementRepository.save(req);
            }
        }

        auditLogService.log(adminEmail, "ADMIN", "SHELTER_VERIFIED", "Shelter", shelterId.toString(), "Shelter and Zone verified by Admin. Created Zone ID: " + savedZone.getId());
        notificationService.sendNotification(shelter.getCoordinator().getEmail(), "Shelter Verified! ", "Your shelter " + shelter.getName() + " has been verified and activated on the map.");
        logger.info("APPROVAL COMPLETE - Submission ID: {}, Zone ID: {}", shelterId, savedZone.getId());
        return savedShelter;
    }

    @Transactional
    public Shelter rejectShelter(UUID shelterId, String reason, String adminEmail) {
        Shelter shelter = shelterRepository.findById(shelterId)
                .orElseThrow(() -> new ResourceNotFoundException("Shelter not found: " + shelterId));

        shelter.setVerificationStatus("REJECTED");
        shelter.setRejectionReason(reason);
        shelter.setUpdatedAt(LocalDateTime.now());
        Shelter saved = shelterRepository.save(shelter);

        // Auto reject associated requirements
        List<FoodRequirement> requirements = foodRequirementRepository.findByStatus("PENDING_VERIFICATION");
        for (FoodRequirement req : requirements) {
            if (req.getShelter().getId().equals(shelterId)) {
                req.setStatus("REJECTED");
                foodRequirementRepository.save(req);
            }
        }

        auditLogService.log(adminEmail, "ADMIN", "SHELTER_REJECTED", "Shelter", shelterId.toString(), "Shelter rejected by Admin: " + reason);
        notificationService.sendNotification(shelter.getCoordinator().getEmail(), "Shelter Rejected ", "Your shelter " + shelter.getName() + " was rejected. Reason: " + reason);
        return saved;
    }

    @Transactional
    public FoodRequirement createRequirement(UUID shelterId, String foodType, Double quantity, String unit, Integer peopleToServe,
                                             String additionalRequirements, String dietaryNotes, LocalDateTime requiredDate,
                                             String startTime, String endTime, String priority, String instructions,
                                             String accessibilityInfo, String emergencyNotes, String coordinatorEmail) {
        Shelter shelter = shelterRepository.findById(shelterId)
                .orElseThrow(() -> new ResourceNotFoundException("Shelter not found: " + shelterId));

        User coordinator = userRepository.findByEmail(coordinatorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + coordinatorEmail));

        FoodRequirement req = new FoodRequirement();
        req.setShelter(shelter);
        req.setFoodType(foodType);
        req.setQuantityRequired(quantity);
        req.setUnit(unit);
        req.setPeopleToServe(peopleToServe);
        req.setAdditionalRequirements(additionalRequirements);
        req.setDietaryNotes(dietaryNotes);
        req.setRequiredDate(requiredDate);
        req.setDeliveryStartTime(startTime);
        req.setDeliveryEndTime(endTime);
        req.setPriority(priority);
        req.setInstructions(instructions);
        req.setAccessibilityInfo(accessibilityInfo);
        req.setEmergencyNotes(emergencyNotes);
        req.setCoordinator(coordinator);

        if ("VERIFIED".equals(shelter.getVerificationStatus())) {
            req.setStatus("VERIFIED");
        } else if ("REJECTED".equals(shelter.getVerificationStatus())) {
            req.setStatus("REJECTED");
        } else {
            req.setStatus("PENDING_VERIFICATION");
        }

        FoodRequirement saved = foodRequirementRepository.save(req);
        auditLogService.log(coordinatorEmail, "COORDINATOR", "REQUIREMENT_CREATED", "FoodRequirement", saved.getId().toString(), "Requirement posted with status: " + req.getStatus());
        return saved;
    }

    public List<FoodRequirement> getCoordinatorRequirements(String coordinatorEmail) {
        return foodRequirementRepository.findByCoordinatorEmail(coordinatorEmail);
    }

    public List<Shelter> getCoordinatorShelters(String coordinatorEmail) {
        User coordinator = userRepository.findByEmail(coordinatorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + coordinatorEmail));
        return shelterRepository.findByCoordinatorId(coordinator.getId());
    }

    public FoodRequirement getRequirementById(UUID id) {
        return foodRequirementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + id));
    }

    public List<Map<String, Object>> getAvailableDeliveries(String city, Double volunteerLat, Double volunteerLng) {
        List<FoodRequirement> list = foodRequirementRepository.findByStatus("VERIFIED");
        List<Map<String, Object>> results = new ArrayList<>();

        for (FoodRequirement req : list) {
            Shelter shelter = req.getShelter();
            // Filter by city if specified
            if (city != null && !city.trim().isEmpty() && !city.equalsIgnoreCase(shelter.getCity())) {
                continue;
            }
            
            // Check expiry
            if (req.getRequiredDate().isBefore(LocalDateTime.now().minusHours(4))) {
                req.setStatus("EXPIRED");
                foodRequirementRepository.save(req);
                continue;
            }

            Map<String, Object> map = new HashMap<>();
            map.put("requirement", req);
            
            double distance = 0.0;
            if (volunteerLat != null && volunteerLng != null) {
                distance = matchingService.calculateDistance(volunteerLat, volunteerLng, shelter.getLatitude(), shelter.getLongitude());
            } else {
                distance = 0.0;
            }
            map.put("distance", distance);
            results.add(map);
        }

        // Sort by distance (closest first)
        results.sort((a, b) -> Double.compare((Double) a.get("distance"), (Double) b.get("distance")));
        return results;
    }

    @Transactional
    public DeliveryAssignment acceptDelivery(UUID requirementId, String volunteerEmail) {
        Volunteer volunteer = volunteerRepository.findByUserEmail(volunteerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Volunteer not found: " + volunteerEmail));

        // Enforce volunteer doesn't already have an active assignment
        List<DeliveryAssignment> activeAssignments = deliveryAssignmentRepository.findByVolunteerUserEmailAndStatusNotIn(
                volunteerEmail, Arrays.asList("DELIVERED", "FAILED", "CANCELLED"));
        if (!activeAssignments.isEmpty()) {
            throw new IllegalArgumentException("You already have an active shelter delivery task. Complete or release it first.");
        }

        // Lock the requirement to prevent race conditions
        FoodRequirement req = foodRequirementRepository.findByIdForUpdate(requirementId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + requirementId));

        if (!"VERIFIED".equals(req.getStatus())) {
            throw new IllegalArgumentException("This food requirement is no longer available. Status: " + req.getStatus());
        }

        // Accept and assign
        req.setStatus("ASSIGNED");
        foodRequirementRepository.save(req);

        // Create assignment
        DeliveryAssignment assignment = new DeliveryAssignment();
        assignment.setFoodRequirement(req);
        assignment.setVolunteer(volunteer);
        assignment.setStatus("ASSIGNED");
        
        // Generate secure 6-digit OTP
        Random random = new Random();
        int otpCode = 100000 + random.nextInt(900000);
        assignment.setOtp(String.valueOf(otpCode));
        assignment.setOtpExpiry(LocalDateTime.now().plusHours(3)); // 3 hours expiration window
        assignment.setOtpAttempts(0);

        DeliveryAssignment saved = deliveryAssignmentRepository.save(assignment);
        auditLogService.log(volunteerEmail, "VOLUNTEER", "DELIVERY_ACCEPTED", "DeliveryAssignment", saved.getId().toString(), "Shelter delivery accepted");
        
        notificationService.sendNotification(req.getCoordinator().getEmail(), "Delivery Assigned", 
                "Volunteer " + volunteer.getUser().getName() + " accepted delivery to " + req.getShelter().getName());
        
        return saved;
    }

    @Transactional
    public DeliveryAssignment startDelivery(UUID assignmentId, String volunteerEmail, Double currentLat, Double currentLng) {
        DeliveryAssignment assignment = deliveryAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        if (!assignment.getVolunteer().getUser().getEmail().equals(volunteerEmail)) {
            throw new IllegalArgumentException("You are not authorized for this assignment.");
        }

        if (!"ASSIGNED".equals(assignment.getStatus())) {
            throw new IllegalArgumentException("Delivery cannot be started in current status: " + assignment.getStatus());
        }

        assignment.setStatus("OUT_FOR_DELIVERY");
        assignment.setUpdatedAt(LocalDateTime.now());
        DeliveryAssignment saved = deliveryAssignmentRepository.save(assignment);
        
        auditLogService.log(volunteerEmail, "VOLUNTEER", "DELIVERY_STARTED", "DeliveryAssignment", assignmentId.toString(), "Started navigation route to shelter");
        return saved;
    }

    @Transactional
    public DeliveryAssignment arriveDelivery(UUID assignmentId, String volunteerEmail, Double currentLat, Double currentLng) {
        DeliveryAssignment assignment = deliveryAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        if (!assignment.getVolunteer().getUser().getEmail().equals(volunteerEmail)) {
            throw new IllegalArgumentException("You are not authorized for this assignment.");
        }

        Shelter shelter = assignment.getFoodRequirement().getShelter();
        double distanceKm = matchingService.calculateDistance(currentLat, currentLng, shelter.getLatitude(), shelter.getLongitude());
        double allowedRadiusKm = geofenceRadiusMeters / 1000.0;

        if (distanceKm > allowedRadiusKm) {
            throw new IllegalArgumentException("You are not at the registered delivery location. You are currently " + 
                    Math.round(distanceKm * 1000) + "m away. Allowed radius is " + (int) geofenceRadiusMeters + "m.");
        }

        assignment.setStatus("ARRIVED");
        assignment.setArrivalTimestamp(LocalDateTime.now());
        assignment.setUpdatedAt(LocalDateTime.now());
        DeliveryAssignment saved = deliveryAssignmentRepository.save(assignment);

        auditLogService.log(volunteerEmail, "VOLUNTEER", "DELIVERY_ARRIVED", "DeliveryAssignment", assignmentId.toString(), "Volunteer arrived within shelter geofence");
        
        // Notify coordinator with the OTP code
        notificationService.sendNotification(
                assignment.getFoodRequirement().getCoordinator().getEmail(),
                "Volunteer Arrived - Share OTP",
                "Volunteer has arrived at " + shelter.getName() + ". Share OTP " + assignment.getOtp() + " to verify handover."
        );

        return saved;
    }

    @Transactional
    public DeliveryAssignment verifyOtp(UUID assignmentId, String volunteerEmail, String otp) {
        DeliveryAssignment assignment = deliveryAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        if (!assignment.getVolunteer().getUser().getEmail().equals(volunteerEmail)) {
            throw new IllegalArgumentException("You are not authorized for this assignment.");
        }

        if (assignment.getOtpAttempts() >= 3) {
            throw new IllegalArgumentException("Too many invalid OTP attempts. Handover verification locked.");
        }

        if (LocalDateTime.now().isAfter(assignment.getOtpExpiry())) {
            throw new IllegalArgumentException("Handover OTP code has expired.");
        }

        assignment.setOtpAttempts(assignment.getOtpAttempts() + 1);

        if (!assignment.getOtp().equals(otp)) {
            deliveryAssignmentRepository.save(assignment);
            throw new IllegalArgumentException("Invalid OTP code. Handover verification failed.");
        }

        assignment.setStatus("VERIFICATION_PENDING"); // Passed OTP, awaiting photo proof and receipt
        assignment.setUpdatedAt(LocalDateTime.now());
        DeliveryAssignment saved = deliveryAssignmentRepository.save(assignment);

        auditLogService.log(volunteerEmail, "VOLUNTEER", "OTP_VERIFIED", "DeliveryAssignment", assignmentId.toString(), "Handover OTP verified successfully");
        return saved;
    }

    @Transactional
    public DeliveryAssignment uploadProof(UUID assignmentId, String volunteerEmail, byte[] imageBytes, String filename, Double latitude, Double longitude) throws IOException {
        DeliveryAssignment assignment = deliveryAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        if (!assignment.getVolunteer().getUser().getEmail().equals(volunteerEmail)) {
            throw new IllegalArgumentException("You are not authorized for this assignment.");
        }

        Shelter shelter = assignment.getFoodRequirement().getShelter();
        double distanceKm = matchingService.calculateDistance(latitude, longitude, shelter.getLatitude(), shelter.getLongitude());
        double allowedRadiusKm = geofenceRadiusMeters / 1000.0;

        if (distanceKm > allowedRadiusKm) {
            throw new IllegalArgumentException("Photo capture coordinate check failed: you must be within " + (int) geofenceRadiusMeters + "m of the shelter.");
        }

        String fileUrl = saveUploadedFile(imageBytes, filename);
        assignment.setPhotoUrl(fileUrl);
        assignment.setPhotoTimestamp(LocalDateTime.now());
        assignment.setPhotoLatitude(latitude);
        assignment.setPhotoLongitude(longitude);
        assignment.setUpdatedAt(LocalDateTime.now());

        DeliveryAssignment saved = deliveryAssignmentRepository.save(assignment);
        auditLogService.log(volunteerEmail, "VOLUNTEER", "PROOF_UPLOADED", "DeliveryAssignment", assignmentId.toString(), "Photo proof uploaded successfully");
        return saved;
    }

    @Transactional
    public DeliveryAssignment completeDelivery(UUID assignmentId, String volunteerEmail, Double actualQuantity, String reason,
                                                String representativeName, String representativePhone, String digitalSignature) {
        DeliveryAssignment assignment = deliveryAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        if (!assignment.getVolunteer().getUser().getEmail().equals(volunteerEmail)) {
            throw new IllegalArgumentException("You are not authorized for this assignment.");
        }

        if (!"VERIFICATION_PENDING".equals(assignment.getStatus()) && !"ARRIVED".equals(assignment.getStatus())) {
            throw new IllegalArgumentException("Delivery cannot be completed in current status: " + assignment.getStatus());
        }

        if (assignment.getPhotoUrl() == null) {
            throw new IllegalArgumentException("Photo proof must be uploaded before completing delivery.");
        }

        double requiredQty = assignment.getFoodRequirement().getQuantityRequired();
        if (actualQuantity < requiredQty && (reason == null || reason.trim().isEmpty())) {
            throw new IllegalArgumentException("Quantity delivered is lower than required. A short explanation/reason must be provided.");
        }

        assignment.setActualDeliveredQuantity(actualQuantity);
        assignment.setQuantityReason(reason);
        assignment.setRepresentativeName(representativeName);
        assignment.setRepresentativePhone(representativePhone);
        assignment.setDigitalSignature(digitalSignature);
        assignment.setConfirmationTimestamp(LocalDateTime.now());
        assignment.setStatus("DELIVERED");
        assignment.setCompletedAt(LocalDateTime.now());
        assignment.setUpdatedAt(LocalDateTime.now());

        FoodRequirement req = assignment.getFoodRequirement();
        req.setStatus("FULFILLED");
        foodRequirementRepository.save(req);

        // Update Volunteer Statistics
        Volunteer volunteer = assignment.getVolunteer();
        volunteer.setTotalDeliveries(volunteer.getTotalDeliveries() + 1);
        volunteer.setSuccessfulDeliveries(volunteer.getSuccessfulDeliveries() + 1);
        volunteer.setBalanceTokens((volunteer.getBalanceTokens() != null ? volunteer.getBalanceTokens() : 0) + 15); // Base 15 tokens for shelter delivery
        volunteerRepository.save(volunteer);

        DeliveryAssignment saved = deliveryAssignmentRepository.save(assignment);

        auditLogService.log(volunteerEmail, "VOLUNTEER", "DELIVERY_COMPLETED", "DeliveryAssignment", assignmentId.toString(), "Delivery completed. Actual quantity: " + actualQuantity);
        
        notificationService.sendNotification(req.getCoordinator().getEmail(), "Delivery Handover Completed", 
                "Volunteer " + volunteer.getUser().getName() + " completed delivery handover of " + actualQuantity + " " + req.getUnit() + " at " + req.getShelter().getName());
        
        return saved;
    }

    public List<DeliveryAssignment> getVolunteerDeliveries(String volunteerEmail) {
        return deliveryAssignmentRepository.findByVolunteerUserEmail(volunteerEmail);
    }

    public List<DeliveryAssignment> getCoordinatorDeliveries(String coordinatorEmail) {
        return deliveryAssignmentRepository.findByFoodRequirementCoordinatorEmail(coordinatorEmail);
    }
}
