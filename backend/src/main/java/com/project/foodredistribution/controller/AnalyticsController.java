package com.project.foodredistribution.controller;

import com.project.foodredistribution.dto.AdminAnalyticsDto;
import com.project.foodredistribution.dto.CoordinatorAnalyticsDto;
import com.project.foodredistribution.dto.ProviderAnalyticsDto;
import com.project.foodredistribution.dto.VolunteerAnalyticsDto;
import com.project.foodredistribution.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/provider")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<ProviderAnalyticsDto> getProviderAnalytics(Principal principal) {
        return ResponseEntity.ok(analyticsService.getProviderAnalytics(principal.getName()));
    }

    @GetMapping("/volunteer")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<VolunteerAnalyticsDto> getVolunteerAnalytics(Principal principal) {
        return ResponseEntity.ok(analyticsService.getVolunteerAnalytics(principal.getName()));
    }

    @GetMapping("/zone/{zoneId}")
    public ResponseEntity<CoordinatorAnalyticsDto> getCoordinatorAnalytics(@PathVariable UUID zoneId) {
        return ResponseEntity.ok(analyticsService.getCoordinatorAnalytics(zoneId));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminAnalyticsDto> getAdminAnalytics() {
        return ResponseEntity.ok(analyticsService.getAdminAnalytics());
    }

    @GetMapping("/admin/summary")
    public ResponseEntity<AdminAnalyticsDto> getPublicSummary() {
        // Publicly visible summary metrics for landing page impact metrics
        return ResponseEntity.ok(analyticsService.getAdminAnalytics());
    }
}
