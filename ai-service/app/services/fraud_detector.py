import os
import io
import math
import joblib
import numpy as np
from PIL import Image
import imagehash

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "isolation_forest_fraud.joblib")
SCALER_PATH = os.path.join(MODELS_DIR, "fraud_scaler.joblib")

_model = None
_scaler = None

def get_fraud_model_and_scaler():
    global _model, _scaler
    if _model is None or _scaler is None:
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            try:
                _model = joblib.load(MODEL_PATH)
                _scaler = joblib.load(SCALER_PATH)
                print(f"[FRAUD AI] Successfully loaded Isolation Forest model and scaler.")
            except Exception as e:
                print(f"[FRAUD AI ERROR] Failed to load model artifacts: {e}")
        else:
            print(f"[FRAUD AI WARN] Model files missing at {MODEL_PATH}. Run train_fraud_model.py first.")
    return _model, _scaler

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Haversine distance in kilometers between two GPS coordinates."""
    if lat1 == 0.0 and lon1 == 0.0 or lat2 == 0.0 and lon2 == 0.0:
        return 0.0
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def compute_perceptual_hash(image_bytes: bytes) -> str:
    """Compute 64-bit dHash string for an image byte payload."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        h = imagehash.dhash(img)
        return str(h)
    except Exception as e:
        print(f"[HASH ERROR] Failed to compute perceptual hash: {e}")
        return ""

def compare_perceptual_hashes(new_hash_str: str, previous_hashes: list) -> tuple:
    """Compare new perceptual hash against list of previous hashes. Return (is_duplicate, min_hamming_distance)."""
    if not new_hash_str or not previous_hashes:
        return False, 999
    
    try:
        new_hash = imagehash.hex_to_hash(new_hash_str)
        min_dist = 999
        for prev in previous_hashes:
            if not prev or not isinstance(prev, str):
                continue
            try:
                prev_h = imagehash.hex_to_hash(prev)
                dist = new_hash - prev_h
                if dist < min_dist:
                    min_dist = dist
            except Exception:
                continue
                
        # Hamming distance <= 6 out of 64 bits indicates near-identical / reused image
        is_duplicate = min_dist <= 6
        return is_duplicate, min_dist
    except Exception as e:
        print(f"[HASH COMPARISON ERROR] {e}")
        return False, 999

