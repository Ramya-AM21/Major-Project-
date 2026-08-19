package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.DeliveryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, UUID> {
    List<DeliveryAssignment> findByVolunteerId(UUID volunteerId);
    List<DeliveryAssignment> findByVolunteerUserEmail(String email);
    List<DeliveryAssignment> findByFoodRequirementCoordinatorEmail(String email);
    Optional<DeliveryAssignment> findByFoodRequirementId(UUID requirementId);
    
    // Find active deliveries for volunteer (anything not DELIVERED, CANCELLED, or FAILED)
    List<DeliveryAssignment> findByVolunteerUserEmailAndStatusNotIn(String email, List<String> finishedStatuses);
}
