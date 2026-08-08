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

    public VolunteerService(VolunteerRepository volunteerRepository,
                            VolunteerRouteRepository volunteerRouteRepository,
                            FoodListingRepository foodListingRepository,
                            ZoneRepository zoneRepository,
                            MatchingService matchingService) {
        this.volunteerRepository = volunteerRepository;
        this.volunteerRouteRepository = volunteerRouteRepository;
        this.foodListingRepository = foodListingRepository;
        this.zoneRepository = zoneRepository;
        this.matchingService = matchingService;
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
        List<Zone> zones = zoneRepository.findAll();

        List<TaskMatchRecommendation> recommendations = new ArrayList<>();

        for (VolunteerRoute route : routes) {
            for (FoodListing food : availableListings) {
                // Find a zone with capacity or pick the nearest eligible zone
                for (Zone zone : zones) {
                    if ("ACTIVE".equalsIgnoreCase(zone.getStatus())) {
                        double deviation = matchingService.calculateRouteDeviation(route, food, zone);
                        
                        // We only recommend tasks if the extra travel is within reasonable bounds (e.g., 12.0 km)
                        if (deviation <= 12.0) {
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
