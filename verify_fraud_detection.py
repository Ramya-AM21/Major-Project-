import os
import sys
import json
import requests
from io import BytesIO
from PIL import Image, ImageDraw

AI_SERVICE_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:8081"

def create_sample_image(text="DELIVERY PROOF EVIDENCE", bg_color=(200, 220, 255)):
    img = Image.new("RGB", (400, 300), color=bg_color)
    d = ImageDraw.Draw(img)
    d.text((20, 140), text, fill=(0, 0, 0))
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()

def test_fastapi_fraud_detection():
    print("\n--- 1. Testing FastAPI /api/v1/ai/detect-fraud directly ---")
    image_bytes = create_sample_image("LEGAL PROOF PHOTO #1")
    
    files = {
        'image': ('proof.png', image_bytes, 'image/png')
    }
    data = {
        'taskId': '11111111-1111-1111-1111-111111111111',
        'volunteerId': '22222222-2222-2222-2222-222222222222',
        'latitude': '12.9716',
        'longitude': '77.5946',
        'accuracy': '10.0',
        'pickupLatitude': '12.9700',
        'pickupLongitude': '77.5900',
        'destinationLatitude': '12.9720',
        'destinationLongitude': '77.5950',
        'expectedDurationMinutes': '20.0',
        'actualDurationMinutes': '18.0',
        'expectedDistanceKm': '1.5',
        'actualDistanceKm': '1.6',
        'otpFailures': '0',
        'cancellationRate': '0.0',
        'gpsMismatchRate': '0.0',
        'proofVerificationFailures': '0',
        'previousSuspiciousEvents': '0',
        'completedDeliveries': '10',
        'cancelledDeliveries': '0',
        'previousProofHashesJson': '[]'
    }
    
    resp = requests.post(f"{AI_SERVICE_URL}/api/v1/ai/detect-fraud", files=files, data=data)
    assert resp.status_code == 200, f"FastAPI detect-fraud failed: {resp.text}"
    result = resp.json()
    print("Direct FastAPI Fraud Detection Result:")
    print(json.dumps(result, indent=2))
    
    assert "riskScore" in result, "Missing riskScore"
    assert "riskLevel" in result, "Missing riskLevel"
    assert "perceptualHash" in result, "Missing perceptualHash"
    assert result["riskLevel"] == "LOW", f"Expected LOW risk for clean telemetry, got {result['riskLevel']}"
    
    # Test Duplicate Image Detection with Perceptual Hash
    perceptual_hash = result["perceptualHash"]
    print(f"\nCaptured perceptualHash: {perceptual_hash}")
    
    print("\n--- 2. Testing Duplicate Image Detection via dHash ---")
    data_dup = data.copy()
    data_dup["previousProofHashesJson"] = json.dumps([perceptual_hash])
    
    files_dup = {
        'image': ('proof.png', image_bytes, 'image/png')
    }
    resp_dup = requests.post(f"{AI_SERVICE_URL}/api/v1/ai/detect-fraud", files=files_dup, data=data_dup)
    assert resp_dup.status_code == 200, f"FastAPI detect-fraud dup test failed: {resp_dup.text}"
    result_dup = resp_dup.json()
    print("Duplicate Proof Image Fraud Result:")
    print(json.dumps(result_dup, indent=2))
    
    assert result_dup["proofRisk"] >= 0.70, f"Expected proofRisk >= 0.70 for duplicate hash, got {result_dup['proofRisk']}"
    print("Perceptual Hash duplicate detection verified successfully!")

def test_backend_fraud_endpoints():
    print("\n--- 3. Testing Backend Admin Fraud Endpoints ---")
    login_payload = {"email": "provider1@food.com", "password": "password"}
    login_resp = requests.post(f"{BACKEND_URL}/api/v1/auth/login", json=login_payload)
    if login_resp.status_code != 200:
        # Try registering or volunteer login
        login_payload = {"email": "volunteer1@food.com", "password": "password"}
        login_resp = requests.post(f"{BACKEND_URL}/api/v1/auth/login", json=login_payload)
    
    token = login_resp.json().get("token", "")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    resp = requests.get(f"{BACKEND_URL}/api/v1/admin/fraud/assessments", headers=headers)
    assert resp.status_code == 200, f"GET /api/v1/admin/fraud/assessments failed: {resp.text}"
    assessments = resp.json()
    print(f"Retrieved {len(assessments)} fraud risk assessments from Spring Boot backend.")
    print("Spring Boot Admin Fraud Endpoints verified successfully!")

def main():
    print("==================================================")
    print("  PHASE 4: ML FRAUD DETECTION VERIFICATION SUITE  ")
    print("==================================================")
    
    test_fastapi_fraud_detection()
    test_backend_fraud_endpoints()
    
    print("\n==================================================")
    print("  ALL ML FRAUD DETECTION TESTS PASSED SUCCESSFULLY! ")
    print("==================================================")

if __name__ == "__main__":
    main()
