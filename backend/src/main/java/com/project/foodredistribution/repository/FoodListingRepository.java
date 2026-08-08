package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.FoodListing;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface FoodListingRepository extends JpaRepository<FoodListing, UUID> {
    List<FoodListing> findByStatus(String status);
    List<FoodListing> findByProviderId(UUID providerId);
    List<FoodListing> findByProviderUserId(UUID userId);
    List<FoodListing> findByProviderUserEmail(String email);
}
