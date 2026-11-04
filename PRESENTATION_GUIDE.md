# 🌟 FoodBridge — Complete Project Presentation & Technical Architecture Guide

---

## 1. What is FoodBridge? (The 30-Second Elevator Pitch)

> **"FoodBridge is an AI-powered, commute-based food logistics platform that rescues surplus food from restaurants and events, matching it with daily commuters who deliver it to verified shelters along their existing travel route with zero carbon deviation."**

### The Core Problem It Solves:
1. **The Food Waste Crisis**: Millions of tonnes of freshly prepared, high-quality food from restaurants, hotels, cafeterias, and events are discarded daily while nearby orphanages, shelters, and community kitchens face food shortages.
2. **The Logistics Barrier**: Traditional courier and food delivery services (e.g., Swiggy, Zomato, Dunzo) charge high delivery fees per trip, require commercial drivers, and create dedicated vehicle journeys that increase traffic and fuel emissions.
3. **The FoodBridge Solution**: Instead of hiring dedicated couriers, FoodBridge leverages **people who are already traveling** (daily commuters, office workers, college students) to pick up and drop off surplus meals along their existing travel corridor at zero logistical cost and zero extra carbon emissions.

---

## 2. The 5 Core Platform Roles & End-to-End Workflow

```text
[ Restaurant / Caterer / Donor ] ──(Uploads Receipt / Food Photo via AI)──> [ FoodBridge AI Vision Engine ]
                                                                                   │
                                                          Matches commuter route along daily travel corridor
                                                                                   │
                                                                                   ▼
[ Verified Shelter / NGO ] <──(Delivered with OTP & Photo Proof)── [ Daily Commuter Volunteer ]
         ▲
         │ (Verifies NGO Registration Certificates & Audit Flags)
[ System Administrator (Yashwardhan Kumar) ]
```

### 1. Food Provider (Restaurants & Commercial Kitchens)
* **AI Receipt & Food Photo Assistant**: The restaurant snaps a photo of the food dish or bill receipt.
* **Automated Extraction**: The multimodal AI vision engine automatically extracts food title, portion count, dietary category (VEG, NON_VEG), preparation timestamp, and estimated safe shelf life.
* **One-Click Publishing**: Food listing is instantly published to the logistics network.

### 2. Individual Donor
* Designed for households, parties, and small gatherings to donate surplus food easily without requiring commercial restaurant food licenses.

### 3. Volunteer (The Commuter)
* **Commute Route Registration**: The volunteer inputs their regular commute (e.g., *Home $\to$ Office* or *College $\to$ Home*).
* **Corridor Matching**: The system calculates the detour trajectory and presents surplus food tasks that lie directly on their way.
* **Step-by-Step Task Execution**:
  $$\text{Accept Task} \longrightarrow \text{Arrive at Provider} \longrightarrow \text{Confirm Pickup} \longrightarrow \text{In-Transit Live GPS} \longrightarrow \text{Drop Off at Shelter}$$

### 4. Community Coordinator (Shelters & NGOs)
* **Shelter Registration**: Registers orphanages, community kitchens, and shelters with precise location coordinates and official registration certificates (PDF or image).
* **Demand Requirements**: Posts daily dietary meal requirements and beneficiary counts.
* **Safe Handover**: Receives delivery and provides a dynamic **OTP** to the volunteer to verify completion.

### 5. Platform Administrator (Yashwardhan Kumar)
* **Strict Single Admin Access**: Centrally pre-configured governance console (`yashwardhankumar15@gmail.com`). Public registration is strictly disabled.
* **Shelter Verification**: Inspects uploaded NGO license proofs (embedded PDF viewer or high-resolution images) and approves or rejects submissions.
* **AI Fraud & Anomaly Review**: Inspects suspicious deliveries flagged by the Machine Learning anomaly engine (GPS distance mismatches, recycled photos, velocity anomalies).
* **Impact Analytics**: Monitors real-time platform impact (kg rescued, meals served, $\text{CO}_2$ emissions prevented).

---

## 3. The Complete Technology Stack

