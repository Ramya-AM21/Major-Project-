package com.project.foodredistribution.controller;

import com.project.foodredistribution.dto.CreateTaskRequest;
import com.project.foodredistribution.entity.DeliveryTask;
import com.project.foodredistribution.service.DeliveryTaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tasks")
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
}
