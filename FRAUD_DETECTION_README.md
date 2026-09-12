# Real ML-Based Fraud Detection Module — Documentation

## Overview
The **FoodBridge Fraud Detection Module** is a production-grade, hybrid ML security architecture designed to detect suspicious activity during food redistribution deliveries without relying on mock data, hardcoded scores, or synthetic rules.

---

## 1. System Architecture

```text
Volunteer Proof Photo + Live GPS + Telemetry
                   │
                   ▼
       Spring Boot Backend Service
        (DeliveryTaskService.java)
                   │
                   ▼
       FraudDetectionService.java
                   │
  ┌────────────────┴────────────────┐
  │                                 │
  ▼                                 ▼
Perceptual Hashing Audit      FastAPI AI Service
(dHash 64-bit Hamming Dist)  (detect_fraud endpoint)
                                    │
                                    ▼
                         Isolation Forest Model
                        (Scikit-Learn Anomaly Model)
                                    │
                                    ▼
                         Hybrid Risk Scoring Engine
                        (Risk Score 0-100 & Level)
                                    │
                                    ▼
                        Database Persistence & Audit
                      (fraud_risk_assessments table)
                                    │
                                    ▼
                       Human-in-the-Loop Review
                      (Admin Fraud Dashboard UI)
```

---

## 2. ML & Perceptual Hashing Components

1. **Isolation Forest Model (`isolation_forest_fraud.joblib`)**:
   - Model Type: Unsupervised Anomaly Detection (`sklearn.ensemble.IsolationForest`).
   - Features Evaluated:
     - `cancellationRate`
     - `gpsMismatchRate`
     - `routeDeviationRatio`
     - `timeDurationRatio`
     - `otpFailures`
     - `proofVerificationFailures`
     - `duplicateProofCount`
     - `previousSuspiciousEvents`
     - `completedDeliveries`
   - Contamination Rate: `0.08`

2. **Perceptual Image Hashing (dHash)**:
   - Evaluates structural image similarity using 64-bit difference hashing (`imagehash.dhash`).
   - Compares the uploaded proof photo against historical proof hashes in the database.
   - Hamming distance $\le 6$ indicates near-identical or recycled proof photos.

3. **Spatial & Temporal Telemetry Audit**:
   - **Haversine Geofencing**: Verifies capture location against target shelter/zone dropoff coordinates.
   - **Route Deviation Ratio**: Calculates ratio between actual travel distance and OSRM shortest road route.
   - **Time Anomaly Ratio**: Evaluates duration elapsed between pickup verification and proof submission against expected travel time.

4. **OCR Verification**:
   - Soft text extraction signal to match delivery context if labels or timestamps are visible.

---

## 3. Risk Levels & Human-in-the-Loop Workflow

| Risk Level | Score Range | Review Status | Payout Action |
|---|---|---|---|
| **LOW** | 0 – 35 | `AUTO_APPROVED` | Automatic token reward credit to volunteer wallet. |
| **MEDIUM** | 36 – 70 | `PENDING` | Held for manual review in Admin Fraud Dashboard. |
| **HIGH** | 71 – 100 | `PENDING` | Held for security audit in Admin Fraud Dashboard. |

---

## 4. API Reference

### FastAPI AI Service Endpoint
- **URL**: `POST http://localhost:8000/api/v1/ai/detect-fraud`
- **Payload**: Multipart Form (`image`, `taskId`, `volunteerId`, `latitude`, `longitude`, `pickupLatitude`, `pickupLongitude`, `destinationLatitude`, `destinationLongitude`, `expectedDurationMinutes`, `actualDurationMinutes`, `expectedDistanceKm`, `actualDistanceKm`, `otpFailures`, `cancellationRate`, `gpsMismatchRate`, `proofVerificationFailures`, `previousSuspiciousEvents`, `completedDeliveries`, `cancelledDeliveries`, `previousProofHashesJson`)
- **Response**:
  ```json
  {
    "riskScore": 23.8,
    "riskLevel": "LOW",
    "anomalyScore": -0.1541,
    "gpsRisk": 0.0,
    "routeRisk": 0.0,
    "behaviourRisk": 0.0,
    "proofRisk": 0.95,
    "timeRisk": 0.0,
    "ocrRisk": 0.0,
    "perceptualHash": "0000807060800000",
    "reasons": [
      "Reused delivery proof photo detected via perceptual image hashing (Hamming distance = 0)"
    ],
    "model": "IsolationForest-v1.0",
    "modelVersion": "1.0.0"
  }
  ```

### Spring Boot Admin Endpoints
- `GET /api/v1/admin/fraud/assessments`: List all assessments sorted by date.
- `GET /api/v1/admin/fraud/assessments/pending`: List pending assessments.
- `POST /api/v1/admin/fraud/assessments/{id}/approve`: Manually approve assessment and credit payout.
- `POST /api/v1/admin/fraud/assessments/{id}/reject`: Reject proof photo and withhold payout.
- `POST /api/v1/admin/fraud/assessments/{id}/dismiss`: Dismiss security alert.

---

## 5. Automated Verification
Run the automated test suite:
```bash
python verify_fraud_detection.py
```