| Architecture Layer | Technologies Used | Key Reason for Selection |
|:---|:---|:---|
| **Frontend SPA** | **React 19 + TypeScript + Vite** | High-performance reactive UI state, strict compile-time type safety, sub-second HMR development. |
| **Styling & Design** | **Tailwind CSS + Lucide Icons** | Clean organic color system, accessible responsive layouts across mobile and desktop. |
| **Geospatial Maps** | **Leaflet + React-Leaflet (OpenStreetMap)** | Interactive polyline route tracing, pin dropping, and shelter geotagging without proprietary API fees. |
| **Backend Core** | **Spring Boot 3.3.2 (Java 21)** | Enterprise-grade transaction management (`@Transactional`), robust IoC architecture, and high throughput. |
| **Security & Auth** | **Spring Security 6 + Stateless JWT** | Cryptographically signed Bearer tokens with strict Role-Based Access Control (`PROVIDER`, `VOLUNTEER`, `COORDINATOR`, `ADMIN`). |
| **Database & ORM** | **PostgreSQL (Render) / Hibernate JPA** | Relational data integrity, foreign key cascades, and `@Lob` binary BLOB storage for tamper-proof document preservation. |
| **Real-time Live Tracking** | **Spring WebSockets (STOMP Protocol)** | Bidirectional, full-duplex coordinate streaming from volunteer devices to the Coordinator dashboard. |
| **AI Vision Microservice** | **FastAPI (Python 3.10+)** | High-speed asynchronous microservice bridging Python ML libraries with the Java backend. |
| **Multimodal Vision** | **Google Gemini 2.5 Flash API + EasyOCR** | Ultra-fast multimodal visual reasoning on receipts and food photos with bounding-box OCR fallback. |
| **Anomaly & Fraud ML** | **Scikit-Learn (Isolation Forest) + Joblib** | Unsupervised machine learning detecting multi-dimensional behavioral anomalies and location spoofing. |
| **Visual Hashing** | **ImageHash (dHash — Difference Hashing)** | 64-bit structural perceptual hashing with Hamming Distance comparison to prevent recycled photo fraud. |
| **Cloud Hosting** | **Render & Vercel** | Vercel Global Edge CDN for frontend SPA; Render containerized services for Backend and AI engine. |

---

## 4. Deep Dive into the Core Algorithms

### Algorithm 1: Commute Route Corridor & Vector Projection
* **Source**: `MatchingService.java`
* **Objective**: Ensure volunteers are matched with tasks that create negligible travel deviation from their daily journey.

1. **Haversine Spherical Distance Formula**:
   Calculates great-circle distance between two GPS coordinates $(lat_1, lon_1)$ and $(lat_2, lon_2)$ over Earth's curved surface ($R = 6371\text{ km}$):
   $$a = \sin^2\left(\frac{\Delta lat}{2}\right) + \cos(lat_1)\cos(lat_2)\sin^2\left(\frac{\Delta lon}{2}\right)$$
   $$d = 2R \cdot \arctan2\left(\sqrt{a}, \sqrt{1 - a}\right)$$

2. **Orthogonal Vector Projection onto Road Polyline**:
   A commuter's path consists of consecutive coordinates $(A \to B \to C)$. To evaluate if food provider $P$ is along their travel corridor, point $P$ is orthogonally projected onto line segment $\vec{AB}$:
   $$t = \frac{(lat_P - lat_A)(lat_B - lat_A) + (lon_P - lon_A)(lon_B - lon_A)}{|\vec{AB}|^2}$$
   * Scalar $t$ is clamped to $[0, 1]$:
     * $t = 0 \implies$ Closest to start node $A$
     * $t = 1 \implies$ Closest to end node $B$
     * $0 < t < 1 \implies$ Projected perpendicular point falls directly along the road between $A$ and $B$.
   * Perpendicular corridor distance:
     $$\text{Distance to Route} = \text{Haversine}(P, \text{Projected Point})$$

3. **Trajectory Detour Calculation**:
   $$\text{Extra Detour} = \text{Dist}(\text{Current} \to \text{Pickup}) + \text{Dist}(\text{Pickup} \to \text{Shelter}) + \text{Dist}(\text{Shelter} \to \text{Destination}) - \text{Direct Commute Dist}$$
   * If $\text{Extra Detour} \le 2.0\text{ km}$, the task qualifies as a **zero-carbon detour match**!

