package com.project.foodredistribution.controller;

import com.project.foodredistribution.dto.TaskMatchRecommendation;
import com.project.foodredistribution.entity.VolunteerRoute;
import com.project.foodredistribution.service.VolunteerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/volunteers", "/api/volunteer"})
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('VOLUNTEER')")
public class VolunteerController {

    private final VolunteerService volunteerService;

    public VolunteerController(VolunteerService volunteerService) {
        this.volunteerService = volunteerService;
    }

    @PostMapping("/routes")
    public ResponseEntity<VolunteerRoute> addRoute(@RequestBody VolunteerRoute route, Principal principal) {
        VolunteerRoute created = volunteerService.addRoute(route, principal.getName());
        return ResponseEntity.ok(created);
    }

    @GetMapping("/routes")
    public ResponseEntity<List<VolunteerRoute>> getRoutes(Principal principal) {
        return ResponseEntity.ok(volunteerService.getRoutes(principal.getName()));
    }

    @DeleteMapping("/routes/{routeId}")
    public ResponseEntity<Void> deleteRoute(@PathVariable UUID routeId, Principal principal) {
        volunteerService.deleteRoute(routeId, principal.getName());
        return ResponseEntity.ok().build();
    }

    @GetMapping({"/tasks", "/matching"})
    public ResponseEntity<List<TaskMatchRecommendation>> getTasks(Principal principal) {
        return ResponseEntity.ok(volunteerService.getMatchRecommendations(principal.getName()));
    }

    @PutMapping("/routes/{routeId}/location")
    public ResponseEntity<VolunteerRoute> updateRouteLocation(@PathVariable UUID routeId, @RequestBody java.util.Map<String, Double> payload, Principal principal) {
        Double latitude = payload.get("latitude");
        Double longitude = payload.get("longitude");
        if (latitude == null || longitude == null) {
            return ResponseEntity.badRequest().build();
        }
        VolunteerRoute updated = volunteerService.updateRouteLocation(routeId, latitude, longitude, principal.getName());
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/location")
    public ResponseEntity<Void> updateVolunteerLocation(@RequestBody java.util.Map<String, Object> payload, Principal principal) {
        Object latObj = payload.get("latitude");
        Object lngObj = payload.get("longitude");
        if (latObj == null || lngObj == null) {
            return ResponseEntity.badRequest().build();
        }
        Double latitude = ((Number) latObj).doubleValue();
        Double longitude = ((Number) lngObj).doubleValue();
        volunteerService.updateVolunteerLocation(latitude, longitude, principal.getName());
        return ResponseEntity.ok().build();
    }
}
