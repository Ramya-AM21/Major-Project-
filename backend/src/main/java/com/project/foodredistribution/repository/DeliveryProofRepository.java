package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.DeliveryProof;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeliveryProofRepository extends JpaRepository<DeliveryProof, UUID> {
    Optional<DeliveryProof> findByTaskId(UUID taskId);
    boolean existsByImageHashAndTaskIdNot(String imageHash, UUID taskId);
    boolean existsByImageHash(String imageHash);
}
