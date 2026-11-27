"""SafeHER Stage 4 Modular Multilingual NLP Package."""

from ai.nlp.inference_service import analyze_multilingual_threat
from ai.nlp.language_detection import detect_language_and_script
from ai.nlp.model_loader import get_loaded_status
from ai.nlp.model_registry import MODEL_REGISTRY, get_registry_summary

__all__ = [
    "analyze_multilingual_threat",
    "detect_language_and_script",
    "get_loaded_status",
    "get_registry_summary",
    "MODEL_REGISTRY",
]
