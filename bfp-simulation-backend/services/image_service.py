import base64
import json
import os
import tempfile
from io import BytesIO
from typing import Optional

import numpy as np
from fastapi import HTTPException, UploadFile
from PIL import Image

from core.config import IMAGE_SIZE
from core.state import state
from inference import analyze_floor_plan_brightness, create_grid_from_image

try:
    import google.generativeai as genai
except Exception:
    genai = None


def _save_upload(file: UploadFile) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
        content = file.file.read()
        temp_file.write(content)
        return temp_file.name


def process_image(file: UploadFile, threshold: float, invert_mask: Optional[bool]):
    if state.unet_model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "U-Net model not loaded. The backend started but model loading failed. "
                "Please check server logs and restart the backend."
            ),
        )

    temp_path = _save_upload(file)

    try:
        if invert_mask is None:
            analysis = analyze_floor_plan_brightness(temp_path, IMAGE_SIZE)
            invert_mask = analysis["should_invert"]
            print(
                f"[PROCESS-IMAGE] Auto-detected invert_mask={invert_mask} "
                f"(edge={analysis['edge_brightness']:.1f}, center={analysis['center_brightness']:.1f})"
            )

        original_image = Image.open(temp_path)
        original_image = original_image.resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)

        buffered = BytesIO()
        original_image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()

        grid = create_grid_from_image(
            state.unet_model,
            temp_path,
            IMAGE_SIZE,
            state.device,
            threshold=threshold,
            invert_mask=invert_mask,
        )

        if grid is None:
            raise HTTPException(status_code=400, detail="Failed to process image")

        return {
            "grid": grid.tolist(),
            "originalImage": f"data:image/png;base64,{img_base64}",
            "gridSize": {"width": IMAGE_SIZE, "height": IMAGE_SIZE},
            "threshold": float(threshold),
            "invertMask": bool(invert_mask),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error processing image: {exc}")
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def process_image_gemini(file: UploadFile):
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key or gemini_api_key == "your-gemini-api-key":
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Set GEMINI_API_KEY environment variable.",
        )
    if genai is None:
        raise HTTPException(status_code=503, detail="Gemini SDK not available in this environment.")

    temp_path = _save_upload(file)

    try:
        original_image = Image.open(temp_path)
        original_image = original_image.resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)

        buffered = BytesIO()
        original_image.save(buffered, format="PNG")
        img_bytes = buffered.getvalue()
        img_base64 = base64.b64encode(img_bytes).decode()

        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

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

        image_part = {"mime_type": "image/png", "data": img_base64}
        response = model.generate_content([prompt, image_part])
        response_text = response.text

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
                "analysis": "Failed to parse Gemini response",
            }

        enhanced_grid = np.zeros((IMAGE_SIZE, IMAGE_SIZE), dtype=int)

        for wall in gemini_analysis.get("walls", []):
            if len(wall) >= 4:
                r1, c1, r2, c2 = [int(v) for v in wall[:4]]
                r1, r2 = max(0, min(r1, r2, 255)), min(255, max(r1, r2))
                c1, c2 = max(0, min(c1, c2, 255)), min(255, max(c1, c2))
                enhanced_grid[r1 : r2 + 1, c1 : c2 + 1] = 1

        for door in gemini_analysis.get("doors", []):
            if len(door) >= 4:
                r, c, w, h = [int(v) for v in door[:4]]
                r, c = max(0, min(r, 255)), max(0, min(c, 255))
                w, h = min(w, 255 - c), min(h, 255 - r)
                enhanced_grid[r : r + h, c : c + w] = 2

        for window in gemini_analysis.get("windows", []):
            if len(window) >= 4:
                r, c, w, h = [int(v) for v in window[:4]]
                r, c = max(0, min(r, 255)), max(0, min(c, 255))
                w, h = min(w, 255 - c), min(h, 255 - r)
                enhanced_grid[r : r + h, c : c + w] = 3

        wall_count = np.sum(enhanced_grid == 1)
        if wall_count < 1000 and state.unet_model is not None:
            print(f"[GEMINI] Low wall detection ({wall_count} cells), falling back to U-Net")
            unet_grid = create_grid_from_image(
                state.unet_model,
                temp_path,
                IMAGE_SIZE,
                state.device,
                threshold=0.5,
                invert_mask=True,
            )
            if unet_grid is not None:
                enhanced_grid = np.where(
                    (enhanced_grid == 2) | (enhanced_grid == 3),
                    enhanced_grid,
                    unet_grid.astype(int),
                )

        return {
            "grid": enhanced_grid.tolist(),
            "originalImage": f"data:image/png;base64,{img_base64}",
            "gridSize": {"width": IMAGE_SIZE, "height": IMAGE_SIZE},
            "analysis": gemini_analysis,
            "method": "gemini",
            "gridLegend": {"0": "free_space", "1": "wall", "2": "door", "3": "window"},
        }
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[GEMINI] Error: {exc}")
        raise HTTPException(status_code=500, detail=f"Gemini processing error: {exc}")
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
