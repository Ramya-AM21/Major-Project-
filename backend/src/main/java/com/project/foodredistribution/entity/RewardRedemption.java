package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reward_redemptions")
public class RewardRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID volunteerId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "restaurant_reward_id", nullable = false)
    private RestaurantReward restaurantReward;

    @Column(nullable = false, unique = true)
    private String redemptionCode;

    @Column(nullable = false)
    private LocalDateTime redeemedAt = LocalDateTime.now();

    public RewardRedemption() {
        this.redeemedAt = LocalDateTime.now();
    }

    public RewardRedemption(UUID volunteerId, RestaurantReward restaurantReward, String redemptionCode) {
        this.volunteerId = volunteerId;
        this.restaurantReward = restaurantReward;
        this.redemptionCode = redemptionCode;
        this.redeemedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getVolunteerId() { return volunteerId; }
    public void setVolunteerId(UUID volunteerId) { this.volunteerId = volunteerId; }

    public RestaurantReward getRestaurantReward() { return restaurantReward; }
    public void setRestaurantReward(RestaurantReward restaurantReward) { this.restaurantReward = restaurantReward; }

    public String getRedemptionCode() { return redemptionCode; }
    public void setRedemptionCode(String redemptionCode) { this.redemptionCode = redemptionCode; }

    public LocalDateTime getRedeemedAt() { return redeemedAt; }
    public void setRedeemedAt(LocalDateTime redeemedAt) { this.redeemedAt = redeemedAt; }
}
