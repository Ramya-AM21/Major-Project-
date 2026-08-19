package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.Zone;
import com.project.foodredistribution.entity.User;
import com.project.foodredistribution.entity.CityDataCoverage;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.ZoneRepository;
import com.project.foodredistribution.repository.UserRepository;
import com.project.foodredistribution.repository.CityDataCoverageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

@Service
public class ZoneService {

    private final ZoneRepository zoneRepository;
    private final UserRepository userRepository;
    private final CityDataCoverageRepository cityDataCoverageRepository;

    public ZoneService(ZoneRepository zoneRepository,
                       UserRepository userRepository,
                       CityDataCoverageRepository cityDataCoverageRepository) {
        this.zoneRepository = zoneRepository;
        this.userRepository = userRepository;
        this.cityDataCoverageRepository = cityDataCoverageRepository;
    }

    public List<Zone> getAllZones() {
        return zoneRepository.findAll();
    }

    public Zone getById(UUID id) {
        return zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + id));
    }

    @Transactional
    public Zone saveZone(Zone zone) {
        if (zone.getPriorityScore() == null) {
            zone.setPriorityScore(1.0);
        }
        if (zone.getStatus() == null) {
            zone.setStatus("ACTIVE");
        }
        return zoneRepository.save(zone);
    }

    @Transactional
    public Zone updatePriority(UUID id, Double priorityScore) {
        Zone zone = getById(id);
        zone.setPriorityScore(priorityScore);
        return zoneRepository.save(zone);
    }

    @Transactional
    public Zone updateStatus(UUID id, String status) {
        Zone zone = getById(id);
        zone.setStatus(status);
        return zoneRepository.save(zone);
    }

    public List<Zone> getZones(String status, String verificationStatus, String city) {
        if (city != null && !city.trim().isEmpty()) {
            if (status != null && verificationStatus != null) {
                return zoneRepository.findByStatusAndVerificationStatusAndCityIgnoreCase(status, verificationStatus, city);
            } else if (verificationStatus != null) {
                return zoneRepository.findByVerificationStatusAndCityIgnoreCase(verificationStatus, city);
            } else {
                return zoneRepository.findByCityIgnoreCase(city);
            }
        } else {
            if (status != null && verificationStatus != null) {
                return zoneRepository.findByStatusAndVerificationStatus(status, verificationStatus);
            } else if (verificationStatus != null) {
                return zoneRepository.findByVerificationStatus(verificationStatus);
            } else {
                return zoneRepository.findAll();
            }
        }
    }

    public CityDataCoverage getCityCoverage(String city) {
        return cityDataCoverageRepository.findByCityIgnoreCase(city)
                .orElse(new CityDataCoverage(city, "", "", false, "COMMUNITY_REPORTED"));
    }

    // Haversine formula to calculate distance in km
    public double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public Optional<Zone> findNearbyDuplicate(Double latitude, Double longitude, Double radiusKm) {
        List<Zone> all = zoneRepository.findAll();
        for (Zone z : all) {
            if ("COMMUNITY_NEED_POINT".equalsIgnoreCase(z.getType()) &&
                !"REJECTED".equalsIgnoreCase(z.getVerificationStatus()) &&
                !"EXPIRED".equalsIgnoreCase(z.getVerificationStatus())) {
                double dist = calculateDistance(latitude, longitude, z.getLatitude(), z.getLongitude());
                if (dist <= radiusKm) {
                    return Optional.of(z);
                }
            }
        }
        return Optional.empty();
    }

    @Transactional
    public Zone reportCommunityNeed(Zone zone, String reporterEmail) {
        User reporter = userRepository.findByEmail(reporterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + reporterEmail));

        zone.setReportedBy(reporter);
        zone.setSource("COMMUNITY_REPORTED");
        zone.setType("COMMUNITY_NEED_POINT");
        zone.setVerificationStatus("PENDING");
        zone.setStatus("INACTIVE"); // Inactive until verified
        zone.setReportCount(1);
        zone.setCreatedAt(LocalDateTime.now());
        zone.setUpdatedAt(LocalDateTime.now());
        if (zone.getValidFrom() == null) {
            zone.setValidFrom(LocalDateTime.now());
        }
        if (zone.getValidUntil() == null) {
            zone.setValidUntil(LocalDateTime.now().plusDays(7)); // defaults to 7 days
        }
        return zoneRepository.save(zone);
    }

    @Transactional
    public Zone confirmCommunityNeed(UUID existingId, Integer estimatedPeople, String description) {
        Zone existing = getById(existingId);
        existing.setReportCount(existing.getReportCount() + 1);
        existing.setUpdatedAt(LocalDateTime.now());
        if (estimatedPeople != null && estimatedPeople > 0) {
            existing.setEstimatedPeople((existing.getEstimatedPeople() + estimatedPeople) / 2);
        }
        if (description != null && !description.trim().isEmpty()) {
            existing.setDescription(existing.getDescription() + " | Additional: " + description);
        }
        return zoneRepository.save(existing);
    }

    @Transactional
    public Zone verifyCommunityNeed(UUID id) {
        Zone zone = getById(id);
        zone.setVerificationStatus("VERIFIED");
        zone.setStatus("ACTIVE"); // Mark it active to enter matching engine
        zone.setLastVerifiedAt(LocalDateTime.now());
        zone.setUpdatedAt(LocalDateTime.now());
        zone.setValidFrom(LocalDateTime.now());
        zone.setValidUntil(LocalDateTime.now().plusDays(7));
        return zoneRepository.save(zone);
    }

    @Transactional
    public Zone rejectCommunityNeed(UUID id) {
        Zone zone = getById(id);
        zone.setVerificationStatus("REJECTED");
        zone.setStatus("INACTIVE");
        zone.setUpdatedAt(LocalDateTime.now());
        return zoneRepository.save(zone);
    }

    @Transactional
    public Zone reviewCommunityNeed(UUID id) {
        Zone zone = getById(id);
        zone.setVerificationStatus("UNDER_REVIEW");
        zone.setUpdatedAt(LocalDateTime.now());
        return zoneRepository.save(zone);
    }
}
