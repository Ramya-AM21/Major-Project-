package com.project.foodredistribution.controller;

import com.project.foodredistribution.entity.RestaurantReward;
import com.project.foodredistribution.entity.RewardRedemption;
import com.project.foodredistribution.service.RewardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rewards")
@CrossOrigin(origins = "*")
public class RewardController {

    private final RewardService rewardService;

    public RewardController(RewardService rewardService) {
        this.rewardService = rewardService;
    }

    @GetMapping
    public ResponseEntity<List<RestaurantReward>> getActiveRewards() {
        return ResponseEntity.ok(rewardService.getActiveRewards());
    }

    @PostMapping("/{id}/redeem")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<RewardRedemption> redeemReward(@PathVariable UUID id, Principal principal) {
        RewardRedemption redemption = rewardService.redeemReward(id, principal.getName());
        return ResponseEntity.ok(redemption);
    }

    @GetMapping("/redemptions")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<List<RewardRedemption>> getMyRedemptions(Principal principal) {
        List<RewardRedemption> history = rewardService.getVolunteerRedemptions(principal.getName());
        return ResponseEntity.ok(history);
    }
}