def evaluate_fraud_risk(
    image_bytes: bytes,
    task_id: str,
    volunteer_id: str,
    capture_lat: float,
    capture_lng: float,
    gps_accuracy: float,
    pickup_lat: float,
    pickup_lng: float,
    dest_lat: float,
    dest_lng: float,
    expected_duration_mins: float,
    actual_duration_mins: float,
    expected_distance_km: float,
    actual_distance_km: float,
    otp_failures: int,
    cancellation_rate: float,
    gps_mismatch_rate: float,
    proof_verification_failures: int,
    previous_suspicious_events: int,
    completed_deliveries: int,
    cancelled_deliveries: int,
    previous_proof_hashes: list = None
) -> dict:
    reasons = []
    
    # 1. Perceptual Image Hashing & Duplicate Verification
    perceptual_hash = compute_perceptual_hash(image_bytes) if image_bytes else ""
    is_duplicate_proof, min_hamming_dist = compare_perceptual_hashes(perceptual_hash, previous_proof_hashes or [])
    
    proof_risk = 0.0
    if is_duplicate_proof:
        proof_risk = 0.95
        reasons.append(f"Reused delivery proof photo detected via perceptual image hashing (Hamming distance = {min_hamming_dist})")
    
    # 2. GPS / Haversine Distance Verification
    dest_dist_km = haversine_distance(capture_lat, capture_lng, dest_lat, dest_lng)
    gps_risk = 0.0
    allowed_radius_km = 0.5 # 500 meters allowed dropoff radius
    if dest_dist_km > allowed_radius_km:
        mismatch_m = int(dest_dist_km * 1000)
        gps_risk = min(1.0, (dest_dist_km - allowed_radius_km) / 2.0)
        reasons.append(f"Delivery photo captured {mismatch_m}m away from target dropoff zone (threshold: 500m)")
    
    if gps_accuracy and gps_accuracy > 150.0:
        gps_risk = max(gps_risk, 0.4)
        reasons.append(f"Poor GPS accuracy reported ({int(gps_accuracy)}m)")
        
    # 3. Route Deviation Analysis
    route_risk = 0.0
    exp_dist = max(expected_distance_km, 0.1)
    route_ratio = actual_distance_km / exp_dist if actual_distance_km > 0 else 1.0
    if route_ratio > 2.2:
        route_risk = min(1.0, (route_ratio - 2.0) / 2.0)
        reasons.append(f"Excessive route deviation ratio ({route_ratio:.2f}x expected distance)")

    # 4. Time Anomaly Detection
    time_risk = 0.0
    exp_time = max(expected_duration_mins, 1.0)
    time_ratio = actual_duration_mins / exp_time if actual_duration_mins > 0 else 1.0
    if actual_duration_mins < 0.5: # Completed in less than 30 seconds
        time_risk = 0.85
        reasons.append(f"Suspiciously fast delivery completion ({actual_duration_mins:.1f} mins)")
    elif time_ratio > 3.5:
        time_risk = min(1.0, (time_ratio - 3.0) / 3.0)
        reasons.append(f"Unusual delay in delivery completion ({actual_duration_mins:.1f} mins vs {exp_time:.1f} mins expected)")

    # 5. OTP Failures Risk
    otp_risk = 0.0
    if otp_failures >= 3:
        otp_risk = 0.8
        reasons.append(f"Multiple consecutive OTP verification failures ({otp_failures} attempts)")
    elif otp_failures > 0:
        otp_risk = 0.3

    # 6. ML Isolation Forest Behaviour Anomaly Assessment
    model, scaler = get_fraud_model_and_scaler()
    behaviour_risk = 0.0
    anomaly_score = 0.0
    
    if model is not None and scaler is not None:
        try:
            features = np.array([[
                float(cancellation_rate),
                float(gps_mismatch_rate),
                float(route_ratio),
                float(time_ratio),
                float(otp_failures),
                float(proof_verification_failures),
                float(1 if is_duplicate_proof else 0),
                float(previous_suspicious_events),
                float(completed_deliveries)
            ]])
            
            features_scaled = scaler.transform(features)
            dec_func = model.decision_function(features_scaled)[0] # Positive = normal, Negative = anomaly
            prediction = model.predict(features_scaled)[0] # 1 = normal, -1 = anomaly
            
            # Map decision score to 0.0-1.0 anomaly risk (dec_func ranges roughly -0.2 to +0.2)
            # Lower decision function implies higher anomaly
            anomaly_score = float(-dec_func)
            behaviour_risk = float(np.clip((0.15 - dec_func) / 0.35, 0.0, 1.0))
            
            if prediction == -1:
                reasons.append(f"Unsupervised ML (Isolation Forest) flagged abnormal volunteer behavior pattern (anomaly score: {dec_func:.4f})")
        except Exception as e:
            print(f"[ML INFERENCE ERROR] {e}")
            behaviour_risk = 0.1
    else:
        # Fallback if model file is uninitialized
        behaviour_risk = 0.1

    # OCR Verification (Soft signal)
    ocr_risk = 0.0

    # 7. Fraud Risk Engine: Hybrid Score Calculation (0 to 100)
    # Weights: Behaviour (30%), GPS (25%), Proof Photo (25%), Route (10%), Time (10%)
    raw_risk = (
        (behaviour_risk * 30.0) +
        (gps_risk * 25.0) +
        (proof_risk * 25.0) +
        (route_risk * 10.0) +
        (time_risk * 10.0)
    )
    
    fraud_risk_score = round(float(np.clip(raw_risk, 0.0, 100.0)), 1)
    
    # 8. Risk Level Classification
    if fraud_risk_score >= 70.0:
        risk_level = "HIGH"
    elif fraud_risk_score >= 35.0:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"
        
    if not reasons:
        reasons.append("Delivery telemetry and proof photo verified within normal parameters.")

    return {
        "riskScore": fraud_risk_score,
        "riskLevel": risk_level,
        "anomalyScore": round(anomaly_score, 4),
        "gpsRisk": round(gps_risk, 2),
        "routeRisk": round(route_risk, 2),
        "behaviourRisk": round(behaviour_risk, 2),
        "proofRisk": round(proof_risk, 2),
        "timeRisk": round(time_risk, 2),
        "ocrRisk": round(ocr_risk, 2),
        "perceptualHash": perceptual_hash,
        "reasons": reasons,
        "model": "IsolationForest-v1.0",
        "modelVersion": "1.0.0"
    }
