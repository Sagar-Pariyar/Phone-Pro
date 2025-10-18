# backend\main.py

import os
import json
import bcrypt
import pickle
import pandas as pd
from typing import List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.metrics.pairwise import cosine_similarity

# --- App Initialization and CORS Configuration ---
app = FastAPI(
    title="PhonePro API",
    description="API for phone recommendations and user management.",
    version="1.0.0"
)

# Allow frontend to communicate with this backend
origins = ["*"]  # For development, allow all origins. For production, restrict this.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Data and Model Loading (Done once on startup) ---
USERS_FILE = 'users.json'

try:
    # Load datasets
    df = pd.read_csv('processed_dataset.csv')
    df_original = pd.read_csv('CleanedDataset.csv')

    # Load pre-trained models
    with open('label_encoders.pkl', 'rb') as le_file:
        label_encoders = pickle.load(le_file)
    with open('scaler.pkl', 'rb') as scaler_file:
        scaler = pickle.load(scaler_file)
except FileNotFoundError as e:
    print(f"Error loading data files: {e}. Make sure all required .csv and .pkl files are present.")
    exit()

# --- Helper Functions ---
def load_users():
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, 'r') as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=4)

def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def check_password(hashed, password):
    return bcrypt.checkpw(password.encode(), hashed.encode())


# --- Pydantic Models for Request/Response Validation ---
class UserSignUp(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class RecommendationInput(BaseModel):
    price: int = Field(..., example=15000)
    brand_name: str = Field(..., example="samsung")
    is_5g: bool = Field(..., alias="5G_or_not", example=True)
    processor_brand: str = Field(..., example="snapdragon")
    primary_camera_rear: int = Field(..., example=64)
    fast_charging: int = Field(..., example=25)
    battery_capacity: int = Field(..., example=4500)
    ram_capacity: int = Field(..., example=6)
    internal_memory: int = Field(..., example=128)
    refresh_rate: int = Field(..., example=90)
    os: str = Field(..., example="android")

class PhoneDetails(BaseModel):
    model: str
    price: int
    brand_name: str
    # Add other fields from your df_original as needed
    # Example:
    # processor_brand: str
    # os: str

# --- API Endpoints ---

# == User Authentication Endpoints ==
@app.post("/signup", status_code=201)
def signup(user: UserSignUp):
    users = load_users()
    if user.username in users:
        raise HTTPException(status_code=400, detail="Username already exists")
    if not all([user.username, user.email, user.password]):
        raise HTTPException(status_code=400, detail="Please fill out all fields")

    users[user.username] = {
        "email": user.email,
        "password": hash_password(user.password)
    }
    save_users(users)
    return {"message": "User created successfully! Please login."}

@app.post("/login")
def login(user: UserLogin):
    users = load_users()
    if user.username not in users:
        raise HTTPException(status_code=404, detail="User does not exist")
    if not check_password(users[user.username]['password'], user.password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    # In a real app, you would return a JWT token here
    return {"message": f"Welcome, {user.username}!", "username": user.username}


# == Phone Recommendation Endpoints ==

# NEW, CORRECTED CODE in main.py

@app.get("/options")
def get_form_options():
    """Provides the necessary options to populate frontend forms (sliders, dropdowns)."""
    return {
        "brand_names": sorted(label_encoders['brand_name'].classes_.tolist()),
        "processor_brands": sorted(label_encoders['processor_brand'].classes_.tolist()),
        "operating_systems": sorted(label_encoders['os'].classes_.tolist()),
        "phone_models": sorted(df_original['model'].unique().tolist())
    }

@app.get("/phone/{model_name}", response_model=Dict[str, Any])
def get_phone_details(model_name: str):
    """Fetches details for a specific phone model."""
    result = df_original[df_original['model'] == model_name]
    if result.empty:
        raise HTTPException(status_code=404, detail="Phone model not found")
    # Convert DataFrame row to a dictionary
    return result.iloc[0].to_dict()

@app.post("/recommend", response_model=Dict[str, Any])
def get_recommendation(input_data: RecommendationInput):
    """Calculates and returns the best phone recommendation based on user input."""
    # Convert Pydantic model to dictionary, handling the alias for 5G
    input_dict = input_data.dict(by_alias=True)
    # Convert boolean '5G_or_not' to integer
    input_dict['5G_or_not'] = 1 if input_dict['5G_or_not'] else 0
    
    # Preprocess the input data
    input_df = pd.DataFrame([input_dict])
    for column in ['brand_name', 'processor_brand', 'os']:
        try:
            input_df[column] = label_encoders[column].transform(input_df[column])
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid value for {column}")

    # Scale numerical features
    numerical_cols = ['price', 'battery_capacity', 'ram_capacity', 'internal_memory', 'refresh_rate', 'primary_camera_rear', 'fast_charging']
    input_df[numerical_cols] = scaler.transform(input_df[numerical_cols])

    # Feature weights
    weights = {
        'brand_name': 5, 'price': 4, 'os': 3, 'processor_brand': 2, '5G_or_not': 1,
        'battery_capacity': 1, 'ram_capacity': 1, 'internal_memory': 1,
        'refresh_rate': 1, 'primary_camera_rear': 1, 'fast_charging': 1
    }
    features = list(weights.keys())

    def apply_weights(df, w):
        weighted_df = df.copy()
        for feature, weight in w.items():
            if feature in weighted_df.columns:
                weighted_df[feature] *= weight
        return weighted_df

    # Filter dataset by brand and get recommendation
    filtered_df = df[df['brand_name'] == input_df['brand_name'].iloc[0]]
    if filtered_df.empty:
        raise HTTPException(status_code=404, detail="No phones found for the selected brand.")

    df_features_weighted = apply_weights(filtered_df[features], weights)
    input_features_weighted = apply_weights(input_df[features], weights)

    similarity_scores = cosine_similarity(input_features_weighted, df_features_weighted)
    suggested_model_name = filtered_df.iloc[similarity_scores.argmax()]['model']
    
    # Get original details of the recommended phone
    recommended_phone_details = df_original[df_original['model'] == suggested_model_name].iloc[0].to_dict()

    return {
        "suggested_model": suggested_model_name,
        "details": recommended_phone_details
    }