---

### Algorithm 2: Multi-Criteria Decision Analysis (MCDA) Matching Score
* **Source**: `MatchingService.java` (`calculateMatchingScoreCustom`)
* **Objective**: Rank and prioritize which volunteer should receive a task recommendation when multiple commuters share the same corridor.

#### The 6-Factor Weighted Mathematical Model (Score 0 to 100):
$$\text{Score} = 0.25 \cdot S_{\text{Route}} + 0.20 \cdot S_{\text{Distance}} + 0.15 \cdot S_{\text{Position}} + 0.15 \cdot S_{\text{Reliability}} + 0.15 \cdot S_{\text{Urgency}} + 0.10 \cdot S_{\text{Capacity}}$$

| Criterion | Weight | Scoring Mechanism |
|:---|:---:|:---|
| **$S_{\text{Route}}$ (Route Compatibility)** | **25%** | Evaluates detour penalty ($15\%$ per km detour) and corridor deviation ($50\%$ per km off road). |
| **$S_{\text{Distance}}$ (Proximity to Pickup)** | **20%** | Proximity of volunteer's current GPS location to the food provider ($20\%$ penalty per km). |
| **$S_{\text{Position}}$ (Ahead vs. Behind)** | **15%** | $100\text{ pts}$ if pickup is ahead in travel direction; $10\text{ pts}$ if already passed (prevents backtracking). |
| **$S_{\text{Reliability}}$ (Volunteer Trust Score)** | **15%** | Volunteer's historical completion reliability score ($0.0 \text{ to } 1.0 \times 100$). |
| **$S_{\text{Urgency}}$ (Food Expiry Window)** | **15%** | Expiry $\le 30\text{ mins} \implies 100\text{ pts}$ (urgent); $\le 2\text{ hrs} \implies 80\text{ pts}$; $>2\text{ hrs} \implies$ normal. |
| **$S_{\text{Capacity}}$ (Vehicle Capacity Match)** | **10%** | Compares meal portion count against volunteer transport mode (walking, bike, motorbike, car). |

---

### Algorithm 3: Multimodal AI Vision & Semantic Receipt Parsing
* **Source**: `ai-service/app/main.py`
* **Objective**: Convert raw dish photos or thermal paper receipts into structured inventory data without manual typing.

1. **Preprocessing Pipeline**: Image normalized to RGB, EXIF orientation corrected, resized with Lanczos interpolation.
2. **Vision Transformer Prompting (Gemini 2.5 Flash)**:
   * Extracts dish names, individual line-item quantities, and unit pricing.
   * Performs semantic classification: dietary type (`VEG`, `NON_VEG`), meal servings estimate, allergens.
   * Calculates safe shelf-life window based on preparation time and food classification.
3. **EasyOCR Fallback**: If receipt contrast is poor or lighting is uneven, local EasyOCR bounding-box extraction reads text lines and merges them into the parsing pipeline.

---

### Algorithm 4: Unsupervised Anomaly Detection (Isolation Forest)
* **Source**: `ai-service/app/services/fraud_detector.py`
* **Objective**: Detect fake deliveries, cheating, and location spoofing without requiring labeled historical fraud datasets.

#### Why Isolation Forest?
Traditional classifiers require massive sets of labeled fraud examples. However, delivery fraud patterns mutate constantly. **Isolation Forest** is an unsupervised anomaly detection algorithm based on the concept that anomalous observations are **"few and different"**, making them easier to isolate in random recursive decision tree splits than normal data points.

#### The 9-Dimensional Telemetry Vector:
$$\vec{X} = [\text{Cancellation Rate}, \text{GPS Mismatch Rate}, \text{Route Ratio}, \text{Time Ratio}, \text{OTP Failures}, \text{Proof Failures}, \text{Duplicate Proof Flag}, \text{Past Warnings}, \text{Total Deliveries}]$$

1. **StandardScaler Transformation**: Standardizes telemetry to zero mean and unit variance.
2. **Decision Function Score**:
   $$s(x, n) = 2^{-\frac{E(h(x))}{c(n)}}$$
   * A negative decision score identifies the telemetry vector as a **statistical outlier**.

