from pydantic import BaseModel
from typing import Any, Dict, List, Optional, Tuple


class ChatbotRequest(BaseModel):
    message: str


class ChatbotResponse(BaseModel):
    response: str


class SimulationConfig(BaseModel):
    grid: List[List[int]]
    exits: Optional[List[Tuple[int, int]]] = None
    fire_position: Tuple[int, int]
    agent_positions: List[Tuple[int, int]]
    use_rl: bool = True
    threshold: float = 0.5
    invert_mask: bool = True
    material_type: str = "concrete"
    extended_fire_steps: int = 0
    assembly_point: Optional[Tuple[int, int]] = None


class JobResponse(BaseModel):
    job_id: str


class StatusResponse(BaseModel):
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
