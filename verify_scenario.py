import urllib.request
import urllib.parse
import json
import os
import sys
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

def get_or_register(email, name, role):
    # Try logging in
    login_payload = {"email": email, "password": "password"}
    login_res, status = make_request(f"{BASE_URL}/api/v1/auth/login", method="POST", data=login_payload)
    if status == 200:
        return login_res["token"]
        
    # If not registered, register first
    reg_payload = {
        "name": name,
        "email": email,
        "password": "password",
        "phone": f"9876543{random.randint(100, 999)}",
        "role": role,
        "businessName": name if role == "PROVIDER" else None
    }
    reg_res, status = make_request(f"{BASE_URL}/api/v1/auth/register", method="POST", data=reg_payload)
    if status == 200 or status == 201:
        return reg_res["token"]
        
    print(f"Failed to register / login: {email} | {reg_res}")
    sys.exit(1)

def test_scenario():
    print("=" * 70)
    print("RUNNING CRITICAL ROUTE-BASED MATCHING SCENARIO TEST")
    print("=" * 70)

    # 1. Login/Register characters
    print("\n[STEP 1] Initializing Users (Volunteer A, Volunteer B, Provider)...")
    token_a = get_or_register("volunteera@food.com", "Volunteer A", "VOLUNTEER")
    token_b = get_or_register("volunteerb@food.com", "Volunteer B", "VOLUNTEER")
    token_p = get_or_register("provider_scenario@food.com", "Scenario Cafe", "PROVIDER")
    
    print("   Volunteer A token obtained.")
    print("   Volunteer B token obtained.")
    print("   Scenario Provider token obtained.")

    # 2. Get active zones to match destinations
    print("\n[STEP 2] Fetching active zones in Bengaluru...")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    headers_p = {"Authorization": f"Bearer {token_p}"}
    
    # We can get zones list directly from zones endpoint
    recs, status = make_request(f"{BASE_URL}/api/v1/zones", method="GET", headers=headers_a)
    if status != 200:
        print(f"Failed to fetch zones: {recs}")
        sys.exit(1)
        
    # Pick target zones
    koramangala_zone = None
    whitefield_zone = None
    
    for z in recs:
        zname = z.get("name", "").lower()
        if "koramangala" in zname or "central" in zname:
            koramangala_zone = z
        if "whitefield" in zname or "east" in zname:
            whitefield_zone = z
            
    if not koramangala_zone or not whitefield_zone:
        # fallback to any two zones
        if len(recs) >= 2:
            koramangala_zone = recs[0]
            whitefield_zone = recs[1]
        else:
            print("Not enough zones seeded to verify scenario.")
            sys.exit(1)
            
    print(f"   Target Zone A (Koramangala direction): {koramangala_zone['name']} ({koramangala_zone['latitude']}, {koramangala_zone['longitude']})")
    print(f"   Target Zone B (Whitefield direction): {whitefield_zone['name']} ({whitefield_zone['latitude']}, {whitefield_zone['longitude']})")

    # 3. Cleanup existing routes of A and B to start clean
    print("\n[STEP 3] Cleaning up old test routes for Volunteers...")
    for tok, name in [(token_a, "A"), (token_b, "B")]:
        headers = {"Authorization": f"Bearer {tok}"}
        routes, _ = make_request(f"{BASE_URL}/api/v1/volunteers/routes", method="GET", headers=headers)
        for rt in routes:
            make_request(f"{BASE_URL}/api/v1/volunteers/routes/{rt['id']}", method="DELETE", headers=headers)
        print(f"   Cleared old routes for Volunteer {name}.")

    # 4. Volunteer A starts Commute: Mysore Road (12.954, 77.535) -> Koramangala (12.934, 77.625) with 2km deviation limit
    print("\n[STEP 4] Registering Route A (Mysore Road -> Koramangala, limit: 5.0 km)...")
    route_a_payload = {
        "startLatitude": 12.954,
        "startLongitude": 77.535,
        "endLatitude": koramangala_zone["latitude"],
        "endLongitude": koramangala_zone["longitude"],
        "startName": "Mysore Road Station",
        "endName": "Koramangala Zone Point",
        "routeGeometry": "12.954,77.535;12.934,77.625",
        "routeType": "DAILY",
        "activeFrom": "08:00 AM",
        "activeUntil": "09:00 AM",
        "maxDeviation": 5.0
    }
    route_a_res, status = make_request(f"{BASE_URL}/api/v1/volunteers/routes", method="POST", headers=headers_a, data=route_a_payload)
    if status != 200 and status != 201:
        print(f"Route A creation failed: {route_a_res}")
        sys.exit(1)
    print(f"   Route A created: {json.dumps(route_a_res)}")
        
    # 5. Volunteer B starts Commute: Yelahanka (13.100, 77.595) -> Whitefield (12.969, 77.750) with 2km deviation limit
    print("\n[STEP 5] Registering Route B (Yelahanka -> Whitefield, limit: 5.0 km)...")
    route_b_payload = {
        "startLatitude": 13.100,
        "startLongitude": 77.595,
        "endLatitude": whitefield_zone["latitude"],
        "endLongitude": whitefield_zone["longitude"],
        "startName": "Yelahanka",
        "endName": "Whitefield Zone Point",
        "routeGeometry": "13.100,77.595;12.969,77.750",
        "routeType": "DAILY",
        "activeFrom": "08:00 AM",
        "activeUntil": "09:00 AM",
        "maxDeviation": 5.0
    }
    route_b_res, status = make_request(f"{BASE_URL}/api/v1/volunteers/routes", method="POST", headers=headers_b, data=route_b_payload)
    if status != 200 and status != 201:
        print(f"Route B creation failed: {route_b_res}")
        sys.exit(1)
    print(f"   Route B created: {json.dumps(route_b_res)}")

    print("   Active routes successfully registered.")

    # 6. Restaurant publishes Food Listing 1 (Mysore Road pickup -> Koramangala Zone)
    print("\n[STEP 6] Restaurant publishes Food Listing 1 (Near Mysore Road -> Koramangala Zone)...")
    import datetime
    now = datetime.datetime.utcnow()
    prep_time = now.isoformat() + "Z"
    expiry_time = (now + datetime.timedelta(hours=12)).isoformat() + "Z"
    
    listing_a_payload = {
        "foodName": "Mysore Veg Thali",
        "category": "VEG",
        "quantity": 10.0,
        "unit": "MEALS",
        "allergens": "None",
        "preparationTime": prep_time,
        "expiryTime": expiry_time,
        "pickupAddress": "KSRTC Layout, Mysore Road",
        "pickupLatitude": 12.955,
        "pickupLongitude": 77.536,
        "destinationZone": {
            "id": koramangala_zone["id"]
        },
        "status": "AVAILABLE"
    }
    
    listing_a_res, status = make_request(f"{BASE_URL}/api/v1/food", method="POST", headers=headers_p, data=listing_a_payload)
    if status != 201 and status != 200:
        print(f"Listing 1 creation failed: {listing_a_res}")
        sys.exit(1)
    listing_a_id = listing_a_res["id"]
    print(f"   Food Listing 1 created. ID: {listing_a_id}")

    # 7. Check who sees Food Listing 1
    print("\n[STEP 7] Verifying Route Match compatibility for Listing 1...")
    recs_a, _ = make_request(f"{BASE_URL}/api/v1/volunteers/tasks", method="GET", headers=headers_a)
    recs_b, _ = make_request(f"{BASE_URL}/api/v1/volunteers/tasks", method="GET", headers=headers_b)
    
    # Print the full list of recommendations for A and B to see actual computed deviations
    print("   Volunteer A matches:")
    for r in recs_a:
        print(f"     Food: {r['foodListing']['foodName']}, Zone: {r['zone']['name']}, Deviation: {r['deviation']} km, Score: {r['matchingScore']}")
    print("   Volunteer B matches:")
    for r in recs_b:
        print(f"     Food: {r['foodListing']['foodName']}, Zone: {r['zone']['name']}, Deviation: {r['deviation']} km, Score: {r['matchingScore']}")

    sees_a = any(r["foodListing"]["id"] == listing_a_id for r in recs_a)
    sees_b = any(r["foodListing"]["id"] == listing_a_id for r in recs_b)
    
    print(f"   Volunteer A sees Mysore Veg Thali: {sees_a}")
    print(f"   Volunteer B sees Mysore Veg Thali: {sees_b}")
    
    if not sees_a:
        print("[FAIL] Error: Volunteer A should see Listing A!")
        sys.exit(1)
    if sees_b:
        print("[FAIL] Error: Volunteer B should NOT see Listing A!")
        sys.exit(1)
    print("   [PASS] Listing 1 correctly matched to Route A commute pattern!")

    # 8. Restaurant publishes Food Listing 2 (Yelahanka pickup -> Whitefield Zone)
    print("\n[STEP 8] Restaurant publishes Food Listing 2 (Near Yelahanka -> Whitefield Zone)...")
    listing_b_payload = {
        "foodName": "Yelahanka Biryani Feast",
        "category": "NON_VEG",
        "quantity": 15.0,
        "unit": "MEALS",
        "allergens": "None",
        "preparationTime": prep_time,
        "expiryTime": expiry_time,
        "pickupAddress": "Yelahanka New Town",
        "pickupLatitude": 13.102,
        "pickupLongitude": 77.595,
        "destinationZone": {
            "id": whitefield_zone["id"]
        },
        "status": "AVAILABLE"
    }
    
    listing_b_res, status = make_request(f"{BASE_URL}/api/v1/food", method="POST", headers=headers_p, data=listing_b_payload)
    if status != 201 and status != 200:
        print(f"Listing 2 creation failed: {listing_b_res}")
        sys.exit(1)
    listing_b_id = listing_b_res["id"]
    print(f"   Food Listing 2 created. ID: {listing_b_id}")

    # 9. Check who sees Food Listing 2
    print("\n[STEP 9] Verifying Route Match compatibility for Listing 2...")
    recs_a, _ = make_request(f"{BASE_URL}/api/v1/volunteers/tasks", method="GET", headers=headers_a)
    recs_b, _ = make_request(f"{BASE_URL}/api/v1/volunteers/tasks", method="GET", headers=headers_b)
    
    sees_a = any(r["foodListing"]["id"] == listing_b_id for r in recs_a)
    sees_b = any(r["foodListing"]["id"] == listing_b_id for r in recs_b)
    
    print(f"   Volunteer A sees Yelahanka Biryani: {sees_a}")
    print(f"   Volunteer B sees Yelahanka Biryani: {sees_b}")
    
    if sees_a:
        print("[FAIL] Error: Volunteer A should NOT see Listing B!")
        sys.exit(1)
    if not sees_b:
        print("[FAIL] Error: Volunteer B should see Listing B!")
        sys.exit(1)
    print("   [PASS] Listing 2 correctly matched to Route B commute pattern!")

    # 10. Volunteer A accepts Food Listing 1 task -> listing becomes unavailable for everyone
    print("\n[STEP 10] Volunteer A accepts Listing 1 Task...")
    target_rec = None
    for r in recs_a:
        if r["foodListing"]["id"] == listing_a_id:
            target_rec = r
            break
            
    accept_payload = {
        "foodListingId": target_rec["foodListing"]["id"],
        "zoneId": target_rec["zone"]["id"],
        "routeId": target_rec["routeId"],
        "deviation": target_rec["deviation"],
        "matchingScore": target_rec["matchingScore"]
    }
    
    task_res, status = make_request(f"{BASE_URL}/api/v1/tasks", method="POST", headers=headers_a, data=accept_payload)
    if status != 200 and status != 201:
        print(f"Task proposal failed: {task_res}")
        sys.exit(1)
        
    task_id = task_res["id"]
    accept_task_res, status = make_request(f"{BASE_URL}/api/v1/tasks/{task_id}/accept", method="POST", headers=headers_a)
    if status != 200:
        print(f"Task acceptance failed: {accept_task_res}")
        sys.exit(1)
    print(f"   Task successfully accepted! ID: {task_id}")

    # Check that Listing 1 is no longer listed in matching offers
    print("\n[STEP 11] Checking Listing 1 removal from available feed...")
    recs_a_after, _ = make_request(f"{BASE_URL}/api/v1/volunteers/tasks", method="GET", headers=headers_a)
    still_sees = any(r["foodListing"]["id"] == listing_a_id for r in recs_a_after)
    print(f"   Volunteer A still sees Listing 1: {still_sees}")
    
    if still_sees:
        print("[FAIL] Error: Assigned listings must disappear from recommendations!")
        sys.exit(1)
        
    print("   [PASS] Assigned food correctly removed from matching list.")

    print("\n" + "=" * 70)
    print("CRITICAL SCENARIO TEST PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_scenario()
