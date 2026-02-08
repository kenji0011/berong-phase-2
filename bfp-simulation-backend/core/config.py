import os
import sys

SIMULATION_TIMEOUT_SECONDS = 360  # 6 minutes - generous for CPU-bound work
PPO_MODEL_VERSION = "500k_steps"
USE_MASKABLE_PPO = True
IMAGE_SIZE = 256
MAX_HISTORY_FRAMES = 300  # Downsample animation to this many frames max

PYTHON_VERSION = sys.version_info

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://bfp_user:bfp_secret_password@localhost:5432/bfp_berong",
)

CORS_ORIGINS_ENV = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
)
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_ENV.split(",")]
