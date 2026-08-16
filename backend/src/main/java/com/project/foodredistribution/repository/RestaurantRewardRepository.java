package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.RestaurantReward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RestaurantRewardRepository extends JpaRepository<RestaurantReward, UUID> {
    List<RestaurantReward> findByStatus(String status);
}
