package com.project.foodredistribution.dto;

public class AdminAnalyticsDto {
    private long activeDonations;
    private long activeDeliveries;
    private long volunteersOnline;
    private long highPriorityZones;
    private long completedToday;
    private long suspiciousEvents;
    
    private double totalKgSaved;
    private double totalMealsDelivered;

    public AdminAnalyticsDto() {
    }

    // Getters and Setters
    public long getActiveDonations() { return activeDonations; }
    public void setActiveDonations(long activeDonations) { this.activeDonations = activeDonations; }

    public long getActiveDeliveries() { return activeDeliveries; }
    public void setActiveDeliveries(long activeDeliveries) { this.activeDeliveries = activeDeliveries; }

    public long getVolunteersOnline() { return volunteersOnline; }
    public void setVolunteersOnline(long volunteersOnline) { this.volunteersOnline = volunteersOnline; }

    public long getHighPriorityZones() { return highPriorityZones; }
    public void setHighPriorityZones(long highPriorityZones) { this.highPriorityZones = highPriorityZones; }

    public long getCompletedToday() { return completedToday; }
    public void setCompletedToday(long completedToday) { this.completedToday = completedToday; }

    public long getSuspiciousEvents() { return suspiciousEvents; }
    public void setSuspiciousEvents(long suspiciousEvents) { this.suspiciousEvents = suspiciousEvents; }

    public double getTotalKgSaved() { return totalKgSaved; }
    public void setTotalKgSaved(double totalKgSaved) { this.totalKgSaved = totalKgSaved; }

    public double getTotalMealsDelivered() { return totalMealsDelivered; }
    public void setTotalMealsDelivered(double totalMealsDelivered) { this.totalMealsDelivered = totalMealsDelivered; }
}
