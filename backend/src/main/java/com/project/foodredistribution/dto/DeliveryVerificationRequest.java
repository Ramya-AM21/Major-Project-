package com.project.foodredistribution.dto;

import java.util.UUID;

public class DeliveryVerificationRequest {
    private UUID taskId;
    private String otp;
    private Double latitude;
    private Double longitude;
    private String proofImageUrl;

    public DeliveryVerificationRequest() {
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

    public String getProofImageUrl() { return proofImageUrl; }
    public void setProofImageUrl(String proofImageUrl) { this.proofImageUrl = proofImageUrl; }
}
