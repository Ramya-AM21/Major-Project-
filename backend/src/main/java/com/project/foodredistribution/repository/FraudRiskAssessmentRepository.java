package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.FraudRiskAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FraudRiskAssessmentRepository extends JpaRepository<FraudRiskAssessment, UUID> {

    Optional<FraudRiskAssessment> findByTaskId(UUID taskId);

    List<FraudRiskAssessment> findByVolunteerId(UUID volunteerId);

    List<FraudRiskAssessment> findByRiskLevel(String riskLevel);

    List<FraudRiskAssessment> findByReviewStatus(String reviewStatus);

    @Query("SELECT f.perceptualHash FROM FraudRiskAssessment f WHERE f.perceptualHash IS NOT NULL AND f.perceptualHash <> ''")
    List<String> findAllPerceptualHashes();

    List<FraudRiskAssessment> findAllByOrderByCreatedAtDesc();
}
