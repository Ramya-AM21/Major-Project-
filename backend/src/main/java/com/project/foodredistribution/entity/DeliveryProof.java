package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "delivery_proofs")
public class DeliveryProof {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID taskId;

    @Column(nullable = false)
    private UUID volunteerId;

    @Column(nullable = false)
    private String imageUrl;

    @Column(nullable = false)
    private String imageHash;

    private Double latitude;
    private Double longitude;

    private LocalDateTime capturedAt;
    private LocalDateTime uploadedAt = LocalDateTime.now();

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    private String mlStatus; // VALIDATING, SUCCESS, FAILED
    private Double mlConfidence;
    private String mlReason;

    public DeliveryProof() {
        this.uploadedAt = LocalDateTime.now();
    }

    public DeliveryProof(UUID taskId, UUID volunteerId, String imageUrl, String imageHash, Double latitude, Double longitude, LocalDateTime capturedAt) {
        this.taskId = taskId;
        this.volunteerId = volunteerId;
        this.imageUrl = imageUrl;
        this.imageHash = imageHash;
        this.latitude = latitude;
        this.longitude = longitude;
        this.capturedAt = capturedAt;
        this.uploadedAt = LocalDateTime.now();
        this.status = "PENDING";
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTaskId() { return taskId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }

    public UUID getVolunteerId() { return volunteerId; }
    public void setVolunteerId(UUID volunteerId) { this.volunteerId = volunteerId; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getImageHash() { return imageHash; }
    public void setImageHash(String imageHash) { this.imageHash = imageHash; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public LocalDateTime getCapturedAt() { return capturedAt; }
    public void setCapturedAt(LocalDateTime capturedAt) { this.capturedAt = capturedAt; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMlStatus() { return mlStatus; }
    public void setMlStatus(String mlStatus) { this.mlStatus = mlStatus; }

    public Double getMlConfidence() { return mlConfidence; }
    public void setMlConfidence(Double mlConfidence) { this.mlConfidence = mlConfidence; }

    public String getMlReason() { return mlReason; }
    public void setMlReason(String mlReason) { this.mlReason = mlReason; }
}
