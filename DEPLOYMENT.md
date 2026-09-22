# FoodBridge / AnnaSetu Production Deployment Guide

This guide provides an end-to-end, production-grade deployment walkthrough for the **AnnaSetu / FoodBridge Surplus Food Redistribution Platform**.

---

## 1. Production Architecture Overview

```text
React Frontend (Vite + Tailwind + Leaflet)
            │
            ▼  (HTTPS / REST / JSON)
       [ Vercel ]
            │
            ├──────────────┐
            ▼ (WSS / REST) ▼ (REST / Multipart)
   Spring Boot Backend   FastAPI AI Service
    (Java 21 + JPA)     (Python + EasyOCR)
    [ Render / Railway ] [ Render / Railway ]
            │                  │
            ▼ (JDBC)           ▼ (Inference / dHash)
     Managed MySQL           Isolated ML Models
  [ Aiven / Railway DB ]    (Isolation Forest + RF)
```

### Component Justification & Hosting Selection

| Service | Technology | Selected Host | Justification |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | **Vercel** | Free global CDN, automatic SSL/HTTPS, instant GitHub CD, built-in SPA routing rewrites. |
| **Backend API** | Spring Boot 3.3.2 (Java 21) | **Render / Railway** | Native Docker / Java container support, automatic `$PORT` binding, full WebSockets (WSS) support. |
| **AI Microservice** | FastAPI + PyTorch + EasyOCR | **Render / Railway** | Python environment support, automatic `$PORT` binding, fast ML model startup. |
| **Database** | Managed MySQL 8.0 | **Aiven / Railway MySQL** | Dedicated managed relational database, persistent storage, connection pooling, SSL encryption. |
| **File Storage** | Multipart Uploads | **Render Volume / Cloudinary** | Persistent storage for delivery proof photos and NGO license certificates without ephemeral wiping. |

---

## 2. Pre-Deployment Checklist

- [x] Git repository is clean (`.gitignore` excludes `.env`, `node_modules`, `dist/`, `target/`).
- [x] No passwords, secret keys, or database credentials committed to source code.
- [x] Production health check endpoints created:
  - Spring Boot Backend: `GET /api/health`
  - FastAPI AI Service: `GET /health`
- [x] SPA fallback configured for React Router (`frontend/vercel.json`).
- [x] CORS origin handling updated in Spring Boot (`SecurityConfig.java` reads `ALLOWED_ORIGINS`).
- [x] Dynamic WebSocket (WSS) URL fallback configured in frontend components.
- [x] FastAPI port binding updated to respect `$PORT` environment variable.

---

## 3. Step-by-Step Deployment Order

### STEP 1: Prepare GitHub Repository
1. Commit all recent changes:
   ```bash
   git add .
   git commit -m "Configure production health checks, CORS, and deployment settings"
   git push origin main
   ```

---

### STEP 2: Deploy Managed MySQL Database (Aiven or Railway)
1. Sign up on **Aiven** (aiven.io) or **Railway** (railway.app).
2. Create a new **MySQL 8.0** service named `foodbridge-db`.
3. Copy the database connection parameters:
   - **Host**: e.g., `mysql-foodbridge-project.aivencloud.com`
   - **Port**: e.g., `12345` or `3306`
   - **Database Name**: `fooddb`
   - **Username**: e.g., `avnadmin`
   - **Password**: `<your-db-password>`
4. Construct the Spring Boot JDBC Connection URL:
   `jdbc:mysql://<HOST>:<PORT>/fooddb?useSSL=true&allowPublicKeyRetrieval=true`

---

### STEP 3: Deploy FastAPI AI Service (Render / Railway)
1. Sign in to **Render** (render.com) or **Railway**.
2. Click **New Web Service** $\rightarrow$ Connect your GitHub Repository.
3. Set the following build and run parameters:
   - **Root Directory**: `ai-service`
   - **Environment**: `Python 3.10+`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables:
   - `PORT`: `8000` (automatically set by Render)
   - `GEMINI_API_KEY`: `<optional-gemini-key>`
