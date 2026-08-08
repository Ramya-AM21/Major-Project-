package com.project.foodredistribution.dto;

import java.util.UUID;

public class CreateTaskRequest {
    private UUID foodListingId;
    private UUID zoneId;
    private UUID routeId;
    private Double deviation;
    private Double matchingScore;

    public CreateTaskRequest() {
    }

    // Getters and Setters
    public UUID getFoodListingId() { return foodListingId; }
    public void setFoodListingId(UUID foodListingId) { this.foodListingId = foodListingId; }

    public UUID getZoneId() { return zoneId; }
    public void setZoneId(UUID zoneId) { this.zoneId = zoneId; }

    public UUID getRouteId() { return routeId; }
    public void setRouteId(UUID routeId) { this.routeId = routeId; }

    public Double getDeviation() { return deviation; }
    public void setDeviation(Double deviation) { this.deviation = deviation; }

    public Double getMatchingScore() { return matchingScore; }
    public void setMatchingScore(Double matchingScore) { this.matchingScore = matchingScore; }
}