---

### Algorithm 5: Difference Perceptual Image Hashing (dHash) & Anti-Recycling
* **Source**: `ai-service/app/services/fraud_detector.py`
* **Objective**: Prevent volunteers from recycling one single photo of a food dropoff for multiple delivery claims.

#### Why Not Standard Cryptographic Hashes (MD5 / SHA-256)?
Cryptographic hashes suffer from the *Avalanche Effect*: if an image is re-saved, resized by 1 pixel, or slightly compressed, the SHA-256 hash completely changes. **dHash** captures the visual structural gradients of the image.

#### The 4-Step dHash Process:
1. **Downsample to $9 \times 8$ Grayscale**: Discards high-frequency noise and color variations, leaving 72 intensity pixels.
2. **Compute Horizontal Gradients**:
   $$\text{Bit} = 1 \quad \text{if } P[x, y] > P[x+1, y] \quad \text{else } 0$$
   Produces an exact **64-bit visual fingerprint**.
3. **Hamming Distance Comparison**:
   Calculates bitwise XOR differences against all previously submitted delivery hashes in the database:
   $$\text{Hamming Distance} = \sum (\text{Hash}_{\text{new}} \oplus \text{Hash}_{\text{stored}})$$
4. **Evaluation Threshold**:
   * If $\text{Hamming Distance} \le 6$ (out of 64 bits), the photos are structurally identical $\implies$ **FLAGGED AS REUSED FRAUD PHOTO**.

---

### Algorithm 6: Environmental Carbon Offset Model
* **Source**: `TokenService.java`
* **Objective**: Measure and display verifiable carbon savings across the platform.
* **Scientific Formula** (UNEP / Food and Agriculture Organization benchmark):
  $$\text{CO}_2\text{ Emissions Prevented (kg)} = \text{Food Rescued (kg)} \times 2.5\text{ kg CO}_2/\text{kg}$$
  Rescuing **$100\text{ kg}$ of surplus food** directly prevents **$250\text{ kg}$ of greenhouse gas emissions** (methane and carbon dioxide) generated by landfill decomposition.

---

## 5. Anomaly & Fraud Detection Engine (Composite Risk Model)

```text
                       [ Volunteer Submits Delivery Proof ]
                                        │
    ┌───────────────────────────────────┼───────────────────────────────────┐
    ▼                                   ▼                                   ▼
[ 1. Image Perceptual Hashing ]  [ 2. GPS Haversine Radius ]    [ 3. Time & Speed Check ]
   (Detects recycled photos)       (Validates within 500m)         (Flags impossible speeds)
    └───────────────────────────────────┬───────────────────────────────────┘
                                        │
                                        ▼
                  [ 4. Unsupervised ML: Isolation Forest ]
                     (Analyzes 9-dimensional volunteer behavior)
                                        │
                                        ▼
                  [ 5. Composite Risk Score Engine (0 - 100) ]
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
    Score < 35 (LOW RISK)                                 Score ≥ 70 (HIGH RISK)
       Auto-Approved                                        Held & Sent to Admin
   (Rewards Released Instantly)                          (Admin "Anomalies Review" Tab)
```

### The Composite Multi-Factor Scoring Formula (0 to 100):
$$\text{Risk Score} = 0.30 \cdot \text{Behaviour} + 0.25 \cdot \text{GPS} + 0.25 \cdot \text{Proof Photo} + 0.10 \cdot \text{Route} + 0.10 \cdot \text{Time}$$

| Risk Tier | Score Range | Action Executed by System |
|:---:|:---:|:---|
| **LOW** | **0 – 34** | **Auto-Approved**: Task marked complete, impact reward tokens credited immediately. |
| **MEDIUM** | **35 – 69** | **Audit Logged**: Flagged for background audit; tokens conditionally held. |
| **HIGH** | **70 – 100** | **Blocked & Held**: Tokens frozen, task flagged as suspicious, escalated to Admin Console. |

---

## 6. How to Inspect Database & User Logins

### Method 1: The Administrative Center (Website UI)
* Open: **`https://foodbridgeee.vercel.app/login`**
* Sign in as Administrator:
  * **Email**: `yashwardhankumar15@gmail.com`
  * **Password**: `1234`
