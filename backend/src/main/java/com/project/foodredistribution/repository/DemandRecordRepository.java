package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.DemandRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DemandRecordRepository extends JpaRepository<DemandRecord, UUID> {
    List<DemandRecord> findByZoneId(UUID zoneId);
}
