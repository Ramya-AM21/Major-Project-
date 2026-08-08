package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.*;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
public class DeliveryTaskService {

    private final DeliveryTaskRepository deliveryTaskRepository;
    private final FoodListingRepository foodListingRepository;
    private final ZoneRepository zoneRepository;
    private final VolunteerRepository volunteerRepository;
    private final VerificationRepository verificationRepository;
    private final MatchingService matchingService;

    public DeliveryTaskService(DeliveryTaskRepository deliveryTaskRepository,
                               FoodListingRepository foodListingRepository,
                               ZoneRepository zoneRepository,
                               VolunteerRepository volunteerRepository,
                               VerificationRepository verificationRepository,
                               MatchingService matchingService) {
        this.deliveryTaskRepository = deliveryTaskRepository;
        this.foodListingRepository = foodListingRepository;
        this.zoneRepository = zoneRepository;
        this.volunteerRepository = volunteerRepository;
        this.verificationRepository = verificationRepository;
        this.matchingService = matchingService;
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

        if (!"CREATED".equals(task.getStatus()) && !"MATCHED".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task is already accepted or in progress");
        }

        task.setVolunteer(volunteer);
        task.setStatus("ACCEPTED");
        
        FoodListing food = task.getFoodListing();
        food.setStatus("MATCHED");
        foodListingRepository.save(food);

        return deliveryTaskRepository.save(task);
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

        return deliveryTaskRepository.save(task);
    }

    @Transactional
    public DeliveryTask verifyDelivery(UUID taskId, String otp, double latitude, double longitude, String proofImageUrl) {
        DeliveryTask task = getById(taskId);
        Verification verification = verificationRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Verification record not found for task: " + taskId));

        if (!"IN_TRANSIT".equals(task.getStatus())) {
            throw new IllegalArgumentException("Task must be in transit before delivery verification");
        }

        if (!verification.getDeliveryOtp().equals(otp)) {
            throw new IllegalArgumentException("Invalid Delivery OTP code");
        }

        Zone zone = task.getZone();
        double distanceToZoneKm = matchingService.calculateDistance(latitude, longitude, zone.getLatitude(), zone.getLongitude());
        boolean radiusVerified = distanceToZoneKm <= 0.25; // 250 meters

        verification.setDeliveryTimestamp(LocalDateTime.now());
        verification.setDeliveryLatitude(latitude);
        verification.setDeliveryLongitude(longitude);
        verification.setProofImageUrl(proofImageUrl);
        verification.setDeliveryRadiusVerified(radiusVerified);
        
        // Calculate confidence score using evidence
        double confidence = 0.50; // Base if OTP matches
        if (radiusVerified) {
            confidence += 0.30;
        } else {
            // penalize slightly if far from delivery zone
            confidence += Math.max(0.00, 0.30 - (distanceToZoneKm * 0.1));
        }
        if (proofImageUrl != null && !proofImageUrl.isEmpty()) {
            confidence += 0.15;
        }
        verification.setVerificationConfidence(Math.round(confidence * 100.0) / 100.0);
        verificationRepository.save(verification);

        task.setStatus("COMPLETED");
        deliveryTaskRepository.save(task);

        FoodListing food = task.getFoodListing();
        food.setStatus("DELIVERED");
        foodListingRepository.save(food);

        // Update Volunteer metrics
        Volunteer volunteer = task.getVolunteer();
        if (volunteer != null) {
            volunteer.setTotalDeliveries(volunteer.getTotalDeliveries() + 1);
            volunteer.setSuccessfulDeliveries(volunteer.getSuccessfulDeliveries() + 1);
            
            // Adjust reliability
            double reliability = (double) volunteer.getSuccessfulDeliveries() / volunteer.getTotalDeliveries();
            volunteer.setReliabilityScore(Math.round(reliability * 100.0) / 100.0);
            volunteerRepository.save(volunteer);
        }

        return task;
    }

    private String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }
}
