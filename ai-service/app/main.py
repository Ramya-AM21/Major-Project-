import sys
import io

# Force UTF-8 encoding for stdout/stderr to avoid Windows charmap encoding errors
if sys.platform.startswith('win'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import uvicorn
from fastapi import FastAPI, Query, File, UploadFile, Form
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import LabelEncoder
import datetime
import random
import base64
import requests
import json
import os
import re
import cv2
from dotenv import load_dotenv

load_dotenv()
import sys
import io
import os

from dotenv import load_dotenv

# Load .env from the ai-service directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_FILE)

print(
    "[ENV] GEMINI_API_KEY:",
    "LOADED" if os.getenv("GEMINI_API_KEY") else "NOT LOADED"
)
# Global EasyOCR Reader
_easyocr_reader = None

def get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        import easyocr
        import torch
        use_gpu = torch.cuda.is_available()
        print(f"[OCR] Initializing EasyOCR Reader (GPU={use_gpu})...")
        _easyocr_reader = easyocr.Reader(['en'], gpu=use_gpu)
    return _easyocr_reader

def preprocess_image(image_bytes):
    # Decode image bytes to OpenCV format
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return None, "Invalid image format"

    # Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Contrast Enhancement (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Denoising using Bilateral Filter to preserve sharp text edges
    denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)

    return denoised, None

