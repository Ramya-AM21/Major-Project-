package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "zones")
public class Zone {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    private String address;

    private Integer capacity = 200; // Expected meal capacity

    private String operatingHours = "08:00 AM - 10:00 PM";

    private Double priorityScore = 1.0; // Dynamic priority assigned by demand analyzer

    private String status = "ACTIVE"; // ACTIVE, OVERFLOWING, INACTIVE

    // --- Extended Fields for City Coverage & Community Need Discovery ---
    private String city = "Bengaluru";
    private String state = "Karnataka";
    private String country = "India";

    private String type = "VERIFIED_SHELTER"; // VERIFIED_SHELTER, GOVERNMENT_SHELTER, NGO, COMMUNITY_KITCHEN, FOOD_DISTRIBUTION_CENTER, COMMUNITY_NEED_POINT
    private String source = "OFFICIAL_DATABASE"; // GOVERNMENT, OFFICIAL_DATABASE, VERIFIED_NGO, COMMUNITY_REPORTED
    private String verificationStatus = "VERIFIED"; // PENDING, UNDER_REVIEW, VERIFIED, REJECTED, EXPIRED, REQUIRES_REVIEW

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reported_by_id")
    private User reportedBy;

    private Integer reportCount = 0;
    private Integer estimatedPeople = 0;
    private String needCategory; // e.g. FOOD, SHELTER, WATER, OTHER
    
    @Column(length = 1000)
    private String description;
    
    @Column(length = 1000)
    private String evidenceUrl;

    private LocalDateTime validFrom;
    private LocalDateTime validUntil;
    private LocalDateTime lastVerifiedAt;
    
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Zone() {
    }

    public Zone(String name, Double latitude, Double longitude, String address, Integer capacity, String operatingHours) {
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.address = address;
        this.capacity = capacity;
        this.operatingHours = operatingHours;
        this.priorityScore = 1.0;
        this.status = "ACTIVE";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public String getOperatingHours() { return operatingHours; }
    public void setOperatingHours(String operatingHours) { this.operatingHours = operatingHours; }

    public Double getPriorityScore() { return priorityScore; }
    public void setPriorityScore(Double priorityScore) { this.priorityScore = priorityScore; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public User getReportedBy() { return reportedBy; }
    public void setReportedBy(User reportedBy) { this.reportedBy = reportedBy; }

    public Integer getReportCount() { return reportCount; }
    public void setReportCount(Integer reportCount) { this.reportCount = reportCount; }

    public Integer getEstimatedPeople() { return estimatedPeople; }
    public void setEstimatedPeople(Integer estimatedPeople) { this.estimatedPeople = estimatedPeople; }

    public String getNeedCategory() { return needCategory; }
    public void setNeedCategory(String needCategory) { this.needCategory = needCategory; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getEvidenceUrl() { return evidenceUrl; }
    public void setEvidenceUrl(String evidenceUrl) { this.evidenceUrl = evidenceUrl; }

    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime validFrom) { this.validFrom = validFrom; }

    public LocalDateTime getValidUntil() { return validUntil; }
    public void setValidUntil(LocalDateTime validUntil) { this.validUntil = validUntil; }

    public LocalDateTime getLastVerifiedAt() { return lastVerifiedAt; }
    public void setLastVerifiedAt(LocalDateTime lastVerifiedAt) { this.lastVerifiedAt = lastVerifiedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
