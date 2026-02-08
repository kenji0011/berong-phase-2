import os
import torch
from stable_baselines3 import PPO
from sb3_contrib import MaskablePPO

from core.config import PPO_MODEL_VERSION, USE_MASKABLE_PPO
from core.state import state
from unet import UNet


def load_models():
    state.device = torch.device("cpu")
    print(f"\nUsing device: {state.device}")

    print("\n[1/3] Loading U-Net Floor Plan Segmentation Model...")
    try:
        model_path = "models/unet_floorplan_model.pth"
        abs_path = os.path.abspath(model_path)
        print(f"  Model path: {abs_path}")

        if not os.path.exists(model_path):
            print("  [FAIL] ERROR: Model file not found!")
            print(f"  Expected location: {abs_path}")
            print("  Please ensure the model file exists at this location.")
            state.unet_model = None
        else:
            file_size = os.path.getsize(model_path) / (1024 * 1024)
            print(f"  File size: {file_size:.2f} MB")
            print("  Loading model...")

            unet_model = UNet()
            checkpoint = torch.load(model_path, map_location=state.device)
            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                print("  Detected checkpoint format, extracting model_state_dict...")
                unet_model.load_state_dict(checkpoint["model_state_dict"])
            else:
                unet_model.load_state_dict(checkpoint)

            unet_model.to(state.device)
            unet_model.eval()
            state.unet_model = unet_model
            print("  [OK] U-Net model loaded successfully")
    except Exception as exc:
        print("  [FAIL] ERROR loading U-Net model:")
        print(f"  {type(exc).__name__}: {exc}")
        import traceback
        traceback.print_exc()
        state.unet_model = None

    print(f"\n[2/3] Loading PPO Commander Model ({PPO_MODEL_VERSION})...")
    try:
        model_path = f"models/ppo_commander_{PPO_MODEL_VERSION}.zip"
        abs_path = os.path.abspath(model_path)
        print(f"  Model path: {abs_path}")
        print(f"  Using {'MaskablePPO' if USE_MASKABLE_PPO else 'Standard PPO'}")

        if not os.path.exists(model_path):
            print("  [FAIL] ERROR: Model file not found!")
            print(f"  Expected location: {abs_path}")
            state.ppo_model = None
        else:
            file_size = os.path.getsize(model_path) / (1024 * 1024)
            print(f"  File size: {file_size:.2f} MB")
            print("  Loading model...")
            if USE_MASKABLE_PPO:
                state.ppo_model = MaskablePPO.load(model_path, device=state.device)
            else:
                state.ppo_model = PPO.load(model_path, device=state.device)
            print(f"  [OK] PPO Commander {PPO_MODEL_VERSION} loaded successfully")
    except Exception as exc:
        print("  [FAIL] ERROR loading PPO model:")
        print(f"  {type(exc).__name__}: {exc}")
        import traceback
        traceback.print_exc()
        state.ppo_model = None

    print("\n" + "=" * 60)
    print("STARTUP SUMMARY:")
    print("=" * 60)
    print(f"  U-Net Model:     {'[OK] Loaded' if state.unet_model else '[FAIL] FAILED'}")
    print(f"  PPO Model:       {'[OK] Loaded' if state.ppo_model else '[FAIL] FAILED'}")
    print("=" * 60)

    if not state.unet_model or not state.ppo_model:
        print("\n[WARN] CRITICAL WARNING: Essential models failed to load!")
        print("The simulation WILL NOT WORK without U-Net and PPO models.")
        print("Please check the errors above and ensure model files exist.")
        print("\nExpected model locations:")
        print(f"  - {os.path.abspath('models/unet_floorplan_model.pth')}")
        print(f"  - {os.path.abspath(f'models/ppo_commander_{PPO_MODEL_VERSION}.zip')}")
    else:
        print("\n[OK] All critical models loaded successfully!")
        print("Backend is ready to process fire evacuation simulations.")
