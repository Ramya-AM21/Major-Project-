package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.FoodRequirement;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FoodRequirementRepository extends JpaRepository<FoodRequirement, UUID> {
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM FoodRequirement r WHERE r.id = :id")
    Optional<FoodRequirement> findByIdForUpdate(@Param("id") UUID id);

    List<FoodRequirement> findByCoordinatorId(UUID coordinatorId);
    List<FoodRequirement> findByCoordinatorEmail(String email);
    List<FoodRequirement> findByStatus(String status);
    List<FoodRequirement> findByShelterCityIgnoreCaseAndStatus(String city, String status);
}
