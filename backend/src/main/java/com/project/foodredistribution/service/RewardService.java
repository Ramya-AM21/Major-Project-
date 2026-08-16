package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.RestaurantReward;
import com.project.foodredistribution.entity.RewardRedemption;
import com.project.foodredistribution.entity.TokenTransaction;
import com.project.foodredistribution.entity.Volunteer;
import com.project.foodredistribution.entity.User;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class RewardService {

    private final RestaurantRewardRepository restaurantRewardRepository;
    private final RewardRedemptionRepository rewardRedemptionRepository;
    private final VolunteerRepository volunteerRepository;
    private final UserRepository userRepository;
    private final TokenTransactionRepository tokenTransactionRepository;

    public RewardService(RestaurantRewardRepository restaurantRewardRepository,
                         RewardRedemptionRepository rewardRedemptionRepository,
                         VolunteerRepository volunteerRepository,
                         UserRepository userRepository,
                         TokenTransactionRepository tokenTransactionRepository) {
        this.restaurantRewardRepository = restaurantRewardRepository;
        this.rewardRedemptionRepository = rewardRedemptionRepository;
        this.volunteerRepository = volunteerRepository;
        this.userRepository = userRepository;
        this.tokenTransactionRepository = tokenTransactionRepository;
    }

    public List<RestaurantReward> getActiveRewards() {
        return restaurantRewardRepository.findByStatus("ACTIVE");
    }

    @Transactional
    public RewardRedemption redeemReward(UUID rewardId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        
        Volunteer volunteer = volunteerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Volunteer profile not found for user: " + user.getName()));

        RestaurantReward reward = restaurantRewardRepository.findById(rewardId)
                .orElseThrow(() -> new ResourceNotFoundException("Reward offer not found with ID: " + rewardId));

        if (!"ACTIVE".equalsIgnoreCase(reward.getStatus())) {
            throw new IllegalArgumentException("Target discount reward offer is no longer active.");
        }

        int currentBalance = volunteer.getBalanceTokens() != null ? volunteer.getBalanceTokens() : 0;
        if (currentBalance < reward.getRequiredCoins()) {
            throw new IllegalArgumentException("Insufficient token balance. Requires " + reward.getRequiredCoins() + " pts, but you only have " + currentBalance + " pts.");
        }

        // 1. Deduct volunteer balance
        volunteer.setBalanceTokens(currentBalance - reward.getRequiredCoins());
        volunteerRepository.save(volunteer);

        // 2. Log deduction transaction ledger
        TokenTransaction tx = new TokenTransaction(
                volunteer.getId(),
                null,
                -reward.getRequiredCoins(),
                "REDEMPTION",
                "Redeemed discount at " + reward.getRestaurantName() + " (" + reward.getDescription() + ")"
        );
        tokenTransactionRepository.save(tx);

        // 3. Generate coupon
        String couponCode = generateCouponCode(reward.getRestaurantName());

        // 4. Save redemption record
        RewardRedemption redemption = new RewardRedemption(volunteer.getId(), reward, couponCode);
        return rewardRedemptionRepository.save(redemption);
    }

    public List<RewardRedemption> getVolunteerRedemptions(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        
        Volunteer volunteer = volunteerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Volunteer profile not found for user: " + user.getName()));

        return rewardRedemptionRepository.findByVolunteerIdOrderByRedeemedAtDesc(volunteer.getId());
    }

    private String generateCouponCode(String restaurantName) {
        String cleanName = restaurantName.toUpperCase().replaceAll("[^A-Z]", "");
        String prefix = cleanName.length() >= 3 ? cleanName.substring(0, 3) : "RWD";
        
        SecureRandom random = new SecureRandom();
        int digits = 1000 + random.nextInt(9000);
        int letters = 10 + random.nextInt(90);
        
        return String.format("%s-%d-X%d", prefix, digits, letters);
    }
}
