package com.project.foodredistribution.controller;

import com.project.foodredistribution.entity.Zone;
import com.project.foodredistribution.service.AiIntegrationService;
import com.project.foodredistribution.service.ZoneService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
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
    public ResponseEntity<List<Zone>> getAllZones() {
        return ResponseEntity.ok(zoneService.getAllZones());
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
}
