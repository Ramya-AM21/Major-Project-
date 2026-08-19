package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "food_requirements", indexes = {
    @Index(name = "idx_requirement_status", columnList = "status"),
    @Index(name = "idx_requirement_date", columnList = "requiredDate"),
    @Index(name = "idx_requirement_coordinator_id", columnList = "coordinator_id")
})
public class FoodRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shelter_id", nullable = false)
    private Shelter shelter;

    @Column(nullable = false)
    private String foodType;

    @Column(nullable = false)
    private Double quantityRequired;

    @Column(nullable = false)
    private String unit = "MEALS"; // MEALS, KG

    @Column(nullable = false)
    private Integer peopleToServe;

    private String additionalRequirements;

    private String dietaryNotes;

    @Column(nullable = false)
    private LocalDateTime requiredDate;

    @Column(nullable = false)
    private String deliveryStartTime; // e.g. "12:00"

    @Column(nullable = false)
    private String deliveryEndTime; // e.g. "14:00"

    @Column(nullable = false)
    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, URGENT

    private String instructions;

    private String accessibilityInfo;

    private String emergencyNotes;

    @Column(nullable = false)
    private String status = "PENDING_VERIFICATION"; // PENDING_VERIFICATION, VERIFIED, REJECTED, EXPIRED, FULFILLED

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "coordinator_id", nullable = false)
    private User coordinator;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();

    public FoodRequirement() {
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Shelter getShelter() { return shelter; }
    public void setShelter(Shelter shelter) { this.shelter = shelter; }

    public String getFoodType() { return foodType; }
    public void setFoodType(String foodType) { this.foodType = foodType; }

    public Double getQuantityRequired() { return quantityRequired; }
    public void setQuantityRequired(Double quantityRequired) { this.quantityRequired = quantityRequired; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Integer getPeopleToServe() { return peopleToServe; }
    public void setPeopleToServe(Integer peopleToServe) { this.peopleToServe = peopleToServe; }

    public String getAdditionalRequirements() { return additionalRequirements; }
    public void setAdditionalRequirements(String additionalRequirements) { this.additionalRequirements = additionalRequirements; }

    public String getDietaryNotes() { return dietaryNotes; }
    public void setDietaryNotes(String dietaryNotes) { this.dietaryNotes = dietaryNotes; }

    public LocalDateTime getRequiredDate() { return requiredDate; }
    public void setRequiredDate(LocalDateTime requiredDate) { this.requiredDate = requiredDate; }

    public String getDeliveryStartTime() { return deliveryStartTime; }
    public void setDeliveryStartTime(String deliveryStartTime) { this.deliveryStartTime = deliveryStartTime; }

    public String getDeliveryEndTime() { return deliveryEndTime; }
    public void setDeliveryEndTime(String deliveryEndTime) { this.deliveryEndTime = deliveryEndTime; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public String getAccessibilityInfo() { return accessibilityInfo; }
    public void setAccessibilityInfo(String accessibilityInfo) { this.accessibilityInfo = accessibilityInfo; }

    public String getEmergencyNotes() { return emergencyNotes; }
    public void setEmergencyNotes(String emergencyNotes) { this.emergencyNotes = emergencyNotes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public User getCoordinator() { return coordinator; }
    public void setCoordinator(User coordinator) { this.coordinator = coordinator; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
