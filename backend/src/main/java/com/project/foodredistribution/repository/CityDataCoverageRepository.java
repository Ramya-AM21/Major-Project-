package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.CityDataCoverage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface CityDataCoverageRepository extends JpaRepository<CityDataCoverage, UUID> {
    Optional<CityDataCoverage> findByCityIgnoreCase(String city);
}
