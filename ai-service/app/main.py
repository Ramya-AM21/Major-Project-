import uvicorn
from fastapi import FastAPI, Query
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import LabelEncoder
import datetime
import random

app = FastAPI(title="Route-Based Food Waste Management AI Service", version="1.0.0")

# --- INITIALIZE DEMAND PREDICTION MODEL (RANDOM FOREST) ---
# Generate mock historical training data
np.random.seed(42)
days = [i % 7 for i in range(500)] # 0: Monday, 6: Sunday
hours = [random.choice([8, 12, 17, 20]) for _ in range(500)]
capacities = [random.choice([100, 120, 150, 200]) for _ in range(500)]
previous_demand = [capacity * random.uniform(0.3, 0.9) for capacity in capacities]
seasonality = [1.2 if d in [5, 6] else 0.95 for d in days] # weekends have higher demand

meals_served = []
for d, h, c, prev, seas in zip(days, hours, capacities, previous_demand, seasonality):
    # Base calculation + noise
    base = prev * seas
    if h == 20: # night slot has more demand
        base *= 1.15
    elif h == 8: # breakfast has lower demand
        base *= 0.70
    served = min(c, max(10, base + np.random.normal(0, 15)))
    meals_served.append(round(served))

df_demand = pd.DataFrame({
    'day_of_week': days,
    'time_slot_hour': hours,
    'capacity': capacities,
    'previous_demand': previous_demand,
    'meals_served': meals_served
})

X_demand = df_demand[['day_of_week', 'time_slot_hour', 'capacity', 'previous_demand']]
y_demand = df_demand['meals_served']

demand_model = RandomForestRegressor(n_estimators=50, random_state=42)
demand_model.fit(X_demand, y_demand)
print("Random Forest Demand Model trained successfully.")

# --- INITIALIZE ANOMALY DETECTION MODEL (ISOLATION FOREST) ---
# Features for anomaly detection: [travel_speed(km/h), repeated_photo(0/1), repeated_gps(0/1)]
normal_deliveries = []
for _ in range(200):
    speed = np.random.normal(25, 8) # normal city transit speed
    photo = 0 if random.random() > 0.05 else 1
    gps = 0 if random.random() > 0.05 else 1
    normal_deliveries.append([speed, photo, gps])

anomalous_deliveries = [
    [150.0, 0, 0], # impossible transit speed (150 km/h in city)
    [18.0, 1, 1],  # reuse of photo and GPS tracker fingerprints
    [210.0, 1, 0], # extreme speed & duplicate image fingerprint
    [3.0, 1, 1]    # stalled speed & duplicated parameters
]

X_anomaly = np.array(normal_deliveries + anomalous_deliveries)
anomaly_detector = IsolationForest(contamination=0.08, random_state=42)
anomaly_detector.fit(X_anomaly)
print("Isolation Forest Anomaly Model trained successfully.")


# --- DTOS ---
class AnomalyRequest(BaseModel):
    taskId: str
    travelSpeed: float
    repeatedPhoto: bool
    repeatedGps: bool


# --- REST ENDPOINTS ---
@app.get("/api/v1/ai/predict-demand")
def predict_demand(zoneId: str = Query(..., description="UUID of the receiving community zone")):
    # Extract current parameters
    now = datetime.datetime.now()
    day_of_week = now.weekday()
    hour = now.hour
    
    # We assign default capacity based on simulated zone metadata
    capacity = 150
    if "north" in zoneId.lower() or "malleswaram" in zoneId.lower():
        capacity = 120
    elif "transit" in zoneId.lower():
        capacity = 200
        
    prev_demand = capacity * 0.72 # mock base
    
    # Predict
    input_data = pd.DataFrame([[day_of_week, hour, capacity, prev_demand]], 
                              columns=['day_of_week', 'time_slot_hour', 'capacity', 'previous_demand'])
    predicted_meals = float(demand_model.predict(input_data)[0])
    
    # Calculate confidence interval metric based on Forest trees variance
    predictions = [tree.predict(input_data)[0] for tree in demand_model.estimators_]
    variance = np.var(predictions)
    # Scale variance to support confidence display score (0.75 - 0.95 range)
    confidence = max(0.70, min(0.96, 0.95 - (variance / 800.0)))
    
    # Priority classification
    fill_ratio = predicted_meals / capacity
    if fill_ratio > 0.80:
        priority = "HIGH"
    elif fill_ratio > 0.45:
        priority = "MEDIUM"
    else:
        priority = "LOW"
        
    return {
        "zoneId": zoneId,
        "predictedMeals": round(predicted_meals),
        "confidence": round(confidence, 2),
        "priority": priority
    }


@app.post("/api/v1/ai/detect-anomaly")
def detect_anomaly(req: AnomalyRequest):
    photo_val = 1 if req.repeatedPhoto else 0
    gps_val = 1 if req.repeatedGps else 0
    
    features = np.array([[req.travelSpeed, photo_val, gps_val]])
    
    # Isolation forest predicts -1 for anomalies, 1 for normal
    prediction = anomaly_detector.predict(features)[0]
    score = float(anomaly_detector.decision_function(features)[0]) # lower scores mean more anomalous
    
    if prediction == -1:
        if req.travelSpeed > 100.0:
            risk = "HIGH RISK"
            reason = f"Impossible travel speed ({round(req.travelSpeed, 2)} km/h)"
        elif req.repeatedPhoto and req.repeatedGps:
            risk = "HIGH RISK"
            reason = "Duplicated photo proof and tracking path fingerprints"
        elif req.repeatedPhoto:
            risk = "HIGH RISK"
            reason = "Duplicate image hash match against database entries"
        else:
            risk = "SUSPICIOUS"
            reason = "Inconsistent geolocation trajectory and travel duration"
    else:
        risk = "NORMAL"
        reason = "All tracking indicators are within normal parameters"
        
    return {
        "taskId": req.taskId,
        "riskLevel": risk,
        "anomalyReason": reason,
        "decisionScore": round(score, 4)
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
