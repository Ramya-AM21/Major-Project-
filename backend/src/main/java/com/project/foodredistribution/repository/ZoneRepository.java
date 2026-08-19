package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ZoneRepository extends JpaRepository<Zone, UUID> {
    List<Zone> findByVerificationStatus(String verificationStatus);
    List<Zone> findByStatusAndVerificationStatus(String status, String verificationStatus);
    List<Zone> findByVerificationStatusAndCityIgnoreCase(String verificationStatus, String city);
    List<Zone> findByStatusAndVerificationStatusAndCityIgnoreCase(String status, String verificationStatus, String city);
    List<Zone> findByCityIgnoreCase(String city);
}
