"""
Member 1 (AI/ML) Integration Service Adapter.
Wraps Member 1's actual HuggingFace NLP (unitary/toxic-bert) and Vision
(AdamCodd/vit-base-nsfw-detector) models with strict validation, lazy loading,
and transparent error propagation.
"""

import hashlib
import io
import os
import threading
from typing import Any, Dict, List, Tuple

os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_TORCH", "1")

import numpy as np
from fastapi import HTTPException, status
from PIL import Image, UnidentifiedImageError

MAX_TEXT_LENGTH = 10_000
MAX_IMAGE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}

_model_lock = threading.Lock()
_text_pipeline = None
_image_pipeline = None


def _get_text_pipeline():
    global _text_pipeline
    if _text_pipeline is not None:
        return _text_pipeline
    with _model_lock:
        if _text_pipeline is None:
            try:
                from transformers import pipeline

                _text_pipeline = pipeline(
                    "text-classification",
                    model="unitary/toxic-bert",
                    framework="pt",
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Text AI model unavailable: {exc}",
                ) from exc
    return _text_pipeline


def _get_image_pipeline():
    global _image_pipeline
    if _image_pipeline is not None:
        return _image_pipeline
    with _model_lock:
        if _image_pipeline is None:
            try:
                from transformers import pipeline

                _image_pipeline = pipeline(
                    "image-classification",
                    model="AdamCodd/vit-base-nsfw-detector",
                    framework="pt",
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Image AI model unavailable: {exc}",
                ) from exc
    return _image_pipeline


def get_ai_health() -> Dict[str, Any]:
    return {
        "text_model": {
            "id": "unitary/toxic-bert",
            "loaded": _text_pipeline is not None,
        },
        "image_model": {
            "id": "AdamCodd/vit-base-nsfw-detector",
            "loaded": _image_pipeline is not None,
        },
    }


def analyze_text(text: str) -> Dict[str, Any]:
    cleaned = (text or "").strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Input text cannot be empty.",
        )
    if len(cleaned) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Input text exceeds maximum length of {MAX_TEXT_LENGTH} characters.",
        )

    model = _get_text_pipeline()
    try:
        # Truncate token sequence safely inside toxic-bert's 512 token window
        raw_results = model(cleaned[:2000])
        result = raw_results[0]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text model inference failed: {exc}",
        ) from exc

    label = str(result.get("label", "")).lower()
    score = float(result.get("score", 0.0))
    text_lower = cleaned.lower()

    # Exact Member 1 toxic-bert + dynamic signal scoring from api_sk1.py
    toxicity = score if "toxic" in label else score * 0.3

    insult_words = ["idiot", "stupid", "useless", "dumb", "loser"]
    insult = 0.0
    for word in insult_words:
        if word in text_lower:
            insult += 0.3
    insult = min(insult + (toxicity * 0.5), 1.0)

    threat_words = ["kill", "destroy", "attack", "die", "bomb", "shoot"]
    threat = 0.0
    for word in threat_words:
        if word in text_lower:
            threat += 0.4
    if "i will" in text_lower or "i'm going to" in text_lower:
        threat += 0.3
    threat = min(threat + (toxicity * 0.4), 1.0)

    if threat > 0.6:
        decision = "BLOCKED"
    elif insult > 0.5 or toxicity > 0.7:
        decision = "BLOCKED"
    elif toxicity > 0.4:
        decision = "WARNING"
    else:
        decision = "SAFE"

    detected_signals: List[str] = []
    if threat > 0.3:
        detected_signals.append("Threatening / hostile language markers detected")
    if insult > 0.4:
        detected_signals.append("Derogatory / insulting slurs identified")
    if any(k in text_lower for k in ["money", "pay", "btc", "bitcoin", "transfer"]):
        detected_signals.append("Possible financial extortion / ransom language")
    if any(k in text_lower for k in ["share", "post", "circulate", "leak", "send to"]):
        detected_signals.append("Coercive distribution threat indicators")
    if any(k in text_lower for k in ["arrest", "warrant", "pmla", "police", "cbi"]):
        detected_signals.append("Possible law-enforcement impersonation / digital arrest language")
    if not detected_signals:
        detected_signals.append("No severe threat markers flagged")

    blackmail_score = (
        0.85
        if any(k in text_lower for k in ["leak", "private", "photos", "circulate"])
        and any(k in text_lower for k in ["pay", "btc", "money", "delete"])
        else round(min(threat * 0.6, 0.5), 3)
    )
    extortion_score = (
        0.88
        if any(k in text_lower for k in ["btc", "bitcoin", "money", "pay"])
        else round(min(threat * 0.5, 0.4), 3)
    )

    urgency = (
        "critical"
        if threat > 0.7 or blackmail_score > 0.7
        else "high"
        if threat > 0.4 or toxicity > 0.65
        else "medium"
        if toxicity > 0.35
        else "low"
    )

    return {
        "toxicity": round(toxicity, 3),
        "insult": round(insult, 3),
        "threat": round(threat, 3),
        "harassment_score": round(min(insult * 1.15, 1.0), 3),
        "blackmail_score": round(blackmail_score, 3),
        "extortion_score": round(extortion_score, 3),
        "urgency_level": urgency,
        "decision": decision,
        "detected_signals": detected_signals,
        "explanation": (
            "The analyzed communication contains high-severity threat or coercion patterns evaluated by unitary/toxic-bert and heuristic rules."
            if urgency in ("critical", "high")
            else "Low to moderate abuse signals detected by unitary/toxic-bert."
        ),
        "limitations": [
            "Automated NLP scores reflect vocabulary patterns and do not verify sender identity or physical capability.",
            "This assessment is a preliminary decision-support indicator, not a formal legal determination.",
        ],
        "suggested_steps": [
            "Do not engage in argument or comply with extortion demands.",
            "Preserve all communications with complete timestamp metadata.",
            "File an official report on the National Cyber Crime Reporting Portal (1930 / cybercrime.gov.in).",
        ],
    }


