package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.DeliveryTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeliveryTaskRepository extends JpaRepository<DeliveryTask, UUID> {
    List<DeliveryTask> findByStatus(String status);
    List<DeliveryTask> findByVolunteerId(UUID volunteerId);
    List<DeliveryTask> findByVolunteerUserId(UUID userId);
    List<DeliveryTask> findByVolunteerUserEmail(String email);
    List<DeliveryTask> findByFoodListingProviderId(UUID providerId);
    List<DeliveryTask> findByFoodListingProviderUserId(UUID userId);
    List<DeliveryTask> findByFoodListingProviderUserEmail(String email);
    Optional<DeliveryTask> findByFoodListingId(UUID foodListingId);
    List<DeliveryTask> findByZoneId(UUID zoneId);
}
