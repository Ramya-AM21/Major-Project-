package com.project.foodredistribution.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class AiIntegrationService {

    private static final Logger log = LoggerFactory.getLogger(AiIntegrationService.class);
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.ai.url}")
    private String aiServiceUrl;

    public Map<String, Object> getDemandPrediction(UUID zoneId) {
        try {
            String url = aiServiceUrl + "/api/v1/ai/predict-demand?zoneId=" + zoneId.toString();
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> result = response.getBody();
                result.put("source", "Python FastAPI - Random Forest Model");
                return result;
            }
        } catch (Exception ex) {
            log.warn("FastAPI AI service unavailable: {}. Falling back to baseline demand prediction.", ex.getMessage());
        }

        // Baseline (Fallback Rules-based)
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("zoneId", zoneId);
        fallback.put("predictedMeals", 120 + (Math.sin(System.currentTimeMillis() / 100000.0) * 40));
        fallback.put("confidence", 0.76);
        fallback.put("priority", "MEDIUM");
        fallback.put("source", "Baseline System Service (AI Offline Fallback)");
        return fallback;
    }

    public Map<String, Object> evaluateAnomaly(UUID taskId, double travelSpeed, boolean repeatedPhoto, boolean repeatedGps) {
        try {
            String url = aiServiceUrl + "/api/v1/ai/detect-anomaly";
            Map<String, Object> request = new HashMap<>();
            request.put("taskId", taskId.toString());
            request.put("travelSpeed", travelSpeed);
            request.put("repeatedPhoto", repeatedPhoto);
            request.put("repeatedGps", repeatedGps);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> result = response.getBody();
                result.put("source", "Python FastAPI - Isolation Forest");
                return result;
            }
        } catch (Exception ex) {
            log.warn("FastAPI AI service unavailable: {}. Falling back to baseline anomaly detection.", ex.getMessage());
        }

        // Baseline Anomaly Detection rules
        Map<String, Object> fallback = new HashMap<>();
        String risk = "NORMAL";
        String reason = "Normal Activity";
        
        if (travelSpeed > 100.0) { // faster than 100km/h
            risk = "HIGH RISK";
            reason = "Impossible travel speed (" + Math.round(travelSpeed) + " km/h)";
        } else if (repeatedPhoto) {
            risk = "HIGH RISK";
            reason = "Duplicate delivery photo hash detected";
        } else if (repeatedGps) {
            risk = "SUSPICIOUS";
            reason = "GPS coordinates match a previous volunteer delivery track";
        }

        fallback.put("taskId", taskId);
        fallback.put("riskLevel", risk);
        fallback.put("anomalyReason", reason);
        fallback.put("source", "Baseline System Security (AI Offline Fallback)");
        return fallback;
    }
}