def validate_and_open_image(content: bytes) -> Tuple[Image.Image, str]:
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Uploaded file is empty.",
        )
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 15 MB maximum limit.",
        )
    try:
        probe = Image.open(io.BytesIO(content))
        fmt = (probe.format or "").upper()
        probe.verify()
    except (UnidentifiedImageError, Exception) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Unsupported or corrupted image file. Supported formats: JPEG, PNG, WEBP.",
        ) from exc

    if fmt not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Unsupported image format '{fmt}'. Supported formats: JPEG, PNG, WEBP.",
        )

    image = Image.open(io.BytesIO(content)).convert("RGB")
    return image, fmt


def analyze_image(content: bytes) -> Dict[str, Any]:
    image, fmt = validate_and_open_image(content)
    model = _get_image_pipeline()

    try:
        results = model(image)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image model inference failed: {exc}",
        ) from exc

    scores = {str(r.get("label", "")).lower(): float(r.get("score", 0.0)) for r in results}
    nsfw_score = round(scores.get("nsfw", 0.0), 3)

    # Member 1 pixel variance heuristic (from api_sk1.py)
    img_np = np.array(image)
    variance = float(np.var(img_np))
    deepfake_score = 0.7 if variance < 300.0 else 0.2

    if nsfw_score > 0.6:
        decision = "BLOCKED"
    elif deepfake_score > 0.6:
        decision = "SUSPICIOUS"
    else:
        decision = "SAFE"

    sha256_hex = hashlib.sha256(content).hexdigest()
    short_md5 = hashlib.md5(content).hexdigest()[:10]
    c2pa_detected = b"c2pa" in content.lower() or b"jumbf" in content.lower()

    return {
        "nudity_score": nsfw_score,
        "deepfake_score": deepfake_score,
        "decision": decision,
        "evidence_hash": short_md5,
        "sha256_hash": sha256_hex,
        "image_format": fmt,
        "model_name": "AdamCodd/vit-base-nsfw-detector + Heuristic Variance",
        "model_version": "v1.0.0",
        "is_calibrated": False,
        "uncertainty_state": "medium" if decision != "SAFE" else "low",
        "compression_anomaly_detected": deepfake_score > 0.5,
        "c2pa_provenance": {
            "detected": c2pa_detected,
            "is_verified": False,
            "limitations": (
                "C2PA/JUMBF marker bytes found; cryptographic signature chain verification is not performed locally."
                if c2pa_detected
                else "No C2PA provenance header detected. Common on social platform uploads; absence does not prove alteration."
            ),
        },
        "limitations": [
            "Uncalibrated score: Vision model and pixel-variance outputs are preliminary screening indicators, not calibrated forensic probabilities.",
            "Social media re-encoding and compression can alter pixel variance heuristics.",
            "Certified human forensic examination is required for legal proceedings.",
        ],
        "recommended_next_steps": [
            "Preserve the original uncompressed file with its SHA-256 digest.",
            "Document the source URL and timestamp where the media appeared.",
            "Include this preliminary screening summary in your complaint preparation dossier.",
        ],
    }
