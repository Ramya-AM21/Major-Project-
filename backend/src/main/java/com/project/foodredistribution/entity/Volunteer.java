package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "volunteers")
public class Volunteer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;

    private String verificationStatus = "VERIFIED";

    private Double rating = 5.0;

    private Integer totalDeliveries = 0;

    private Integer successfulDeliveries = 0;

    private Double reliabilityScore = 1.0; // 0.0 to 1.0

    private Integer balanceTokens = 0;

    private Double latitude;

    private Double longitude;

    public Volunteer() {
        this.balanceTokens = 0;
    }

    public Volunteer(User user) {
        this.user = user;
        this.verificationStatus = "VERIFIED";
        this.rating = 5.0;
        this.totalDeliveries = 0;
        this.successfulDeliveries = 0;
        this.reliabilityScore = 1.0;
        this.balanceTokens = 0;
    }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getTotalDeliveries() { return totalDeliveries; }
    public void setTotalDeliveries(Integer totalDeliveries) { this.totalDeliveries = totalDeliveries; }

    public Integer getSuccessfulDeliveries() { return successfulDeliveries; }
    public void setSuccessfulDeliveries(Integer successfulDeliveries) { this.successfulDeliveries = successfulDeliveries; }

    public Double getReliabilityScore() { return reliabilityScore; }
    public void setReliabilityScore(Double reliabilityScore) { this.reliabilityScore = reliabilityScore; }

    public Integer getBalanceTokens() { return balanceTokens; }
    public void setBalanceTokens(Integer balanceTokens) { this.balanceTokens = balanceTokens; }
}
