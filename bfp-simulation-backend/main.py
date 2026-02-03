from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Tuple, Dict, Any, Optional
from contextlib import asynccontextmanager
import uuid
import torch
import numpy as np
import os
import sys
import tempfile
import sqlite3
import json
import base64
import random
import gc
from datetime import datetime
from PIL import Image
from io import BytesIO
import pickle

# Chatbot dependencies - optional (TensorFlow doesn't support Python 3.13 yet)
TENSORFLOW_AVAILABLE = False
nltk = None
WordNetLemmatizer = None
load_model = None

# Check Python version before attempting TensorFlow import
import sys
PYTHON_VERSION = sys.version_info

if PYTHON_VERSION >= (3, 13):
    print(f"[WARN] Python {PYTHON_VERSION.major}.{PYTHON_VERSION.minor} detected - TensorFlow not supported")
    print("[WARN] Chatbot will be disabled, but simulation will work.")
else:
    try:
        import nltk
        from nltk.stem import WordNetLemmatizer
        import tensorflow as tf
        from tensorflow.keras.models import load_model
        TENSORFLOW_AVAILABLE = True
    except Exception as e:
        print(f"[WARN] TensorFlow/NLTK not available: {e}")
        print("[WARN] Chatbot will be disabled, but simulation will work.")
        TENSORFLOW_AVAILABLE = False

# Google Generative AI - optional
GENAI_AVAILABLE = False
genai = None

if PYTHON_VERSION >= (3, 13):
    print("[WARN] Google API libraries may not work on Python 3.13")
else:
    try:
        import google.generativeai as genai
        GENAI_AVAILABLE = True
    except Exception as e:
        print(f"[WARN] google-generativeai not available: {e}")
        genai = None

from stable_baselines3 import PPO
from sb3_contrib import MaskablePPO

from unet import UNet
from inference import create_grid_from_image, analyze_floor_plan_brightness
from simulation import EvacuationEnv, run_heuristic_simulation

# Configuration
PPO_MODEL_VERSION = "500k_steps"  # Options: "v1.5", "v2.0_lite", "500k_steps", "v2.0"
USE_MASKABLE_PPO = True  # Set to True for v2.0, False for v1.5

# Global variables for models
unet_model = None
ppo_model = None
device = None
IMAGE_SIZE = 256

# Chatbot global variables
chatbot_model = None
words = None
classes = None
intents = None
lemmatizer = None

