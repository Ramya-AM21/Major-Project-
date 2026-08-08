package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.FoodProvider;
import com.project.foodredistribution.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface FoodProviderRepository extends JpaRepository<FoodProvider, UUID> {
    Optional<FoodProvider> findByUser(User user);
    Optional<FoodProvider> findByUserId(UUID userId);
    Optional<FoodProvider> findByUserEmail(String email);
}
