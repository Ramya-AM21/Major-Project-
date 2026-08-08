package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "food_providers")
public class FoodProvider {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String businessName;

    private String address;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    private String licenseNumber;

    @Column(nullable = false)
    private String verificationStatus = "VERIFIED"; // VERIFIED, PENDING, REJECTED

    public FoodProvider() {
    }

    public FoodProvider(User user, String businessName, String address, Double latitude, Double longitude, String licenseNumber) {
        this.user = user;
        this.businessName = businessName;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.licenseNumber = licenseNumber;
        this.verificationStatus = "VERIFIED";
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
}
