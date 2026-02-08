from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

from api.routes import router
from core.config import CORS_ORIGINS
from db.jobs import init_db, start_cleanup_thread
from services.chatbot_service import load_chatbot
from services.model_loader import load_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "=" * 60)
    print("FIRE EVACUATION SIMULATION BACKEND - STARTING UP")
    print("=" * 60)
    print(f"Working directory: {os.getcwd()}")
    print(f"Python version: {sys.version}")
    print("=" * 60)

    load_models()
    load_chatbot()
    init_db()
    start_cleanup_thread()

    print("\nServer is now listening on http://0.0.0.0:8000")
    print("API documentation available at http://localhost:8000/docs")
    print("=" * 60 + "\n")

    yield

    print("\nShutting down backend...")


app = FastAPI(title="Fire Evacuation Simulation API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True,
    )
