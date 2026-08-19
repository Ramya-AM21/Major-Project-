package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.Shelter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ShelterRepository extends JpaRepository<Shelter, UUID> {
    List<Shelter> findByVerificationStatus(String verificationStatus);
    List<Shelter> findByCoordinatorId(UUID coordinatorId);
    List<Shelter> findByCityIgnoreCase(String city);
}
