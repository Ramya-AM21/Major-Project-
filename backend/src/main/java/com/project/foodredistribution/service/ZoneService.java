package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.Zone;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.ZoneRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ZoneService {

    private final ZoneRepository zoneRepository;

    public ZoneService(ZoneRepository zoneRepository) {
        this.zoneRepository = zoneRepository;
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
}
