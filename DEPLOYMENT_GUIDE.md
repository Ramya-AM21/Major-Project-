# FoodBridge – Deployment Guide

FoodBridge consists of a React frontend, a Spring Boot backend, and a FastAPI AI Service. To successfully run the platform in production, these three services must be deployed with correct environment variable configurations, a production database, and proper service communication (including WebSocket for real-time tracking).

## 1. Production Architecture Overview

```text
Users
  │
  ▼
React Frontend (Vite)
  │
  ├──────────────► Spring Boot Backend (Java/Maven)
  │                       │
  │                       ├────► MySQL/H2 Database (JDBC)
  │                       │
  │                       ├────► FastAPI AI Service (Python/Uvicorn)
  │                       │
  │                       └────► Real-Time/WebSocket Service (/ws/tracking)
  │
  └──────────────► Maps / External APIs (Nominatim)
```

| Component | Purpose | Deployment Requirement |
| :--- | :--- | :--- |
| **Frontend** | User Interface (Volunteer, Provider, Admin) | Static hosting (e.g., Vercel, Netlify, Nginx) |
| **Backend** | Core APIs & Business Logic | Java Server / Docker Container |
| **Database** | Persistent Storage | Managed MySQL or self-hosted DB |
| **AI Service** | OCR, Validation & Demand Prediction | Python Service (GPU optional but recommended) |
| **Storage** | Food images & Delivery proofs | Cloud Object Storage (Recommended) |

## 2. Prerequisites

The following software must be installed on your production or deployment server. Verify these versions based on the project's configuration:

* **Node.js** (v18+ recommended)
* **npm** (for frontend dependencies)
* **Java** (JDK 17 or higher)
* **Maven** (for building the backend)
* **Python** (3.9+ for AI service)
* **MySQL** (If not using the default H2 in-memory DB)

**Verification commands:**
```bash
node --version
npm --version
java -version
mvn -version
python --version
```

## 3. Repository Setup

Clone the repository and inspect the structure:

```bash
git clone <repository-url>
cd Major-Project-
```

**Project Structure:**
```text
Major-Project-/
├── frontend/             # React / Vite SPA
├── backend/              # Spring Boot Application
├── ai-service/           # FastAPI Python Application
├── .env.example          # Root environment template
└── Documentation.md      # General project documentation
```

## 4. Environment Variables

Environment variables must be configured on the server. **Never commit `.env` files containing real production credentials.**

### Backend & Database (`backend/src/main/resources/application.yml`)
Configure these either via a `.env` file (if using Docker) or directly as system environment variables:

```ini
# Server Configuration
PORT=8080 # Production backend port

# Database Configuration
DATABASE_URL=jdbc:mysql://<production-db-host>:3306/fooddb
DATABASE_USERNAME=prod_user
DATABASE_PASSWORD=super_secret_password

# Authentication
JWT_SECRET=your_secure_random_64_character_string_for_production

# Service Integration
AI_SERVICE_URL=https://ai.your-domain.com

# Matching & Geofence Logic
MAX_ROUTE_DEVIATION_KM=2.0
MAX_VOLUNTEER_TO_SHELTER_DISTANCE_KM=5.0
MIN_MATCH_DISTANCE_METERS=100.0
GPS_ACCURACY_THRESHOLD_METERS=50.0
DELIVERY_GEOFENCE_RADIUS_METERS=100.0
```

## 5. Database Deployment

The backend defaults to an **H2 in-memory database** (`jdbc:h2:mem:fooddb`), which will lose all data when the server restarts.

For production, you **must** use a persistent database like MySQL.

1. **Create the Database:**
   ```sql
   CREATE DATABASE fooddb;
   ```
2. **Configure Variables:**
   Set `DATABASE_URL`, `DATABASE_USERNAME`, and `DATABASE_PASSWORD`.
3. **Schema Initialization:**
   The application uses Hibernate (`ddl-auto: update`). The tables will be automatically created on the first successful startup.

## 6. AI Service Deployment

The FastAPI application requires Python and specific ML packages (`torch`, `scikit-learn`, `easyocr`).

1. **Navigate to the AI service:**
   ```bash
   cd ai-service
   ```
2. **Create and activate a virtual environment:**
   ```bash
   # Windows
   python -m venv .venv
   .venv\Scripts\activate
   
   # Linux/macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the production server:**
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8002
   ```

*Note: Ensure the backend `AI_SERVICE_URL` variable is updated to point to this service.*

## 7. Spring Boot Backend Deployment

1. **Navigate to the backend:**
   ```bash
   cd backend
   ```
2. **Build the production JAR:**
   ```bash
   mvn clean package -DskipTests
   ```
3. **Run the application:**
   ```bash
   # Pass environment variables directly or rely on the system environment
   java -jar target/foodredistribution-0.0.1-SNAPSHOT.jar
   ```

## 8. Frontend Deployment

The Vite React application requires the production API URLs to be configured before building.

