"""
SafeHER Isolated AI Inference Worker
====================================
Executes heavy neural network inference (Model A & Model B) in background
worker threads to avoid blocking FastAPI web request event loops.
Integrates strictly with Stage 1 AES-256-GCM envelope encryption.
"""

import concurrent.futures
import datetime
import json
import logging
import os
import time
import uuid
from typing import Any, Dict, Optional

from security.evidence_storage import retrieve_and_decrypt_evidence
from db import get_db, get_storage_dir, update_analysis_job, get_analysis_job
from ai.models.model_a import detect_ai_generated_image, get_model_a_health
from ai.models.model_b import detect_facial_deepfakes, get_model_b_health
from ai.c2pa_service import inspect_content_credentials
from ai.face_detection import detect_faces

logger = logging.getLogger("safeher.ai.worker")

# Bounded thread pool executor specifically dedicated to heavy AI inference
_AI_WORKER_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
    max_workers=2,
    thread_name_prefix="SafeHER-AI-Worker",
)


def _process_inference_job(job_id: str, evidence_id: str, owner_id: str, model_type: str) -> None:
    """
    Worker task:
    1. Checks if cancelled.
    2. Decrypts evidence in memory via AES-256-GCM envelope encryption.
    3. Executes requested neural model(s).
    4. Updates database state.
    5. Cleans up memory immediately.
    """
    logger.info(f"Worker picked up job {job_id} for evidence {evidence_id} (model: {model_type})")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Step 1: Check cancellation
    job_info = get_analysis_job(job_id)
    if not job_info or job_info["status"] == "cancelled":
        logger.info(f"Job {job_id} was cancelled before worker execution.")
        return

    update_analysis_job(job_id, status="processing", started_at=now_iso)

    plaintext_bytes: Optional[bytes] = None
    try:
        # Step 2: Retrieve evidence record and decrypt in-memory
        with get_db() as conn:
            evi = conn.execute("SELECT * FROM evidence WHERE id = ?", (str(evidence_id),)).fetchone()
            if not evi:
                raise FileNotFoundError(f"Evidence {evidence_id} not found in database.")

            # Authorization check
            if str(evi["user_id"]) != str(owner_id):
                raise PermissionError("Unauthorized: evidence does not belong to the job owner.")

            evi_keys = evi.keys() if hasattr(evi, "keys") else []
            plaintext_bytes = retrieve_and_decrypt_evidence(
                evidence_id=str(evidence_id),
                user_id=str(owner_id),
                stored_filename=evi["stored_filename"],
                storage_dir=get_storage_dir(),
                wrapped_key_hex=evi["wrapped_key"] if "wrapped_key" in evi_keys else None,
                wrapped_dek_hex=evi["wrapped_dek"] if "wrapped_dek" in evi_keys else None,
                wrapping_nonce_hex=evi["wrapping_nonce"] if "wrapping_nonce" in evi_keys else None,
                data_nonce_hex=evi["data_nonce"] if "data_nonce" in evi_keys else None,
                key_id=evi["key_id"] if "key_id" in evi_keys else None,
                key_version=evi["key_version"] if "key_version" in evi_keys else None,
                encryption_version=evi["encryption_version"] if "encryption_version" in evi_keys else "v2",
                expected_sha256=(evi["original_sha256"] if ("original_sha256" in evi_keys and evi["original_sha256"]) else evi["sha256_hash"]),
            )

        # Step 3: Run requested inference in-memory
        results: Dict[str, Any] = {
            "job_id": job_id,
            "evidence_id": evidence_id,
            "model_type": model_type,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

        # Model A: Effort-AIGI-Detection
        if model_type in ("model_a", "full_forensics", "all"):
            try:
                results["model_a"] = detect_ai_generated_image(plaintext_bytes)
            except Exception as e:
                logger.error(f"Model A failure in job {job_id}: {e}")
                results["model_a"] = {"error": str(e), "analysis_status": "failed"}

        # RetinaFace + Model B: DeepfakeBench Xception
        if model_type in ("model_b", "full_forensics", "all"):
            try:
                # Stage 2 RetinaFace localization
                face_det = detect_faces(plaintext_bytes)
                face_dict = face_det.to_dict() if hasattr(face_det, "to_dict") else {}
                results["face_localization"] = {
                    "face_count": face_det.face_count,
                    "faces": [f.to_dict() for f in face_det.faces],
                    "detector": face_det.detector_name,
                }
                # Model B classification on detected faces
                results["model_b"] = detect_facial_deepfakes(
                    plaintext_bytes,
                    custom_faces=[f.to_dict() for f in face_det.faces],
                )
            except Exception as e:
                logger.error(f"Model B failure in job {job_id}: {e}")
                results["model_b"] = {"error": str(e), "analysis_status": "failed"}

        # C2PA verification for full forensics
        if model_type in ("full_forensics", "all", "c2pa"):
            try:
                c2pa_obj = inspect_content_credentials(plaintext_bytes)
                results["c2pa"] = c2pa_obj.to_dict() if hasattr(c2pa_obj, "to_dict") else dict(c2pa_obj)
            except Exception as e:
                logger.error(f"C2PA failure in job {job_id}: {e}")
                results["c2pa"] = {"error": str(e), "c2pa_status": "verification_error", "status": "verification_error"}

        # Tampering Localization (Stage 5)
        if model_type in ("tampering_localization", "full_forensics", "all"):
            try:
                from ai.tampering_localization import analyze_image_tampering
                tamp_res = analyze_image_tampering(plaintext_bytes)
                # Strip raw PNG bytes before JSON serialization
                results["tampering_localization"] = {
                    k: v for k, v in tamp_res.items() if k not in ("heatmap_png_bytes", "mask_png_bytes")
                }
            except Exception as e:
                logger.error(f"Tampering localization failure in job {job_id}: {e}")
                results["tampering_localization"] = {"error": str(e), "analysis_status": "failed"}

        # Composite score calculation if full_forensics
        if model_type in ("full_forensics", "all"):
            synthetic_score = results.get("model_a", {}).get("synthetic_score", 0.0)
            manip_score = results.get("model_b", {}).get("max_manipulation_score", 0.0)
            c2pa_dict = results.get("c2pa", {})
            c2pa_status = c2pa_dict.get("c2pa_status", c2pa_dict.get("status", "credentials_not_present"))
            c2pa_intact = 1.0 if c2pa_status == "valid_credentials" else (0.5 if c2pa_status == "credentials_not_present" else 0.1)

            composite = round((synthetic_score * 0.4) + (manip_score * 0.4) + ((1.0 - c2pa_intact) * 0.2), 4)
            risk = "critical" if composite >= 0.75 else ("high" if composite >= 0.5 else ("medium" if composite >= 0.25 else "low"))
            results["composite_assessment"] = {
                "composite_risk_score": composite,
                "risk_level": risk,
            }

        # Step 4: Persist results
        completed_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        result_json_str = json.dumps(results)
        update_analysis_job(
            job_id,
            status="completed",
            result_json=result_json_str,
            completed_at=completed_iso,
        )

        # Non-destructively record in media_analyses table
        try:
            with get_db() as conn:
                analysis_uuid = f"analysis-{uuid.uuid4().hex[:12]}"
                c2pa_res_str = json.dumps(results.get("c2pa", {}))
                face_loc_str = json.dumps(results.get("face_localization", {}))
                model_a_str = json.dumps(results.get("model_a", {}))
                model_b_str = json.dumps(results.get("model_b", {}))
                composite_score = results.get("composite_assessment", {}).get("composite_risk_score", 0.5)

                conn.execute(
                    """
                    INSERT INTO media_analyses (
                        id, evidence_id, user_id, media_type, model_name, model_version,
                        deepfake_score, nudity_score, is_calibrated, uncertainty_state, decision,
                        compression_anomaly_detected, c2pa_provenance, c2pa_result, face_localization,
                        model_a_result, model_b_result, limitations, recommended_next_steps, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        analysis_uuid,
                        str(evidence_id),
                        str(owner_id),
                        "image",
                        "SafeHER-MultiModal-Ensemble",
                        "3.0.0",
                        float(results.get("model_b", {}).get("max_manipulation_score", 0.0)),
                        0.0,
                        1,
                        "calibrated",
                        results.get("composite_assessment", {}).get("risk_level", "medium"),
                        0,
                        results.get("c2pa", {}).get("status", "credentials_not_present"),
                        c2pa_res_str,
                        face_loc_str,
                        model_a_str,
                        model_b_str,
                        "Automated decision support signals; not standalone legal proof.",
                        "Proceed with secondary digital forensics verification if legal escalation is planned.",
                        completed_iso,
                    ),
                )
        except Exception as e:
            logger.warning(f"Could not persist to media_analyses table: {e}")

        logger.info(f"Job {job_id} completed successfully in worker.")

    except Exception as exc:
        logger.error(f"Worker job {job_id} encountered fatal error: {exc}")
        completed_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        update_analysis_job(
            job_id,
            status="failed",
            error_message=str(exc),
            completed_at=completed_iso,
        )

    finally:
        # Immediate memory cleanup of decrypted survivor evidence
        del plaintext_bytes


def dispatch_analysis_job(evidence_id: str, owner_id: str, model_type: str = "full_forensics") -> Dict[str, Any]:
    """
    Creates an analysis job record in database and submits it to the background worker pool.
    Returns immediately with job_id and status='queued'.
    """
    job_id = f"job-{uuid.uuid4().hex[:12]}"
    from db import create_analysis_job
    job_record = create_analysis_job(
        job_id=job_id,
        evidence_id=str(evidence_id),
        owner_id=str(owner_id),
        model_type=model_type,
    )

    _AI_WORKER_EXECUTOR.submit(_process_inference_job, job_id, str(evidence_id), str(owner_id), model_type)
    return job_record
