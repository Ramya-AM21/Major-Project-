package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "verifications")
public class Verification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "task_id", nullable = false)
    private DeliveryTask task;

    private String pickupOtp;

    private String deliveryOtp;

    private LocalDateTime pickupTimestamp;

    private LocalDateTime deliveryTimestamp;

    private Double pickupLatitude;

    private Double pickupLongitude;

    private Double deliveryLatitude;

    private Double deliveryLongitude;

    private String proofImageUrl;

    private Boolean deliveryRadiusVerified = false;

    private Double verificationConfidence = 1.0; // Calculated based on GPS, photo checks, speed

    private LocalDateTime pickupOtpExpiry = LocalDateTime.now().plusHours(3);

    private LocalDateTime deliveryOtpExpiry = LocalDateTime.now().plusHours(3);

    private Integer pickupOtpAttempts = 0;

    private Integer deliveryOtpAttempts = 0;

    public Verification() {
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public DeliveryTask getTask() { return task; }
    public void setTask(DeliveryTask task) { this.task = task; }

    public String getPickupOtp() { return pickupOtp; }
    public void setPickupOtp(String pickupOtp) { this.pickupOtp = pickupOtp; }

    public String getDeliveryOtp() { return deliveryOtp; }
    public void setDeliveryOtp(String deliveryOtp) { this.deliveryOtp = deliveryOtp; }

    public LocalDateTime getPickupTimestamp() { return pickupTimestamp; }
    public void setPickupTimestamp(LocalDateTime pickupTimestamp) { this.pickupTimestamp = pickupTimestamp; }

    public LocalDateTime getDeliveryTimestamp() { return deliveryTimestamp; }
    public void setDeliveryTimestamp(LocalDateTime deliveryTimestamp) { this.deliveryTimestamp = deliveryTimestamp; }

    public Double getPickupLatitude() { return pickupLatitude; }
    public void setPickupLatitude(Double pickupLatitude) { this.pickupLatitude = pickupLatitude; }

    public Double getPickupLongitude() { return pickupLongitude; }
    public void setPickupLongitude(Double pickupLongitude) { this.pickupLongitude = pickupLongitude; }

    public Double getDeliveryLatitude() { return deliveryLatitude; }
    public void setDeliveryLatitude(Double deliveryLatitude) { this.deliveryLatitude = deliveryLatitude; }

    public Double getDeliveryLongitude() { return deliveryLongitude; }
    public void setDeliveryLongitude(Double deliveryLongitude) { this.deliveryLongitude = deliveryLongitude; }

    public String getProofImageUrl() { return proofImageUrl; }
    public void setProofImageUrl(String proofImageUrl) { this.proofImageUrl = proofImageUrl; }

    public Boolean getDeliveryRadiusVerified() { return deliveryRadiusVerified; }
    public void setDeliveryRadiusVerified(Boolean deliveryRadiusVerified) { this.deliveryRadiusVerified = deliveryRadiusVerified; }

    public Double getVerificationConfidence() { return verificationConfidence; }
    public void setVerificationConfidence(Double verificationConfidence) { this.verificationConfidence = verificationConfidence; }

    public LocalDateTime getPickupOtpExpiry() { return pickupOtpExpiry; }
    public void setPickupOtpExpiry(LocalDateTime pickupOtpExpiry) { this.pickupOtpExpiry = pickupOtpExpiry; }

    public LocalDateTime getDeliveryOtpExpiry() { return deliveryOtpExpiry; }
    public void setDeliveryOtpExpiry(LocalDateTime deliveryOtpExpiry) { this.deliveryOtpExpiry = deliveryOtpExpiry; }

    public Integer getPickupOtpAttempts() { return pickupOtpAttempts; }
    public void setPickupOtpAttempts(Integer pickupOtpAttempts) { this.pickupOtpAttempts = pickupOtpAttempts; }

    public Integer getDeliveryOtpAttempts() { return deliveryOtpAttempts; }
    public void setDeliveryOtpAttempts(Integer deliveryOtpAttempts) { this.deliveryOtpAttempts = deliveryOtpAttempts; }
}
