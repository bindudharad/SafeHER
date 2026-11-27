# SafeHER Stage 3 API Changelog & Interface Specifications
**Version:** SafeHER 3.0.0  
**Effective Date:** November 2026  

---

## 1. Overview of New Endpoints

Stage 3 introduces dedicated asynchronous inference endpoints alongside centralized AI diagnostic services:

| HTTP Method | Path | Status | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ai/health` | `200 OK` | Yes (Bearer JWT) | Returns real-time health, device information, and license compliance across all AI forensic engines (Model A, Model B, RetinaFace, C2PA). |
| `POST` | `/api/v1/evidence/{evidence_id}/jobs` | `202 Accepted` | Yes (Owner) | Submits an asynchronous inference job to the background worker pool for encrypted evidence. |
| `GET` | `/api/v1/evidence/{evidence_id}/jobs/{job_id}` | `200 OK` | Yes (Owner) | Retrieves status (`queued`, `processing`, `completed`, `failed`, `cancelled`) and deserialized results for a specific job. |
| `GET` | `/api/v1/evidence/{evidence_id}/jobs` | `200 OK` | Yes (Owner) | Lists all background inference jobs associated with an evidence item. |
| `POST` | `/api/v1/evidence/{evidence_id}/jobs/{job_id}/cancel` | `200 OK` / `400 Bad Request` | Yes (Owner) | Requests cancellation of a pending or active inference job. |

---

## 2. Request & Response Schemas

### 2.1 `GET /api/v1/ai/health`
**Response (200 OK):**
```json
{
  "status": "operational",
  "device_info": {
    "cuda_available": false,
    "device_count": 0,
    "pytorch_version": "2.x.x"
  },
  "engines": {
    "c2pa": {
      "available": true,
      "sdk": "c2pa-python 0.39.0",
      "core_engine": "c2pa-rs 0.92.0",
      "task": "Cryptographic Content Credentials & Manifest Verification",
      "status": "ready"
    },
    "retinaface": {
      "model_name": "RetinaFace-ResNet50",
      "status": "ready",
      "device": "cpu"
    },
    "model_a": {
      "model_id": "effort_clip_l14_genimage",
      "model_name": "Effort-AIGI-Detection",
      "task": "AI-Generated Image Detection",
      "checkpoint_path": "models/effort_clip_l14_genimage.pth",
      "checkpoint_exists": true,
      "checkpoint_size_bytes": 1213769519,
      "checkpoint_hash": "7c32ceb4e66d303050e8fc5dc7543fa347693fb4ee6b5df4d6eaf9f6a92fb813",
      "is_loaded": true,
      "license": "CC BY-NC 4.0"
    },
    "model_b": {
      "model_id": "deepfakebench_ff_xception",
      "model_name": "DeepfakeBench-Xception",
      "task": "Facial Deepfake & Manipulation Detection",
      "checkpoint_path": "models/xception_best.pth",
      "checkpoint_exists": true,
      "checkpoint_size_bytes": 87763531,
      "checkpoint_hash": "dd61186f9ac8e99aae85982cae338b555dfaeef042f6b699e5a55cae3998ba47",
      "is_loaded": true,
      "license": "CC BY-NC 4.0"
    }
  }
}
```

### 2.2 `POST /api/v1/evidence/{evidence_id}/jobs`
**Request Body:**
```json
{
  "model_type": "all" // Optional: "model_a", "model_b", "full_forensics", "all"
}
```
**Response (202 Accepted):**
```json
{
  "job_id": "job-818b7e01d7a0",
  "evidence_id": "evi-09f90f58",
  "status": "queued",
  "created_at": "2026-11-27T01:32:38.158542+00:00"
}
```

### 2.3 `GET /api/v1/evidence/{evidence_id}/jobs/{job_id}`
**Response (200 OK):**
```json
{
  "id": "job-818b7e01d7a0",
  "evidence_id": "evi-09f90f58",
  "owner_id": "usr-b45c2b35",
  "model_type": "all",
  "status": "completed",
  "created_at": "2026-11-27T01:32:38.158542+00:00",
  "started_at": "2026-11-27T01:32:38.166659+00:00",
  "completed_at": "2026-11-27T01:32:54.492381+00:00",
  "result": {
    "model_a": {
      "model_id": "effort_clip_l14_genimage",
      "synthetic_score": 0.1284,
      "real_score": 0.8716,
      "analysis_status": "completed"
    },
    "model_b": {
      "model_id": "deepfakebench_ff_xception",
      "max_manipulation_score": 0.0,
      "face_count": 0,
      "analysis_status": "no_faces_detected"
    },
    "c2pa": {
      "c2pa_status": "credentials_not_present",
      "manifest_present": false
    },
    "composite_assessment": {
      "composite_risk_score": 0.1514,
      "risk_level": "low"
    }
  }
}
```

---

## 3. Frontend Service Client Additions

The frontend API client (`frontend/src/services/api/client.ts`) has been augmented with three typed service functions:
1. `submitAnalysisJob(evidenceId: string, modelType?: string): Promise<{ job_id: string; status: string }>`
2. `getAnalysisJob(evidenceId: string, jobId: string): Promise<AnalysisJob>`
3. `getAiHealth(): Promise<Record<string, any>>`

And `frontend/src/pages/analysis/MediaAnalysisPage.tsx` now supports asynchronous job dispatching, real-time status polling, dedicated Model A telemetry cards, and per-face Model B breakdown visualization.
