from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class AppState:
    unet_model: Optional[Any] = None
    ppo_model: Optional[Any] = None
    device: Optional[Any] = None
    chatbot_model: Optional[Any] = None
    words: Optional[Any] = None
    classes: Optional[Any] = None
    intents: Optional[Any] = None
    lemmatizer: Optional[Any] = None
    use_gemini: bool = False
    gemini_model: Optional[Any] = None


state = AppState()
