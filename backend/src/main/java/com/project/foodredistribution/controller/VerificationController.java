package com.project.foodredistribution.controller;

import com.project.foodredistribution.dto.DeliveryVerificationRequest;
import com.project.foodredistribution.dto.PickupVerificationRequest;
import com.project.foodredistribution.entity.DeliveryTask;
import com.project.foodredistribution.entity.Verification;
import com.project.foodredistribution.repository.VerificationRepository;
import com.project.foodredistribution.service.DeliveryTaskService;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<DeliveryTask> verifyPickup(@RequestBody PickupVerificationRequest request) {
        DeliveryTask task = deliveryTaskService.verifyPickup(
                request.getTaskId(),
                request.getOtp(),
                request.getLatitude() != null ? request.getLatitude() : 0.0,
                request.getLongitude() != null ? request.getLongitude() : 0.0
        );
        return ResponseEntity.ok(task);
    }

    @PostMapping("/delivery")
    public ResponseEntity<DeliveryTask> verifyDelivery(@RequestBody DeliveryVerificationRequest request) {
        DeliveryTask task = deliveryTaskService.verifyDelivery(
                request.getTaskId(),
                request.getOtp(),
                request.getLatitude() != null ? request.getLatitude() : 0.0,
                request.getLongitude() != null ? request.getLongitude() : 0.0,
                request.getProofImageUrl()
        );
        return ResponseEntity.ok(task);
    }

    @PostMapping("/upload-proof")
    public ResponseEntity<DeliveryTask> uploadProof(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("taskId") UUID taskId,
            @RequestParam("latitude") double latitude,
            @RequestParam("longitude") double longitude) {
        
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file cannot be empty");
        }
        
        try {
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename();
            if (filename == null) {
                filename = "proof.png";
            }
            
            DeliveryTask task = deliveryTaskService.processDeliveryProof(taskId, bytes, filename, latitude, longitude);
            return ResponseEntity.ok(task);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to read uploaded photo bytes", e);
        }
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<Verification> getVerificationByTaskId(@PathVariable UUID taskId) {
        Verification verification = verificationRepository.findByTaskId(taskId)
                .orElseThrow(() -> new com.project.foodredistribution.exception.ResourceNotFoundException("Verification record not found for taskId: " + taskId));
        return ResponseEntity.ok(verification);
    }
}
