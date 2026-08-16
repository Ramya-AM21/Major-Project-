package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.LocationTracking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LocationTrackingRepository extends JpaRepository<LocationTracking, UUID> {
    List<LocationTracking> findByDeliveryTaskIdOrderByTimestampAsc(UUID deliveryTaskId);
    void deleteByDeliveryTaskId(UUID deliveryTaskId);
}
