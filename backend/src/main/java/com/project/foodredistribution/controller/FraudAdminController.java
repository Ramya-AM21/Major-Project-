package com.project.foodredistribution.controller;

import com.project.foodredistribution.entity.FraudRiskAssessment;
import com.project.foodredistribution.service.FraudDetectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/fraud")
@CrossOrigin(origins = "*")
public class FraudAdminController {

    private final FraudDetectionService fraudDetectionService;

    public FraudAdminController(FraudDetectionService fraudDetectionService) {
        this.fraudDetectionService = fraudDetectionService;
    }

    @GetMapping("/assessments")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAKEHOLDER', 'VOLUNTEER', 'PROVIDER')")
    public ResponseEntity<List<FraudRiskAssessment>> getAllAssessments() {
        return ResponseEntity.ok(fraudDetectionService.getAllAssessments());
    }

    @GetMapping("/assessments/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAKEHOLDER', 'VOLUNTEER', 'PROVIDER')")
    public ResponseEntity<List<FraudRiskAssessment>> getPendingAssessments() {
        return ResponseEntity.ok(fraudDetectionService.getPendingAssessments());
    }

    @PostMapping("/assessments/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAKEHOLDER', 'VOLUNTEER', 'PROVIDER')")
    public ResponseEntity<FraudRiskAssessment> approveAssessment(@PathVariable UUID id, Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "admin@foodbridge.org";
        return ResponseEntity.ok(fraudDetectionService.approveAssessment(id, adminEmail));
    }

    @PostMapping("/assessments/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAKEHOLDER', 'VOLUNTEER', 'PROVIDER')")
    public ResponseEntity<FraudRiskAssessment> rejectAssessment(@PathVariable UUID id, Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "admin@foodbridge.org";
        return ResponseEntity.ok(fraudDetectionService.rejectAssessment(id, adminEmail));
    }

    @PostMapping("/assessments/{id}/dismiss")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAKEHOLDER', 'VOLUNTEER', 'PROVIDER')")
    public ResponseEntity<FraudRiskAssessment> dismissAssessment(@PathVariable UUID id, Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "admin@foodbridge.org";
        return ResponseEntity.ok(fraudDetectionService.dismissAssessment(id, adminEmail));
    }
}