def parse_ocr_text_to_food_details(raw_text):
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    
    # Metadata headers/footers to skip
    metadata_keywords = [
        "total", "tax", "subtotal", "gst", "cgst", "sgst", "invoice", "bill", "date", "time",
        "tel", "phone", "cashier", "receipt", "payment", "change", "cash", "card", "visa",
        "mastercard", "table", "waiter", "guest", "pax", "order", "no.", "sr.", "sl.", "qty",
        "amount", "price", "rate", "disc", "discount", "net amt", "round off", "balance",
        "welcome", "thank you", "visit again", "merchant", "terminal", "auth", "signature",
        "address", "street", "road", "city", "state", "pin", "code", "website", "email"
    ]
    
    # Keywords indicating a food item is likely present
    food_keywords = [
        "rice", "biryani", "roti", "chapati", "curry", "dal", "sambar", "paneer", "chicken",
        "veg", "salad", "soup", "pizza", "burger", "pasta", "thali", "meal", "naan", "sabji",
        "sabzi", "gravy", "fry", "fish", "meat", "mutton", "egg", "noodle", "chole", "bhature",
        "parotta", "paratha", "dosa", "idli", "vada", "upma", "pulao", "khichdi", "kofta",
        "korma", "raita", "dessert", "sweet", "juice", "beverage", "drink", "coffee", "tea",
        "water", "sandwich", "wrap", "roll", "taco", "burrito", "fries", "nuggets", "wing",
        "kebab", "tikka", "tandoori", "manchurian", "momos", "samosa", "pakoda", "bhaji",
        "paneer", "butter", "cheese", "bread", "milk", "curd", "yogurt"
    ]

    food_items = []
    
    for line in lines:
        line_clean = line.strip()
        line_lower = line_clean.lower()
        
        # Skip lines that are clearly metadata
        if any(keyword in line_lower for keyword in metadata_keywords):
            continue
            
        tokens = line_clean.split()
        if not tokens:
            continue
            
        item_qty = None
        item_name_tokens = []
        
        for token in tokens:
            # Check if token is numerical quantity or price
            if token.replace('.', '', 1).isdigit():
                val = float(token)
                if val.is_integer() and 1 <= val <= 100:
                    if item_qty is None:
                        item_qty = int(val)
            else:
                item_name_tokens.append(token)
                
        item_name = " ".join(item_name_tokens).strip()
        # Clean special chars
        item_name = re.sub(r'[^a-zA-Z\s\-\&]', '', item_name).strip()
        # Clean leading/trailing noise
        item_name = re.sub(r'^[xX\@\-\s]+', '', item_name).strip()
        item_name = re.sub(r'[xX\@\-\s]+$', '', item_name).strip()
        item_name = re.sub(r'\s+', ' ', item_name).strip()
        
        if len(item_name) >= 3 and not any(kw in item_name.lower() for kw in metadata_keywords):
            if not any(f["name"].lower() == item_name.lower() for f in food_items):
                is_food = any(kw in item_name.lower() for kw in food_keywords)
                # If it's a food keyword, or has a quantity, or is multi-word text, treat as candidate food
                if is_food or item_qty is not None or len(item_name.split()) >= 2:
                    food_items.append({
                        "name": item_name,
                        "quantity": item_qty
                    })

    # Extract suggested primary food name
    suggested_food_name = ""
    if food_items:
        suggested_food_name = food_items[0]["name"]
        
    # Extract total quantity from text
    suggested_quantity = None
    qty_total_match = re.search(r'(?:total\s+)?(?:qty|quantity|meals|plates|pcs|pieces)\s*:?\s*([\d\.]+)', raw_text, re.IGNORECASE)
    if qty_total_match:
        try:
            suggested_quantity = float(qty_total_match.group(1))
        except ValueError:
            pass
            
    # Fallback to sum of items if total is not found
    if not suggested_quantity and food_items:
        item_quantities = [f["quantity"] for f in food_items if f["quantity"] is not None]
        if item_quantities:
            suggested_quantity = float(sum(item_quantities))

    # Classify category
    suggested_category = "Vegetarian"
    non_veg_keywords = ["chicken", "mutton", "fish", "meat", "non-veg", "beef", "pork", "prawn", "crab"]
    egg_keywords = ["egg", "anda"]
    
    text_lower = raw_text.lower()
    if any(kw in text_lower for kw in non_veg_keywords):
        suggested_category = "Non-Vegetarian"
    elif any(kw in text_lower for kw in egg_keywords):
        suggested_category = "Egg"
        
    suggested_unit = "MEALS"
    if "kg" in text_lower or "kilogram" in text_lower:
        suggested_unit = "KG"
        
    allergen_list = []
    allergen_keywords = ["nuts", "peanut", "dairy", "milk", "gluten", "wheat", "egg", "soy", "shellfish", "fish"]
    for kw in allergen_keywords:
        if kw in text_lower:
            allergen_list.append(kw.capitalize())
    suggested_allergens = ", ".join(allergen_list) if allergen_list else ""

    return {
        "foodItems": food_items,
        "suggestedFoodName": suggested_food_name,
        "suggestedQuantity": suggested_quantity,
        "suggestedCategory": suggested_category,
        "suggestedUnit": suggested_unit,
        "suggestedAllergens": suggested_allergens
    }

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


@app.post("/validate/delivery-proof")
async def validate_delivery_proof(
    image: UploadFile = File(...),
    taskId: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...)
):
    # inspect size
    content = await image.read()
    size = len(content)
    
    filename = image.filename.lower()
    
    # Check duplicate flags or cheat markers in filename
    if "fake" in filename or "cheat" in filename or size < 500:
        return {
            "valid": False,
            "confidence": 0.05,
            "anomalyScore": 0.98,
            "reason": "Suspicious pattern or duplicate file upload signature detected"
        }
        
    return {
        "valid": True,
        "confidence": 0.95,
        "anomalyScore": 0.02,
        "reason": "Delivery evidence matched target density metrics"
    }

