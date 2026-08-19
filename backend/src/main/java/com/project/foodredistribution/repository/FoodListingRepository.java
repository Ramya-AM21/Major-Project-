package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.FoodListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FoodListingRepository extends JpaRepository<FoodListing, UUID> {
    List<FoodListing> findByStatus(String status);
    List<FoodListing> findByProviderId(UUID providerId);
    List<FoodListing> findByProviderUserId(UUID userId);
    List<FoodListing> findByProviderUserEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM FoodListing f WHERE f.id = :id")
    Optional<FoodListing> findByIdForUpdate(@Param("id") UUID id);
}
