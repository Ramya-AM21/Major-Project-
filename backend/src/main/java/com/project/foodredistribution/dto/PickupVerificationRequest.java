package com.project.foodredistribution.dto;

import java.util.UUID;

public class PickupVerificationRequest {
    private UUID taskId;
    private String otp;
    private Double latitude;
    private Double longitude;
    private Double accuracy;
    private String timestamp;

    public PickupVerificationRequest() {
    }

    // Getters and Setters
    public UUID getTaskId() { return taskId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getAccuracy() { return accuracy; }
    public void setAccuracy(Double accuracy) { this.accuracy = accuracy; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
