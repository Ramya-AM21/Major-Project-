package com.project.foodredistribution.dto;

public class VolunteerAnalyticsDto {
    private double rating;
    private int completedDeliveries;
    private int successfulDeliveries;
    private double reliabilityScore;
    private double mealsDelivered;
    private int tokens;

    public VolunteerAnalyticsDto() {
    }

    // Getters and Setters
    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }

    public int getCompletedDeliveries() { return completedDeliveries; }
    public void setCompletedDeliveries(int completedDeliveries) { this.completedDeliveries = completedDeliveries; }

    public int getSuccessfulDeliveries() { return successfulDeliveries; }
    public void setSuccessfulDeliveries(int successfulDeliveries) { this.successfulDeliveries = successfulDeliveries; }

    public double getReliabilityScore() { return reliabilityScore; }
    public void setReliabilityScore(double reliabilityScore) { this.reliabilityScore = reliabilityScore; }

    public double getMealsDelivered() { return mealsDelivered; }
    public void setMealsDelivered(double mealsDelivered) { this.mealsDelivered = mealsDelivered; }

    public int getTokens() { return tokens; }
    public void setTokens(int tokens) { this.tokens = tokens; }
}
