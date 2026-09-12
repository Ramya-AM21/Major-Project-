import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# Model Directory
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODELS_DIR, "isolation_forest_fraud.joblib")
SCALER_PATH = os.path.join(MODELS_DIR, "fraud_scaler.joblib")

# Feature Vector Definitions:
# 1. cancellationRate (0.0 to 1.0)
# 2. gpsMismatchRate (0.0 to 1.0)
# 3. routeDeviationRatio (actual / expected distance ratio, e.g., 1.0 to 3.0)
# 4. timeDurationRatio (actual / expected time ratio, e.g., 0.5 to 3.0)
# 5. otpFailures (0 to 5)
# 6. proofVerificationFailures (0 to 5)
# 7. duplicateProofCount (0 to 5)
# 8. previousSuspiciousEvents (0 to 5)
# 9. completedDeliveries (1 to 100)

FEATURE_NAMES = [
    "cancellationRate",
    "gpsMismatchRate",
    "routeDeviationRatio",
    "timeDurationRatio",
    "otpFailures",
    "proofVerificationFailures",
    "duplicateProofCount",
    "previousSuspiciousEvents",
    "completedDeliveries"
]

def train_isolation_forest_model(n_samples=2000, random_state=42):
    print("==========================================================")
    print("TRAINING UNSUPERVISED ISOLATION FOREST FRAUD ANOMALY MODEL")
    print("==========================================================")
    
    np.random.seed(random_state)
    
    # 1. Generate realistic legitimate volunteer behavior baseline
    cancellation_rate = np.random.beta(a=0.5, b=10, size=n_samples) # Mode near 0.02
    gps_mismatch_rate = np.random.beta(a=0.5, b=15, size=n_samples) # Mode near 0.01
    route_deviation_ratio = np.random.normal(loc=1.1, scale=0.2, size=n_samples)
    route_deviation_ratio = np.clip(route_deviation_ratio, 1.0, 2.5)
    
    time_duration_ratio = np.random.normal(loc=1.0, scale=0.25, size=n_samples)
    time_duration_ratio = np.clip(time_duration_ratio, 0.4, 2.5)
    
    otp_failures = np.random.poisson(lam=0.1, size=n_samples)
    otp_failures = np.clip(otp_failures, 0, 3)
    
    proof_failures = np.random.poisson(lam=0.05, size=n_samples)
    proof_failures = np.clip(proof_failures, 0, 2)
    
    duplicate_proof_count = np.zeros(n_samples, dtype=int) # Baseline legitimate users don't reuse images
    previous_suspicious = np.random.poisson(lam=0.02, size=n_samples)
    
    completed_deliveries = np.random.randint(1, 100, size=n_samples)
    
    X_train_raw = np.column_stack([
        cancellation_rate,
        gps_mismatch_rate,
        route_deviation_ratio,
        time_duration_ratio,
        otp_failures,
        proof_failures,
        duplicate_proof_count,
        previous_suspicious,
        completed_deliveries
    ])
    
    # 2. Fit StandardScaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_raw)
    
    # 3. Fit Isolation Forest
    model = IsolationForest(
        n_estimators=100,
        contamination=0.08,
        random_state=random_state,
        n_jobs=-1
    )
    model.fit(X_train_scaled)
    
    # 4. Save artifacts
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(model, MODEL_PATH)
    
    print(f"[SUCCESS] Trained Isolation Forest Fraud Model!")
    print(f"   Model file saved: {MODEL_PATH}")
    print(f"   Scaler file saved: {SCALER_PATH}")
    print(f"   Features trained: {FEATURE_NAMES}")
    
    # Evaluate sample decision scores
    raw_scores = model.decision_function(X_train_scaled)
    print(f"   Score range: min={raw_scores.min():.4f}, max={raw_scores.max():.4f}, mean={raw_scores.mean():.4f}")
    
    return model, scaler

if __name__ == "__main__":
    train_isolation_forest_model()
