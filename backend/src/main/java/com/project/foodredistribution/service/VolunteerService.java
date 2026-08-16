package com.project.foodredistribution.service;

import com.project.foodredistribution.dto.TaskMatchRecommendation;
import com.project.foodredistribution.entity.FoodListing;
import com.project.foodredistribution.entity.Volunteer;
import com.project.foodredistribution.entity.VolunteerRoute;
import com.project.foodredistribution.entity.Zone;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.FoodListingRepository;
import com.project.foodredistribution.repository.VolunteerRepository;
import com.project.foodredistribution.repository.VolunteerRouteRepository;
import com.project.foodredistribution.repository.ZoneRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class VolunteerService {

    private final VolunteerRepository volunteerRepository;
    private final VolunteerRouteRepository volunteerRouteRepository;
    private final FoodListingRepository foodListingRepository;
    private final ZoneRepository zoneRepository;
    private final MatchingService matchingService;
    private final com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler;

    public VolunteerService(VolunteerRepository volunteerRepository,
                            VolunteerRouteRepository volunteerRouteRepository,
                            FoodListingRepository foodListingRepository,
                            ZoneRepository zoneRepository,
                            MatchingService matchingService,
                            com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler) {
        this.volunteerRepository = volunteerRepository;
        this.volunteerRouteRepository = volunteerRouteRepository;
        this.foodListingRepository = foodListingRepository;
        this.zoneRepository = zoneRepository;
        this.matchingService = matchingService;
        this.webSocketHandler = webSocketHandler;
    }

    @Transactional
    public VolunteerRoute updateRouteLocation(UUID routeId, Double latitude, Double longitude, String email) {
        VolunteerRoute route = volunteerRouteRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + routeId));

        if (!route.getVolunteer().getUser().getEmail().equals(email)) {
            throw new org.springframework.security.access.AccessDeniedException("Unauthorized to update route location");
        }

        route.setCurrentLatitude(latitude);
        route.setCurrentLongitude(longitude);
        route.setLastLocationUpdate(java.time.LocalDateTime.now());
        VolunteerRoute saved = volunteerRouteRepository.save(route);

        // Broadcast telemetry details via WS
        String telemetryData = String.format(
            "{\"routeId\":\"%s\",\"volunteerId\":\"%s\",\"latitude\":%f,\"longitude\":%f}",
            routeId, route.getVolunteer().getId(), latitude, longitude
        );
        webSocketHandler.broadcastUpdate("LOCATION_UPDATE", telemetryData);

        return saved;
    }

    @Transactional
    public void updateVolunteerLocation(Double latitude, Double longitude, String email) {
        Volunteer volunteer = getVolunteerByEmail(email);
        volunteer.setLatitude(latitude);
        volunteer.setLongitude(longitude);
        volunteerRepository.save(volunteer);

        // Update all ACTIVE routes for the volunteer
        List<VolunteerRoute> routes = volunteerRouteRepository.findByVolunteerId(volunteer.getId());
        for (VolunteerRoute route : routes) {
            if (route.getStatus() == null || "ACTIVE".equalsIgnoreCase(route.getStatus())) {
                route.setCurrentLatitude(latitude);
                route.setCurrentLongitude(longitude);
                route.setLastLocationUpdate(java.time.LocalDateTime.now());
                volunteerRouteRepository.save(route);
            }
        }

        // Broadcast telemetry details via WS
        String telemetryData = String.format(
            "{\"volunteerId\":\"%s\",\"latitude\":%f,\"longitude\":%f,\"timestamp\":\"%s\"}",
            volunteer.getId(), latitude, longitude, java.time.LocalDateTime.now().toString()
        );
        webSocketHandler.broadcastUpdate("VOLUNTEER_LOCATION_UPDATE", telemetryData);
    }

    public Volunteer getVolunteerByEmail(String email) {
        return volunteerRepository.findByUserEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Volunteer not found for email: " + email));
    }

    @Transactional
    public VolunteerRoute addRoute(VolunteerRoute route, String email) {
        Volunteer volunteer = getVolunteerByEmail(email);
        route.setVolunteer(volunteer);
        return volunteerRouteRepository.save(route);
    }

    public List<VolunteerRoute> getRoutes(String email) {
        return volunteerRouteRepository.findByVolunteerUserEmail(email);
    }

    @Transactional
    public void deleteRoute(UUID routeId, String email) {
        VolunteerRoute route = volunteerRouteRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + routeId));

        if (!route.getVolunteer().getUser().getEmail().equals(email)) {
            throw new org.springframework.security.access.AccessDeniedException("Unauthorized to delete route");
        }
        volunteerRouteRepository.delete(route);
    }

    public List<TaskMatchRecommendation> getMatchRecommendations(String email) {
        Volunteer volunteer = getVolunteerByEmail(email);
        List<VolunteerRoute> routes = volunteerRouteRepository.findByVolunteerId(volunteer.getId());
        List<FoodListing> availableListings = foodListingRepository.findByStatus("AVAILABLE");
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        List<FoodListing> validListings = new java.util.ArrayList<>();
        for (FoodListing food : availableListings) {
            if (food.getExpiryTime() != null && food.getExpiryTime().isBefore(now)) {
                food.setStatus("EXPIRED");
                foodListingRepository.save(food);
            } else {
                validListings.add(food);
            }
        }
        List<Zone> zones = zoneRepository.findAll();

        List<TaskMatchRecommendation> recommendations = new ArrayList<>();

        List<VolunteerRoute> activeRoutes = new java.util.ArrayList<>();
        for (VolunteerRoute r : routes) {
            if (r.getStatus() == null || "ACTIVE".equalsIgnoreCase(r.getStatus())) {
                activeRoutes.add(r);
            }
        }

        if (activeRoutes.isEmpty()) {
            // Fallback: If no ACTIVE routes are registered, recommend all available tasks by matching to food's destination zone
            for (FoodListing food : validListings) {
                Zone zone = food.getDestinationZone();
                if (zone == null && !zones.isEmpty()) {
                    zone = zones.get(0);
                }
                if (zone != null && "ACTIVE".equalsIgnoreCase(zone.getStatus())) {
                    double deviation = 1.2; // Static virtual deviation
                    // Simulate a virtual route directly from pickup to delivery
                    VolunteerRoute virtualRoute = new VolunteerRoute();
                    virtualRoute.setStartLatitude(food.getPickupLatitude());
                    virtualRoute.setStartLongitude(food.getPickupLongitude());
                    virtualRoute.setEndLatitude(zone.getLatitude());
                    virtualRoute.setEndLongitude(zone.getLongitude());
                    
                    double score = matchingService.calculateMatchingScore(volunteer, virtualRoute, food, zone);
                    recommendations.add(new TaskMatchRecommendation(food, zone, null, deviation, score));
                }
            }
        } else {
            for (VolunteerRoute route : activeRoutes) {
                for (FoodListing food : validListings) {
                    Zone zone = food.getDestinationZone();
                    if (zone == null && !zones.isEmpty()) {
                        zone = zones.get(0);
                    }
                    if (zone != null && "ACTIVE".equalsIgnoreCase(zone.getStatus())) {
                        double deviation = matchingService.calculateRouteDeviation(route, food, zone);
                        double maxDev = route.getMaxDeviation() != null ? route.getMaxDeviation() : 15.0;
                        
                        // Recommend tasks within a reasonable extra travel range
                        if (deviation <= maxDev) {
                            double score = matchingService.calculateMatchingScore(volunteer, route, food, zone);
                            recommendations.add(new TaskMatchRecommendation(food, zone, route.getId(), deviation, score));
                        }
                    }
                }
            }
        }

        // Sort by matching score in descending order
        recommendations.sort(Comparator.comparingDouble(TaskMatchRecommendation::getMatchingScore).reversed());

        // Cap at 10 recommendations to represent realistic dashboard options
        return recommendations.subList(0, Math.min(10, recommendations.size()));
    }
}
