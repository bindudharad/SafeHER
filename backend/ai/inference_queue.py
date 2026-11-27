"""
SafeHER Inference Queue & Health Service
=========================================
Provides asynchronous job dispatching, status querying, cancellation,
and centralized health diagnostics across all AI/ML models.
"""

import json
from typing import Any, Dict, List, Optional

from db import get_analysis_job, list_analysis_jobs_for_evidence, cancel_analysis_job
from ai.workers.inference_worker import dispatch_analysis_job
from ai.models.model_a import get_model_a_health
from ai.models.model_b import get_model_b_health
from ai.face_detection import get_retinaface_health
from ai.c2pa_service import C2PA_AVAILABLE
from ai.tampering_localization import get_tampering_health


def submit_analysis_job(evidence_id: str, owner_id: str, model_type: str = "full_forensics") -> Dict[str, Any]:
    """Submits an asynchronous inference job to the worker queue."""
    if model_type not in ("model_a", "model_b", "tampering_localization", "full_forensics", "all"):
        raise ValueError(
            f"Invalid model_type: {model_type}. Allowed: 'model_a', 'model_b', 'tampering_localization', 'full_forensics', 'all'"
        )

    return dispatch_analysis_job(evidence_id=str(evidence_id), owner_id=str(owner_id), model_type=model_type)


def get_job_status(job_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves status and results for an analysis job, enforcing user authorization."""
    job = get_analysis_job(job_id)
    if not job:
        return None

    if str(job["owner_id"]) != str(owner_id):
        raise PermissionError("Access denied: You do not have permission to view this analysis job.")

    # Parse result_json if completed
    result_data = None
    if job.get("result_json"):
        try:
            result_data = json.loads(job["result_json"])
        except Exception:
            result_data = job["result_json"]

    return {
        "id": job["id"],
        "evidence_id": job["evidence_id"],
        "owner_id": job["owner_id"],
        "model_type": job["model_type"],
        "status": job["status"],
        "result": result_data,
        "error_message": job.get("error_message"),
        "created_at": job["created_at"],
        "started_at": job.get("started_at"),
        "completed_at": job.get("completed_at"),
    }


def cancel_job(job_id: str, owner_id: str) -> bool:
    """Cancels a pending or queued analysis job."""
    return cancel_analysis_job(job_id=job_id, owner_id=str(owner_id))


def list_jobs(evidence_id: str, owner_id: str) -> List[Dict[str, Any]]:
    """Lists all historical and current jobs for a specific evidence item."""
    jobs = list_analysis_jobs_for_evidence(evidence_id=str(evidence_id), owner_id=str(owner_id))
    parsed_jobs = []
    for j in jobs:
        res = None
        if j.get("result_json"):
            try:
                res = json.loads(j["result_json"])
            except Exception:
                res = j["result_json"]
        parsed_jobs.append({
            "id": j["id"],
            "evidence_id": j["evidence_id"],
            "model_type": j["model_type"],
            "status": j["status"],
            "result": res,
            "error_message": j.get("error_message"),
            "created_at": j["created_at"],
            "completed_at": j.get("completed_at"),
        })
    return parsed_jobs


def get_all_models_health() -> Dict[str, Any]:
    """Centralized diagnostic status of all SafeHER forensic inspection engines."""
    import torch

    return {
        "status": "operational",
        "device_info": {
            "cuda_available": torch.cuda.is_available(),
            "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
            "pytorch_version": torch.__version__,
        },
        "engines": {
            "c2pa": {
                "available": C2PA_AVAILABLE,
                "sdk": "c2pa-python 0.39.0",
                "core_engine": "c2pa-rs 0.92.0",
                "task": "Cryptographic Content Credentials & Manifest Verification",
                "status": "ready" if C2PA_AVAILABLE else "unavailable",
            },
            "retinaface": get_retinaface_health(),
            "model_a": get_model_a_health(),
            "model_b": get_model_b_health(),
            "tampering_localization": get_tampering_health(),
        },
    }
