package com.project.foodredistribution.controller;

import com.project.foodredistribution.entity.Zone;
import com.project.foodredistribution.service.AiIntegrationService;
import com.project.foodredistribution.service.ZoneService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.project.foodredistribution.entity.CityDataCoverage;
import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/zones")
@CrossOrigin(origins = "*")
public class ZoneController {

    private final ZoneService zoneService;
    private final AiIntegrationService aiIntegrationService;

    public ZoneController(ZoneService zoneService, AiIntegrationService aiIntegrationService) {
        this.zoneService = zoneService;
        this.aiIntegrationService = aiIntegrationService;
    }

    @GetMapping
    public ResponseEntity<List<Zone>> getAllZones(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String verificationStatus,
            @RequestParam(required = false) String city,
            @RequestParam(required = false, defaultValue = "false") boolean all) {
        if (all) {
            return ResponseEntity.ok(zoneService.getZones(status, verificationStatus, city));
        }
        // Default: only return verified active zones if not specified
        String finalStatus = (status != null) ? status : "ACTIVE";
        String finalVerificationStatus = (verificationStatus != null) ? verificationStatus : "VERIFIED";
        return ResponseEntity.ok(zoneService.getZones(finalStatus, finalVerificationStatus, city));
    }

    @PostMapping
    public ResponseEntity<Zone> saveZone(@RequestBody Zone zone) {
        Zone saved = zoneService.saveZone(zone);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Zone> updateZone(@PathVariable UUID id, @RequestBody Zone zone) {
        Zone existing = zoneService.getById(id);
        if (zone.getName() != null) existing.setName(zone.getName());
        if (zone.getLatitude() != null) existing.setLatitude(zone.getLatitude());
        if (zone.getLongitude() != null) existing.setLongitude(zone.getLongitude());
        if (zone.getAddress() != null) existing.setAddress(zone.getAddress());
        if (zone.getCapacity() != null) existing.setCapacity(zone.getCapacity());
        if (zone.getOperatingHours() != null) existing.setOperatingHours(zone.getOperatingHours());
        if (zone.getPriorityScore() != null) existing.setPriorityScore(zone.getPriorityScore());
        if (zone.getStatus() != null) existing.setStatus(zone.getStatus());

        return ResponseEntity.ok(zoneService.saveZone(existing));
    }

    @GetMapping("/{id}/predict")
    public ResponseEntity<Map<String, Object>> getDemandPrediction(@PathVariable UUID id) {
        // Triggers AI Fast API prediction call or baseline fallback
        Map<String, Object> prediction = aiIntegrationService.getDemandPrediction(id);
        return ResponseEntity.ok(prediction);
    }

    @GetMapping("/coverage/{city}")
    public ResponseEntity<CityDataCoverage> getCityCoverage(@PathVariable String city) {
        return ResponseEntity.ok(zoneService.getCityCoverage(city));
    }

    @PostMapping("/community-needs")
    public ResponseEntity<?> reportCommunityNeed(
            @RequestBody Zone zone,
            @RequestParam(required = false, defaultValue = "false") boolean force,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        if (!force && zone.getLatitude() != null && zone.getLongitude() != null) {
            // Check for duplicate within 0.1 km (100 meters)
            Optional<Zone> duplicate = zoneService.findNearbyDuplicate(zone.getLatitude(), zone.getLongitude(), 0.1);
            if (duplicate.isPresent()) {
                return ResponseEntity.status(409).body(Map.of(
                        "message", "A similar community need location already exists nearby.",
                        "existingZone", duplicate.get()
                ));
            }
        }
        Zone reported = zoneService.reportCommunityNeed(zone, principal.getName());
        return ResponseEntity.ok(reported);
    }

    @PostMapping("/community-needs/{id}/confirm")
    public ResponseEntity<Zone> confirmCommunityNeed(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload) {
        Integer estimatedPeople = null;
        if (payload.containsKey("estimatedPeople") && payload.get("estimatedPeople") != null) {
            estimatedPeople = ((Number) payload.get("estimatedPeople")).intValue();
        }
        String description = (String) payload.get("description");
        Zone confirmed = zoneService.confirmCommunityNeed(id, estimatedPeople, description);
        return ResponseEntity.ok(confirmed);
    }

    @GetMapping("/community-needs/pending")
    public ResponseEntity<List<Zone>> getPendingCommunityNeeds() {
        List<Zone> pending = zoneService.getZones(null, "PENDING", null);
        List<Zone> underReview = zoneService.getZones(null, "UNDER_REVIEW", null);
        List<Zone> requiresReview = zoneService.getZones(null, "REQUIRES_REVIEW", null);
        List<Zone> result = new ArrayList<>();
        result.addAll(pending);
        result.addAll(underReview);
        result.addAll(requiresReview);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/community-needs/{id}/verify")
    public ResponseEntity<Zone> verifyCommunityNeed(@PathVariable UUID id) {
        return ResponseEntity.ok(zoneService.verifyCommunityNeed(id));
    }

    @PutMapping("/community-needs/{id}/reject")
    public ResponseEntity<Zone> rejectCommunityNeed(@PathVariable UUID id) {
        return ResponseEntity.ok(zoneService.rejectCommunityNeed(id));
    }

    @PutMapping("/community-needs/{id}/review")
    public ResponseEntity<Zone> reviewCommunityNeed(@PathVariable UUID id) {
        return ResponseEntity.ok(zoneService.reviewCommunityNeed(id));
    }
}
