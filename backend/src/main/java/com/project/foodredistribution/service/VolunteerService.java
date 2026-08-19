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
import com.project.foodredistribution.repository.TokenTransactionRepository;
import com.project.foodredistribution.entity.TokenTransaction;
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
    private final TokenTransactionRepository tokenTransactionRepository;
    private final com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler;

    public VolunteerService(VolunteerRepository volunteerRepository,
                            VolunteerRouteRepository volunteerRouteRepository,
                            FoodListingRepository foodListingRepository,
                            ZoneRepository zoneRepository,
                            MatchingService matchingService,
                            TokenTransactionRepository tokenTransactionRepository,
                            com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler) {
        this.volunteerRepository = volunteerRepository;
        this.volunteerRouteRepository = volunteerRouteRepository;
        this.foodListingRepository = foodListingRepository;
        this.zoneRepository = zoneRepository;
        this.matchingService = matchingService;
        this.tokenTransactionRepository = tokenTransactionRepository;
        this.webSocketHandler = webSocketHandler;
    }

    @Transactional
    public VolunteerRoute updateRouteLocation(UUID routeId, Double latitude, Double longitude, String email) {
        return updateRouteLocation(routeId, latitude, longitude, null, null, email);
    }

    @Transactional
    public VolunteerRoute updateRouteLocation(UUID routeId, Double latitude, Double longitude, Double accuracy, String timestamp, String email) {
        VolunteerRoute route = volunteerRouteRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + routeId));

        if (!route.getVolunteer().getUser().getEmail().equals(email)) {
            throw new org.springframework.security.access.AccessDeniedException("Unauthorized to update route location");
        }

        if (accuracy != null && accuracy > matchingService.getGpsAccuracyThresholdMeters()) {
            org.slf4j.LoggerFactory.getLogger(VolunteerService.class).warn("Ignoring route location update due to low accuracy: {} meters", accuracy);
            return route;
        }

        route.setCurrentLatitude(latitude);
        route.setCurrentLongitude(longitude);
        java.time.LocalDateTime updateTime = java.time.LocalDateTime.now();
        if (timestamp != null && !timestamp.trim().isEmpty()) {
            try {
                updateTime = java.time.LocalDateTime.parse(timestamp.replace("Z", ""));
            } catch (Exception e) {
                // Ignore parse error
            }
        }
        route.setLastLocationUpdate(updateTime);
        VolunteerRoute saved = volunteerRouteRepository.save(route);

        // Broadcast telemetry details via WS
        String telemetryData = String.format(
            "{\"routeId\":\"%s\",\"volunteerId\":\"%s\",\"latitude\":%f,\"longitude\":%f,\"accuracy\":%f,\"timestamp\":\"%s\"}",
            routeId, route.getVolunteer().getId(), latitude, longitude, (accuracy != null ? accuracy : 0.0), updateTime.toString()
        );
        webSocketHandler.broadcastUpdate("LOCATION_UPDATE", telemetryData);

        return saved;
    }

    @Transactional
    public void updateVolunteerLocation(Double latitude, Double longitude, String email) {
        updateVolunteerLocation(latitude, longitude, null, null, email);
    }

    @Transactional
    public void updateVolunteerLocation(Double latitude, Double longitude, Double accuracy, String timestamp, String email) {
        Volunteer volunteer = getVolunteerByEmail(email);

        if (accuracy != null && accuracy > matchingService.getGpsAccuracyThresholdMeters()) {
            org.slf4j.LoggerFactory.getLogger(VolunteerService.class).warn("Ignoring volunteer location update due to low accuracy: {} meters", accuracy);
            return;
        }

        volunteer.setLatitude(latitude);
        volunteer.setLongitude(longitude);
        volunteerRepository.save(volunteer);

        java.time.LocalDateTime updateTime = java.time.LocalDateTime.now();
        if (timestamp != null && !timestamp.trim().isEmpty()) {
            try {
                updateTime = java.time.LocalDateTime.parse(timestamp.replace("Z", ""));
            } catch (Exception e) {
                // Ignore parse error
            }
        }

        // Update all ACTIVE routes for the volunteer
        List<VolunteerRoute> routes = volunteerRouteRepository.findByVolunteerId(volunteer.getId());
        for (VolunteerRoute route : routes) {
            if (route.getStatus() == null || "ACTIVE".equalsIgnoreCase(route.getStatus())) {
                route.setCurrentLatitude(latitude);
                route.setCurrentLongitude(longitude);
                route.setLastLocationUpdate(updateTime);
                volunteerRouteRepository.save(route);
            }
        }

        // Broadcast telemetry details via WS
        String telemetryData = String.format(
            "{\"volunteerId\":\"%s\",\"latitude\":%f,\"longitude\":%f,\"accuracy\":%f,\"timestamp\":\"%s\"}",
            volunteer.getId(), latitude, longitude, (accuracy != null ? accuracy : 0.0), updateTime.toString()
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
        java.time.Instant nowInstant = java.time.Instant.now();
        List<FoodListing> validListings = new java.util.ArrayList<>();
        for (FoodListing food : availableListings) {
            if (food.getEffectiveAvailableUntil() != null && food.getEffectiveAvailableUntil().isBefore(nowInstant)) {
                food.setStatus("EXPIRED");
                foodListingRepository.save(food);
            } else {
                validListings.add(food);
            }
        }
        List<Zone> allZones = zoneRepository.findAll();
        List<Zone> zones = new java.util.ArrayList<>();
        for (Zone z : allZones) {
            if ("VERIFIED".equalsIgnoreCase(z.getVerificationStatus())) {
                // Check expiry
                if (z.getValidUntil() != null && z.getValidUntil().isBefore(now)) {
                    z.setVerificationStatus("EXPIRED");
                    z.setStatus("INACTIVE");
                    zoneRepository.save(z);
                    continue;
                }
                // Check stale (30 days re-verification window)
                if ("COMMUNITY_NEED_POINT".equalsIgnoreCase(z.getType())) {
                    java.time.LocalDateTime lastVer = z.getLastVerifiedAt();
                    if (lastVer == null) {
                        lastVer = z.getCreatedAt();
                    }
                    if (lastVer != null && lastVer.isBefore(now.minusDays(30))) {
                        z.setVerificationStatus("REQUIRES_REVIEW");
                        z.setStatus("INACTIVE");
                        zoneRepository.save(z);
                        continue;
                    }
                }
                zones.add(z);
            }
        }

        List<TaskMatchRecommendation> recommendations = new ArrayList<>();

        List<VolunteerRoute> activeRoutes = new java.util.ArrayList<>();
        for (VolunteerRoute r : routes) {
            if (r.getStatus() == null || "ACTIVE".equalsIgnoreCase(r.getStatus())) {
                activeRoutes.add(r);
            }
        }

        double maxDevLimit = matchingService.getMaxRouteDeviationKm();
        double maxVolToShelterLimit = matchingService.getMaxVolunteerToShelterDistanceKm();

        if (activeRoutes.isEmpty()) {
            // Fallback: If no ACTIVE routes are registered, recommend tasks close to volunteer's current real-time GPS location (within 5km)
            if (volunteer.getLatitude() != null && volunteer.getLongitude() != null) {
                List<TaskMatchRecommendation> candidates = new ArrayList<>();
                for (FoodListing food : validListings) {
                    Zone zone = food.getDestinationZone();
                    if (zone == null && !zones.isEmpty()) {
                        zone = zones.get(0);
                    }
                    if (zone != null && "ACTIVE".equalsIgnoreCase(zone.getStatus())) {
                        double distanceToPickup = matchingService.calculateDistance(volunteer.getLatitude(), volunteer.getLongitude(), food.getPickupLatitude(), food.getPickupLongitude());
                        if (distanceToPickup <= maxVolToShelterLimit) {
                            VolunteerRoute virtualRoute = new VolunteerRoute();
                            virtualRoute.setStartLatitude(volunteer.getLatitude());
                            virtualRoute.setStartLongitude(volunteer.getLongitude());
                            virtualRoute.setEndLatitude(zone.getLatitude());
                            virtualRoute.setEndLongitude(zone.getLongitude());
                            
                            TaskMatchRecommendation rec = matchingService.getRealTimeMatchDetail(volunteer, virtualRoute, food, zone, false);
                            candidates.add(rec);
                        }
                    }
                }
                candidates.sort(Comparator.comparingDouble(TaskMatchRecommendation::getMatchingScore).reversed());
                
                List<TaskMatchRecommendation> shortlist = candidates.subList(0, Math.min(5, candidates.size()));
                for (TaskMatchRecommendation rec : shortlist) {
                    VolunteerRoute virtualRoute = new VolunteerRoute();
                    virtualRoute.setStartLatitude(volunteer.getLatitude());
                    virtualRoute.setStartLongitude(volunteer.getLongitude());
                    virtualRoute.setEndLatitude(rec.getZone().getLatitude());
                    virtualRoute.setEndLongitude(rec.getZone().getLongitude());
                    
                    TaskMatchRecommendation roadRec = matchingService.getRealTimeMatchDetail(volunteer, virtualRoute, rec.getFoodListing(), rec.getZone(), true);
                    recommendations.add(roadRec);
                }
            }
        } else {
            List<TaskMatchRecommendation> candidates = new ArrayList<>();
            for (VolunteerRoute route : activeRoutes) {
                for (FoodListing food : validListings) {
                    Zone zone = food.getDestinationZone();
                    if (zone == null && !zones.isEmpty()) {
                        zone = zones.get(0);
                    }
                    if (zone != null && "ACTIVE".equalsIgnoreCase(zone.getStatus())) {
                        double distanceToPickup = matchingService.calculateDistance(
                            (route.getCurrentLatitude() != null ? route.getCurrentLatitude() : route.getStartLatitude()),
                            (route.getCurrentLongitude() != null ? route.getCurrentLongitude() : route.getStartLongitude()),
                            food.getPickupLatitude(), food.getPickupLongitude()
                        );
                        
                        if (distanceToPickup <= maxVolToShelterLimit) {
                            double deviation = matchingService.calculateRouteDeviation(route, food, zone);
                            double maxDev = route.getMaxDeviation() != null ? route.getMaxDeviation() : maxDevLimit;
                            
                            if (deviation <= maxDev) {
                                TaskMatchRecommendation rec = matchingService.getRealTimeMatchDetail(volunteer, route, food, zone, false);
                                if (rec.getDistanceToRoute() <= maxDev) {
                                    if (rec.getIsAhead() || rec.getDistanceToVolunteer() <= 1.0) {
                                        candidates.add(rec);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            candidates.sort(Comparator.comparingDouble(TaskMatchRecommendation::getMatchingScore).reversed());

            List<TaskMatchRecommendation> shortlist = candidates.subList(0, Math.min(5, candidates.size()));
            for (TaskMatchRecommendation rec : shortlist) {
                VolunteerRoute route = null;
                for (VolunteerRoute r : activeRoutes) {
                    if (r.getId().equals(rec.getRouteId())) {
                        route = r;
                        break;
                    }
                }
                if (route != null) {
                    TaskMatchRecommendation roadRec = matchingService.getRealTimeMatchDetail(volunteer, route, rec.getFoodListing(), rec.getZone(), true);
                    recommendations.add(roadRec);
                } else {
                    recommendations.add(rec);
                }
            }
        }

        recommendations.sort(Comparator.comparingDouble(TaskMatchRecommendation::getMatchingScore).reversed());

        return recommendations.subList(0, Math.min(10, recommendations.size()));
    }

    public List<TokenTransaction> getWalletTransactions(String email) {
        Volunteer volunteer = getVolunteerByEmail(email);
        return tokenTransactionRepository.findByVolunteerId(volunteer.getId());
    }
}
