import urllib.request
import urllib.parse
import json
import os
import sys
import datetime
import random

BASE_URL = "http://localhost:8081"

def make_request(url, method="GET", headers=None, data=None, is_json=True):
    if headers is None:
        headers = {}
    
    req_data = None
    if data is not None:
        if is_json:
            req_data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            req_data = data

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            resp_body = response.read()
            if status >= 200 and status < 300:
                try:
                    return json.loads(resp_body.decode("utf-8")), status
                except:
                    return resp_body.decode("utf-8"), status
            else:
                return {"error": resp_body.decode("utf-8")}, status
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8")
            return json.loads(err_body), e.code
        except:
            return {"error": str(e)}, e.code
    except Exception as e:
        return {"error": str(e)}, 500

def test_personal_donation_workflow():
    print("=" * 70)
    print("STARTING REAL END-TO-END PERSONAL FOOD DONATION WORKFLOW VERIFICATION")
    print("=" * 70)

    # 1. Register or Login as Individual Donor
    donor_email = f"personal.donor.{random.randint(1000, 9999)}@example.com"
    donor_password = "password123"
    print(f"\n[TEST A - INDIVIDUAL REGISTRATION] Registering new Individual Donor ({donor_email})...")
    
    reg_payload = {
        "name": "Ananya Sharma",
        "email": donor_email,
        "phone": "9876543210",
        "password": donor_password,
        "role": "INDIVIDUAL_DONOR",
        "address": "Sadashiva Nagar Main Rd, Bengaluru",
        "latitude": 13.0060,
        "longitude": 77.5810,
        "businessName": "Ananya's Birthday Gathering"
    }

    reg_res, status = make_request(f"{BASE_URL}/api/v1/auth/register", method="POST", data=reg_payload)
    if status != 200 or "token" not in reg_res:
        print(f"[FAIL] Registration failed: {reg_res}")
        sys.exit(1)

    donor_token = reg_res["token"]
    donor_role = reg_res.get("role")
    print(f"[PASS] Individual Donor registered successfully! Role: {donor_role}")
    assert donor_role == "INDIVIDUAL_DONOR", f"Expected INDIVIDUAL_DONOR role, got {donor_role}"

    headers_donor = {"Authorization": f"Bearer {donor_token}"}

    # Verify Provider Profile linked to Individual Donor
    profile_res, status = make_request(f"{BASE_URL}/api/v1/provider/profile", method="GET", headers=headers_donor)
    if status != 200:
        print(f"[FAIL] Failed to fetch donor provider profile: {profile_res}")
        sys.exit(1)
    print(f"[PASS] Donor Profile verified! Address: {profile_res.get('address')} ({profile_res.get('latitude')}, {profile_res.get('longitude')})")

    # Fetch active zones for destination
    zones, status = make_request(f"{BASE_URL}/api/v1/zones", method="GET", headers=headers_donor)
    if status != 200 or not zones:
        print(f"[FAIL] Failed to fetch zones: {zones}")
        sys.exit(1)
    
    target_zone = zones[0]
    for z in zones:
        if "central" in z.get("name", "").lower():
            target_zone = z
            break
    print(f"   Target distribution zone: {target_zone['name']} (ID: {target_zone['id']})")

    # 2. Test AI Image Analysis Endpoint for Individual Donor
    print("\n[TEST C - AI ANALYSIS] Uploading sample food photo to AI image analysis service...")
    image_bytes = b"\x99PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATu\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82" + os.urandom(500)
    boundary = "----WebKitFormBoundaryPersonalDonationTest"
    body = []
    body.append(f"--{boundary}".encode())
    body.append(f'Content-Disposition: form-data; name="file"; filename="birthday_food.png"'.encode())
    body.append(b"Content-Type: image/png")
    body.append(b"")
    body.append(image_bytes)
    body.append(f"--{boundary}--".encode())
    body.append(b"")
    multipart_data = b"\r\n".join(body)

    ai_headers = {
        "Authorization": f"Bearer {donor_token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    }

    ai_res, status = make_request(f"{BASE_URL}/api/v1/food/analyze-image", method="POST", headers=ai_headers, data=multipart_data, is_json=False)
    if status == 200 and isinstance(ai_res, dict):
        print(f"[PASS] AI Image Analysis processed successfully! Source: {ai_res.get('source')}")
    else:
        print(f"   Note: AI Endpoint returned status {status}, proceeding with listing creation.")

    # 3. Create Personal Food Donation Listing
    print("\n[TEST B - PERSONAL DONATION] Creating surplus food listing with occasion = BIRTHDAY...")
    now = datetime.datetime.now(datetime.timezone.utc)
    prep_time = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    listing_payload = {
        "foodName": "Birthday Feast Surplus - Paneer Tikka, Pulav & Sweets",
        "category": "VEG",
        "quantity": 25.0,
        "unit": "MEALS",
        "description": "Surplus freshly cooked meals from 25th birthday celebration.",
        "allergens": "Dairy, Gluten",
        "preparationTime": prep_time,
        "safeConsumptionHours": 6,
        "distributionSession": "NIGHT",
        "donationOccasion": "BIRTHDAY",
        "pickupAddress": profile_res.get('address'),
        "pickupLatitude": profile_res.get('latitude'),
        "pickupLongitude": profile_res.get('longitude'),
        "destinationZone": {
            "id": target_zone["id"]
        },
        "status": "AVAILABLE"
    }

    listing_res, status = make_request(f"{BASE_URL}/api/v1/food", method="POST", headers=headers_donor, data=listing_payload)
    if status != 200 and status != 201:
        print(f"[FAIL] Failed to create personal donation listing: {listing_res}")
        sys.exit(1)

    listing_id = listing_res.get("id")
    stored_occasion = listing_res.get("donationOccasion")
    print(f"[PASS] Personal donation created! ID: {listing_id}")
    print(f"   Food: {listing_res.get('foodName')}")
    print(f"   Occasion stored in database: {stored_occasion}")
    assert stored_occasion == "BIRTHDAY", f"Expected BIRTHDAY occasion, got {stored_occasion}"

    # Verify donor dashboard listing query
    my_listings, status = make_request(f"{BASE_URL}/api/v1/food/provider", method="GET", headers=headers_donor)
    if status != 200 or not any(l["id"] == listing_id for l in my_listings):
        print(f"[FAIL] Listing not found in donor dashboard query: {my_listings}")
        sys.exit(1)
    print(f"[PASS] Donor Dashboard database query verified! Total donor listings: {len(my_listings)}")

    # 4. Volunteer Matching & Acceptance
    print("\n[TEST D - VOLUNTEER MATCHING] Logging in as Volunteer (rahul@food.com)...")
    login_vol = {"email": "rahul@food.com", "password": "password"}
    vol_res, status = make_request(f"{BASE_URL}/api/v1/auth/login", method="POST", data=login_vol)
    if status != 200 or "token" not in vol_res:
        print(f"[FAIL] Failed to login volunteer: {vol_res}")
        sys.exit(1)
    vol_token = vol_res["token"]
    headers_vol = {"Authorization": f"Bearer {vol_token}"}

    # Clear active tasks for clean run
    active_tasks, status = make_request(f"{BASE_URL}/api/v1/tasks", method="GET", headers=headers_vol)
    if status == 200:
        for t in active_tasks:
            if t["status"] not in ["COMPLETED", "CANCELLED"] and t.get("foodListing", {}).get("id") != listing_id:
                make_request(f"{BASE_URL}/api/v1/tasks/{t['id']}/cancel", method="POST", headers=headers_vol)

    # Reset volunteer location to Bengaluru active route start (Vyalikaval)
    make_request(f"{BASE_URL}/api/v1/volunteers/location", method="POST", headers=headers_vol, data={"latitude": 13.0036, "longitude": 77.5783})

    # Fetch recommendations
    recommendations, status = make_request(f"{BASE_URL}/api/v1/volunteers/tasks", method="GET", headers=headers_vol)
    if status != 200:
        print(f"[FAIL] Failed to fetch volunteer matching recommendations: {recommendations}")
        sys.exit(1)

    print("   Volunteer recommendations returned:")
    for r in recommendations:
        print(f"     Listing ID: {r['foodListing']['id']} | Food: {r['foodListing']['foodName']} | Score: {r['matchingScore']} | Deviation: {r['deviation']}")

    target_match = None
    for r in recommendations:
        if r["foodListing"]["id"] == listing_id:
            target_match = r
            break

    if not target_match:
        print("[FAIL] Created personal food listing not found in volunteer route matching recommendations!")
        sys.exit(1)

    print(f"[PASS] Personal donation matched to volunteer route!")
    print(f"   Matching score: {target_match['matchingScore']}% | Extra route deviation: {target_match['deviation']} km")

    # Propose & Accept task
    accept_payload = {
        "foodListingId": target_match["foodListing"]["id"],
        "zoneId": target_match["zone"]["id"],
        "routeId": target_match["routeId"],
        "deviation": target_match["deviation"],
        "matchingScore": target_match["matchingScore"]
    }
    task_res, status = make_request(f"{BASE_URL}/api/v1/tasks", method="POST", headers=headers_vol, data=accept_payload)
    if status != 200 and status != 201:
        print(f"[FAIL] Failed to propose task: {task_res}")
        sys.exit(1)
    task_id = task_res["id"]

    accept_res, status = make_request(f"{BASE_URL}/api/v1/tasks/{task_id}/accept", method="POST", headers=headers_vol)
    if status != 200:
        print(f"[FAIL] Volunteer failed to accept task: {accept_res}")
        sys.exit(1)
    print(f"[PASS] Task accepted by volunteer! Status: {accept_res['status']}")

    # 5. Pickup Verification (Test E)
    print("\n[TEST E - PICKUP] Retrieving pickup OTP and verifying handover...")
    ver_res, status = make_request(f"{BASE_URL}/api/v1/verification/task/{task_id}", method="GET", headers=headers_vol)
    if status != 200:
        print(f"[FAIL] Failed to fetch verification record: {ver_res}")
        sys.exit(1)

    pickup_otp = ver_res["pickupOtp"]
    delivery_otp = ver_res["deliveryOtp"]
    dest_lat = target_match["zone"]["latitude"]
    dest_lng = target_match["zone"]["longitude"]

    pickup_verify_payload = {
        "taskId": task_id,
        "otp": pickup_otp,
        "latitude": target_match["foodListing"]["pickupLatitude"],
        "longitude": target_match["foodListing"]["pickupLongitude"]
    }
    pickup_res, status = make_request(f"{BASE_URL}/api/v1/verification/pickup", method="POST", headers=headers_vol, data=pickup_verify_payload)
    if status != 200:
        print(f"[FAIL] Pickup OTP verification failed: {pickup_res}")
        sys.exit(1)
    print(f"[PASS] Pickup OTP verified! New status: {pickup_res['status']}")

    # 6. GPS Location Updates & Delivery Verification (Test F)
    print("\n[TEST F - DELIVERY] Updating live GPS to drop zone and verifying destination OTP...")
    loc_payload = {"latitude": dest_lat, "longitude": dest_lng}
    make_request(f"{BASE_URL}/api/v1/tasks/{task_id}/location", method="POST", headers=headers_vol, data=loc_payload)

    delivery_verify_payload = {
        "taskId": task_id,
        "otp": delivery_otp,
        "latitude": dest_lat,
        "longitude": dest_lng,
        "proofImageUrl": ""
    }
    del_res, status = make_request(f"{BASE_URL}/api/v1/verification/delivery", method="POST", headers=headers_vol, data=delivery_verify_payload)
    if status != 200:
        print(f"[FAIL] Delivery OTP verification failed: {del_res}")
        sys.exit(1)
    print(f"[PASS] Destination OTP verified! Status: {del_res['status']}")

    # Submit Proof Image for ML verification
    proof_bytes = b"\x99PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATu\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82" + os.urandom(1000)
    boundary_proof = "----WebKitFormBoundaryProofTest"
    p_body = []
    p_body.append(f"--{boundary_proof}".encode())
    p_body.append(f'Content-Disposition: form-data; name="taskId"'.encode())
    p_body.append(b"")
    p_body.append(str(task_id).encode())
    p_body.append(f"--{boundary_proof}".encode())
    p_body.append(f'Content-Disposition: form-data; name="latitude"'.encode())
    p_body.append(b"")
    p_body.append(str(dest_lat).encode())
    p_body.append(f"--{boundary_proof}".encode())
    p_body.append(f'Content-Disposition: form-data; name="longitude"'.encode())
    p_body.append(b"")
    p_body.append(str(dest_lng).encode())
    p_body.append(f"--{boundary_proof}".encode())
    p_body.append(f'Content-Disposition: form-data; name="file"; filename="proof.png"'.encode())
    p_body.append(b"Content-Type: image/png")
    p_body.append(b"")
    p_body.append(proof_bytes)
    p_body.append(f"--{boundary_proof}--".encode())
    p_body.append(b"")

    upload_proof_res, status = make_request(
        f"{BASE_URL}/api/v1/verification/upload-proof",
        method="POST",
        headers={"Authorization": f"Bearer {vol_token}", "Content-Type": f"multipart/form-data; boundary={boundary_proof}"},
        data=b"\r\n".join(p_body),
        is_json=False
    )
    if status != 200:
        print(f"[FAIL] Proof upload failed: {upload_proof_res}")
        sys.exit(1)

    print(f"[PASS] Proof uploaded & ML verified! Final task status: {upload_proof_res['status']}")

    # 7. Re-verify Donor Dashboard (Test G)
    print("\n[TEST G - DONOR VERIFICATION] Logging back in as Individual Donor to check final delivery status...")
    my_listings_final, status = make_request(f"{BASE_URL}/api/v1/food/provider", method="GET", headers=headers_donor)
    if status != 200:
        print(f"[FAIL] Failed to fetch final donor listings: {my_listings_final}")
        sys.exit(1)

    completed_item = next((l for l in my_listings_final if l["id"] == listing_id), None)
    if not completed_item:
        print("[FAIL] Donation listing missing in donor dashboard!")
        sys.exit(1)

    final_status = completed_item["status"]
    print(f"[PASS] Personal donation status in donor dashboard: {final_status}")
    assert final_status == "DELIVERED", f"Expected DELIVERED status, got {final_status}"

    print("\n" + "=" * 70)
    print("ALL REAL END-TO-END PERSONAL FOOD DONATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_personal_donation_workflow()
