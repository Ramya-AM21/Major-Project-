package com.project.foodredistribution.controller;

import com.project.foodredistribution.dto.DeliveryVerificationRequest;
import com.project.foodredistribution.dto.PickupVerificationRequest;
import com.project.foodredistribution.entity.DeliveryTask;
import com.project.foodredistribution.entity.Verification;
import com.project.foodredistribution.repository.VerificationRepository;
import com.project.foodredistribution.service.DeliveryTaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/verification")
@CrossOrigin(origins = "*")
public class VerificationController {

    private final DeliveryTaskService deliveryTaskService;
    private final VerificationRepository verificationRepository;

    public VerificationController(DeliveryTaskService deliveryTaskService,
                                  VerificationRepository verificationRepository) {
        this.deliveryTaskService = deliveryTaskService;
        this.verificationRepository = verificationRepository;
    }

    @PostMapping("/pickup")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryTask> verifyPickup(@RequestBody PickupVerificationRequest request, java.security.Principal principal) {
        DeliveryTask task = deliveryTaskService.verifyPickup(
                request.getTaskId(),
                request.getOtp(),
                request.getLatitude() != null ? request.getLatitude() : 0.0,
                request.getLongitude() != null ? request.getLongitude() : 0.0,
                request.getAccuracy(),
                request.getTimestamp(),
                principal.getName()
        );
        return ResponseEntity.ok(task);
    }

    @PostMapping("/delivery")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryTask> verifyDelivery(@RequestBody DeliveryVerificationRequest request, java.security.Principal principal) {
        DeliveryTask task = deliveryTaskService.verifyDelivery(
                request.getTaskId(),
                request.getOtp(),
                request.getLatitude() != null ? request.getLatitude() : 0.0,
                request.getLongitude() != null ? request.getLongitude() : 0.0,
                request.getAccuracy(),
                request.getTimestamp(),
                request.getProofImageUrl(),
                principal.getName()
        );
        return ResponseEntity.ok(task);
    }

    @PostMapping("/upload-proof")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryTask> uploadProof(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("taskId") UUID taskId,
            @RequestParam("latitude") double latitude,
            @RequestParam("longitude") double longitude,
            @RequestParam(value = "accuracy", required = false) Double accuracy,
            java.security.Principal principal) {
        
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file cannot be empty");
        }
        
        try {
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename();
            if (filename == null) {
                filename = "proof.png";
            }
            
            DeliveryTask task = deliveryTaskService.processDeliveryProof(taskId, bytes, filename, latitude, longitude, accuracy, principal.getName());
            return ResponseEntity.ok(task);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to read uploaded photo bytes", e);
        }
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<Verification> getVerificationByTaskId(@PathVariable UUID taskId, java.security.Principal principal) {
        Verification verification = verificationRepository.findByTaskId(taskId)
                .orElseThrow(() -> new com.project.foodredistribution.exception.ResourceNotFoundException("Verification record not found for taskId: " + taskId));
        
        // If caller is the assigned VOLUNTEER, mask pickupOtp and deliveryOtp to prevent leakage
        if (principal != null) {
            String userEmail = principal.getName();
            if (verification.getTask() != null && verification.getTask().getVolunteer() != null &&
                userEmail.equalsIgnoreCase(verification.getTask().getVolunteer().getUser().getEmail())) {
                Verification copy = new Verification();
                copy.setId(verification.getId());
                copy.setTask(verification.getTask());
                copy.setPickupOtp(null); // Masked for volunteer
                copy.setDeliveryOtp(null); // Masked for volunteer
                copy.setPickupTimestamp(verification.getPickupTimestamp());
                copy.setDeliveryTimestamp(verification.getDeliveryTimestamp());
                copy.setPickupLatitude(verification.getPickupLatitude());
                copy.setPickupLongitude(verification.getPickupLongitude());
                copy.setDeliveryLatitude(verification.getDeliveryLatitude());
                copy.setDeliveryLongitude(verification.getDeliveryLongitude());
                copy.setProofImageUrl(verification.getProofImageUrl());
                copy.setDeliveryRadiusVerified(verification.getDeliveryRadiusVerified());
                copy.setVerificationConfidence(verification.getVerificationConfidence());
                copy.setPickupOtpExpiry(verification.getPickupOtpExpiry());
                copy.setDeliveryOtpExpiry(verification.getDeliveryOtpExpiry());
                copy.setPickupOtpAttempts(verification.getPickupOtpAttempts());
                copy.setDeliveryOtpAttempts(verification.getDeliveryOtpAttempts());
                return ResponseEntity.ok(copy);
            }
        }
        return ResponseEntity.ok(verification);
    }

    @GetMapping("/task/{taskId}/demo-otp")
    public ResponseEntity<java.util.Map<String, String>> getDemoOtp(@PathVariable UUID taskId) {
        Verification verification = verificationRepository.findByTaskId(taskId)
                .orElseThrow(() -> new com.project.foodredistribution.exception.ResourceNotFoundException("Verification record not found for taskId: " + taskId));
        java.util.Map<String, String> map = new java.util.HashMap<>();
        map.put("pickupOtp", verification.getPickupOtp());
        map.put("deliveryOtp", verification.getDeliveryOtp());
        return ResponseEntity.ok(map);
    }
}
