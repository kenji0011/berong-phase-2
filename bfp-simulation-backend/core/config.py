import os
import sys
from pathlib import Path

# Load .env from the project root (parent of bfp-simulation-backend/)
from dotenv import load_dotenv
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)
    print(f"[CONFIG] Loaded .env from {_env_path}")

SIMULATION_TIMEOUT_SECONDS = 360  # 6 minutes - generous for CPU-bound work
PPO_MODEL_VERSION = "500k_steps"
USE_MASKABLE_PPO = True
IMAGE_SIZE = 256
MAX_HISTORY_FRAMES = 300  # Downsample animation to this many frames max

PYTHON_VERSION = sys.version_info

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("FATAL: DATABASE_URL environment variable is not set!", file=sys.stderr)
    sys.exit(1)

# Strip Prisma-specific query params that psycopg2 doesn't understand
if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

CORS_ORIGINS_ENV = os.environ.get(
    "CORS_ORIGINS",
    "https://bfpscberong.app,https://www.bfpscberong.app,http://nextjs:3000",
)
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_ENV.split(",")]