* Navigate through:
  * **Dashboard**: System-wide counts of registered providers, volunteers, and deliveries.
  * **Pending Shelters**: Inspect coordinator shelter submissions and click to view uploaded NGO certificates (PDF or Image).
  * **Anomalies Review**: Inspect deliveries flagged by the ML anomaly engine.

### Method 2: Live Server Logs on Render
* Open **dashboard.render.com** $\to$ Select backend service (`major-project-1-rcud`) $\to$ Click **Logs**.
* Real-time events are streamed live:
  * `POST /api/v1/auth/login` — User authentication events.
  * `POST /api/v1/auth/register` — New participant registrations.
  * `COORDINATOR SHELTER_CREATED` — New shelter submissions.

### Method 3: Direct Database Queries (SQL)
Connect to your PostgreSQL database on Render or via DBeaver/pgAdmin:
```sql
-- 1. View all registered accounts
SELECT id, name, email, role, phone_number, created_at FROM users;

-- 2. View all food providers / restaurants
SELECT * FROM food_providers;

-- 3. View all registered volunteers
SELECT * FROM volunteers;

-- 4. View live system audit logs
SELECT * FROM audit_logs ORDER BY timestamp DESC;

-- 5. View all posted food listings
SELECT id, title, quantity, category, status, expiry_time FROM food_listings;
```

---

## 7. Recommended Live Presentation Demo Script (5-7 Minutes)

### Step 1: Landing Page & Problem Statement (1 min)
* Open **`https://foodbridgeee.vercel.app`**.
* Highlight the clean UI and live metrics (*Kg Saved, Meals Delivered*).
* Deliver the elevator pitch: *"We connect surplus food to shelters using commuters' existing routes."*

### Step 2: Food Provider AI Upload (1.5 min)
* Log in as **Restaurant (`PROVIDER`)**.
* Open **"Create Listing"**. Upload a receipt or food photo.
* Demonstrate how the AI automatically populates title, portions, dietary category, and shelf life. Click **Submit**.

### Step 3: Volunteer Commute Matching & Delivery (2 min)
* Log in as **Volunteer**.
* Display the active commute route corridor on the interactive map.
* Accept the newly created task. Click **"Start Pickup"** $\to$ **"Confirm Pickup"** $\to$ Show live route moving toward the shelter.

### Step 4: Coordinator OTP & Admin Review (2 min)
* Log in as **Coordinator**: Open the shelter dashboard and generate the secret **OTP** to complete delivery.
* Log in as **Admin (`yashwardhankumar15@gmail.com` / `1234`)**:
  * Open the **Administrative Center**.
  * View pending shelter verification proofs (demonstrate the embedded PDF viewer and image zoom).
  * Open the **Fraud / Anomalies Review** tab showing the Isolation Forest telemetry analysis.

---

## 8. Common Viva / Evaluator Questions & Crisp Answers

**Q1: Why choose commuters over commercial delivery partners like Swiggy or Zomato?**
> *"Commercial delivery partners charge delivery fees per order and create dedicated vehicle journeys that increase traffic and fuel burn. Commuters are already making the trip anyway, resulting in zero-cost logistics and zero-carbon detour."*

**Q2: Why use an Unsupervised Isolation Forest instead of standard Supervised Classification?**
> *"Redistribution fraud is rare and constantly evolving—we do not have thousands of pre-labeled historical fraud datasets. Isolation Forest isolates anomalies without requiring prior labels by measuring how few random tree splits are needed to separate an outlier from the normal cluster."*

**Q3: How do you prevent people from recycling old food dropoff photos?**
> *"We use Difference Hashing (dHash) to generate a 64-bit structural fingerprint of every uploaded proof. If the Hamming Distance between a new upload and any past delivery photo is 6 or less, the system immediately flags it as a duplicate recycled photo."*

**Q4: How do you handle poor GPS accuracy indoors or in basements?**
> *"The backend checks reported GPS horizontal accuracy. If accuracy exceeds 150 meters, the system flags a warning for administrator review instead of auto-rejecting the delivery, allowing legitimate volunteers to be verified by the coordinator."*
