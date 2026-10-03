package com.project.foodredistribution.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AiIntegrationService {

    private static final Logger log = LoggerFactory.getLogger(AiIntegrationService.class);
    private final RestTemplate restTemplate;

    public AiIntegrationService() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(45000);
        factory.setReadTimeout(60000);
        this.restTemplate = new RestTemplate(factory);
    }

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

    public Map<String, Object> validateDeliveryProof(UUID taskId, byte[] imageBytes, String filename, double latitude, double longitude) {
        try {
            String url = aiServiceUrl + "/validate/delivery-proof";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

            org.springframework.util.LinkedMultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
            
            org.springframework.core.io.ByteArrayResource fileResource = new org.springframework.core.io.ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };
            
            body.add("image", fileResource);
            body.add("taskId", taskId.toString());
            body.add("latitude", String.valueOf(latitude));
            body.add("longitude", String.valueOf(longitude));

            org.springframework.http.HttpEntity<org.springframework.util.LinkedMultiValueMap<String, Object>> requestEntity =
                    new org.springframework.http.HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> res = (Map<String, Object>) response.getBody();
                res.put("source", "Python FastAPI - Validate Proof");
                return res;
            }
        } catch (Exception ex) {
            log.warn("FastAPI ML proof-validation service unavailable: {}. Falling back to baseline simulation.", ex.getMessage());
        }

        // Fallback: if offline, return offline state to let backend keep reward pending
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("valid", false);
        fallback.put("isOffline", true);
        fallback.put("confidence", 0.0);
        fallback.put("anomalyScore", 0.0);
        fallback.put("reason", "Proof validation unavailable (AI service offline).");
        fallback.put("source", "Baseline System Security (AI Offline Fallback)");
        return fallback;
    }

    public Map<String, Object> analyzeFoodImage(byte[] imageBytes, String filename) {
        try {
            String baseUrl = (aiServiceUrl != null && !aiServiceUrl.trim().isEmpty()) ? aiServiceUrl.replaceAll("/+$", "") : "http://localhost:8000";
            String url = baseUrl + "/api/v1/ai/analyze-food";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

            org.springframework.util.LinkedMultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
            
            org.springframework.core.io.ByteArrayResource fileResource = new org.springframework.core.io.ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };
            
            body.add("image", fileResource);

            org.springframework.http.HttpEntity<org.springframework.util.LinkedMultiValueMap<String, Object>> requestEntity =
                    new org.springframework.http.HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> res = (Map<String, Object>) response.getBody();
                if (Boolean.TRUE.equals(res.get("success")) || "SUCCESS".equals(res.get("status"))) {
                    return res;
                }
            }
        } catch (Exception ex) {
            log.warn("FastAPI food analysis service unavailable: {}. Attempting direct Gemini API fallback.", ex.getMessage());
        }

        // Direct Gemini Vision API Fallback (runs in Cloud / Render deployment)
        String geminiKey = System.getenv("GEMINI_API_KEY");
        if (geminiKey == null || geminiKey.trim().isEmpty()) {
            geminiKey = System.getProperty("GEMINI_API_KEY");
        }

        if (geminiKey != null && !geminiKey.trim().isEmpty()) {
            try {
                log.info("[JAVA AI FALLBACK] Calling Gemini Vision API directly via Spring REST...");
                String b64Image = java.util.Base64.getEncoder().encodeToString(imageBytes);
                String mimeType = "image/jpeg";
                if (filename != null) {
                    String fn = filename.toLowerCase();
                    if (fn.endsWith(".png")) mimeType = "image/png";
                    else if (fn.endsWith(".webp")) mimeType = "image/webp";
                }

                String prompt = "You are the food-analysis AI for FoodBridge. " +
                        "Analyze the uploaded image (RECEIPT/INVOICE or FOOD PHOTO) and extract all visible details.\n" +
                        "Return ONLY valid JSON matching this exact structure:\n" +
                        "{\n" +
                        "  \"is_receipt\": true,\n" +
                        "  \"receipt_details\": {\n" +
                        "    \"restaurant_name\": \"Restaurant name or unknown\",\n" +
                        "    \"receipt_number\": \"Invoice/Receipt # or unknown\",\n" +
                        "    \"date_time\": \"Date/Time string or unknown\",\n" +
                        "    \"currency\": \"INR\"\n" +
                        "  },\n" +
                        "  \"food_name\": \"Main food summary (e.g. Veg Biryani, Paneer Masala)\",\n" +
                        "  \"food_items\": [\n" +
                        "    {\n" +
                        "      \"name\": \"Item name\",\n" +
                        "      \"quantity\": 2,\n" +
                        "      \"unit_price\": 150.0,\n" +
                        "      \"total_price\": 300.0,\n" +
                        "      \"food_category\": \"Vegetarian\",\n" +
                        "      \"confidence\": 0.95,\n" +
                        "      \"needs_review\": false\n" +
                        "    }\n" +
                        "  ],\n" +
                        "  \"totals\": {\n" +
                        "    \"subtotal\": 300.0,\n" +
                        "    \"tax\": 15.0,\n" +
                        "    \"discount\": 0.0,\n" +
                        "    \"grand_total\": 315.0\n" +
                        "  },\n" +
                        "  \"food_category\": \"Cooked Meal\",\n" +
                        "  \"food_type\": \"Vegetarian\",\n" +
                        "  \"description\": \"Description of food or receipt contents\",\n" +
                        "  \"estimated_quantity\": 10.0,\n" +
                        "  \"confidence\": 0.90,\n" +
                        "  \"warnings\": []\n" +
                        "}\n" +
                        "Return JSON only. No markdown formatting fences.";

                String geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey;
                org.springframework.http.HttpHeaders gHeaders = new org.springframework.http.HttpHeaders();
                gHeaders.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

                Map<String, Object> inlineData = new HashMap<>();
                inlineData.put("mimeType", mimeType);
                inlineData.put("data", b64Image);

                Map<String, Object> imagePart = new HashMap<>();
                imagePart.put("inlineData", inlineData);

                Map<String, Object> textPart = new HashMap<>();
                textPart.put("text", prompt);

                List<Map<String, Object>> parts = Arrays.asList(textPart, imagePart);
                Map<String, Object> contentObj = new HashMap<>();
                contentObj.put("parts", parts);

                Map<String, Object> reqBody = new HashMap<>();
                reqBody.put("contents", Arrays.asList(contentObj));

                org.springframework.http.HttpEntity<Map<String, Object>> gReq = new org.springframework.http.HttpEntity<>(reqBody, gHeaders);
                ResponseEntity<Map> gResponse = restTemplate.postForEntity(geminiUrl, gReq, Map.class);

                if (gResponse.getStatusCode().is2xxSuccessful() && gResponse.getBody() != null) {
                    Map gBody = gResponse.getBody();
                    List candidates = (List) gBody.get("candidates");
                    if (candidates != null && !candidates.isEmpty()) {
                        Map candidate = (Map) candidates.get(0);
                        Map content = (Map) candidate.get("content");
                        if (content != null) {
                            List resParts = (List) content.get("parts");
                            if (resParts != null && !resParts.isEmpty()) {
                                Map firstPart = (Map) resParts.get(0);
                                String rawText = (String) firstPart.get("text");
                                if (rawText != null) {
                                    rawText = rawText.trim();
                                    if (rawText.startsWith("```json")) rawText = rawText.substring(7);
                                    if (rawText.startsWith("```")) rawText = rawText.substring(3);
                                    if (rawText.endsWith("```")) rawText = rawText.substring(0, rawText.length() - 3);
                                    rawText = rawText.trim();

                                    Map<String, Object> aiParsed = new com.fasterxml.jackson.databind.ObjectMapper().readValue(rawText, Map.class);
                                    aiParsed.put("success", true);
                                    aiParsed.put("status", "SUCCESS");
                                    aiParsed.put("source", "Direct Gemini 1.5 Flash (Java Cloud Fallback)");
                                    return aiParsed;
                                }
                            }
                        }
                    }
                }
            } catch (Exception gEx) {
                log.error("[JAVA AI FALLBACK ERROR] Direct Gemini API call failed: {}", gEx.getMessage(), gEx);
            }
        }

        Map<String, Object> offlineResult = new HashMap<>();
        offlineResult.put("success", false);
        offlineResult.put("status", "SERVICE_UNAVAILABLE");
        offlineResult.put("source", "System Preprocessor (AI Service Offline)");
        offlineResult.put("aiServiceOffline", true);
        offlineResult.put("message", "AI Vision service is offline or unreachable. Please verify GEMINI_API_KEY environment variable or enter food details manually.");
        offlineResult.put("confidence", 0.0);
        return offlineResult;
    }

    public Map<String, Object> detectFraud(
            byte[] imageBytes,
            String filename,
            String taskId,
            String volunteerId,
            double latitude,
            double longitude,
            Double accuracy,
            double pickupLatitude,
            double pickupLongitude,
            double destinationLatitude,
            double destinationLongitude,
            double expectedDurationMinutes,
            double actualDurationMinutes,
            double expectedDistanceKm,
            double actualDistanceKm,
            int otpFailures,
            double cancellationRate,
            double gpsMismatchRate,
            int proofVerificationFailures,
            int previousSuspiciousEvents,
            int completedDeliveries,
            int cancelledDeliveries,
            List<String> previousProofHashes
    ) {
        try {
            String url = aiServiceUrl + "/api/v1/ai/detect-fraud";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

            org.springframework.util.LinkedMultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();

            if (imageBytes != null && imageBytes.length > 0) {
                org.springframework.core.io.ByteArrayResource fileResource = new org.springframework.core.io.ByteArrayResource(imageBytes) {
                    @Override
                    public String getFilename() {
                        return filename != null ? filename : "proof.png";
                    }
                };
                body.add("image", fileResource);
            }

            body.add("taskId", taskId != null ? taskId : "");
            body.add("volunteerId", volunteerId != null ? volunteerId : "");
            body.add("latitude", String.valueOf(latitude));
            body.add("longitude", String.valueOf(longitude));
            body.add("accuracy", String.valueOf(accuracy != null ? accuracy : 0.0));
            body.add("pickupLatitude", String.valueOf(pickupLatitude));
            body.add("pickupLongitude", String.valueOf(pickupLongitude));
            body.add("destinationLatitude", String.valueOf(destinationLatitude));
            body.add("destinationLongitude", String.valueOf(destinationLongitude));
            body.add("expectedDurationMinutes", String.valueOf(expectedDurationMinutes));
            body.add("actualDurationMinutes", String.valueOf(actualDurationMinutes));
            body.add("expectedDistanceKm", String.valueOf(expectedDistanceKm));
            body.add("actualDistanceKm", String.valueOf(actualDistanceKm));
            body.add("otpFailures", String.valueOf(otpFailures));
            body.add("cancellationRate", String.valueOf(cancellationRate));
            body.add("gpsMismatchRate", String.valueOf(gpsMismatchRate));
            body.add("proofVerificationFailures", String.valueOf(proofVerificationFailures));
            body.add("previousSuspiciousEvents", String.valueOf(previousSuspiciousEvents));
            body.add("completedDeliveries", String.valueOf(completedDeliveries));
            body.add("cancelledDeliveries", String.valueOf(cancelledDeliveries));

            String hashesJson = "[]";
            if (previousProofHashes != null && !previousProofHashes.isEmpty()) {
                try {
                    hashesJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(previousProofHashes);
                } catch (Exception e) {
                    // ignore
                }
            }
            body.add("previousProofHashesJson", hashesJson);

            org.springframework.http.HttpEntity<org.springframework.util.LinkedMultiValueMap<String, Object>> requestEntity =
                    new org.springframework.http.HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return (Map<String, Object>) response.getBody();
            }
        } catch (Exception ex) {
            log.warn("FastAPI fraud detection service unavailable: {}.", ex.getMessage());
        }

        Map<String, Object> fallback = new HashMap<>();
        fallback.put("riskScore", 0.0);
        fallback.put("riskLevel", "LOW");
        fallback.put("reasons", java.util.Collections.singletonList("Fraud detection service offline. Fallback to basic checks."));
        fallback.put("model", "FallbackEngine");
        fallback.put("modelVersion", "1.0.0");
        return fallback;
    }
}