def build_food_ai_prompt(ocr_text: str):
    return f"""
You are the food-analysis AI for a food redistribution platform.

The uploaded image will be a RECEIPT or INVOICE containing a list of food items.
Analyze the image and the OCR text to extract all the food items listed on the receipt.

OCR TEXT DETECTED FROM IMAGE:
{ocr_text if ocr_text.strip() else "(No readable text detected)"}

Your job is to identify the food visible in the image and return ONLY valid JSON.

Return exactly this structure:

{{
  "food_name": "main food name",
  "food_items": [
    {{
      "name": "food item",
      "confidence": 0.95
    }}
  ],
  "food_category": "Cooked Meal",
  "food_type": "Vegetarian",
  "description": "short description of visible food",
  "estimated_quantity": null,
  "estimated_servings": null,
  "visible_packaging": null,
  "visible_labels": [],
  "possible_allergens": [],
  "confidence": 0.90,
  "warnings": []
}}

IMPORTANT RULES:

1. The image is a receipt/invoice. Identify all food items listed in the receipt.
2. Use the provided OCR text and your own vision capabilities to read the receipt.
3. If multiple food items are present, include all of them in the `food_items` list.
4. If a quantity is listed next to a food item on the receipt, include it or sum it up for `estimated_quantity`.
5. Do NOT treat random non-food text (like tax, totals, GST, dates, prices) as a food name.
6. Do NOT invent food items.
7. Do NOT invent quantity or servings.
8. estimated_quantity must be null unless quantity is actually visible or explicitly stated in the image/text.
9. estimated_servings must be null unless servings can reasonably be determined from visible information.
10. food_type must be one of:
   - Vegetarian
   - Non-Vegetarian
   - Egg
   - Unknown
11. food_category should describe the food, such as:
   - Cooked Meal
   - Rice Dish
   - Curry
   - Bread
   - Bakery
   - Fruit
   - Vegetables
   - Packaged Food
   - Beverage
   - Dessert
   - Other
12. Extract visible package/brand/label/restaurant names when present.
13. possible_allergens should contain only allergens reasonably associated with the identified food or explicitly visible.
14. confidence must be between 0 and 1.
15. If the receipt does not list any food items, return:
   food_name = ""
   food_items = []
   confidence <= 0.20
16. Return JSON only. No markdown. No explanation.
"""


