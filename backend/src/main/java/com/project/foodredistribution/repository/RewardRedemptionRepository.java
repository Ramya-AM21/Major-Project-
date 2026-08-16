package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.RewardRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RewardRedemptionRepository extends JpaRepository<RewardRedemption, UUID> {
    List<RewardRedemption> findByVolunteerIdOrderByRedeemedAtDesc(UUID volunteerId);
}
