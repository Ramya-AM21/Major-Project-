package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ZoneRepository extends JpaRepository<Zone, UUID> {
}