# Lifespan event handler (replaces deprecated on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global unet_model, ppo_model, device, chatbot_model, words, classes, intents, lemmatizer
    
    print("\n" + "=" * 60)
    print("FIRE EVACUATION SIMULATION BACKEND - STARTING UP")
    print("=" * 60)
    print(f"Working directory: {os.getcwd()}")
    print(f"Python version: {sys.version}")
    print("=" * 60)
    
    device = torch.device("cpu")
    print(f"\nUsing device: {device}")
    
    # Load U-Net model with error handling
    print("\n[1/3] Loading U-Net Floor Plan Segmentation Model...")
    try:
        model_path = "models/unet_floorplan_model.pth"
        abs_path = os.path.abspath(model_path)
        print(f"  Model path: {abs_path}")
        
        if not os.path.exists(model_path):
            print(f"  [FAIL] ERROR: Model file not found!")
            print(f"  Expected location: {abs_path}")
            print(f"  Please ensure the model file exists at this location.")
            unet_model = None
        else:
            file_size = os.path.getsize(model_path) / (1024 * 1024)  # MB
            print(f"  File size: {file_size:.2f} MB")
            print(f"  Loading model...")
            
            unet_model = UNet()
            
            # Load the checkpoint and handle different save formats
            checkpoint = torch.load(model_path, map_location=device)
            
            # Check if it's a full checkpoint (with optimizer, epoch, etc.) or just state_dict
            if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
                # Full checkpoint format - extract just the model weights
                print(f"  Detected checkpoint format, extracting model_state_dict...")
                unet_model.load_state_dict(checkpoint['model_state_dict'])
            else:
                # Direct state_dict format
                unet_model.load_state_dict(checkpoint)
            
            unet_model.to(device)
            unet_model.eval()
            print(f"  [OK] U-Net model loaded successfully")
    except Exception as e:
        print(f"  [FAIL] ERROR loading U-Net model:")
        print(f"  {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        unet_model = None
    
    # Load PPO model with error handling
    print(f"\n[2/3] Loading PPO Commander Model ({PPO_MODEL_VERSION})...")
    try:
        model_path = f"models/ppo_commander_{PPO_MODEL_VERSION}.zip"
        abs_path = os.path.abspath(model_path)
        print(f"  Model path: {abs_path}")
        print(f"  Using {'MaskablePPO' if USE_MASKABLE_PPO else 'Standard PPO'}")
        
        if not os.path.exists(model_path):
            print(f"  [FAIL] ERROR: Model file not found!")
            print(f"  Expected location: {abs_path}")
            ppo_model = None
        else:
            file_size = os.path.getsize(model_path) / (1024 * 1024)  # MB
            print(f"  File size: {file_size:.2f} MB")
            print(f"  Loading model...")
            
            if USE_MASKABLE_PPO:
                ppo_model = MaskablePPO.load(model_path, device=device)
            else:
                ppo_model = PPO.load(model_path, device=device)
            print(f"  [OK] PPO Commander {PPO_MODEL_VERSION} loaded successfully")
    except Exception as e:
        print(f"  [FAIL] ERROR loading PPO model:")
        print(f"  {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        ppo_model = None
    
    # Load Chatbot model (optional - requires TensorFlow)
    print("\n[3/3] Loading Fire Safety Chatbot Model...")
    
    if not TENSORFLOW_AVAILABLE:
        print("  [SKIP] TensorFlow not available - chatbot disabled")
        print("  (This is normal on Python 3.13+, simulation will still work)")
        chatbot_model = None
        lemmatizer = None
    else:
        try:
            # Download required NLTK data if not already present
            try:
                nltk.data.find('tokenizers/punkt')
            except LookupError:
                print("  Downloading NLTK punkt tokenizer...")
                nltk.download('punkt')

            try:
                nltk.data.find('corpora/wordnet')
            except LookupError:
                print("  Downloading NLTK wordnet...")
                nltk.download('wordnet')

            try:
                nltk.data.find('corpora/omw-1.4')
            except LookupError:
                print("  Downloading NLTK omw-1.4...")
                nltk.download('omw-1.4')

            # Initialize lemmatizer
            lemmatizer = WordNetLemmatizer()

            # Load the model and data files
            chatbot_model = load_model('Fire Safety Chatbot/chatbot_model.h5')
            words = pickle.load(open('Fire Safety Chatbot/words.pkl', 'rb'))
            classes = pickle.load(open('Fire Safety Chatbot/classes.pkl', 'rb'))
            intents = json.load(open('Fire Safety Chatbot/intents.json', 'rb'))
            print("  [OK] Chatbot model loaded successfully")
        except Exception as e:
            print(f"  [WARN] WARNING: Chatbot failed to load:")
            print(f"  {type(e).__name__}: {str(e)}")
            print(f"  Chatbot will not be available, but simulation will work.")
            chatbot_model = None
    
    # Try to initialize Gemini API
    use_gemini = False
    if GENAI_AVAILABLE:
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if gemini_api_key and gemini_api_key != "your-gemini-api-key":
            try:
                print("\n  Initializing Google Gemini AI...")
                genai.configure(api_key=gemini_api_key)
                gemini_model = genai.GenerativeModel('gemini-1.5-flash')
                use_gemini = True
                print("  [OK] Gemini API configured successfully")
            except Exception as e:
                print(f"  [WARN] Gemini API initialization failed: {e}")
                print("  Falling back to TensorFlow chatbot model")
                use_gemini = False
        else:
            print("  [INFO] GEMINI_API_KEY not configured, using TensorFlow model")
    else:
        print("  [INFO] Gemini API not available")
    
    # Print summary
    print("\n" + "=" * 60)
    print("STARTUP SUMMARY:")
    print("=" * 60)
    print(f"  U-Net Model:     {'[OK] Loaded' if unet_model else '[FAIL] FAILED'}")
    print(f"  PPO Model:       {'[OK] Loaded' if ppo_model else '[FAIL] FAILED'}")
    print(f"  Chatbot:         {'[OK] Gemini API' if use_gemini else ('[OK] TensorFlow' if chatbot_model else '[SKIP] Not Available')}")
    print("=" * 60)
    
    if not unet_model or not ppo_model:
        print("\n[WARN] CRITICAL WARNING: Essential models failed to load!")
        print("The simulation WILL NOT WORK without U-Net and PPO models.")
        print("Please check the errors above and ensure model files exist.")
        print("\nExpected model locations:")
        print(f"  - {os.path.abspath('models/unet_floorplan_model.pth')}")
        print(f"  - {os.path.abspath(f'models/ppo_commander_{PPO_MODEL_VERSION}.zip')}")
    else:
        print("\n[OK] All critical models loaded successfully!")
        print("Backend is ready to process fire evacuation simulations.")
    
    print("\nServer is now listening on http://0.0.0.0:8000")
    print("API documentation available at http://localhost:8000/docs")
    print("=" * 60 + "\n")
    
    yield  # Server runs here
    
    # Shutdown (cleanup if needed)
    print("\nShutting down backend...")

# Initialize FastAPI app with lifespan
app = FastAPI(title="Fire Evacuation Simulation API", version="1.0.0", lifespan=lifespan)

# CORS Configuration - use environment variable or defaults
cors_origins_env = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models
unet_model = None
ppo_model = None
device = None
IMAGE_SIZE = 256

# Chatbot global variables
chatbot_model = None
words = None
classes = None
intents = None
lemmatizer = None

# Pydantic model for chatbot requests
class ChatbotRequest(BaseModel):
    message: str

class ChatbotResponse(BaseModel):
    response: str

def clean_up_sentence(sentence):
    """Tokenize and lemmatize the sentence"""
    if not TENSORFLOW_AVAILABLE or nltk is None:
        return sentence.lower().split()  # Fallback to simple split
    if lemmatizer is None:
        return nltk.word_tokenize(sentence)
    sentence_words = nltk.word_tokenize(sentence)
    sentence_words = [lemmatizer.lemmatize(word.lower()) for word in sentence_words]
    return sentence_words

def bow(sentence, show_details=True):
    """Create bag of words array from sentence"""
    if not TENSORFLOW_AVAILABLE or words is None:
        return np.array([])
    sentence_words = clean_up_sentence(sentence)
    bag = [0] * len(words)
    for s in sentence_words:
        for i, w in enumerate(words):
            if w == s:
                bag[i] = 1
                if show_details:
                    print(f"Found in bag: {w}")
    return np.array(bag)

def predict_class(sentence):
    """Predict the class of the sentence"""
    if not TENSORFLOW_AVAILABLE or chatbot_model is None:
        return []
    p = bow(sentence, show_details=False)
    res = chatbot_model.predict(np.array([p]))[0]
    ERROR_THRESHOLD = 0.25
    results = [[i, r] for i, r in enumerate(res) if r > ERROR_THRESHOLD]
    
    results.sort(key=lambda x: x[1], reverse=True)
    return_list = []
    for r in results:
        return_list.append({"intent": classes[r[0]], "probability": str(r[1])})
    return return_list

def get_response(ints, intents_json):
    """Get response based on predicted intent"""
    if len(ints) > 0:
        tag = ints[0]['intent']
        if tag in intents_json:
            import random
            result = random.choice(intents_json[tag]['responses'])
        else:
            result = "I don't understand. Please ask me something related to fire safety."
        return result
    else:
        return "I don't understand. Please ask me something related to fire safety."

def chatbot_response(msg):
    """Main function to get chatbot response"""
    global use_gemini, gemini_model
    
    # Use Gemini if available
    if use_gemini and gemini_model:
        try:
            # Create a fire safety-focused system prompt
            system_prompt = """You are a fire safety expert chatbot for the Bureau of Fire Protection (BFP) in the Philippines. 
            Your role is to:
            - Provide accurate fire safety information
            - Explain fire prevention tips in simple Filipino and English (Taglish)
            - Guide people on emergency procedures
            - Be friendly, helpful, and community-oriented
            - Keep responses concise (2-3 sentences) unless detailed explanation is needed
            
            Always prioritize safety and provide actionable advice."""
            
            # Combine system prompt with user message
            full_prompt = f"{system_prompt}\n\nUser question: {msg}\n\nYour response:"
            
            response = gemini_model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            print(f"Gemini API error: {e}")
            # Fallback to TensorFlow model if Gemini fails
            pass
    
    # Fallback: Use TensorFlow model
    ints = predict_class(msg)
    res = get_response(ints, intents)
    return res

# Database setup
def init_db():
    conn = sqlite3.connect("jobs.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            job_id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            result TEXT,
            error TEXT,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

# Pydantic Models
class SimulationConfig(BaseModel):
    grid: List[List[int]]
    exits: Optional[List[Tuple[int, int]]] = None  # User-placed exits (row, col format from frontend)
    fire_position: Tuple[int, int]  # (row, col) format from frontend
    agent_positions: List[Tuple[int, int]]  # [(row, col), ...] format from frontend
    # New configuration options
    use_rl: bool = True  # If False, use heuristic mode (no 10-agent limit)
    threshold: float = 0.5  # U-Net segmentation threshold
    invert_mask: bool = True  # Whether to invert the mask
    material_type: str = "concrete"  # "wood" or "concrete"
    extended_fire_steps: int = 0  # Continue fire spread after all agents done
    assembly_point: Optional[Tuple[int, int]] = None  # (row, col) for assembly area


# Coordinate conversion utilities
def frontend_to_backend(row: int, col: int) -> Tuple[int, int]:
    """Convert frontend (row, col) to backend (x, y) coordinates.
    Frontend uses row=y, col=x convention.
    Backend A* and agent positions use (x, y).
    """
    return (col, row)  # x=col, y=row


def backend_to_frontend(x: int, y: int) -> Tuple[int, int]:
    """Convert backend (x, y) to frontend (row, col) coordinates."""
    return (y, x)  # row=y, col=x

class JobResponse(BaseModel):
    job_id: str

class StatusResponse(BaseModel):
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Database helper functions
def update_job_status(job_id: str, status: str, result: Dict = None, error: str = None):
    conn = sqlite3.connect("jobs.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO jobs (job_id, status, result, error, created_at) VALUES (?, ?, ?, ?, ?)",
        (job_id, status, json.dumps(result) if result else None, error, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_job_status(job_id: str) -> Dict:
    conn = sqlite3.connect("jobs.db")
    cursor = conn.cursor()
    cursor.execute("SELECT status, result, error FROM jobs WHERE job_id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return {
            "status": "not_found",
            "result": None,
            "error": "Job not found"
        }
    
    status, result, error = row
    return {
        "status": status,
        "result": json.loads(result) if result else None,
        "error": error
    }

def distribute_exits_to_model(user_exits: List[Tuple[int, int]], grid: np.ndarray, total_model_exits: int = 248) -> List[Tuple[int, int]]:
    """
    Distribute 248 model exits across user-defined exit points.
    
    IMPORTANT: Input exits should be in (x, y) format (backend convention).
    Frontend sends (row, col) which should be converted to (x, y) = (col, row) before calling.
    
    Example:
    - 1 user exit -> all 248 model exits at that location (with small offsets)
    - 2 user exits -> 124 exits each
    - 3 user exits -> 83, 83, 82 exits
    
    Args:
        user_exits: List of (x, y) tuples (backend format)
        grid: The grid array (256x256) where 0=free, 1=wall
        total_model_exits: Total exits needed for model (default 248)
    
    Returns:
        List of 248 (x, y) exit coordinates distributed across user exits
    """
    if not user_exits:
        # Fallback: auto-detect exits from grid edges
        return auto_detect_exits(grid, total_model_exits)
    
    num_user_exits = len(user_exits)
    exits_per_location = total_model_exits // num_user_exits
    remainder = total_model_exits % num_user_exits
    
    distributed_exits = []
    
    for i, (exit_x, exit_y) in enumerate(user_exits):
        # Calculate how many exits for this location
        count = exits_per_location + (1 if i < remainder else 0)
        
        for j in range(count):
            # Add small random offset to prevent stacking (±2 pixels in a circle pattern)
            angle = (2 * np.pi * j) / count if count > 1 else 0
            radius = min(2, j % 3)  # Vary radius 0, 1, 2
            offset_x = int(radius * np.cos(angle))
            offset_y = int(radius * np.sin(angle))
            
            new_x = exit_x + offset_x
            new_y = exit_y + offset_y
            
            # Clamp to grid bounds
            new_x = max(0, min(255, new_x))
            new_y = max(0, min(255, new_y))
            
            # Validate it's on free space (grid uses [y][x] indexing!)
            if 0 <= new_y < grid.shape[0] and 0 <= new_x < grid.shape[1]:
                if grid[new_y][new_x] == 0:
                    distributed_exits.append((new_x, new_y))
                else:
                    # Fallback to original user position
                    distributed_exits.append((exit_x, exit_y))
            else:
                distributed_exits.append((exit_x, exit_y))
    
    # Ensure exactly total_model_exits
    while len(distributed_exits) < total_model_exits:
        distributed_exits.append(user_exits[0])  # Pad with first exit
    
    return distributed_exits[:total_model_exits]

def auto_detect_exits(grid: np.ndarray, max_exits: int = 248) -> List[Tuple[int, int]]:
    """Fallback: Auto-detect exits from grid boundaries"""
    exits = []
    height, width = grid.shape
    
    # Check edges for free spaces (potential exits)
    for x in range(width):
        if grid[0, x] == 0:  # Top edge
            exits.append((x, 0))
        if grid[height-1, x] == 0:  # Bottom edge
            exits.append((x, height-1))
    
    for y in range(height):
        if grid[y, 0] == 0:  # Left edge
            exits.append((0, y))
        if grid[y, width-1] == 0:  # Right edge
            exits.append((width-1, y))
    
    # Remove duplicates and limit
    exits = list(set(exits))[:max_exits]
    
    # If still not enough, pad with corner
    while len(exits) < max_exits:
        exits.append(exits[0] if exits else (0, 0))
    
    return exits[:max_exits]



# API Endpoints

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "unet_loaded": unet_model is not None,
        "ppo_loaded": ppo_model is not None,
        "ppo_version": PPO_MODEL_VERSION,
        "maskable_ppo": USE_MASKABLE_PPO
    }

@app.post("/api/chatbot/ai-response", response_model=ChatbotResponse)
async def get_chatbot_response(request: ChatbotRequest):
    """Get AI response from the chatbot model"""
    try:
        # Check if chatbot model is loaded
        if chatbot_model is None:
            # Return a rule-based response if model is not available
            return ChatbotResponse(response="I'm sorry, the AI chatbot is currently unavailable. Please try again later.")
        
        # Get response from the chatbot
        response = chatbot_response(request.message)
        return ChatbotResponse(response=response)
    except Exception as e:
        print(f"Error in chatbot response: {str(e)}")
        return ChatbotResponse(response="I'm sorry, I encountered an error processing your request.")

@app.post("/api/process-image")
async def process_image(
    file: UploadFile = File(...),
    threshold: float = 0.5,
    invert_mask: Optional[bool] = None  # None = auto-detect
):
    """Process uploaded floor plan image and return grid with original image.
    
    Args:
        file: Floor plan image file
        threshold: Segmentation threshold (0.0-1.0). Lower = more walls detected.
        invert_mask: True=rooms are bright/white, False=walls are bright/white, None=auto-detect
    """
    # Check if U-Net model is loaded
    if unet_model is None:
        raise HTTPException(
            status_code=503,
            detail="U-Net model not loaded. The backend started but model loading failed. Please check server logs and restart the backend."
        )
    
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Auto-detect inversion if not specified
        if invert_mask is None:
            analysis = analyze_floor_plan_brightness(temp_path, IMAGE_SIZE)
            invert_mask = analysis["should_invert"]
            print(f"[PROCESS-IMAGE] Auto-detected invert_mask={invert_mask} (edge={analysis['edge_brightness']:.1f}, center={analysis['center_brightness']:.1f})")
        
        # Load original image for base64 encoding
        original_image = Image.open(temp_path)
        # Resize to match grid size for overlay alignment
        original_image = original_image.resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)
        
        # Convert to base64
        buffered = BytesIO()
        original_image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Process image with U-Net model (using configurable threshold and inversion)
        grid = create_grid_from_image(
            unet_model, 
            temp_path, 
            IMAGE_SIZE, 
            device,
            threshold=threshold,
            invert_mask=invert_mask
        )
        
        # Clean up temp file
        os.unlink(temp_path)
        
        if grid is None:
            raise HTTPException(status_code=400, detail="Failed to process image")
        
        # Convert numpy array to list for JSON serialization
        grid_list = grid.tolist()
        
        return {
            "grid": grid_list,
            "originalImage": f"data:image/png;base64,{img_base64}",
            "gridSize": {"width": IMAGE_SIZE, "height": IMAGE_SIZE},
            "threshold": float(threshold),
            "invertMask": bool(invert_mask)  # Convert numpy.bool to Python bool
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@app.post("/api/process-image-gemini")
async def process_image_gemini(file: UploadFile = File(...)):
    """Process floor plan using Gemini Vision API for semantic analysis.
    
    Returns enhanced grid with door/window detection and room labeling.
    Falls back to U-Net if Gemini is unavailable.
    """
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key or gemini_api_key == "your-gemini-api-key":
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Set GEMINI_API_KEY environment variable."
        )
    
    try:
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Load and resize image
        original_image = Image.open(temp_path)
        original_image = original_image.resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)
        
        # Convert to base64 for Gemini
        buffered = BytesIO()
        original_image.save(buffered, format="PNG")
        img_bytes = buffered.getvalue()
        img_base64 = base64.b64encode(img_bytes).decode()
        
        # Configure Gemini
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Analyze with Gemini Vision
        prompt = """Analyze this floor plan image and identify:
1. All WALLS - areas that block movement (usually thick black/dark lines)
2. All DOORS - entry/exit points (usually gaps in walls or door symbols)
3. All WINDOWS - openings in walls (usually thin lines or glass symbols)
4. ROOMS - open areas for movement

Return a JSON object with this EXACT structure:
{
    "walls": [[row1_start, col1_start, row1_end, col1_end], ...],
    "doors": [[row, col, width, height], ...],
    "windows": [[row, col, width, height], ...],
    "suggested_exits": [[row, col], ...],
    "room_centers": [[row, col], ...],
    "analysis": "Brief description of the floor plan"
}

All coordinates should be normalized to a 256x256 grid (0-255 range).
Doors are important for fire spread simulation - they allow passage but fire spreads through them.
Windows are semi-permeable - fire spreads faster through them.
"""
        
        # Create image part for Gemini
        image_part = {
            "mime_type": "image/png",
            "data": img_base64
        }
        
        response = model.generate_content([prompt, image_part])
        
        # Parse Gemini response
        response_text = response.text
        
        # Extract JSON from response (handle markdown code blocks)
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            json_str = response_text.strip()
        
        try:
            gemini_analysis = json.loads(json_str)
        except json.JSONDecodeError:
            print(f"[GEMINI] Failed to parse response: {response_text[:500]}")
            gemini_analysis = {
                "walls": [],
                "doors": [],
                "windows": [],
                "suggested_exits": [],
                "room_centers": [],
                "analysis": "Failed to parse Gemini response"
            }
        
        # Create enhanced grid from Gemini analysis
        # Grid values: 0=free, 1=wall, 2=door, 3=window
        enhanced_grid = np.zeros((IMAGE_SIZE, IMAGE_SIZE), dtype=int)
        
        # Draw walls (value=1)
        for wall in gemini_analysis.get("walls", []):
            if len(wall) >= 4:
                r1, c1, r2, c2 = [int(v) for v in wall[:4]]
                r1, r2 = max(0, min(r1, r2, 255)), min(255, max(r1, r2))
                c1, c2 = max(0, min(c1, c2, 255)), min(255, max(c1, c2))
                enhanced_grid[r1:r2+1, c1:c2+1] = 1
        
        # Draw doors (value=2)
        for door in gemini_analysis.get("doors", []):
            if len(door) >= 4:
                r, c, w, h = [int(v) for v in door[:4]]
                r, c = max(0, min(r, 255)), max(0, min(c, 255))
                w, h = min(w, 255-c), min(h, 255-r)
                enhanced_grid[r:r+h, c:c+w] = 2
        
        # Draw windows (value=3)
        for window in gemini_analysis.get("windows", []):
            if len(window) >= 4:
                r, c, w, h = [int(v) for v in window[:4]]
                r, c = max(0, min(r, 255)), max(0, min(c, 255))
                w, h = min(w, 255-c), min(h, 255-r)
                enhanced_grid[r:r+h, c:c+w] = 3
        
        # If Gemini didn't detect enough walls, fall back to U-Net
        wall_count = np.sum(enhanced_grid == 1)
        if wall_count < 1000 and unet_model is not None:
            print(f"[GEMINI] Low wall detection ({wall_count} cells), falling back to U-Net")
            unet_grid = create_grid_from_image(
                unet_model, temp_path, IMAGE_SIZE, device, 
                threshold=0.5, invert_mask=True
            )
            if unet_grid is not None:
                # Merge: U-Net walls + Gemini doors/windows
                enhanced_grid = np.where(
                    (enhanced_grid == 2) | (enhanced_grid == 3),
                    enhanced_grid,  # Keep doors/windows
                    unet_grid.astype(int)  # Use U-Net for walls
                )
        
        # Clean up
        os.unlink(temp_path)
        
        return {
            "grid": enhanced_grid.tolist(),
            "originalImage": f"data:image/png;base64,{img_base64}",
            "gridSize": {"width": IMAGE_SIZE, "height": IMAGE_SIZE},
            "analysis": gemini_analysis,
            "method": "gemini",
            "gridLegend": {
                "0": "free_space",
                "1": "wall",
                "2": "door",
                "3": "window"
            }
        }
        
    except Exception as e:
        print(f"[GEMINI] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Clean up temp file on error
        try:
            os.unlink(temp_path)
        except:
            pass
        
        raise HTTPException(status_code=500, detail=f"Gemini processing error: {str(e)}")


# Background simulation runner
def run_simulation_task(job_id: str, config: SimulationConfig):
    """Run simulation in background"""
    try:
        # Convert grid to numpy array
        grid = np.array(config.grid)
        
        # Convert frontend (row, col) coordinates to backend (x, y) format
        # Frontend sends: (row, col) where row=y, col=x
        # Backend expects: (x, y)
        agent_positions_xy = [frontend_to_backend(row, col) for row, col in config.agent_positions]
        fire_position_xy = frontend_to_backend(config.fire_position[0], config.fire_position[1])
        
        # Convert exit positions to (x, y) format if provided
        if config.exits and len(config.exits) > 0:
            exits_xy = [frontend_to_backend(row, col) for row, col in config.exits]
            print(f"[JOB {job_id[:8]}] Converted {len(config.exits)} exits from (row,col) to (x,y) format", flush=True)
            
            # Validate exits - ensure they're on free cells, not walls, and not near agents
            MIN_EXIT_AGENT_DISTANCE = 20  # Exits must be at least 20 cells from any agent
            validated_exits = []
            for ex in exits_xy:
                ex_x, ex_y = int(ex[0]), int(ex[1])
                if 0 <= ex_y < grid.shape[0] and 0 <= ex_x < grid.shape[1]:
                    if grid[ex_y][ex_x] == 1:  # CELL_WALL
                        print(f"[JOB {job_id[:8]}] WARNING: Exit ({ex_x}, {ex_y}) is on WALL, finding nearest free cell...", flush=True)
                        # Search for nearest free cell that's not near agents
                        found = False
                        for radius in range(1, 50):
                            for dy in range(-radius, radius + 1):
                                for dx in range(-radius, radius + 1):
                                    if abs(dx) == radius or abs(dy) == radius:
                                        new_x, new_y = ex_x + dx, ex_y + dy
                                        if 0 <= new_y < grid.shape[0] and 0 <= new_x < grid.shape[1]:
                                            if grid[new_y][new_x] == 0:  # CELL_FREE
                                                # Check distance to all agents
                                                too_close = False
                                                for agent_pos in agent_positions_xy:
                                                    dist = np.sqrt((new_x - agent_pos[0])**2 + (new_y - agent_pos[1])**2)
                                                    if dist < MIN_EXIT_AGENT_DISTANCE:
                                                        too_close = True
                                                        break
                                                if not too_close:
                                                    print(f"[JOB {job_id[:8]}] Fixed exit: ({ex_x}, {ex_y}) -> ({new_x}, {new_y})", flush=True)
                                                    validated_exits.append((new_x, new_y))
                                                    found = True
                                                    break
                                    if found:
                                        break
                                if found:
                                    break
                            if found:
                                break
                    else:
                        validated_exits.append((ex_x, ex_y))
            
            if len(validated_exits) > 0:
                exits_xy = validated_exits
                print(f"[JOB {job_id[:8]}] Using {len(exits_xy)} validated exits", flush=True)
            else:
                exits_xy = None
                print(f"[JOB {job_id[:8]}] No valid exits found, will auto-detect", flush=True)
        else:
            exits_xy = None
        
        print(f"[JOB {job_id[:8]}] Fire position: frontend={config.fire_position} -> backend={fire_position_xy}", flush=True)
        print(f"[JOB {job_id[:8]}] Agent positions converted: {len(agent_positions_xy)} agents", flush=True)
        
        # Choose simulation mode based on config
        num_agents = len(agent_positions_xy)
        use_heuristic = not config.use_rl or num_agents > 10 or ppo_model is None
        
        if use_heuristic:
            print(f"[JOB {job_id[:8]}] Using HEURISTIC mode (agents={num_agents}, use_rl={config.use_rl})", flush=True)
            result = run_heuristic_simulation(
                grid=grid,
                agent_positions=agent_positions_xy,
                fire_position=fire_position_xy,
                exits=exits_xy,
                max_steps=500,
                extended_fire_steps=config.extended_fire_steps,
                assembly_point=frontend_to_backend(config.assembly_point[0], config.assembly_point[1]) if config.assembly_point else None,
                material_type=config.material_type
            )
            update_job_status(job_id, "complete", result=result)
            gc.collect()
            return
        
        # RL Mode: Distribute user exits to 248 model exits
        if exits_xy and len(exits_xy) > 0:
            distributed_exits = distribute_exits_to_model(exits_xy, grid, total_model_exits=248)
            print(f"[JOB {job_id[:8]}] Distributed {len(exits_xy)} user exits -> 248 model exits", flush=True)
        else:
            distributed_exits = auto_detect_exits(grid, max_exits=248)
            print(f"[JOB {job_id[:8]}] Auto-detected {len(distributed_exits)} exits from grid boundaries", flush=True)
        
        # Create environment
        env = EvacuationEnv(
            grid=grid,
            num_agents=len(agent_positions_xy),
            max_steps=500,
            agent_start_positions=agent_positions_xy,
            fire_start_position=fire_position_xy,
            exits=distributed_exits,  # Use distributed exits
            max_agents=10  # Zero-padding for 500k_steps model compatibility
        )
        
        # Run simulation
        obs, _ = env.reset()
        terminated, truncated = False, False
        history = []
        step_count = 0
        max_steps = 500
        
        print(f"[JOB {job_id[:8]}] Starting RL simulation: {len(agent_positions_xy)} agents, {len(env.exits)} exits", flush=True)
        
        while not terminated and not truncated and step_count < max_steps:
            if USE_MASKABLE_PPO:
                # For MaskablePPO, action_mask must match training dimensions (248)
                num_exits = len(env.exits) if env.exits else 248
                action_mask = np.zeros((1, 248), dtype=np.int8)  # Shape: [1, 248] for batch size 1
                action_mask[0, :num_exits] = 1  # Only enable actual exits
                action, _ = ppo_model.predict(obs, action_masks=action_mask, deterministic=True)
            else:
                # For standard PPO v1.5
                action, _ = ppo_model.predict(obs, deterministic=True)
                # Apply modulo guard for v1.5 fixed action space
                action = int(action) % len(env.exits)
            
            obs, _, terminated, truncated, _ = env.step(int(action))
            step_count += 1
            
            # Log progress every 50 steps
            if step_count % 50 == 0:
                active = sum(1 for a in env.agents if a.status == 'evacuating')
                escaped = sum(1 for a in env.agents if a.status == 'escaped')
                burned = sum(1 for a in env.agents if a.status == 'burned')
                print(f"[JOB {job_id[:8]}] Step {step_count}/{max_steps}: {active} active, {escaped} escaped, {burned} burned", flush=True)
            
            # Store frame data (convert fire coords from [y,x] to [row,col] for frontend)
            fire_coords = np.argwhere(env.fire_sim.fire_map == 1).tolist()  # Already [y,x] = [row,col]
            
            agents_data = []
            for agent in env.agents:
                # Convert agent position from (x,y) to [row,col] for frontend
                agent_pos_frontend = [agent.pos[1], agent.pos[0]]  # [y, x] = [row, col]
                agents_data.append({
                    "pos": agent_pos_frontend,
                    "status": agent.status,
                    "state": agent.state,
                    "tripped": agent.tripped_timer > 0
                })
            
            history.append({
                "fire_map": fire_coords,
                "agents": agents_data
            })
        
        # Extended fire steps: continue fire spread after all agents are done
        # Also move escaped agents to assembly point if provided
        assembly_point_xy = frontend_to_backend(config.assembly_point[0], config.assembly_point[1]) if config.assembly_point else None
        
        if config.extended_fire_steps != 0:
            if config.extended_fire_steps == -1:
                # Burn until complete - continue fire until no more cells can burn
                print(f"[JOB {job_id[:8]}] Burn until complete mode - spreading fire until fully consumed", flush=True)
                if assembly_point_xy:
                    print(f"[JOB {job_id[:8]}] Assembly point: {assembly_point_xy} - agents will move there after escaping", flush=True)
                
                max_burn_steps = 2000  # Safety limit
                burn_step = 0
                while burn_step < max_burn_steps:
                    prev_fire_count = np.sum(env.fire_sim.fire_map)
                    env.fire_sim.step()
                    new_fire_count = np.sum(env.fire_sim.fire_map)
                    
                    # Move escaped agents toward assembly point
                    if assembly_point_xy:
                        for agent in env.agents:
                            if agent.status == 'escaped':
                                agent.move_to_assembly(grid, assembly_point_xy, env.fire_sim.fire_map)
                                agent.check_status(env.fire_sim.fire_map, env.exits, assembly_point=assembly_point_xy)
                    
                    fire_coords = np.argwhere(env.fire_sim.fire_map == 1).tolist()
                    agents_data = []
                    for agent in env.agents:
                        agent_pos_frontend = [agent.pos[1], agent.pos[0]]
                        agents_data.append({
                            "pos": agent_pos_frontend,
                            "status": agent.status,
                            "state": agent.state,
                            "tripped": False
                        })
                    history.append({
                        "fire_map": fire_coords,
                        "agents": agents_data
                    })
                    
                    burn_step += 1
                    
                    # Check if done: fire stopped AND all agents at assembly (or no assembly)
                    fire_stopped = (new_fire_count == prev_fire_count)
                    if assembly_point_xy:
                        all_at_assembly = all(a.status in ['at_assembly', 'burned'] for a in env.agents)
                        if fire_stopped and all_at_assembly:
                            print(f"[JOB {job_id[:8]}] Fire fully spread and all agents at assembly after {burn_step} extra steps", flush=True)
                            break
                        elif fire_stopped:
                            # Fire stopped but agents still moving to assembly - continue
                            pass
                    elif fire_stopped:
                        print(f"[JOB {job_id[:8]}] Fire fully spread after {burn_step} extra steps", flush=True)
                        break
            else:
                # Fixed number of extended steps
                print(f"[JOB {job_id[:8]}] Running {config.extended_fire_steps} extended fire steps...", flush=True)
                for extra_step in range(config.extended_fire_steps):
                    env.fire_sim.step()
                    fire_coords = np.argwhere(env.fire_sim.fire_map == 1).tolist()
                    # Keep last agent positions frozen
                    agents_data = []
                    for agent in env.agents:
                        agent_pos_frontend = [agent.pos[1], agent.pos[0]]
                        agents_data.append({
                            "pos": agent_pos_frontend,
                            "status": agent.status,
                            "state": agent.state,
                            "tripped": False
                        })
                    history.append({
                        "fire_map": fire_coords,
                        "agents": agents_data
                    })
        
        # Calculate final statistics
        # Count both 'escaped' and 'at_assembly' as successfully evacuated
        escaped = sum(1 for agent in env.agents if agent.status in ["escaped", "at_assembly"])
        burned = sum(1 for agent in env.agents if agent.status == "burned")
        total_agents = len(env.agents)
        
        print(f"[JOB {job_id[:8]}] Simulation complete at step {step_count}: {escaped}/{total_agents} escaped, {burned} burned", flush=True)
        
        # Prepare agent results with detailed information
        agent_results = []
        for i, agent in enumerate(env.agents):
            # Normalize status for frontend (at_assembly counts as escaped)
            final_status = "escaped" if agent.status in ["escaped", "at_assembly"] else agent.status
            agent_results.append({
                "agent_id": i,
                "status": final_status,
                "exit_time": agent.escape_time if hasattr(agent, 'escape_time') and agent.status in ["escaped", "at_assembly"] else None,
                "path_length": agent.steps_taken if hasattr(agent, 'steps_taken') else step_count
            })
        
        # Convert exits to frontend format [row, col] for visualization
        exits_frontend = [[y, x] for x, y in (exits_xy if exits_xy else [])]
        
        # Convert assembly point to frontend format if provided
        assembly_point_frontend = None
        if config.assembly_point:
            assembly_point_frontend = [config.assembly_point[0], config.assembly_point[1]]  # Already in (row, col)
        
        # Prepare result with correct structure for frontend
        result = {
            "total_agents": total_agents,
            "escaped_count": escaped,
            "burned_count": burned,
            "time_steps": step_count,
            "agent_results": agent_results,
            "exits": exits_frontend,  # Include exits for visualization
            "assembly_point": assembly_point_frontend,  # Include assembly point
            "commander_actions": history[:100] if history else [],  # Limit to first 100 actions
            "animation_data": {
                "history": history
            },
            "mode": "rl"
        }
        
        # Update job status to complete
        update_job_status(job_id, "complete", result=result)
        
        # Clean up memory after simulation
        del env
        del history
        del grid
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
    except Exception as e:
        # Update job status to failed
        print(f"[JOB {job_id[:8]}] FAILED with error: {str(e)}", flush=True)
        import traceback
        traceback.print_exc()
        update_job_status(job_id, "failed", error=str(e))
        # Clean up on error too
        gc.collect()

@app.post("/api/run-simulation", response_model=JobResponse)
async def run_simulation(config: SimulationConfig, background_tasks: BackgroundTasks):
    """Start simulation in background"""
    try:
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job status
        update_job_status(job_id, "processing")
        
        # Add background task
        background_tasks.add_task(run_simulation_task, job_id, config)
        
        return {"job_id": job_id}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting simulation: {str(e)}")

@app.get("/api/status/{job_id}", response_model=StatusResponse)
async def get_status(job_id: str):
    """Get simulation job status"""
    job = get_job_status(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info",
        access_log=True
    )
