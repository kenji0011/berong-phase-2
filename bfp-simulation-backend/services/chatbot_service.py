import json
import pickle
from typing import Optional

from core.config import PYTHON_VERSION
from core.state import state

# Chatbot dependencies - optional (TensorFlow doesn't support Python 3.13 yet)
TENSORFLOW_AVAILABLE = False
nltk = None
WordNetLemmatizer = None
load_model = None

if PYTHON_VERSION >= (3, 13):
    print(
        f"[WARN] Python {PYTHON_VERSION.major}.{PYTHON_VERSION.minor} detected - TensorFlow not supported"
    )
    print("[WARN] Chatbot will be disabled, but simulation will work.")
else:
    try:
        import nltk
        from nltk.stem import WordNetLemmatizer
        import tensorflow as tf
        from tensorflow.keras.models import load_model
        TENSORFLOW_AVAILABLE = True
    except Exception as exc:
        print(f"[WARN] TensorFlow/NLTK not available: {exc}")
        print("[WARN] Chatbot will be disabled, but simulation will work.")
        TENSORFLOW_AVAILABLE = False

GENAI_AVAILABLE = False
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except Exception as exc:
    print(f"[WARN] google-generativeai not available: {exc}")
    genai = None


def load_chatbot():
    print("\n[3/3] Loading Fire Safety Chatbot Model...")

    if not TENSORFLOW_AVAILABLE:
        print("  [SKIP] TensorFlow not available - chatbot disabled")
        print("  (This is normal on Python 3.13+, simulation will still work)")
        state.chatbot_model = None
        state.lemmatizer = None
    else:
        try:
            try:
                nltk.data.find("tokenizers/punkt")
            except LookupError:
                print("  Downloading NLTK punkt tokenizer...")
                nltk.download("punkt")

            try:
                nltk.data.find("corpora/wordnet")
            except LookupError:
                print("  Downloading NLTK wordnet...")
                nltk.download("wordnet")

            try:
                nltk.data.find("corpora/omw-1.4")
            except LookupError:
                print("  Downloading NLTK omw-1.4...")
                nltk.download("omw-1.4")

            state.lemmatizer = WordNetLemmatizer()
            state.chatbot_model = load_model("Fire Safety Chatbot/chatbot_model.h5")
            state.words = pickle.load(open("Fire Safety Chatbot/words.pkl", "rb"))
            state.classes = pickle.load(open("Fire Safety Chatbot/classes.pkl", "rb"))
            state.intents = json.load(open("Fire Safety Chatbot/intents.json", "rb"))
            print("  [OK] Chatbot model loaded successfully")
        except Exception as exc:
            print("  [WARN] WARNING: Chatbot failed to load:")
            print(f"  {type(exc).__name__}: {exc}")
            print("  Chatbot will not be available, but simulation will work.")
            state.chatbot_model = None

    state.use_gemini = False
    if GENAI_AVAILABLE:
        import os

        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if gemini_api_key and gemini_api_key != "your-gemini-api-key":
            try:
                print("\n  Initializing Google Gemini AI...")
                genai.configure(api_key=gemini_api_key)
                state.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                state.use_gemini = True
                print("  [OK] Gemini API configured successfully")
            except Exception as exc:
                print(f"  [WARN] Gemini API initialization failed: {exc}")
                print("  Falling back to TensorFlow chatbot model")
                state.use_gemini = False
        else:
            print("  [INFO] GEMINI_API_KEY not configured, using TensorFlow model")
    else:
        print("  [INFO] Gemini API not available")

    print("=" * 60)


def _clean_up_sentence(sentence: str):
    if not TENSORFLOW_AVAILABLE or nltk is None:
        return sentence.lower().split()
    if state.lemmatizer is None:
        return nltk.word_tokenize(sentence)
    sentence_words = nltk.word_tokenize(sentence)
    sentence_words = [state.lemmatizer.lemmatize(word.lower()) for word in sentence_words]
    return sentence_words


def _bow(sentence: str, show_details: bool = True):
    if not TENSORFLOW_AVAILABLE or state.words is None:
        return []
    sentence_words = _clean_up_sentence(sentence)
    bag = [0] * len(state.words)
    for s in sentence_words:
        for i, w in enumerate(state.words):
            if w == s:
                bag[i] = 1
                if show_details:
                    print(f"Found in bag: {w}")
    return bag


def _predict_class(sentence: str):
    if not TENSORFLOW_AVAILABLE or state.chatbot_model is None:
        return []
    import numpy as np

    p = _bow(sentence, show_details=False)
    if not p:
        return []
    res = state.chatbot_model.predict(np.array([p]))[0]
    error_threshold = 0.25
    results = [[i, r] for i, r in enumerate(res) if r > error_threshold]
    results.sort(key=lambda x: x[1], reverse=True)
    return [{"intent": state.classes[r[0]], "probability": str(r[1])} for r in results]


def _get_response(intents, intents_json):
    if intents:
        tag = intents[0]["intent"]
        if tag in intents_json:
            import random
            return random.choice(intents_json[tag]["responses"])
        return "I don't understand. Please ask me something related to fire safety."
    return "I don't understand. Please ask me something related to fire safety."


def chatbot_response(message: str) -> str:
    if state.use_gemini and state.gemini_model:
        try:
            system_prompt = (
                "You are a fire safety expert chatbot for the Bureau of Fire Protection (BFP) in the "
                "Philippines. Your role is to: provide accurate fire safety information, explain fire "
                "prevention tips in simple Filipino and English (Taglish), guide people on emergency "
                "procedures, be friendly and helpful, and keep responses concise (2-3 sentences) unless "
                "detailed explanation is needed. Always prioritize safety and provide actionable advice."
            )
            full_prompt = f"{system_prompt}\n\nUser question: {message}\n\nYour response:"
            response = state.gemini_model.generate_content(full_prompt)
            return response.text
        except Exception as exc:
            print(f"Gemini API error: {exc}")

    intents = _predict_class(message)
    if state.intents is None:
        return "I'm sorry, the AI chatbot is currently unavailable. Please try again later."
    return _get_response(intents, state.intents)
