"""
SafeHER Thread-Safe Lazy NLP Model Loader
=========================================
Loads approved HuggingFace checkpoints lazily with USE_TF=0 so FastAPI
startup is never blocked and missing/offline models degrade gracefully.
"""

from __future__ import annotations

import logging
import os
import threading
from typing import Any, Dict, Optional

os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_TORCH", "1")

logger = logging.getLogger("safeher.ai.nlp.loader")

_LOCK = threading.Lock()
_PIPELINES: Dict[str, Any] = {}
_LOAD_ERRORS: Dict[str, str] = {}


def get_nlp_pipeline(registry_key: str) -> Optional[Any]:
    """
    Returns a cached HuggingFace text-classification pipeline for the given
    registry_key ('indic_abusive_muril', 'english_toxic_bert', 'kannada_deoff_xlmr'),
    or None if loading failed.
    """
    if registry_key in _PIPELINES:
        return _PIPELINES[registry_key]

    with _LOCK:
        if registry_key in _PIPELINES:
            return _PIPELINES[registry_key]

        from ai.nlp.model_registry import MODEL_REGISTRY

        spec = MODEL_REGISTRY.get(registry_key)
        if spec is None:
            _LOAD_ERRORS[registry_key] = f"Unknown model registry key: {registry_key}"
            return None

        try:
            import torch
            from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline

            device = 0 if torch.cuda.is_available() else -1
            try:
                tok = AutoTokenizer.from_pretrained(spec.model_id)
            except Exception as tok_exc:
                if registry_key == "kannada_deoff_xlmr":
                    logger.info("Using xlm-roberta-base tokenizer fallback for %s: %s", spec.model_id, tok_exc)
                    tok = AutoTokenizer.from_pretrained("xlm-roberta-base")
                else:
                    raise

            mdl = AutoModelForSequenceClassification.from_pretrained(spec.model_id)
            mdl.eval()
            pipe = pipeline(
                "text-classification",
                model=mdl,
                tokenizer=tok,
                framework="pt",
                top_k=None,
                device=device,
                truncation=True,
                max_length=256,
            )
            _PIPELINES[registry_key] = pipe
            _LOAD_ERRORS.pop(registry_key, None)
            logger.info("Loaded NLP model %s (%s)", spec.model_id, spec.version)
            return pipe
        except Exception as exc:
            _LOAD_ERRORS[registry_key] = str(exc)
            logger.warning("Failed to load NLP model %s: %s", spec.model_id, exc)
            return None


def get_loaded_status() -> Dict[str, Any]:
    from ai.nlp.model_registry import MODEL_REGISTRY

    return {
        key: {
            "model_id": spec.model_id,
            "version": spec.version,
            "loaded": key in _PIPELINES,
            "error": _LOAD_ERRORS.get(key),
            "license": spec.license,
        }
        for key, spec in MODEL_REGISTRY.items()
    }
