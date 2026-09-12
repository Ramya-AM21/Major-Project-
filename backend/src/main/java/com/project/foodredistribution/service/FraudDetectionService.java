package com.project.foodredistribution.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.foodredistribution.entity.*;
import com.project.foodredistribution.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class FraudDetectionService {

    private static final Logger log = LoggerFactory.getLogger(FraudDetectionService.class);

    @Autowired
    private FraudRiskAssessmentRepository fraudRiskAssessmentRepository;

    @Autowired
    private DeliveryTaskRepository deliveryTaskRepository;

    @Autowired
    private VolunteerRepository volunteerRepository;

    @Autowired
    private VerificationRepository verificationRepository;

    @Autowired
    private DeliveryProofRepository deliveryProofRepository;

    @Autowired
    private TokenTransactionRepository tokenTransactionRepository;

    @Autowired
    private AiIntegrationService aiIntegrationService;

    @Autowired
    private MatchingService matchingService;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public FraudRiskAssessment evaluateDeliveryTask(
            DeliveryTask task,
            byte[] imageBytes,
            String filename,
            double currentLat,
            double currentLng,
            Double accuracy
    ) {
        Volunteer volunteer = task.getVolunteer();
        UUID taskId = task.getId();
        UUID volunteerId = volunteer.getId();

        Verification verification = verificationRepository.findByTaskId(taskId).orElse(null);

        // Fetch location points
        FoodListing food = task.getFoodListing();
        double pickupLat = food != null && food.getPickupLatitude() != null ? food.getPickupLatitude() : currentLat;
        double pickupLng = food != null && food.getPickupLongitude() != null ? food.getPickupLongitude() : currentLng;

        double destLat = task.getZone() != null && task.getZone().getLatitude() != null ? task.getZone().getLatitude() : (food != null && food.getDestinationLatitude() != null ? food.getDestinationLatitude() : currentLat);
        double destLng = task.getZone() != null && task.getZone().getLongitude() != null ? task.getZone().getLongitude() : (food != null && food.getDestinationLongitude() != null ? food.getDestinationLongitude() : currentLng);

        // Durations
        double actualDurationMinutes = 15.0;
        if (verification != null && verification.getPickupTimestamp() != null) {
            actualDurationMinutes = Math.max(1.0, Duration.between(verification.getPickupTimestamp(), LocalDateTime.now()).toMinutes());
        }

        double expectedDistanceKm = matchingService.calculateDistance(pickupLat, pickupLng, destLat, destLng);
        double actualDistanceKm = matchingService.calculateDistance(pickupLat, pickupLng, currentLat, currentLng);
        double expectedDurationMinutes = Math.max(5.0, (expectedDistanceKm / 20.0) * 60.0 + 10.0);

        int otpFailures = 0;
        if (verification != null) {
            otpFailures += (verification.getPickupOtpAttempts() != null ? verification.getPickupOtpAttempts() : 0);
            otpFailures += (verification.getDeliveryOtpAttempts() != null ? verification.getDeliveryOtpAttempts() : 0);
        }

        int completedDeliveries = volunteer.getSuccessfulDeliveries() != null ? volunteer.getSuccessfulDeliveries() : 0;
        int totalDeliveries = volunteer.getTotalDeliveries() != null ? volunteer.getTotalDeliveries() : 0;
        int cancelledDeliveries = Math.max(0, totalDeliveries - completedDeliveries);
        double cancellationRate = totalDeliveries > 0 ? (double) cancelledDeliveries / totalDeliveries : 0.0;

        List<FraudRiskAssessment> previousAssessments = fraudRiskAssessmentRepository.findByVolunteerId(volunteerId);
        int previousSuspiciousEvents = (int) previousAssessments.stream()
                .filter(a -> "MEDIUM".equalsIgnoreCase(a.getRiskLevel()) || "HIGH".equalsIgnoreCase(a.getRiskLevel()))
                .count();

        double gpsMismatchRate = 0.0;
        if (!previousAssessments.isEmpty()) {
            long highGpsCount = previousAssessments.stream().filter(a -> a.getGpsRisk() > 40.0).count();
            gpsMismatchRate = (double) highGpsCount / previousAssessments.size();
        }

        int proofVerificationFailures = (int) previousAssessments.stream()
                .filter(a -> a.getProofRisk() > 50.0 || "REJECTED".equalsIgnoreCase(a.getReviewStatus()))
                .count();

        List<String> previousProofHashes = fraudRiskAssessmentRepository.findAllPerceptualHashes();

        // Call FastAPI ML Fraud Detector
        Map<String, Object> aiResponse = aiIntegrationService.detectFraud(
                imageBytes,
                filename,
                taskId.toString(),
                volunteerId.toString(),
                currentLat,
                currentLng,
                accuracy,
                pickupLat,
                pickupLng,
                destLat,
                destLng,
                expectedDurationMinutes,
                actualDurationMinutes,
                expectedDistanceKm,
                actualDistanceKm,
                otpFailures,
                cancellationRate,
                gpsMismatchRate,
                proofVerificationFailures,
                previousSuspiciousEvents,
                completedDeliveries,
                cancelledDeliveries,
                previousProofHashes
        );

        double riskScore = ((Number) aiResponse.getOrDefault("riskScore", 0.0)).doubleValue();
        String riskLevel = (String) aiResponse.getOrDefault("riskLevel", "LOW");
        double anomalyScore = ((Number) aiResponse.getOrDefault("anomalyScore", 0.0)).doubleValue();
        String perceptualHash = (String) aiResponse.getOrDefault("perceptualHash", "");

        Map<String, Object> componentRisks = (Map<String, Object>) aiResponse.getOrDefault("componentRisks", new HashMap<>());
        double gpsRisk = ((Number) componentRisks.getOrDefault("gpsRisk", 0.0)).doubleValue();
        double routeRisk = ((Number) componentRisks.getOrDefault("routeRisk", 0.0)).doubleValue();
        double behaviourRisk = ((Number) componentRisks.getOrDefault("behaviourRisk", 0.0)).doubleValue();
        double proofRisk = ((Number) componentRisks.getOrDefault("proofRisk", 0.0)).doubleValue();
        double timeRisk = ((Number) componentRisks.getOrDefault("timeRisk", 0.0)).doubleValue();
        double ocrRisk = ((Number) componentRisks.getOrDefault("ocrRisk", 0.0)).doubleValue();

        List<String> reasonsList = (List<String>) aiResponse.getOrDefault("reasons", new ArrayList<>());
        String reasonsJson = "[]";
        try {
            reasonsJson = objectMapper.writeValueAsString(reasonsList);
        } catch (Exception e) {
            reasonsJson = reasonsList.toString();
        }

        FraudRiskAssessment assessment = new FraudRiskAssessment(taskId, volunteerId, riskScore, riskLevel);
        assessment.setAnomalyScore(anomalyScore);
        assessment.setGpsRisk(gpsRisk);
        assessment.setRouteRisk(routeRisk);
        assessment.setBehaviourRisk(behaviourRisk);
        assessment.setProofRisk(proofRisk);
        assessment.setTimeRisk(timeRisk);
        assessment.setOcrRisk(ocrRisk);
        assessment.setPerceptualHash(perceptualHash);
        assessment.setReasons(reasonsJson);
        assessment.setModelName((String) aiResponse.getOrDefault("modelName", "IsolationForest+PerceptualHash"));
        assessment.setModelVersion((String) aiResponse.getOrDefault("modelVersion", "v1.0"));

        if ("LOW".equalsIgnoreCase(riskLevel)) {
            assessment.setReviewStatus("AUTO_APPROVED");
            assessment.setReviewedAt(LocalDateTime.now());
            assessment.setReviewedBy("SYSTEM_ML_AUTO");
        } else {
            assessment.setReviewStatus("PENDING");
        }

        FraudRiskAssessment saved = fraudRiskAssessmentRepository.save(assessment);
        log.info("Fraud assessment created for task {}: riskScore={}, riskLevel={}", taskId, riskScore, riskLevel);

        return saved;
    }

    public List<FraudRiskAssessment> getAllAssessments() {
        return fraudRiskAssessmentRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<FraudRiskAssessment> getPendingAssessments() {
        return fraudRiskAssessmentRepository.findByReviewStatus("PENDING");
    }

    public FraudRiskAssessment getAssessmentById(UUID id) {
        return fraudRiskAssessmentRepository.findById(id).orElse(null);
    }

    @Transactional
    public FraudRiskAssessment approveAssessment(UUID assessmentId, String adminEmail) {
        FraudRiskAssessment assessment = fraudRiskAssessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new IllegalArgumentException("Fraud assessment not found: " + assessmentId));

        assessment.setReviewStatus("APPROVED");
        assessment.setReviewedBy(adminEmail);
        assessment.setReviewedAt(LocalDateTime.now());
        fraudRiskAssessmentRepository.save(assessment);

        DeliveryTask task = deliveryTaskRepository.findById(assessment.getTaskId()).orElse(null);
        if (task != null) {
            Volunteer volunteer = task.getVolunteer();
            FoodListing food = task.getFoodListing();

            // Grant completion & tokens if not already credited
            List<TokenTransaction> txs = tokenTransactionRepository.findByTaskId(task.getId());
            if (txs.isEmpty() && volunteer != null) {
                int rewardedCoins = 15;
                volunteer.setSuccessfulDeliveries((volunteer.getSuccessfulDeliveries() != null ? volunteer.getSuccessfulDeliveries() : 0) + 1);
                volunteer.setTotalDeliveries((volunteer.getTotalDeliveries() != null ? volunteer.getTotalDeliveries() : 0) + 1);
                volunteer.setBalanceTokens((volunteer.getBalanceTokens() != null ? volunteer.getBalanceTokens() : 0) + rewardedCoins);
                volunteerRepository.save(volunteer);

                TokenTransaction transaction = new TokenTransaction(
                        volunteer.getId(),
                        task.getId(),
                        rewardedCoins,
                        "EARNED_DELIVERY",
                        "Admin approved fraud audit verification payout"
                );
                tokenTransactionRepository.save(transaction);
            }

            task.setStatus("COMPLETED");
            deliveryTaskRepository.save(task);
            if (food != null) {
                food.setStatus("DELIVERED");
            }

            webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", task.getId(), "COMPLETED"));

            auditLogService.log(adminEmail, "ADMIN", "FRAUD_ASSESSMENT_APPROVED", "FraudRiskAssessment", assessmentId.toString(), "Admin manually approved fraud assessment");
            if (volunteer != null) {
                notificationService.sendNotification(
                        volunteer.getUser().getEmail(),
                        "Delivery Verified!",
                        "Your delivery proof for task #" + task.getId().toString().substring(0, 8) + " has been approved by admin. Reward tokens credited!"
                );
            }
        }

        return assessment;
    }

    @Transactional
    public FraudRiskAssessment rejectAssessment(UUID assessmentId, String adminEmail) {
        FraudRiskAssessment assessment = fraudRiskAssessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new IllegalArgumentException("Fraud assessment not found: " + assessmentId));

        assessment.setReviewStatus("REJECTED");
        assessment.setReviewedBy(adminEmail);
        assessment.setReviewedAt(LocalDateTime.now());
        fraudRiskAssessmentRepository.save(assessment);

        DeliveryTask task = deliveryTaskRepository.findById(assessment.getTaskId()).orElse(null);
        if (task != null) {
            task.setStatus("PHOTO_REJECTED");
            deliveryTaskRepository.save(task);

            webSocketHandler.broadcastUpdate("TASK_UPDATE", String.format("{\"id\":\"%s\",\"status\":\"%s\"}", task.getId(), "PHOTO_REJECTED"));

            auditLogService.log(adminEmail, "ADMIN", "FRAUD_ASSESSMENT_REJECTED", "FraudRiskAssessment", assessmentId.toString(), "Admin rejected delivery proof due to fraud detection");

            Volunteer volunteer = task.getVolunteer();
            if (volunteer != null) {
                notificationService.sendNotification(
                        volunteer.getUser().getEmail(),
                        "Delivery Proof Rejected",
                        "Your delivery proof photo was rejected following security audit. Reward tokens withheld."
                );
            }
        }

        return assessment;
    }

    @Transactional
    public FraudRiskAssessment dismissAssessment(UUID assessmentId, String adminEmail) {
        FraudRiskAssessment assessment = fraudRiskAssessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new IllegalArgumentException("Fraud assessment not found: " + assessmentId));

        assessment.setReviewStatus("DISMISSED");
        assessment.setReviewedBy(adminEmail);
        assessment.setReviewedAt(LocalDateTime.now());
        fraudRiskAssessmentRepository.save(assessment);

        auditLogService.log(adminEmail, "ADMIN", "FRAUD_ASSESSMENT_DISMISSED", "FraudRiskAssessment", assessmentId.toString(), "Admin dismissed fraud assessment alert");
        return assessment;
    }
}