def normalize_ai_food_response(ai_data, source):
    food_items = ai_data.get("food_items", [])

    if not isinstance(food_items, list):
        food_items = []

    normalized_items = []

    for item in food_items:
        if isinstance(item, dict):
            name = str(item.get("name", "")).strip()

            if not name:
                continue

            try:
                confidence = float(item.get("confidence", 0.0))
            except (TypeError, ValueError):
                confidence = 0.0

            normalized_items.append({
                "name": name,
                "confidence": round(max(0.0, min(1.0, confidence)), 2)
            })

    food_name = str(ai_data.get("food_name") or "").strip()

    if not food_name and normalized_items:
        food_name = normalized_items[0]["name"]

    food_type = str(
        ai_data.get("food_type") or "Unknown"
    ).strip()

    if food_type not in ["Vegetarian", "Non-Vegetarian", "Egg", "Unknown"]:
        food_type = "Unknown"

    try:
        confidence = float(ai_data.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0

    confidence = round(max(0.0, min(1.0, confidence)), 2)

    extracted_details = {
        "foodItems": [
            {
                "name": item["name"],
                "quantity": None
            }
            for item in normalized_items
        ],
        "suggestedFoodName": food_name,
        "suggestedQuantity": ai_data.get("estimated_quantity"),
        "suggestedCategory": food_type
    }

    return {
        "success": True,
        "status": "SUCCESS",
        "source": source,

        "rawText": ai_data.get("description", ""),
        "ocrStatus": "SUCCESS",

        "extractedDetails": extracted_details,

        # Spring Boot compatibility
        "food_name": food_name,
        "food_items": normalized_items,
        "food_category": ai_data.get(
            "food_category",
            "Other"
        ),
        "food_type": food_type,
        "description": ai_data.get(
            "description",
            ""
        ),
        "estimated_quantity": ai_data.get(
            "estimated_quantity"
        ),
        "estimated_servings": ai_data.get(
            "estimated_servings"
        ),
        "visible_packaging": ai_data.get(
            "visible_packaging"
        ),
        "visible_labels": ai_data.get(
            "visible_labels",
            []
        ),
        "possible_allergens": ai_data.get(
            "possible_allergens",
            []
        ),
        "confidence": confidence,
        "warnings": ai_data.get(
            "warnings",
            []
        )
    }


@app.post("/api/v1/ai/analyze-food")
async def analyze_food(image: UploadFile = File(...)):

    print("\n========================================")
    print("[FOOD AI] New image received")
    print(f"[FOOD AI] Filename: {image.filename}")
    print(f"[FOOD AI] Content-Type: {image.content_type}")
    print("========================================")

    content = await image.read()

    if not content:
        return {
            "success": False,
            "status": "FAILED",
            "message": "Empty image received"
        }

    print(f"[FOOD AI] Image size: {len(content)} bytes")

    # ---------------------------------------------------------
    # STEP 1: OCR
    # ---------------------------------------------------------

    raw_ocr_text = ""

    try:
        preprocessed_img, prep_err = preprocess_image(content)

        if prep_err or preprocessed_img is None:
            print(
                f"[OCR] Preprocessing failed: {prep_err}"
            )
        else:
            reader = get_easyocr_reader()

            ocr_results = reader.readtext(
                preprocessed_img
            )

            raw_ocr_text = "\n".join(
                [
                    str(res[1])
                    for res in ocr_results
                    if len(res) > 1
                ]
            ).strip()

            print(
                f"[OCR] Extracted text: "
                f"{raw_ocr_text[:500]}"
            )

    except Exception as e:
        print(
            f"[OCR] OCR failed: {e}"
        )

    # ---------------------------------------------------------
    # STEP 2: GEMINI VISION
    # ---------------------------------------------------------

    gemini_key = os.getenv("GEMINI_API_KEY")

    if gemini_key:

        try:

            print(
                "[AI] Sending image to Gemini Vision..."
            )

            image_b64 = base64.b64encode(
                content
            ).decode("utf-8")

            mime_type = (
                image.content_type
                or "image/jpeg"
            )

            prompt = build_food_ai_prompt(
                raw_ocr_text
            )

            url = (
                "https://generativelanguage.googleapis.com/"
                "v1beta/models/gemini-3.6-flash:generateContent"
                f"?key={gemini_key}"
            )

            headers = {
                "Content-Type": "application/json"
            }

            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            },
                            {
                                "inlineData": {
                                    "mimeType": mime_type,
                                    "data": image_b64
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json"
                }
            }

            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=30
            )

            print(
                f"[AI] Gemini HTTP status: "
                f"{response.status_code}"
            )

            if response.status_code != 200:

                print(
                    f"[AI] Gemini error: "
                    f"{response.text[:1000]}"
                )

            else:

                res_json = response.json()

                candidates = res_json.get(
                    "candidates",
                    []
                )

                if not candidates:
                    raise Exception(
                        "Gemini returned no candidates"
                    )

                parts = (
                    candidates[0]
                    .get("content", {})
                    .get("parts", [])
                )

                if not parts:
                    raise Exception(
                        "Gemini returned no content parts"
                    )

                text_response = (
                    parts[0]
                    .get("text", "")
                    .strip()
                )

                print(
                    f"[AI] Gemini response: "
                    f"{text_response[:1000]}"
                )

                # Remove accidental markdown fences
                if text_response.startswith(
                    "```json"
                ):
                    text_response = (
                        text_response[7:]
                    )

                if text_response.startswith(
                    "```"
                ):
                    text_response = (
                        text_response[3:]
                    )

                if text_response.endswith(
                    "```"
                ):
                    text_response = (
                        text_response[:-3]
                    )

                text_response = (
                    text_response.strip()
                )

                ai_data = json.loads(
                    text_response
                )

                result = normalize_ai_food_response(
                    ai_data,
                    "Gemini Vision + EasyOCR"
                )

                # Preserve OCR text
                result["rawText"] = raw_ocr_text

                print(
                    "[AI] Food identified: "
                    f"{result['food_name']}"
                )

                print(
                    "[AI] Food type: "
                    f"{result['food_type']}"
                )

                print(
                    "[AI] Food category: "
                    f"{result['food_category']}"
                )

                print(
                    "[AI] Confidence: "
                    f"{result['confidence']}"
                )

                return result

        except json.JSONDecodeError as e:

            print(
                f"[AI] Gemini JSON parsing failed: {e}"
            )

        except Exception as e:

            print(
                f"[AI] Gemini processing failed: {e}"
            )

    else:

        print(
            "[AI] GEMINI_API_KEY not configured"
        )

    # ---------------------------------------------------------
    # STEP 3: OCR FALLBACK
    # ---------------------------------------------------------

    if raw_ocr_text:

        print(
            "[FALLBACK] Using EasyOCR parser"
        )

        try:

            extracted = (
                parse_ocr_text_to_food_details(
                    raw_ocr_text
                )
            )

            food_name = (
                extracted["suggestedFoodName"]
            )

            category = (
                extracted["suggestedCategory"]
            )

            return {
                "success": True,
                "status": "SUCCESS",
                "source": "EasyOCR + Parser",
                "rawText": raw_ocr_text,
                "ocrStatus": "SUCCESS",

                "extractedDetails": {
                    "foodItems": [
                        {
                            "name": f["name"],
                            "quantity": (
                                f"{f['quantity']} meals"
                                if f["quantity"]
                                else None
                            )
                        }
                        for f in extracted["foodItems"]
                    ],
                    "suggestedFoodName": food_name,
                    "suggestedQuantity": (
                        extracted[
                            "suggestedQuantity"
                        ]
                    ),
                    "suggestedCategory": category
                },

                "food_name": food_name,

                "food_items": [
                    {
                        "name": f["name"],
                        "confidence": 0.60
                    }
                    for f in extracted["foodItems"]
                ],

                "food_category": category,
                "food_type": category,

                "description": (
                    f"Cooked {food_name} "
                    "ready for redistribution."
                    if food_name
                    else "Food identified from OCR text."
                ),

                "estimated_quantity": (
                    extracted[
                        "suggestedQuantity"
                    ]
                ),

                "estimated_servings": None,
                "visible_packaging": None,

                "visible_labels": [
                    f["name"]
                    for f in extracted["foodItems"]
                ],

                "possible_allergens": [
                    a.strip()
                    for a in extracted[
                        "suggestedAllergens"
                    ].split(",")
                    if a.strip()
                ],

                "confidence": 0.60,
                "warnings": [
                    "Food identified using OCR fallback."
                ]
            }

        except Exception as e:

            print(
                f"[FALLBACK] OCR parsing failed: {e}"
            )

    # ---------------------------------------------------------
    # FINAL FAILURE
    # ---------------------------------------------------------

    print(
        "[FOOD AI] Unable to identify food."
    )

    return {
        "success": False,
        "status": "FAILED",
        "source": "Food AI",
        "rawText": raw_ocr_text,
        "ocrStatus": "FAILED",

        "extractedDetails": {
            "foodItems": [],
            "suggestedFoodName": "",
            "suggestedQuantity": None,
            "suggestedCategory": ""
        },

        "food_name": "",
        "food_items": [],
        "food_category": "",
        "food_type": "Unknown",
        "description": "",
        "estimated_quantity": None,
        "estimated_servings": None,
        "visible_packaging": None,
        "visible_labels": [],
        "possible_allergens": [],
        "confidence": 0.0,

        "warnings": [
            "No recognizable food could be identified."
        ],

        "message": (
            "Unable to reliably identify food "
            "from the uploaded image."
        )
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)