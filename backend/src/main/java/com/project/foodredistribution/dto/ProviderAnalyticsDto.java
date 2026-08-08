package com.project.foodredistribution.dto;

import java.util.List;

public class ProviderAnalyticsDto {
    private long activeListingsCount;
    private long awaitingPickupCount;
    private long inTransitCount;
    private long completedCount;
    
    private double mealsRedirected;
    private double kgFoodSaved;
    private double disposalAvoidedCost; // estimated financial savings

    public ProviderAnalyticsDto() {
    }

    // Getters and Setters
    public long getActiveListingsCount() { return activeListingsCount; }
    public void setActiveListingsCount(long activeListingsCount) { this.activeListingsCount = activeListingsCount; }

    public long getAwaitingPickupCount() { return awaitingPickupCount; }
    public void setAwaitingPickupCount(long awaitingPickupCount) { this.awaitingPickupCount = awaitingPickupCount; }

    public long getInTransitCount() { return inTransitCount; }
    public void setInTransitCount(long inTransitCount) { this.inTransitCount = inTransitCount; }

    public long getCompletedCount() { return completedCount; }
    public void setCompletedCount(long completedCount) { this.completedCount = completedCount; }

    public double getMealsRedirected() { return mealsRedirected; }
    public void setMealsRedirected(double mealsRedirected) { this.mealsRedirected = mealsRedirected; }

    public double getKgFoodSaved() { return kgFoodSaved; }
    public void setKgFoodSaved(double kgFoodSaved) { this.kgFoodSaved = kgFoodSaved; }

    public double getDisposalAvoidedCost() { return disposalAvoidedCost; }
    public void setDisposalAvoidedCost(double disposalAvoidedCost) { this.disposalAvoidedCost = disposalAvoidedCost; }
}
