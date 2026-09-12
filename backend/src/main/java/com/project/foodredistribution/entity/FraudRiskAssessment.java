package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "fraud_risk_assessments")
public class FraudRiskAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "task_id", nullable = false)
    private UUID taskId;

    @Column(name = "volunteer_id", nullable = false)
    private UUID volunteerId;

    @Column(name = "risk_score", nullable = false)
    private double riskScore; // 0.0 to 100.0

    @Column(name = "risk_level", nullable = false, length = 20)
    private String riskLevel; // LOW, MEDIUM, HIGH

    @Column(name = "anomaly_score")
    private double anomalyScore;

    @Column(name = "gps_risk")
    private double gpsRisk;

    @Column(name = "route_risk")
    private double routeRisk;

    @Column(name = "behaviour_risk")
    private double behaviourRisk;

    @Column(name = "proof_risk")
    private double proofRisk;

    @Column(name = "time_risk")
    private double timeRisk;

    @Column(name = "ocr_risk")
    private double ocrRisk;

    @Column(name = "perceptual_hash", length = 128)
    private String perceptualHash;

    @Column(name = "reasons", columnDefinition = "TEXT")
    private String reasons; // JSON string or comma-separated reasons

    @Column(name = "model_name", length = 50)
    private String modelName;

    @Column(name = "model_version", length = 20)
    private String modelVersion;

    @Column(name = "review_status", length = 30)
    private String reviewStatus; // PENDING, APPROVED, REJECTED, DISMISSED

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public FraudRiskAssessment() {
        this.createdAt = LocalDateTime.now();
        this.reviewStatus = "PENDING";
    }

    public FraudRiskAssessment(UUID taskId, UUID volunteerId, double riskScore, String riskLevel) {
        this();
        this.taskId = taskId;
        this.volunteerId = volunteerId;
        this.riskScore = riskScore;
        this.riskLevel = riskLevel;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTaskId() { return taskId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }

    public UUID getVolunteerId() { return volunteerId; }
    public void setVolunteerId(UUID volunteerId) { this.volunteerId = volunteerId; }

    public double getRiskScore() { return riskScore; }
    public void setRiskScore(double riskScore) { this.riskScore = riskScore; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public double getAnomalyScore() { return anomalyScore; }
    public void setAnomalyScore(double anomalyScore) { this.anomalyScore = anomalyScore; }

    public double getGpsRisk() { return gpsRisk; }
    public void setGpsRisk(double gpsRisk) { this.gpsRisk = gpsRisk; }

    public double getRouteRisk() { return routeRisk; }
    public void setRouteRisk(double routeRisk) { this.routeRisk = routeRisk; }

    public double getBehaviourRisk() { return behaviourRisk; }
    public void setBehaviourRisk(double behaviourRisk) { this.behaviourRisk = behaviourRisk; }

    public double getProofRisk() { return proofRisk; }
    public void setProofRisk(double proofRisk) { this.proofRisk = proofRisk; }

    public double getTimeRisk() { return timeRisk; }
    public void setTimeRisk(double timeRisk) { this.timeRisk = timeRisk; }

    public double getOcrRisk() { return ocrRisk; }
    public void setOcrRisk(double ocrRisk) { this.ocrRisk = ocrRisk; }

    public String getPerceptualHash() { return perceptualHash; }
    public void setPerceptualHash(String perceptualHash) { this.perceptualHash = perceptualHash; }

    public String getReasons() { return reasons; }
    public void setReasons(String reasons) { this.reasons = reasons; }

    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public String getReviewStatus() { return reviewStatus; }
    public void setReviewStatus(String reviewStatus) { this.reviewStatus = reviewStatus; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
