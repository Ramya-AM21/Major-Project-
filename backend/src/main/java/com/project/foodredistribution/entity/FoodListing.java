package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "food_listings")
public class FoodListing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "provider_id", nullable = false)
    private FoodProvider provider;

    @Column(nullable = false)
    private String foodName;

    @Column(nullable = false)
    private String category; // VEG, NON_VEG, EGG

    @Column(nullable = false)
    private Double quantity;

    @Column(nullable = false)
    private String unit; // MEALS, KG

    private String allergens;

    @Column(nullable = false)
    private Instant preparationTime;

    @Column(nullable = false)
    private Instant expiryTime;

    private Integer safeConsumptionHours;

    private String imageUrl;

    private String pickupAddress;

    @Column(nullable = false)
    private Double pickupLatitude;

    @Column(nullable = false)
    private Double pickupLongitude;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "destination_zone_id")
    private Zone destinationZone;

    private String destinationAddress;

    private Double destinationLatitude;

    private Double destinationLongitude;

    @Column(nullable = false)
    private String status = "AVAILABLE"; // DRAFT, SCHEDULED, AVAILABLE, ACCEPTED, PICKED_UP, IN_TRANSIT, DELIVERED, EXPIRED, CANCELLED

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Enumerated(EnumType.STRING)
    private DistributionSession distributionSession;

    private Instant availableFrom;

    private Instant availableUntil;

    public FoodListing() {
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public FoodProvider getProvider() { return provider; }
    public void setProvider(FoodProvider provider) { this.provider = provider; }

    public String getFoodName() { return foodName; }
    public void setFoodName(String foodName) { this.foodName = foodName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Double getQuantity() { return quantity; }
    public void setQuantity(Double quantity) { this.quantity = quantity; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getAllergens() { return allergens; }
    public void setAllergens(String allergens) { this.allergens = allergens; }

    public Instant getPreparationTime() { return preparationTime; }
    public void setPreparationTime(Instant preparationTime) { this.preparationTime = preparationTime; }

    public Instant getExpiryTime() { return expiryTime; }
    public void setExpiryTime(Instant expiryTime) { this.expiryTime = expiryTime; }

    public Integer getSafeConsumptionHours() { return safeConsumptionHours; }
    public void setSafeConsumptionHours(Integer safeConsumptionHours) { this.safeConsumptionHours = safeConsumptionHours; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getPickupAddress() { return pickupAddress; }
    public void setPickupAddress(String pickupAddress) { this.pickupAddress = pickupAddress; }

    public Double getPickupLatitude() { return pickupLatitude; }
    public void setPickupLatitude(Double pickupLatitude) { this.pickupLatitude = pickupLatitude; }

    public Double getPickupLongitude() { return pickupLongitude; }
    public void setPickupLongitude(Double pickupLongitude) { this.pickupLongitude = pickupLongitude; }

    public Zone getDestinationZone() { return destinationZone; }
    public void setDestinationZone(Zone destinationZone) { this.destinationZone = destinationZone; }

    public String getDestinationAddress() { return destinationAddress; }
    public void setDestinationAddress(String destinationAddress) { this.destinationAddress = destinationAddress; }

    public Double getDestinationLatitude() { return destinationLatitude; }
    public void setDestinationLatitude(Double destinationLatitude) { this.destinationLatitude = destinationLatitude; }

    public Double getDestinationLongitude() { return destinationLongitude; }
    public void setDestinationLongitude(Double destinationLongitude) { this.destinationLongitude = destinationLongitude; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public DistributionSession getDistributionSession() { return distributionSession; }
    public void setDistributionSession(DistributionSession distributionSession) { this.distributionSession = distributionSession; }

    public Instant getAvailableFrom() { return availableFrom; }
    public void setAvailableFrom(Instant availableFrom) { this.availableFrom = availableFrom; }

    public Instant getAvailableUntil() { return availableUntil; }
    public void setAvailableUntil(Instant availableUntil) { this.availableUntil = availableUntil; }

    public Instant getEffectiveAvailableUntil() {
        if (availableUntil == null) return expiryTime;
        if (expiryTime == null) return availableUntil;
        return availableUntil.isBefore(expiryTime) ? availableUntil : expiryTime;
    }
}