1. **Navigate to the frontend:**
   ```bash
   cd frontend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Build the production bundle:**
   ```bash
   npm run build
   ```
4. **Hosting:**
   The output is generated in the `dist/` directory. Upload this directory to your static hosting provider (Vercel, Netlify) or serve it via Nginx.

## 9. CORS and Service Communication

In `backend/src/main/java/.../SecurityConfig.java`, CORS is currently configured to `setAllowedOrigins(Collections.singletonList("*"))`.

**For Production:**
You must update this Java file to restrict origins to your actual frontend domain before compiling the JAR:
```java
configuration.setAllowedOrigins(Collections.singletonList("https://your-domain.com"));
```

## 10. Real-Time Deployment (WebSocket)

The application relies heavily on WebSockets for real-time volunteer tracking and delivery verification.

1. **WebSocket Endpoint:**
   The backend exposes `/ws/tracking`.
2. **Proxy Configuration:**
   If using a reverse proxy like Nginx, you must explicitly enable `Upgrade` headers for WebSocket support:
   ```nginx
   location /ws/ {
       proxy_pass http://localhost:8080;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "Upgrade";
   }
   ```
3. **Secure WebSockets (WSS):**
   If the frontend is served over HTTPS, the WebSocket connection *must* use `wss://`.

## 11. Image Upload and Storage

**Current Implementation:**
The backend writes uploaded images (Food pictures, delivery proofs) directly to the local disk in a folder named `uploads/` in the working directory (configured via `WebConfig.java`).

### ⚠️ Production Storage Recommendation
Local filesystem storage is **ephemeral** on modern cloud hosting (like Heroku, AWS ECS, or Docker). If the server restarts, all delivery proofs and food images will be lost, breaking the UI.

**Action Required:**
You must integrate a permanent Object Storage solution (like AWS S3, Cloudinary, or Firebase Storage) into `ShelterDeliveryService.java` and `FoodListingService.java` before going to production, OR ensure your deployment environment utilizes a persistent attached volume (like an AWS EBS volume mounted to `/uploads`).

## 12. Deployment Options

### Option A: Traditional VPS Deployment (Recommended for MVP)
1. Provision a single Linux server (e.g., Ubuntu).
2. Install Nginx, Java, Python, and MySQL.
3. Run the AI Service via `systemd` or `pm2`.
4. Run the Spring Boot JAR via `systemd`.
5. Serve the built React `dist/` folder directly through Nginx.
6. Configure Nginx to reverse proxy `/api` and `/ws` to the Spring Boot backend.

### Option B: Recommended Future Docker Setup
Currently, the repository does not contain Dockerfiles. Creating a `docker-compose.yml` that networks the Frontend, Backend, AI Service, and a MySQL container is highly recommended for scaling.

## 13. Recommended Deployment Order

1. Configure and start the **MySQL Database**.
2. Deploy the **AI Service** (ensure it's accessible).
3. Update backend environment variables (Database URL, JWT, AI Service URL).
4. Compile and deploy the **Spring Boot Backend**.
5. Verify backend health and AI connectivity.
6. Fix frontend hardcoded URLs (see Blockers below).
7. Build and deploy the **React Frontend**.
8. Test end-to-end workflow.

## 14. Post-Deployment Checklist

- [ ] **Authentication:** Registration, Login, and JWT parsing work.
- [ ] **Provider:** OCR image extraction successfully calls the AI service.
- [ ] **Volunteer:** Location tracking updates accurately without crashing.
- [ ] **Validation:** OTP and Proof Photo uploads execute successfully.
- [ ] **WebSockets:** Live deliveries update the dashboard without refreshing.
- [ ] **Admin:** Anomalies and zones fetch real data from the persistent DB.

## 15. Final Deployment Readiness Audit

Based on an exhaustive audit of the existing codebase, the following issues were identified.

### 🔴 DEPLOYMENT BLOCKERS (Must Fix Before Production)

1. **Hardcoded WebSocket URLs in Frontend**
   In the frontend components (`DashboardLayout.tsx`, `VolunteerDashboard.tsx`, `FindMatchingFood.tsx`, `FoodDetailPage.tsx`), the WebSocket URL is strictly hardcoded to localhost:
   `const wsUrl = \`${protocol}//localhost:8081/ws/tracking\`;`
   *Fix: You must change this to dynamically read the host or an environment variable (e.g., `import.meta.env.VITE_WS_URL`).*
2. **Frontend to Backend API Proxy**
   The frontend currently relies entirely on Vite's local development proxy (`vite.config.ts` proxying `/api` to `localhost:8081`). The production build of the frontend does not have an Axios Base URL configured.
   *Fix: Configure Axios default base URL for production, or serve the frontend via Nginx and proxy `/api` directly to the backend.*
3. **Port Mismatches in Configuration**
   The `application.yml` defaults the backend port to `8082`. The frontend `vite.config.ts` proxies to `8081`. The AI service `main.py` binds to `8002`, but `.env.example` lists `8000`.
   *Fix: Standardize and align these ports before finalizing your environment variables.*

### 🟡 RECOMMENDED IMPROVEMENTS

1. **Wildcard CORS:** Update `SecurityConfig.java` to restrict allowed origins instead of `*`.
2. **Ephemeral File Storage:** Migrate `uploads/` directory logic to Cloudinary or AWS S3 to prevent data loss upon server restart.
3. **.env Variables in Frontend:** Introduce `.env.production` for Vite to safely manage API routes across environments.

---
**Deployment Status:** `BLOCKED` (Requires resolution of hardcoded URLs and proxy configuration prior to building).
