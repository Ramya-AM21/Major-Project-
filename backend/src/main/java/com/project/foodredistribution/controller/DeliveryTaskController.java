package com.project.foodredistribution.controller;

import com.project.foodredistribution.dto.CreateTaskRequest;
import com.project.foodredistribution.entity.DeliveryTask;
import com.project.foodredistribution.entity.LocationTracking;
import com.project.foodredistribution.service.DeliveryTaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/tasks", "/api/delivery-tasks"})
@CrossOrigin(origins = "*")
public class DeliveryTaskController {

    private final DeliveryTaskService deliveryTaskService;

    public DeliveryTaskController(DeliveryTaskService deliveryTaskService) {
        this.deliveryTaskService = deliveryTaskService;
    }

    @PostMapping
    public ResponseEntity<DeliveryTask> createTask(@RequestBody CreateTaskRequest request) {
        DeliveryTask task = deliveryTaskService.createProposedTask(
                request.getFoodListingId(),
                request.getZoneId(),
                request.getRouteId(),
                request.getDeviation() != null ? request.getDeviation() : 0.0,
                request.getMatchingScore() != null ? request.getMatchingScore() : 100.0
        );
        return ResponseEntity.ok(task);
    }

    @PostMapping("/{id}/accept")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryTask> acceptTask(@PathVariable UUID id, Principal principal) {
        DeliveryTask task = deliveryTaskService.acceptTask(id, principal.getName());
        return ResponseEntity.ok(task);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryTask> cancelTask(@PathVariable UUID id, Principal principal) {
        DeliveryTask task = deliveryTaskService.cancelTask(id, principal.getName());
        return ResponseEntity.ok(task);
    }

    @GetMapping
    public ResponseEntity<List<DeliveryTask>> getAllTasks() {
        return ResponseEntity.ok(deliveryTaskService.getAllTasks());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeliveryTask> getTaskById(@PathVariable UUID id) {
        return ResponseEntity.ok(deliveryTaskService.getById(id));
    }

    @GetMapping("/volunteer")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<List<DeliveryTask>> getVolunteerTasks(Principal principal) {
        return ResponseEntity.ok(deliveryTaskService.getVolunteerTasks(principal.getName()));
    }

    @GetMapping("/provider")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<List<DeliveryTask>> getProviderTasks(Principal principal) {
        return ResponseEntity.ok(deliveryTaskService.getProviderTasks(principal.getName()));
    }

    @GetMapping("/zone/{zoneId}")
    public ResponseEntity<List<DeliveryTask>> getZoneTasks(@PathVariable UUID zoneId) {
        return ResponseEntity.ok(deliveryTaskService.getZoneTasks(zoneId));
    }

    @PostMapping("/{id}/location")
    public ResponseEntity<DeliveryTask> updateLocation(@PathVariable UUID id, @RequestBody java.util.Map<String, Object> payload) {
        Object latObj = payload.get("latitude");
        Object lngObj = payload.get("longitude");
        if (latObj == null || lngObj == null) {
            return ResponseEntity.badRequest().build();
        }
        Double latitude = ((Number) latObj).doubleValue();
        Double longitude = ((Number) lngObj).doubleValue();

        Object accObj = payload.get("accuracy");
        Double accuracy = null;
        if (accObj != null) {
            accuracy = ((Number) accObj).doubleValue();
        }

        Object timeObj = payload.get("timestamp");
        String timestamp = null;
        if (timeObj != null) {
            timestamp = timeObj.toString();
        }

        DeliveryTask updated = deliveryTaskService.updateTaskLocation(id, latitude, longitude, accuracy, timestamp);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/location")
    public ResponseEntity<java.util.List<LocationTracking>> getLocationHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(deliveryTaskService.getTaskLocationHistory(id));
    }

    @PostMapping("/{id}/start-pickup")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryTask> startPickup(@PathVariable UUID id, Principal principal) {
        DeliveryTask task = deliveryTaskService.startPickup(id, principal.getName());
        return ResponseEntity.ok(task);
    }

    @PostMapping("/{id}/arrive-pickup")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryTask> arrivePickup(@PathVariable UUID id, Principal principal) {
        DeliveryTask task = deliveryTaskService.arrivePickup(id, principal.getName());
        return ResponseEntity.ok(task);
    }

    @PostMapping("/{id}/start-delivery")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryTask> startDelivery(@PathVariable UUID id, Principal principal) {
        DeliveryTask task = deliveryTaskService.startDelivery(id, principal.getName());
        return ResponseEntity.ok(task);
    }

    @PostMapping("/{id}/arrive-delivery")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryTask> arriveDelivery(@PathVariable UUID id, Principal principal) {
        DeliveryTask task = deliveryTaskService.arriveDelivery(id, principal.getName());
        return ResponseEntity.ok(task);
    }
}
