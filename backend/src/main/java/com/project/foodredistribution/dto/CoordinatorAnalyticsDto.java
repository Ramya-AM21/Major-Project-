package com.project.foodredistribution.dto;

public class CoordinatorAnalyticsDto {
    private long expectedToday;
    private long receivedToday;
    private int availableCapacity;
    private long pendingConfirmations;

    public CoordinatorAnalyticsDto() {
    }

    // Getters and Setters
    public long getExpectedToday() { return expectedToday; }
    public void setExpectedToday(long expectedToday) { this.expectedToday = expectedToday; }

    public long getReceivedToday() { return receivedToday; }
    public void setReceivedToday(long receivedToday) { this.receivedToday = receivedToday; }

    public int getAvailableCapacity() { return availableCapacity; }
    public void setAvailableCapacity(int availableCapacity) { this.availableCapacity = availableCapacity; }

    public long getPendingConfirmations() { return pendingConfirmations; }
    public void setPendingConfirmations(long pendingConfirmations) { this.pendingConfirmations = pendingConfirmations; }
}
