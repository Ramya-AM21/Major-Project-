package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.User;
import com.project.foodredistribution.entity.Volunteer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface VolunteerRepository extends JpaRepository<Volunteer, UUID> {
    Optional<Volunteer> findByUser(User user);
    Optional<Volunteer> findByUserId(UUID userId);
    Optional<Volunteer> findByUserEmail(String email);
}
