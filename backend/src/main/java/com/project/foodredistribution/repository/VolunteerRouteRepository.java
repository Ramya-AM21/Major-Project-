package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.VolunteerRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface VolunteerRouteRepository extends JpaRepository<VolunteerRoute, UUID> {
    List<VolunteerRoute> findByVolunteerId(UUID volunteerId);
    List<VolunteerRoute> findByVolunteerUserId(UUID userId);
    List<VolunteerRoute> findByVolunteerUserEmail(String email);
}
