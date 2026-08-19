package com.project.foodredistribution.dto;

import com.project.foodredistribution.entity.FoodListing;
import com.project.foodredistribution.entity.Zone;

import java.util.UUID;

public class TaskMatchRecommendation {
    private FoodListing foodListing;
    private Zone zone;
    private UUID routeId;
    private Double deviation;
    private Double matchingScore;
    
    // Real-time telemetry matching fields
    private Double distanceToVolunteer;
    private Double distanceToDestination;
    private Double shelterToDestinationDistance;
    private Double distanceToRoute;
    private Boolean isAhead;
    private String positionStatus; // "Ahead on your route", "Behind you", "Pickup nearby", etc.
    private Double volunteerRouteProgress;
    private Double shelterRouteProgress;

    public TaskMatchRecommendation() {
    }

    public TaskMatchRecommendation(FoodListing foodListing, Zone zone, UUID routeId, Double deviation, Double matchingScore) {
        this.foodListing = foodListing;
        this.zone = zone;
        this.routeId = routeId;
        this.deviation = deviation;
        this.matchingScore = matchingScore;
    }

    public TaskMatchRecommendation(FoodListing foodListing, Zone zone, UUID routeId, Double deviation, Double matchingScore,
                                   Double distanceToVolunteer, Double distanceToDestination, Double shelterToDestinationDistance,
                                   Double distanceToRoute, Boolean isAhead, String positionStatus,
                                   Double volunteerRouteProgress, Double shelterRouteProgress) {
        this.foodListing = foodListing;
        this.zone = zone;
        this.routeId = routeId;
        this.deviation = deviation;
        this.matchingScore = matchingScore;
        this.distanceToVolunteer = distanceToVolunteer;
        this.distanceToDestination = distanceToDestination;
        this.shelterToDestinationDistance = shelterToDestinationDistance;
        this.distanceToRoute = distanceToRoute;
        this.isAhead = isAhead;
        this.positionStatus = positionStatus;
        this.volunteerRouteProgress = volunteerRouteProgress;
        this.shelterRouteProgress = shelterRouteProgress;
    }

    // Getters and Setters
    public FoodListing getFoodListing() { return foodListing; }
    public void setFoodListing(FoodListing foodListing) { this.foodListing = foodListing; }

    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }

    public UUID getRouteId() { return routeId; }
    public void setRouteId(UUID routeId) { this.routeId = routeId; }

    public Double getDeviation() { return deviation; }
    public void setDeviation(Double deviation) { this.deviation = deviation; }

    public Double getMatchingScore() { return matchingScore; }
    public void setMatchingScore(Double matchingScore) { this.matchingScore = matchingScore; }

    public Double getDistanceToVolunteer() { return distanceToVolunteer; }
    public void setDistanceToVolunteer(Double distanceToVolunteer) { this.distanceToVolunteer = distanceToVolunteer; }

    public Double getDistanceToDestination() { return distanceToDestination; }
    public void setDistanceToDestination(Double distanceToDestination) { this.distanceToDestination = distanceToDestination; }

    public Double getShelterToDestinationDistance() { return shelterToDestinationDistance; }
    public void setShelterToDestinationDistance(Double shelterToDestinationDistance) { this.shelterToDestinationDistance = shelterToDestinationDistance; }

    public Double getDistanceToRoute() { return distanceToRoute; }
    public void setDistanceToRoute(Double distanceToRoute) { this.distanceToRoute = distanceToRoute; }

    public Boolean getIsAhead() { return isAhead; }
    public void setIsAhead(Boolean isAhead) { this.isAhead = isAhead; }

    public String getPositionStatus() { return positionStatus; }
    public void setPositionStatus(String positionStatus) { this.positionStatus = positionStatus; }

    public Double getVolunteerRouteProgress() { return volunteerRouteProgress; }
    public void setVolunteerRouteProgress(Double volunteerRouteProgress) { this.volunteerRouteProgress = volunteerRouteProgress; }

    public Double getShelterRouteProgress() { return shelterRouteProgress; }
    public void setShelterRouteProgress(Double shelterRouteProgress) { this.shelterRouteProgress = shelterRouteProgress; }
}
