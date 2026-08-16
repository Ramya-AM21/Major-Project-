package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.Verification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface VerificationRepository extends JpaRepository<Verification, UUID> {
    Optional<Verification> findByTaskId(UUID taskId);
    boolean existsByProofImageUrlAndTaskIdNot(String proofImageUrl, UUID taskId);
    boolean existsByDeliveryLatitudeAndDeliveryLongitudeAndTaskIdNot(Double deliveryLatitude, Double deliveryLongitude, UUID taskId);
}