5. Click **Deploy**. Note down your live FastAPI URL:
   `https://foodbridge-ai.onrender.com`
6. Verify Health Endpoint:
   `curl https://foodbridge-ai.onrender.com/health`
   Expected Output: `{"status":"UP","service":"AnnaSetu AI Service"}`

---

### STEP 4: Deploy Spring Boot Backend (Render / Railway)
1. In **Render** or **Railway**, click **New Web Service** $\rightarrow$ Select GitHub Repository.
2. Set configuration:
   - **Root Directory**: `backend`
   - **Environment**: `Docker` or `Java` (Java 21)
   - **Build Command**: `./mvnw clean package -DskipTests`
   - **Start Command**: `java -jar target/foodredistribution-0.0.1-SNAPSHOT.jar`
3. Add Production Environment Variables in dashboard:
   - `DATABASE_URL`: `jdbc:mysql://<DB_HOST>:<DB_PORT>/fooddb?useSSL=true`
   - `DATABASE_USERNAME`: `<DB_USER>`
   - `DATABASE_PASSWORD`: `<DB_PASS>`
   - `DATABASE_DRIVER`: `com.mysql.cj.jdbc.Driver`
   - `JPA_DIALECT`: `org.hibernate.dialect.MySQLDialect`
   - `JWT_SECRET`: `<generate-a-strong-256-bit-random-secret>`
   - `AI_SERVICE_URL`: `https://foodbridge-ai.onrender.com`
   - `ALLOWED_ORIGINS`: `https://foodbridge.vercel.app`
   - `DELIVERY_GEOFENCE_RADIUS_METERS`: `100.0`
4. Click **Deploy**. Note down your live Backend URL:
   `https://foodbridge-backend.onrender.com`
5. Verify Health Endpoint:
   `curl https://foodbridge-backend.onrender.com/api/health`
   Expected Output: `{"status":"UP","service":"FoodBridge Backend Engine"}`

---

### STEP 5: Deploy React Frontend (Vercel)
1. Log in to **Vercel** (vercel.com) $\rightarrow$ **Add New Project** $\rightarrow$ Import GitHub Repository.
2. Select Framework Preset: **Vite**.
3. Set **Root Directory**: `frontend`.
4. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://foodbridge-backend.onrender.com`
   - `VITE_WS_URL`: `wss://foodbridge-backend.onrender.com`
5. Click **Deploy**.
6. Note down your live Frontend URL:
   `https://foodbridge.vercel.app`

---

## 4. Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **CORS Error in Browser** | Backend `ALLOWED_ORIGINS` does not match Frontend domain | Update `ALLOWED_ORIGINS` in Render backend env variables to include exact Vercel URL. |
| **WebSocket Connection Failed** | Frontend connecting via `ws://` instead of `wss://` | Ensure `VITE_WS_URL` is set to `wss://<backend-host>` on Vercel. |
| **Database Connection Timeout** | Managed MySQL host/port wrong or SSL required | Verify `DATABASE_URL` uses SSL parameters (`?useSSL=true`). |
| **FastAPI 502 Bad Gateway** | FastAPI not listening on injected `$PORT` | Verify start command uses `--port $PORT` in Render. |
| **404 Page Not Found on Refresh** | SPA router path not rewritten by static web server | Verify `frontend/vercel.json` contains `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`. |

---

## 5. Estimated Monthly Pilot Cost

| Service | Free Tier / Plan | Monthly Cost |
| :--- | :--- | :--- |
| **Vercel** (Frontend) | Hobby Free Tier | **$0.00** |
| **Render** (Spring Boot Backend) | Free Web Service (512MB RAM) | **$0.00** |
| **Render** (FastAPI AI Service) | Free Web Service (512MB RAM) | **$0.00** |
| **Aiven / Railway** (MySQL DB) | Free Trial / Hobby $5 credit | **$0.00 - $5.00** |
| **Total Estimated Cost** | **Pilot Deployment** | **$0.00 - $5.00 / month** |
