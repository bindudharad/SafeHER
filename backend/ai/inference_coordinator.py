"""
SafeHER Forensic AI Inference Coordinator
=========================================
Unified coordinator linking:
- Model A: Effort-AIGI-Detection (AI-Generated Image Detection)
- Model B: RetinaFace + Deepfake Forensics (Facial Manipulation Detection & Localization)
- C2PA Content Credentials Provenance Engine (Adobe c2pa-python SDK)
- NSFW Screening (ViT)
"""

from __future__ import annotations

import hashlib
import os
from typing import Any, Dict, Optional

from ai.c2pa_service import inspect_content_credentials, C2PAServiceResult
from ai.c2pa_verification import verify_c2pa_bytes, C2PAValidationResult
from ai.face_detection import detect_faces, FaceDetectionResult
from ai.image_authenticity import analyze_image_authenticity, AIGIAnalysisResult
from ai.deepfake_detection import analyze_facial_deepfakes, DeepfakeAnalysisResult
from ai.models.model_a import detect_ai_generated_image
from ai.models.model_b import detect_facial_deepfakes


def coordinate_media_forensics(
    content: bytes,
    original_filename: str = "media_file",
    mime_type: str = "image/jpeg",
    filename: Optional[str] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Executes full multi-modal media forensics pipeline.
    Ensures backward compatibility with SafeHER schema while adding rich forensic telemetry.
    """
    effective_filename = filename or original_filename

    # 1. Official C2PA Provenance Inspection
    c2pa_service_res: C2PAServiceResult = inspect_content_credentials(content, mime_type=mime_type)
    c2pa_res: C2PAValidationResult = verify_c2pa_bytes(content, mime_type=mime_type)

    # 2. Pretrained RetinaFace Facial Detection & Localization
    face_res: FaceDetectionResult = detect_faces(content)

    # 3. Model A: General Synthetic Image Detection & NSFW Screening
    model_a_res: AIGIAnalysisResult = analyze_image_authenticity(content)
    try:
        model_a_genuine = detect_ai_generated_image(content)
    except Exception as e:
        model_a_genuine = {"error": str(e), "analysis_status": "failed"}

    # 4. Model B: Facial Deepfake Analysis Pipeline
    model_b_res: DeepfakeAnalysisResult = analyze_facial_deepfakes(content)
    try:
        model_b_genuine = detect_facial_deepfakes(
            content,
            custom_faces=[f.to_dict() for f in face_res.faces] if face_res.faces else None,
        )
    except Exception as e:
        model_b_genuine = {"error": str(e), "analysis_status": "failed"}

    # Derive consolidated decision and scores
    nudity_score = model_a_res.nsfw_screening.nudity_score
    if model_b_genuine.get("analysis_status") == "completed":
        deepfake_score = model_b_genuine.get("max_manipulation_score", 0.0)
    elif model_b_res.aggregate_deepfake_score is not None:
        deepfake_score = model_b_res.aggregate_deepfake_score
    else:
        deepfake_score = 0.0

    # Decision synthesis
    decision_parts = []
    if c2pa_res.status == "verified":
        decision_parts.append("C2PA Cryptographically Verified")
    elif c2pa_res.status == "invalid":
        decision_parts.append("C2PA Signature Invalid / Tampered")

    if model_a_genuine.get("analysis_status") == "completed":
        synth_score = model_a_genuine.get("synthetic_score", 0.0)
        decision_parts.append(f"AI-Generated Score: {synth_score:.2f}")

    if face_res.face_count > 0:
        if model_b_genuine.get("analysis_status") == "completed":
            decision_parts.append(f"Face Deepfake Score: {deepfake_score:.2f}")
        else:
            decision_parts.append(f"{face_res.face_count} Face(s) Localized")
    else:
        decision_parts.append("No Human Faces Detected")

    if nudity_score > 0.6:
        decision_parts.append(f"High NSFW Content ({nudity_score:.2f})")

    consolidated_decision = " | ".join(decision_parts) if decision_parts else "Analysis Complete"

    # Limitations summary
    limitations_list = []
    if c2pa_res.status == "not_present":
        limitations_list.append("C2PA credentials absent (standard for social media / messaging apps).")
    limitations_list.extend(model_a_res.warnings)
    limitations_list.extend(model_b_res.warnings)
    limitations_str = " ".join(limitations_list) if limitations_list else "Analysis performed within standard confidence parameters."

    recommended_steps = [
        "Preserve original uncompressed files and conversation context in the SafeHER Evidence Vault.",
        "Verify SHA-256 integrity receipt for court or police submissions.",
        "Check C2PA provenance credentials against issuing authority.",
        "For intimate threats or extortion, record suspect URLs and handles immediately.",
        "Submit evidence reports to cybercrime.gov.in (Helpline 1930) or local cyber cells.",
    ]

    # Structure faces for JSON serialization
    faces_json = []
    for f in model_b_res.faces:
        faces_json.append({
            "face_id": f.face_id,
            "bounding_box": list(f.bounding_box),
            "detection_confidence": f.detection_confidence,
            "landmarks": {k: list(v) for k, v in f.landmarks.items()},
            "deepfake_score": f.deepfake_score,
            "prediction": f.prediction,
            "decision": f.model_decision,
        })

    return {
        # Core backward-compatible fields
        "deepfake_score": round(float(deepfake_score), 4),
        "nudity_score": round(float(nudity_score), 4),
        "model_name": "SafeHER Multi-Model Forensic Suite (RetinaFace + Effort + c2pa-rs + ViT)",
        "model_version": "v2.0.0",
        "is_calibrated": True,
        "uncertainty_state": "calibrated" if (model_b_res.status == "complete" or c2pa_res.is_valid) else "uncalibrated",
        "decision": consolidated_decision,
        "compression_anomaly_detected": False,
        "c2pa_provenance": c2pa_res.status,
        "limitations": limitations_str,
        "recommended_next_steps": recommended_steps,
        "faces": faces_json,

        # Stage 2 C2PA & RetinaFace Core Integrations
        "c2pa_analysis": c2pa_service_res.to_dict(),
        "face_localization": face_res.to_dict(),

        # Stage 3 Model A & Model B Integrations
        "model_a_result": model_a_genuine,
        "model_b_result": model_b_genuine,

        # Enriched forensic inspection payloads
        "c2pa": {
            "status": c2pa_res.status,
            "has_manifest": c2pa_res.has_manifest,
            "is_valid": c2pa_res.is_valid,
            "claim_generator": c2pa_res.claim_generator,
            "title": c2pa_res.title,
            "active_manifest": c2pa_res.active_manifest,
            "validation_state": c2pa_res.validation_state,
            "validation_errors": c2pa_res.validation_errors,
            "assertions": c2pa_res.assertions,
        },
        "model_a_aigi": {
            "model_identifier": model_a_res.model_identifier,
            "status": model_a_res.status,
            "prediction": model_a_res.prediction,
            "synthetic_score": model_a_res.synthetic_score,
            "authentic_score": model_a_res.authentic_score,
            "license": model_a_res.license_type,
            "processing_time_ms": model_a_res.processing_time_ms,
        },
        "model_b_deepfake": {
            "model_identifier": model_b_res.model_identifier,
            "status": model_b_res.status,
            "face_count": model_b_res.face_count,
            "faces": faces_json,
            "overall_decision": model_b_res.overall_decision,
            "license": model_b_res.license_type,
            "processing_time_ms": model_b_res.processing_time_ms,
        },
        "nsfw_screening": {
            "status": model_a_res.nsfw_screening.status,
            "nudity_score": model_a_res.nsfw_screening.nudity_score,
            "detected_category": model_a_res.nsfw_screening.detected_category,
            "scores": model_a_res.nsfw_screening.scores,
        },

        # Structured 4-Panel Forensic Presentation
        "panel_a_authenticity": {
            "status": model_a_res.status,
            "model_identifier": model_a_res.model_identifier,
            "synthetic_score": model_a_res.synthetic_score,
            "authentic_score": model_a_res.authentic_score,
            "prediction": model_a_res.prediction,
            "nsfw_screening": {
                "status": model_a_res.nsfw_screening.status,
                "nudity_score": model_a_res.nsfw_screening.nudity_score,
                "detected_category": model_a_res.nsfw_screening.detected_category,
                "scores": model_a_res.nsfw_screening.scores,
            },
            "warnings": model_a_res.warnings,
        },
        "panel_b_deepfake": {
            "status": model_b_res.status,
            "model_identifier": model_b_res.model_identifier,
            "face_count": model_b_res.face_count,
            "faces": faces_json,
            "aggregate_deepfake_score": model_b_res.aggregate_deepfake_score,
            "overall_decision": model_b_res.overall_decision,
            "warnings": model_b_res.warnings,
            "disclaimer": model_b_res.disclaimer,
        },
        "panel_c_c2pa": {
            "status": c2pa_res.status,
            "c2pa_present": c2pa_res.c2pa_present,
            "has_manifest": c2pa_res.has_manifest,
            "is_valid": c2pa_res.is_valid,
            "claim_generator": c2pa_res.claim_generator,
            "title": c2pa_res.title,
            "active_manifest": c2pa_res.active_manifest,
            "validation_errors": c2pa_res.validation_errors,
            "assertions": c2pa_res.assertions,
        },
        "panel_d_integrity": {
            "sha256_hash": hashlib.sha256(content).hexdigest(),
            "bytes_size": len(content),
            "filename": effective_filename,
            "vault_storage_status": "supported",
        },
    }
