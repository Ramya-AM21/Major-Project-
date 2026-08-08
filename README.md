# E-Meal Route-Based Food Waste Management & Redistribution System

A high-fidelity route-aware logistics platform designed to optimize food redistribution, prevent waste, and ensure tracking compliance through secure OTP handshakes and geospatial proximity boundaries.

---

## 1. Project Directory Structure

```text
food-redistribution-system/
│
├── frontend/                 # React, Vite, TS, Tailwind CSS interface
│   ├── src/
│   │   ├── components/       # MapView and other utility components
│   │   ├── pages/            # Landing, Login, Provider, Volunteer, Admin dashboards
│   │   └── context/          # Auth context for JWT security states
│   └── package.json
│
├── backend/                  # Java, Spring Boot, JPA, Security backend
│   ├── src/main/java/        # Entities, repos, controllers, matching filters
│   └── pom.xml
│
└── ai-service/               # Python, FastAPI, Pandas, scikit-learn service
    ├── app/main.py           # Isolation Forest anomalies & Random Forest demand
    └── requirements.txt
```

---

## 2. Quick Start Running Guide

### Step A: Python AI Inference Server
Initialize the FastAPI server to process ML operations.
```bash
cd ai-service
pip install -r requirements.txt
python app/main.py
```
*App is active at: `http://localhost:8000`*

### Step B: Core Spring Boot Engine
Set up core business logic & data seeders. The default database engine is H2 in-memory.
```bash
cd backend
mvnw clean install
mvnw spring-boot:run
```
*API is active at: `http://localhost:8080`*

### Step C: React Client Console
Launch the frontend client application. Vite proxies `/api/v1` traffic to `http://localhost:8080/api/v1`.
```bash
cd frontend
npm install
npm run dev
```
*Client Console is active at: `http://localhost:5173`*

---

## 3. Demonstration Credentials

Open `http://localhost:5173` and sign in with the following preset credentials:

*   **Food Provider:** `provider1@food.com` | Password: `password`
*   **Volunteer Commuter:** `rahul@food.com` | Password: `password`
*   **Platform Admin:** `admin@food.com` | Password: `password`

*For step-by-step presentation guidelines, review the generated walkthrough logs.*
