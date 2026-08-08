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

    public TaskMatchRecommendation() {
    }

    public TaskMatchRecommendation(FoodListing foodListing, Zone zone, UUID routeId, Double deviation, Double matchingScore) {
        this.foodListing = foodListing;
        this.zone = zone;
        this.routeId = routeId;
        this.deviation = deviation;
        this.matchingScore = matchingScore;
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
}
