# FoodBridge / AnnaSetu Pilot Testing Guide & Checklist

This document details the real-world pilot testing procedure for validating the AnnaSetu surplus food redistribution system during production pilot testing.

---

## Pre-Test Setup Verification

- [ ] Production Frontend URL accessible: `https://foodbridge.vercel.app`
- [ ] Backend API Health Check returns UP: `https://foodbridge-backend.onrender.com/api/health`
- [ ] FastAPI AI Health Check returns UP: `https://foodbridge-ai.onrender.com/health`
- [ ] Database connection active and tables initialized (`users`, `zones`, `food_listings`, `delivery_tasks`).

---

## Role-Based Pilot Verification Checklist

### 1. NGO Coordinator Workflow
- [ ] **Register / Log In**: Register new user with role `COORDINATOR` or log in as `coord@food.com`.
- [ ] **Submit Shelter Registration**:
  - Navigate to `/coordinator/dashboard`.
  - Add shelter name, address, latitude, longitude, and meal capacity.
  - Upload authorization license document.
  - Confirm status is set to `PENDING_VERIFICATION`.
- [ ] **Create Food Requirement**:
  - Submit shelter meal requirement (e.g., 50 meals required by 8:00 PM).
  - Verify requirement appears in live coordinator feed.

### 2. Platform Admin Approval Workflow
- [ ] **Log In as Admin**: Log in with `admin@food.com` / `password`.
- [ ] **Review Pending Shelter**:
  - Navigate to `/admin/dashboard`.
  - View pending shelter application and inspect uploaded license certificate.
  - Click **Approve Shelter**.
- [ ] **Verify Database Update**: Confirm shelter `verificationStatus` updates to `VERIFIED`.

### 3. Food Provider / Restaurant Workflow
- [ ] **Log In as Provider**: Log in with `provider1@food.com` / `password`.
- [ ] **Create Surplus Food Listing**:
  - Navigate to `/provider/food/new`.
  - Upload food image.
  - Click **Analyze with Food AI** (verifies FastAPI EasyOCR parsing).
  - Confirm autofilled fields: Food Name, Quantity, Category, Expiry Time.
  - Submit listing.
- [ ] **Receive Pickup OTP**: Record generated 4-digit Pickup OTP for delivery handover.

### 4. Commute Volunteer Delivery Workflow
- [ ] **Log In as Volunteer**: Log in with `rahul@food.com` / `password`.
- [ ] **Register Commute Route**:
  - Navigate to `/volunteer/matching`.
  - Enter commute start (Sadashiva Nagar) and end (Indiranagar).
  - Set maximum detour threshold ($2.0\text{ km}$).
  - Click **Start Journey Route**.
- [ ] **Accept Matched Task**:
  - Inspect top match card showing composite match score (e.g., $84.50/100$) and detour distance ($0.42\text{ km}$).
  - Click **Accept Delivery Task**.
- [ ] **Pickup Handover**:
  - Arrive at provider location.
  - Enter Provider's Pickup OTP.
  - Confirm task status updates to `PICKED_UP`.
- [ ] **Dropoff & Delivery Completion**:
  - Navigate to destination shelter zone.
  - Grant browser location permission (GPS verification).
  - Verify dropoff distance is within geofence radius ($100\text{m}$).
  - Enter Coordinator's Delivery OTP.
  - Capture and upload proof-of-delivery photo.
  - Enter actual delivered meal quantity.
  - Submit proof.
- [ ] **Completion Verification**:
  - Confirm task status updates to `COMPLETED`.
  - Confirm reward coins/tokens credited to volunteer wallet.
  - Confirm Fraud Risk Assessment generated in backend (`riskLevel: LOW`).
