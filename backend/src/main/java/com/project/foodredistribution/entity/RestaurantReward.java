package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "restaurant_rewards")
public class RestaurantReward {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String restaurantName;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private Integer requiredCoins;

    @Column(nullable = false)
    private Integer discountPercentage;

    private LocalDateTime validUntil;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE, EXPIRED, INACTIVE

    public RestaurantReward() {
    }

    public RestaurantReward(String restaurantName, String description, Integer requiredCoins, Integer discountPercentage, LocalDateTime validUntil) {
        this.restaurantName = restaurantName;
        this.description = description;
        this.requiredCoins = requiredCoins;
        this.discountPercentage = discountPercentage;
        this.validUntil = validUntil;
        this.status = "ACTIVE";
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getRestaurantName() { return restaurantName; }
    public void setRestaurantName(String restaurantName) { this.restaurantName = restaurantName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getRequiredCoins() { return requiredCoins; }
    public void setRequiredCoins(Integer requiredCoins) { this.requiredCoins = requiredCoins; }

    public Integer getDiscountPercentage() { return discountPercentage; }
    public void setDiscountPercentage(Integer discountPercentage) { this.discountPercentage = discountPercentage; }

    public LocalDateTime getValidUntil() { return validUntil; }
    public void setValidUntil(LocalDateTime validUntil) { this.validUntil = validUntil; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
