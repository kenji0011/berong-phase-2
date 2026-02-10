from fastapi import APIRouter, File, HTTPException, UploadFile

from core.config import PPO_MODEL_VERSION, USE_MASKABLE_PPO
from core.state import state
from db.jobs import get_job_status, update_job_status
from schemas import ChatbotRequest, ChatbotResponse, JobResponse, SimulationConfig, StatusResponse
from services.chatbot_service import chatbot_response
from services.image_service import process_image, process_image_gemini
from services.simulation_service import create_job_id, run_simulation_task, _simulation_executor

router = APIRouter()

# File upload constraints
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"}


async def _validate_image_upload(file: UploadFile) -> None:
    """Validate uploaded file is a safe image within size limits."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )
    # Read content to check size
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(content)} bytes). Maximum: {MAX_UPLOAD_SIZE} bytes (10 MB).",
        )
    # Reset file position for downstream processing
    await file.seek(0)


@router.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "unet_loaded": state.unet_model is not None,
        "ppo_loaded": state.ppo_model is not None,
        "ppo_version": PPO_MODEL_VERSION,
        "maskable_ppo": USE_MASKABLE_PPO,
    }


@router.post("/api/chatbot/ai-response", response_model=ChatbotResponse)
async def get_chatbot_response(request: ChatbotRequest):
    try:
        if state.chatbot_model is None and not state.use_gemini:
            return ChatbotResponse(
                response="I'm sorry, the AI chatbot is currently unavailable. Please try again later."
            )
        response = chatbot_response(request.message)
        return ChatbotResponse(response=response)
    except Exception as exc:
        print(f"Error in chatbot response: {exc}")
        return ChatbotResponse(
            response="I'm sorry, I encountered an error processing your request."
        )


@router.post("/api/process-image")
async def process_image_endpoint(
    file: UploadFile = File(...),
    threshold: float = 0.5,
    invert_mask: bool | None = None,
):
    await _validate_image_upload(file)
    return process_image(file, threshold, invert_mask)


@router.post("/api/process-image-gemini")
async def process_image_gemini_endpoint(file: UploadFile = File(...)):
    await _validate_image_upload(file)
    return process_image_gemini(file)


@router.post("/api/run-simulation", response_model=JobResponse)
async def run_simulation(config: SimulationConfig):
    try:
        job_id = create_job_id()
        update_job_status(job_id, "processing")
        # Submit to dedicated thread pool — does NOT block the event loop
        _simulation_executor.submit(run_simulation_task, job_id, config)
        return {"job_id": job_id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error starting simulation: {exc}")


@router.get("/api/status/{job_id}", response_model=StatusResponse)
async def get_status(job_id: str):
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
