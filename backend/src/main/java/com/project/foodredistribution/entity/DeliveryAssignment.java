package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "delivery_assignments", indexes = {
    @Index(name = "idx_assignment_status", columnList = "status"),
    @Index(name = "idx_assignment_volunteer_id", columnList = "volunteer_id"),
    @Index(name = "idx_assignment_requirement_id", columnList = "food_requirement_id")
})
public class DeliveryAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "food_requirement_id", nullable = false)
    private FoodRequirement foodRequirement;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "volunteer_id", nullable = false)
    private Volunteer volunteer;

    @Column(nullable = false)
    private LocalDateTime assignedAt = LocalDateTime.now();

    @Column(nullable = false)
    private String status = "ASSIGNED"; // ASSIGNED, OUT_FOR_DELIVERY, ARRIVED, VERIFICATION_PENDING, DELIVERED, FAILED, CANCELLED

    private LocalDateTime expectedDeliveryTime;

    private String otp;

    private LocalDateTime otpExpiry;

    @Column(nullable = false)
    private Integer otpAttempts = 0;

    private String photoUrl;

    private LocalDateTime photoTimestamp;

    private Double photoLatitude;

    private Double photoLongitude;

    private Double actualDeliveredQuantity;

    private String quantityReason;

    private String representativeName;

    private String representativePhone;

    private LocalDateTime confirmationTimestamp;

    @Lob
    @Column(length = 10000)
    private String digitalSignature; // Base64 data URL signature

    private LocalDateTime arrivalTimestamp;

    private LocalDateTime completedAt;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();

    public DeliveryAssignment() {
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public FoodRequirement getFoodRequirement() { return foodRequirement; }
    public void setFoodRequirement(FoodRequirement foodRequirement) { this.foodRequirement = foodRequirement; }

    public Volunteer getVolunteer() { return volunteer; }
    public void setVolunteer(Volunteer volunteer) { this.volunteer = volunteer; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getExpectedDeliveryTime() { return expectedDeliveryTime; }
    public void setExpectedDeliveryTime(LocalDateTime expectedDeliveryTime) { this.expectedDeliveryTime = expectedDeliveryTime; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public LocalDateTime getOtpExpiry() { return otpExpiry; }
    public void setOtpExpiry(LocalDateTime otpExpiry) { this.otpExpiry = otpExpiry; }

    public Integer getOtpAttempts() { return otpAttempts; }
    public void setOtpAttempts(Integer otpAttempts) { this.otpAttempts = otpAttempts; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public LocalDateTime getPhotoTimestamp() { return photoTimestamp; }
    public void setPhotoTimestamp(LocalDateTime photoTimestamp) { this.photoTimestamp = photoTimestamp; }

    public Double getPhotoLatitude() { return photoLatitude; }
    public void setPhotoLatitude(Double photoLatitude) { this.photoLatitude = photoLatitude; }

    public Double getPhotoLongitude() { return photoLongitude; }
    public void setPhotoLongitude(Double photoLongitude) { this.photoLongitude = photoLongitude; }

    public Double getActualDeliveredQuantity() { return actualDeliveredQuantity; }
    public void setActualDeliveredQuantity(Double actualDeliveredQuantity) { this.actualDeliveredQuantity = actualDeliveredQuantity; }

    public String getQuantityReason() { return quantityReason; }
    public void setQuantityReason(String quantityReason) { this.quantityReason = quantityReason; }

    public String getRepresentativeName() { return representativeName; }
    public void setRepresentativeName(String representativeName) { this.representativeName = representativeName; }

    public String getRepresentativePhone() { return representativePhone; }
    public void setRepresentativePhone(String representativePhone) { this.representativePhone = representativePhone; }

    public LocalDateTime getConfirmationTimestamp() { return confirmationTimestamp; }
    public void setConfirmationTimestamp(LocalDateTime confirmationTimestamp) { this.confirmationTimestamp = confirmationTimestamp; }

    public String getDigitalSignature() { return digitalSignature; }
    public void setDigitalSignature(String digitalSignature) { this.digitalSignature = digitalSignature; }

    public LocalDateTime getArrivalTimestamp() { return arrivalTimestamp; }
    public void setArrivalTimestamp(LocalDateTime arrivalTimestamp) { this.arrivalTimestamp = arrivalTimestamp; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
