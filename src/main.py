import os
import cv2
import pandas as pd
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import uvicorn
import base64
# from .firebaseAuth import *
from firebase_admin import credentials, auth, firestore
import jwt
from fastapi.security import OAuth2PasswordBearer
import firebase_admin
from fastapi import Depends
from fastapi.responses import JSONResponse

# Inisialisasi Firestore
cred = credentials.Certificate("src/key.json")
firebase_admin.initialize_app(cred)

db = firestore.client()



# OAuth2PasswordBearer akan membaca Bearer token dari header Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Kunci rahasia JWT yang digunakan untuk verifikasi token
JWT_SECRET = "axsafacto_jwt_2024"  # Sama seperti yang digunakan di JavaScript

# Fungsi untuk verifikasi JWT
def verify_token(token: str):
    try:
        # Verifikasi dan decode token JWT menggunakan JWT_SECRET
        decoded_token = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
        # Access userId from the decoded token
        user_id = decoded_token.get("userId")  # Correct key based on your JWT structure
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")
        
        return user_id
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")



# Konfigurasi dasar
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'best.pt')
NUTRITION_FILE = os.path.join(BASE_DIR, 'data', 'nutrition_data.csv')

# Pastikan folder ada
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Inisialisasi Aplikasi
app = FastAPI(
    title="NutriSee Food Detection API",
    description="API untuk deteksi makanan dan informasi nutrisi",
    version="1.0.0"
)

# Tambahkan CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model dan data saat startup
try:
    model = YOLO(MODEL_PATH)
    nutrition_df = pd.read_csv(NUTRITION_FILE)
except Exception as e:
    print(f"Error loading model or nutrition data: {e}")
    model = None
    nutrition_df = None

def detect_food(image_path, user_id):
    if not model or nutrition_df is None:
        raise HTTPException(status_code=500, detail="Model atau data nutrisi tidak dimuat")

    try:
        # Deteksi makanan
        results = model(image_path)

        # Parsing hasil deteksi
        detected_foods = []
        for result in results:
            for box in result.boxes.data.tolist():
                cls = box[5]
                label = result.names[int(cls)]
                detected_foods.append(label)

        # Filter nutrisi
        detected_nutrition = nutrition_df[nutrition_df['class'].isin(detected_foods)]
        total_new_nutrition = detected_nutrition[['Calories (kcal)', 'Protein (g)', 'Carbohydrates (g)', 'Fat (g)', 'Fiber (g)']].sum().to_dict()

        # Ambil data Firestore
        user_ref = db.collection('users').document(user_id)
        
        # Mendapatkan doc_id dari subkoleksi data
        doc_id = list(user_ref.collection('data').list_documents())[0].id
        doc_ref = user_ref.collection('data').document(doc_id)
        
        existing_doc = doc_ref.get()

        if not existing_doc.exists:
            raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")

        current_data = existing_doc.to_dict()
        
        # Pastikan dailyNeeds dan nutritionHistory ada di current_data
        daily_needs = current_data.get('dailyNeeds', {})
        nutrition_history = current_data.get('nutritionHistory', {})

        # Hitung ulang total nutrisi
        updated_nutrition_history = {
            "totalCalories": nutrition_history.get('totalCalories', 0) + total_new_nutrition.get('Calories (kcal)', 0),
            "totalProtein": nutrition_history.get('totalProtein', 0) + total_new_nutrition.get('Protein (g)', 0),
            "totalCarbs": nutrition_history.get('totalCarbs', 0) + total_new_nutrition.get('Carbohydrates (g)', 0),
            "totalFat": nutrition_history.get('totalFat', 0) + total_new_nutrition.get('Fat (g)', 0),
            "totalFiber": nutrition_history.get('totalFiber', 0) + total_new_nutrition.get('Fiber (g)', 0),
        }

        updated_remaining_nutrition = {
            "remainingCalories": daily_needs.get('Calories', 0) - updated_nutrition_history['totalCalories'],
            "remainingCarbs": daily_needs.get('Carbohydrates', 0) - updated_nutrition_history['totalCarbs'],
            "remainingFat": daily_needs.get('Fat', 0) - updated_nutrition_history['totalFat'],
            "remainingFiber": daily_needs.get('Fiber', 0) - updated_nutrition_history['totalFiber'],
            "remainingProtein": daily_needs.get('Protein', 0) - updated_nutrition_history['totalProtein'],
        }

        # Update dokumen di Firestore
        doc_ref.update({
            "nutritionHistory.totalCalories": updated_nutrition_history["totalCalories"],
            "nutritionHistory.totalProtein": updated_nutrition_history["totalProtein"],
            "nutritionHistory.totalCarbs": updated_nutrition_history["totalCarbs"],
            "nutritionHistory.totalFat": updated_nutrition_history["totalFat"],
            "nutritionHistory.totalFiber": updated_nutrition_history["totalFiber"],
            "nutritionHistory.remainingCalories": updated_remaining_nutrition["remainingCalories"],
            "nutritionHistory.remainingCarbs": updated_remaining_nutrition["remainingCarbs"],
            "nutritionHistory.remainingFat": updated_remaining_nutrition["remainingFat"],
            "nutritionHistory.remainingFiber": updated_remaining_nutrition["remainingFiber"],
            "nutritionHistory.remainingProtein": updated_remaining_nutrition["remainingProtein"]
        })

        return {
            "detected_foods": detected_foods,
            "nutrition_info": detected_nutrition[['class', 'Calories (kcal)', 'Protein (g)', 'Carbohydrates (g)', 'Fat (g)', 'Fiber (g)']].to_dict(orient='records'),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/detect_food")
async def upload_image(file: UploadFile = File(...), token: str = Depends(oauth2_scheme)):
    # Verifikasi token untuk mendapatkan user_id
    if not token:
        raise HTTPException(status_code=401, detail="Authorization token is required")
    
    user_id = verify_token(token)

    # Validasi tipe file
    allowed_types = ['image/jpeg', 'image/png', 'image/jpg']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File harus gambar (JPEG/PNG)")

    # Simpan file
    file_location = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())

    # Deteksi makanan dan kirimkan data ke Firestore
    result = detect_food(file_location, user_id)

    return result

@app.get("/result_image/{filename}")
async def get_result_image(filename: str):
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Gambar tidak ditemukan")
    return FileResponse(file_path)

    
@app.get("/")
def read_root():
    # Membuat respons dengan status kode 200
    response_content = {
        "status": "success",
        "message": "API connected successfully!",
    }
    return JSONResponse(content=response_content, status_code=200)

# Jalankan server
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
