"""
SafeHER Unified FastAPI Application (Member 1 AI + Member 2 Backend & DB).
"""

import hashlib
import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from ai_service import analyze_image, analyze_text, get_ai_health
from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    validate_jwt_configuration,
    verify_password,
)
from db import get_db, get_storage_dir, init_db
from schemas import (
    CaseUpdateRequest,
    ComplaintGenerateRequest,
    ComplaintUpdateRequest,
    IncidentCreateRequest,
    LoginRequest,
    RegisterRequest,
    ReportingRecordCreateRequest,
    ThreatAnalysisRequest,
    TimelineEventCreateRequest,
)

MAX_EVIDENCE_BYTES = 25 * 1024 * 1024  # 25 MB
ALLOWED_EVIDENCE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".pdf",
    ".txt",
    ".mp4",
    ".webm",
    ".wav",
    ".mp3",
}

REPORTING_DESTINATIONS: List[Dict[str, Any]] = [
    {
        "id": "dest-ncrp-india",
        "name": "National Cyber Crime Reporting Portal (India)",
        "category": "government",
        "platform": "Ministry of Home Affairs (cybercrime.gov.in)",
        "description": "Official Indian government portal for reporting cybercrimes against women and children, cyber blackmail, online stalking, and deepfake abuse.",
        "official_url": "https://cybercrime.gov.in",
        "helpline_number": "1930",
        "instructions": [
            "Open cybercrime.gov.in and select 'Report Crime Against Women/Children'.",
            "Choose 'Report Anonymously' or 'Report & Track' with mobile OTP.",
            "Enter incident chronology, suspect handles/URLs, and attach SHA-256 preserved evidence.",
            "Save the 14-digit Complaint Acknowledgement Number in SafeHER Case Tracking.",
        ],
        "required_materials": [
            "Preserved screenshots/media with SafeHER SHA-256 digests",
            "Suspect profile URLs, phone numbers, or payment IDs",
            "Confirmed complaint draft statement",
        ],
    },
    {
        "id": "dest-meta-ig",
        "name": "Instagram & Meta Grievance / NCII Takedown",
        "category": "platform",
        "platform": "Meta Platforms (Instagram / Facebook)",
        "description": "Official Meta escalation path for impersonation, non-consensual imagery, and harassment under IT Rules Rule 3(2)(b).",
        "official_url": "https://help.instagram.com/contact/636276399721841",
        "instructions": [
            "Open the official Instagram impersonation/abuse form.",
            "Provide infringing account URLs and government ID verification if requested.",
            "Record the Meta reference ticket number in SafeHER Case Tracking.",
        ],
        "required_materials": [
            "Exact URL of the infringing profile or post",
            "SafeHER evidence inventory reference",
        ],
    },
    {
        "id": "dest-stopncii",
        "name": "StopNCII.org Hash Prevention Registry",
        "category": "hash_prevention",
        "platform": "SWGfL / Meta / TikTok / Reddit Participating Platforms",
        "description": "Generates privacy-preserving perceptual hashes on your device so participating platforms can block non-consensual intimate imagery.",
        "official_url": "https://stopncii.org",
        "instructions": [
            "Select the intimate image locally inside StopNCII.org (image never leaves device).",
            "Save the StopNCII Case Number and PIN securely.",
        ],
        "required_materials": [
            "Original image file on your device",
        ],
    },
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _seed_demo_user() -> None:
    if os.environ.get("SAFEHER_SEED_DEMO", "true").lower() == "false":
        return
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?",
            ("ananya.sharma@safeher.protect",),
        ).fetchone()
        if existing:
            return
        now = _utc_now()
        user_id = "usr-demo-ananya"
        conn.execute(
            """
            INSERT INTO users (id, name, email, password_hash, consent_acknowledged, consent_date, preferred_language, created_at)
            VALUES (?, ?, ?, ?, 1, ?, 'en', ?)
            """,
            (
                user_id,
                "Ananya Sharma",
                "ananya.sharma@safeher.protect",
                hash_password("demoPassword123"),
                now,
                now,
            ),
        )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    validate_jwt_configuration()
    init_db()
    _seed_demo_user()
    yield


app = FastAPI(
    title="SafeHER Unified API",
    version="1.0.0",
    description="Integrated FastAPI backend combining Member 1 AI models and Member 2 persistence.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# HEALTH & ROOT
# ==========================================================
@app.get("/")
def root() -> Dict[str, Any]:
    return {"message": "SafeHER Unified Backend running", "status": "ok"}


@app.get("/api/v1/health")
def health() -> Dict[str, Any]:
    db_ok = False
    try:
        with get_db() as conn:
            conn.execute("SELECT 1").fetchone()
            db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "error",
        "ai": get_ai_health(),
        "timestamp": _utc_now(),
    }


# ==========================================================
# AUTHENTICATION (Member 2)
# ==========================================================
@app.post("/api/v1/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> Dict[str, Any]:
    if not payload.consent_acknowledged:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Privacy consent must be acknowledged to register.",
        )
    email = payload.email.strip().lower()
    now = _utc_now()
    user_id = f"usr-{uuid.uuid4().hex[:8]}"

    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (email,)
        ).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )
        conn.execute(
            """
            INSERT INTO users (id, name, email, password_hash, consent_acknowledged, consent_date, preferred_language, created_at)
            VALUES (?, ?, ?, ?, 1, ?, 'en', ?)
            """,
            (
                user_id,
                payload.name.strip(),
                email,
                hash_password(payload.password),
                now,
                now,
            ),
        )

    token = create_access_token(user_id, email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": payload.name.strip(),
            "email": email,
            "consent_acknowledged": True,
            "consent_date": now,
            "preferred_language": "en",
            "created_at": now,
        },
    }


@app.post("/api/v1/auth/login")
def login(payload: LoginRequest) -> Dict[str, Any]:
    email = payload.email.strip().lower()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email,)
        ).fetchone()
    if not row or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    token = create_access_token(row["id"], row["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "consent_acknowledged": bool(row["consent_acknowledged"]),
            "consent_date": row["consent_date"],
            "preferred_language": row["preferred_language"],
            "created_at": row["created_at"],
        },
    }


@app.get("/api/v1/auth/me")
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return current_user


# ==========================================================
# INCIDENTS (Member 2)
# ==========================================================
def _serialize_incident(conn, row) -> Dict[str, Any]:
    evi_count = conn.execute(
        "SELECT COUNT(*) FROM evidence WHERE incident_id = ?", (row["id"],)
    ).fetchone()[0]
    med_count = conn.execute(
        """
        SELECT COUNT(*) FROM media_analyses ma
        JOIN evidence e ON e.id = ma.evidence_id
        WHERE e.incident_id = ?
        """,
        (row["id"],),
    ).fetchone()[0]
    thr_count = conn.execute(
        "SELECT COUNT(*) FROM threat_analyses WHERE incident_id = ?", (row["id"],)
    ).fetchone()[0]
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "title": row["title"],
        "category": row["category"],
        "description": row["description"],
        "platform": row["platform"],
        "incident_date": row["incident_date"],
        "incident_time": row["incident_time"],
        "relevant_urls": json.loads(row["relevant_urls"] or "[]"),
        "status": row["status"],
        "evidence_count": evi_count,
        "analysis_count": med_count + thr_count,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


@app.get("/api/v1/incidents")
def list_incidents(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM incidents WHERE user_id = ? ORDER BY created_at DESC",
            (current_user["id"],),
        ).fetchall()
        return [_serialize_incident(conn, r) for r in rows]


@app.post("/api/v1/incidents", status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    now = _utc_now()
    inc_id = f"inc-{uuid.uuid4().hex[:8]}"
    case_id = f"cas-{inc_id}"
    tl_id = f"tl-{uuid.uuid4().hex[:8]}"

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO incidents (id, user_id, title, category, description, platform, incident_date, incident_time, relevant_urls, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
            """,
            (
                inc_id,
                current_user["id"],
                payload.title.strip(),
                payload.category,
                payload.description.strip(),
                payload.platform.strip(),
                payload.incident_date,
                payload.incident_time,
                json.dumps(payload.relevant_urls),
                now,
                now,
            ),
        )
        conn.execute(
            """
            INSERT INTO cases (id, incident_id, user_id, status, reporting_references, notes, created_at, updated_at)
            VALUES (?, ?, ?, 'draft', '[]', 'Case established upon incident logging.', ?, ?)
            """,
            (case_id, inc_id, current_user["id"], now, now),
        )
        conn.execute(
            """
            INSERT INTO timeline_events (id, incident_id, user_id, event_type, source, title, description, timestamp)
            VALUES (?, ?, ?, 'incident_created', 'system', 'Incident Record Created', ?, ?)
            """,
            (
                tl_id,
                inc_id,
                current_user["id"],
                f"Logged incident '{payload.title.strip()}' on {payload.platform.strip()}.",
                now,
            ),
        )
        row = conn.execute("SELECT * FROM incidents WHERE id = ?", (inc_id,)).fetchone()
        return _serialize_incident(conn, row)


@app.get("/api/v1/incidents/{incident_id}")
def get_incident(
    incident_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM incidents WHERE id = ? AND user_id = ?",
            (incident_id, current_user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found"
            )
        return _serialize_incident(conn, row)


# ==========================================================
# EVIDENCE VAULT (Member 2)
# ==========================================================
def _serialize_evidence(row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "incident_id": row["incident_id"],
        "original_filename": row["original_filename"],
        "file_type": row["file_type"],
        "file_size": row["file_size"],
        "sha256_hash": row["sha256_hash"],
        "upload_timestamp": row["upload_timestamp"],
        "storage_status": row["storage_status"],
        "validation_status": row["validation_status"],
        "malware_status": row["malware_status"],
        "processing_status": row["processing_status"],
        "duplicate_status": row["duplicate_status"],
        "notes": row["notes"],
    }


@app.get("/api/v1/evidence")
def list_all_evidence(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM evidence WHERE user_id = ? ORDER BY upload_timestamp DESC",
            (current_user["id"],),
        ).fetchall()
        return [_serialize_evidence(r) for r in rows]


@app.get("/api/v1/incidents/{incident_id}/evidence")
def list_incident_evidence(
    incident_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        inc = conn.execute(
            "SELECT id FROM incidents WHERE id = ? AND user_id = ?",
            (incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found"
            )
        rows = conn.execute(
            "SELECT * FROM evidence WHERE incident_id = ? AND user_id = ? ORDER BY upload_timestamp DESC",
            (incident_id, current_user["id"]),
        ).fetchall()
        return [_serialize_evidence(r) for r in rows]


@app.post("/api/v1/incidents/{incident_id}/evidence", status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    incident_id: str,
    file: UploadFile = File(...),
    sha256: Optional[str] = Form(default=None),
    notes: Optional[str] = Form(default=None),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        inc = conn.execute(
            "SELECT id FROM incidents WHERE id = ? AND user_id = ?",
            (incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target incident not found or access denied.",
            )

    original_name = os.path.basename(file.filename or "evidence_file")
    _, ext = os.path.splitext(original_name.lower())
    if ext not in ALLOWED_EVIDENCE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Unsupported file extension '{ext}'.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Uploaded file is empty.",
        )
    if len(content) > MAX_EVIDENCE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 25 MB limit.",
        )

    server_sha256 = hashlib.sha256(content).hexdigest()
    if sha256 and sha256.strip().lower() != server_sha256.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client SHA-256 digest does not match uploaded file bytes.",
        )

    evi_id = f"evi-{uuid.uuid4().hex[:8]}"
    stored_filename = f"{evi_id}{ext}"
    dest_path = os.path.join(get_storage_dir(), stored_filename)
    with open(dest_path, "wb") as out_file:
        out_file.write(content)

    now = _utc_now()
    with get_db() as conn:
        dup_row = conn.execute(
            "SELECT id FROM evidence WHERE user_id = ? AND sha256_hash = ?",
            (current_user["id"], server_sha256),
        ).fetchone()
        duplicate_status = "duplicate" if dup_row else "unique"

        conn.execute(
            """
            INSERT INTO evidence (
                id, incident_id, user_id, original_filename, stored_filename,
                file_type, file_size, sha256_hash, upload_timestamp,
                storage_status, validation_status, malware_status,
                processing_status, duplicate_status, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'stored_encrypted', 'passed', 'clean', 'ready', ?, ?)
            """,
            (
                evi_id,
                incident_id,
                current_user["id"],
                original_name,
                stored_filename,
                file.content_type or "application/octet-stream",
                len(content),
                server_sha256,
                now,
                duplicate_status,
                notes,
            ),
        )
        conn.execute(
            """
            INSERT INTO timeline_events (id, incident_id, user_id, event_type, source, title, description, related_evidence_id, timestamp)
            VALUES (?, ?, ?, 'evidence_uploaded', 'system', 'Evidence Preserved with SHA-256', ?, ?, ?)
            """,
            (
                f"tl-{uuid.uuid4().hex[:8]}",
                incident_id,
                current_user["id"],
                f"Preserved '{original_name}' ({len(content)} bytes), SHA-256: {server_sha256[:16]}...",
                evi_id,
                now,
            ),
        )
        row = conn.execute("SELECT * FROM evidence WHERE id = ?", (evi_id,)).fetchone()
        return _serialize_evidence(row)


@app.get("/api/v1/evidence/{evidence_id}/download")
def download_evidence(
    evidence_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM evidence WHERE id = ? AND user_id = ?",
            (evidence_id, current_user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence item not found or access denied.",
            )
    file_path = os.path.join(get_storage_dir(), row["stored_filename"])
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored evidence file not found on disk.",
        )
    return FileResponse(
        path=file_path,
        media_type=row["file_type"],
        filename=row["original_filename"],
    )


@app.delete("/api/v1/evidence/{evidence_id}", status_code=status.HTTP_200_OK)
def delete_evidence(
    evidence_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM evidence WHERE id = ? AND user_id = ?",
            (evidence_id, current_user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence item not found or access denied.",
            )
        file_path = os.path.join(get_storage_dir(), row["stored_filename"])
        conn.execute("DELETE FROM evidence WHERE id = ?", (evidence_id,))
    if os.path.exists(file_path):
        os.remove(file_path)
    return {"status": "deleted", "id": evidence_id}


# ==========================================================
# AI ANALYSIS (Member 1 + Member 2 Persistence)
# ==========================================================
@app.post("/check-text")
def check_text_compat(text: str = Query(..., min_length=1)) -> Dict[str, Any]:
    res = analyze_text(text)
    return {
        "toxicity": res["toxicity"],
        "insult": res["insult"],
        "threat": res["threat"],
        "decision": res["decision"],
    }


@app.post("/check-image")
async def check_image_compat(file: UploadFile = File(...)) -> Dict[str, Any]:
    content = await file.read()
    res = analyze_image(content)
    return {
        "nudity_score": res["nudity_score"],
        "deepfake_score": res["deepfake_score"],
        "decision": res["decision"],
        "evidence_hash": res["evidence_hash"],
    }


@app.post("/api/v1/analysis/threat", status_code=status.HTTP_201_CREATED)
def run_threat_analysis(
    payload: ThreatAnalysisRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    if payload.incident_id:
        with get_db() as conn:
            inc = conn.execute(
                "SELECT id FROM incidents WHERE id = ? AND user_id = ?",
                (payload.incident_id, current_user["id"]),
            ).fetchone()
            if not inc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Incident not found or access denied.",
                )

    ai_res = analyze_text(payload.text)
    an_id = f"an-thr-{uuid.uuid4().hex[:8]}"
    now = _utc_now()

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO threat_analyses (
                id, incident_id, user_id, input_text,
                toxicity_score, insult_score, threat_score,
                harassment_score, blackmail_score, extortion_score,
                urgency_level, decision, detected_signals,
                explanation, limitations, suggested_steps, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                an_id,
                payload.incident_id,
                current_user["id"],
                payload.text.strip(),
                ai_res["toxicity"],
                ai_res["insult"],
                ai_res["threat"],
                ai_res["harassment_score"],
                ai_res["blackmail_score"],
                ai_res["extortion_score"],
                ai_res["urgency_level"],
                ai_res["decision"],
                json.dumps(ai_res["detected_signals"]),
                ai_res["explanation"],
                json.dumps(ai_res["limitations"]),
                json.dumps(ai_res["suggested_steps"]),
                now,
            ),
        )
        if payload.incident_id:
            conn.execute(
                """
                INSERT INTO timeline_events (id, incident_id, user_id, event_type, source, title, description, timestamp)
                VALUES (?, ?, ?, 'analysis_completed', 'system', 'Threat NLP Screening Completed', ?, ?)
                """,
                (
                    f"tl-{uuid.uuid4().hex[:8]}",
                    payload.incident_id,
                    current_user["id"],
                    f"Decision: {ai_res['decision']} (Urgency: {ai_res['urgency_level']})",
                    now,
                ),
            )

    return {
        "id": an_id,
        "incident_id": payload.incident_id,
        "input_text": payload.text.strip(),
        "toxicity_score": ai_res["toxicity"],
        "insult_score": ai_res["insult"],
        "threat_score": ai_res["threat"],
        "harassment_score": ai_res["harassment_score"],
        "blackmail_score": ai_res["blackmail_score"],
        "extortion_score": ai_res["extortion_score"],
        "urgency_level": ai_res["urgency_level"],
        "decision": ai_res["decision"],
        "detected_signals": ai_res["detected_signals"],
        "explanation": ai_res["explanation"],
        "limitations": ai_res["limitations"],
        "suggested_steps": ai_res["suggested_steps"],
        "created_at": now,
    }


@app.post("/api/v1/analysis/media", status_code=status.HTTP_201_CREATED)
async def run_media_analysis(
    evidence_id: Optional[str] = Form(default=None),
    media_type: str = Form(default="image"),
    file: Optional[UploadFile] = File(default=None),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    content: Optional[bytes] = None
    target_evidence_id = evidence_id or "custom-upload"

    if file is not None:
        content = await file.read()
    elif evidence_id:
        with get_db() as conn:
            row = conn.execute(
                "SELECT * FROM evidence WHERE id = ? AND user_id = ?",
                (evidence_id, current_user["id"]),
            ).fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Evidence item not found or access denied.",
                )
            file_path = os.path.join(get_storage_dir(), row["stored_filename"])
            if not os.path.exists(file_path):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Evidence file missing on disk.",
                )
            with open(file_path, "rb") as f:
                content = f.read()
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Provide either an image file or an existing evidence_id.",
        )

    ai_res = analyze_image(content)
    an_id = f"an-med-{uuid.uuid4().hex[:8]}"
    now = _utc_now()

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO media_analyses (
                id, evidence_id, user_id, media_type, model_name, model_version,
                deepfake_score, nudity_score, is_calibrated, uncertainty_state,
                decision, compression_anomaly_detected, c2pa_provenance,
                limitations, recommended_next_steps, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                an_id,
                target_evidence_id,
                current_user["id"],
                media_type,
                ai_res["model_name"],
                ai_res["model_version"],
                ai_res["deepfake_score"],
                ai_res["nudity_score"],
                ai_res["uncertainty_state"],
                ai_res["decision"],
                1 if ai_res["compression_anomaly_detected"] else 0,
                json.dumps(ai_res["c2pa_provenance"]),
                json.dumps(ai_res["limitations"]),
                json.dumps(ai_res["recommended_next_steps"]),
                now,
            ),
        )

    return {
        "id": an_id,
        "evidence_id": target_evidence_id,
        "media_type": media_type,
        "model_name": ai_res["model_name"],
        "model_version": ai_res["model_version"],
        "deepfake_score": ai_res["deepfake_score"],
        "nudity_score": ai_res["nudity_score"],
        "is_calibrated": False,
        "uncertainty_state": ai_res["uncertainty_state"],
        "decision": ai_res["decision"],
        "compression_anomaly_detected": ai_res["compression_anomaly_detected"],
        "c2pa_provenance": ai_res["c2pa_provenance"],
        "limitations": ai_res["limitations"],
        "recommended_next_steps": ai_res["recommended_next_steps"],
        "created_at": now,
    }


def _serialize_media_analysis(row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "evidence_id": row["evidence_id"],
        "media_type": row["media_type"],
        "model_name": row["model_name"],
        "model_version": row["model_version"],
        "deepfake_score": row["deepfake_score"],
        "nudity_score": row["nudity_score"],
        "is_calibrated": bool(row["is_calibrated"]),
        "uncertainty_state": row["uncertainty_state"],
        "decision": row["decision"],
        "compression_anomaly_detected": bool(row["compression_anomaly_detected"]),
        "c2pa_provenance": json.loads(row["c2pa_provenance"]),
        "limitations": json.loads(row["limitations"]),
        "recommended_next_steps": json.loads(row["recommended_next_steps"]),
        "created_at": row["created_at"],
    }


@app.get("/api/v1/analysis/media/{evidence_id}")
def get_media_analysis(
    evidence_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM media_analyses WHERE evidence_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1",
            (evidence_id, current_user["id"]),
        ).fetchone()
        if not row:
            return None
        return _serialize_media_analysis(row)


@app.get("/api/v1/analysis/history")
def get_analysis_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        media_rows = conn.execute(
            "SELECT * FROM media_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
            (current_user["id"],),
        ).fetchall()
        threat_rows = conn.execute(
            "SELECT * FROM threat_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
            (current_user["id"],),
        ).fetchall()
        return {
            "media_analyses": [_serialize_media_analysis(r) for r in media_rows],
            "threat_analyses": [
                {
                    "id": r["id"],
                    "incident_id": r["incident_id"],
                    "input_text": r["input_text"],
                    "toxicity_score": r["toxicity_score"],
                    "insult_score": r["insult_score"],
                    "threat_score": r["threat_score"],
                    "harassment_score": r["harassment_score"],
                    "blackmail_score": r["blackmail_score"],
                    "extortion_score": r["extortion_score"],
                    "urgency_level": r["urgency_level"],
                    "decision": r["decision"],
                    "detected_signals": json.loads(r["detected_signals"]),
                    "explanation": r["explanation"],
                    "limitations": json.loads(r["limitations"]),
                    "suggested_steps": json.loads(r["suggested_steps"]),
                    "created_at": r["created_at"],
                }
                for r in threat_rows
            ],
        }


# ==========================================================
# TIMELINE (Member 2)
# ==========================================================
@app.get("/api/v1/incidents/{incident_id}/timeline")
def get_timeline(
    incident_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        inc = conn.execute(
            "SELECT id FROM incidents WHERE id = ? AND user_id = ?",
            (incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found"
            )
        rows = conn.execute(
            "SELECT * FROM timeline_events WHERE incident_id = ? AND user_id = ? ORDER BY timestamp DESC",
            (incident_id, current_user["id"]),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "incident_id": r["incident_id"],
                "event_type": r["event_type"],
                "source": r["source"],
                "title": r["title"],
                "description": r["description"],
                "related_evidence_id": r["related_evidence_id"],
                "timestamp": r["timestamp"],
            }
            for r in rows
        ]


@app.post("/api/v1/incidents/{incident_id}/timeline", status_code=status.HTTP_201_CREATED)
def add_timeline_event(
    incident_id: str,
    payload: TimelineEventCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    now = _utc_now()
    tl_id = f"tl-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        inc = conn.execute(
            "SELECT id FROM incidents WHERE id = ? AND user_id = ?",
            (incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found"
            )
        conn.execute(
            """
            INSERT INTO timeline_events (id, incident_id, user_id, event_type, source, title, description, related_evidence_id, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                tl_id,
                incident_id,
                current_user["id"],
                payload.event_type,
                payload.source,
                payload.title.strip(),
                payload.description.strip(),
                payload.related_evidence_id,
                now,
            ),
        )
    return {
        "id": tl_id,
        "incident_id": incident_id,
        "event_type": payload.event_type,
        "source": payload.source,
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "related_evidence_id": payload.related_evidence_id,
        "timestamp": now,
    }


# ==========================================================
# COMPLAINTS (Member 2)
# ==========================================================
@app.post("/api/v1/complaints/generate", status_code=status.HTTP_201_CREATED)
def generate_complaint(
    payload: ComplaintGenerateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        inc = conn.execute(
            "SELECT * FROM incidents WHERE id = ? AND user_id = ?",
            (payload.incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found"
            )
        evi_rows = conn.execute(
            "SELECT * FROM evidence WHERE incident_id = ? AND user_id = ?",
            (payload.incident_id, current_user["id"]),
        ).fetchall()

        selected = (
            [r for r in evi_rows if r["id"] in payload.evidence_ids]
            if payload.evidence_ids
            else []
        )
        inventory = [
            {
                "evidence_id": r["id"],
                "filename": r["original_filename"],
                "file_type": r["file_type"],
                "sha256_hash": r["sha256_hash"],
                "relevance_note": r["notes"] or "Preserved digital evidence record",
            }
            for r in selected
        ]

        urls = json.loads(inc["relevant_urls"] or "[]")
        evidence_text = (
            "\n\n".join(
                f"  [{i + 1}] Filename: {e['filename']}\n      SHA-256 Checksum: {e['sha256_hash']}\n      Relevance: {e['relevance_note']}"
                for i, e in enumerate(inventory)
            )
            if inventory
            else "  No evidence files attached to this draft yet."
        )

        draft_text = (
            "COMPLAINT REGARDING DIGITAL ABUSE & CYBER OFFENSES\n"
            f"Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n"
            "To: Designated Cyber Crime Authority / Platform Grievance Officer\n\n"
            "1. COMPLAINANT / AFFECTED PARTY STATEMENT:\n"
            f"{payload.confirmed_facts.strip()}\n\n"
            "2. INCIDENT SPECIFICS:\n"
            f"- Category: {inc['category'].replace('_', ' ').upper()}\n"
            f"- Date of Occurrence: {inc['incident_date']} {inc['incident_time'] or ''}\n"
            f"- Platform / Channel: {inc['platform']}\n"
            f"- Associated URLs / Identifiers: {', '.join(urls) if urls else 'None provided'}\n\n"
            "3. PRESERVED DIGITAL EVIDENCE & CRYPTOGRAPHIC INTEGRITY:\n"
            f"{evidence_text}\n\n"
            "4. VERIFICATION:\n"
            "I verify that the statements above are based strictly on facts known to me. SafeHER served solely as an evidence organization and drafting tool.\n\n"
            "Complainant Signature: _______________________\n"
        )

        cmp_id = f"cmp-{uuid.uuid4().hex[:8]}"
        now = _utc_now()
        title = f"Formal Complaint: {inc['title']}"
        platform_details = f"{inc['platform']} (URLs: {', '.join(urls) if urls else 'N/A'})"
        timeline_summary = f"Incident occurred around {inc['incident_date']}."
        threat_indicators = ["Confirmed complainant statement", "SHA-256 preserved evidence references"]
        requested_authorities = ["Platform Grievance Officer", "Cyber Crime Cell (cybercrime.gov.in)"]

        conn.execute(
            """
            INSERT INTO complaint_drafts (
                id, incident_id, user_id, title, incident_summary, affected_party_statement,
                platform_details, timeline_summary, evidence_inventory, threat_indicators,
                requested_authorities, full_draft_text, is_user_confirmed, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """,
            (
                cmp_id,
                payload.incident_id,
                current_user["id"],
                title,
                inc["description"],
                payload.confirmed_facts.strip(),
                platform_details,
                timeline_summary,
                json.dumps(inventory),
                json.dumps(threat_indicators),
                json.dumps(requested_authorities),
                draft_text,
                now,
                now,
            ),
        )

    return {
        "id": cmp_id,
        "incident_id": payload.incident_id,
        "title": title,
        "incident_summary": inc["description"],
        "affected_party_statement": payload.confirmed_facts.strip(),
        "platform_details": platform_details,
        "timeline_summary": timeline_summary,
        "evidence_inventory": inventory,
        "threat_indicators": threat_indicators,
        "requested_authorities": requested_authorities,
        "full_draft_text": draft_text,
        "is_user_confirmed": False,
        "created_at": now,
        "updated_at": now,
    }


@app.put("/api/v1/complaints/{complaint_id}")
def update_complaint(
    complaint_id: str,
    payload: ComplaintUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    now = _utc_now()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM complaint_drafts WHERE id = ? AND user_id = ?",
            (complaint_id, current_user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Complaint draft not found"
            )
        confirmed_at = (
            row["user_confirmed_at"] or now if payload.is_user_confirmed else None
        )
        conn.execute(
            """
            UPDATE complaint_drafts
            SET full_draft_text = ?, is_user_confirmed = ?, user_confirmed_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload.full_draft_text,
                1 if payload.is_user_confirmed else 0,
                confirmed_at,
                now,
                complaint_id,
            ),
        )
        updated = conn.execute(
            "SELECT * FROM complaint_drafts WHERE id = ?", (complaint_id,)
        ).fetchone()
        return {
            "id": updated["id"],
            "incident_id": updated["incident_id"],
            "title": updated["title"],
            "incident_summary": updated["incident_summary"],
            "affected_party_statement": updated["affected_party_statement"],
            "platform_details": updated["platform_details"],
            "timeline_summary": updated["timeline_summary"],
            "evidence_inventory": json.loads(updated["evidence_inventory"]),
            "threat_indicators": json.loads(updated["threat_indicators"]),
            "requested_authorities": json.loads(updated["requested_authorities"]),
            "full_draft_text": updated["full_draft_text"],
            "is_user_confirmed": bool(updated["is_user_confirmed"]),
            "user_confirmed_at": updated["user_confirmed_at"],
            "created_at": updated["created_at"],
            "updated_at": updated["updated_at"],
        }


# ==========================================================
# CASES & REPORTING (Member 2)
# ==========================================================
def _serialize_case(conn, row) -> Dict[str, Any]:
    inc = conn.execute(
        "SELECT title, category FROM incidents WHERE id = ?", (row["incident_id"],)
    ).fetchone()
    evi_count = conn.execute(
        "SELECT COUNT(*) FROM evidence WHERE incident_id = ?", (row["incident_id"],)
    ).fetchone()[0]
    return {
        "id": row["id"],
        "incident_id": row["incident_id"],
        "incident_title": inc["title"] if inc else "Unknown Incident",
        "incident_category": inc["category"] if inc else "other",
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "evidence_count": evi_count,
        "follow_up_date": row["follow_up_date"],
        "reporting_references": json.loads(row["reporting_references"] or "[]"),
        "notes": row["notes"],
    }


@app.get("/api/v1/cases")
def list_cases(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM cases WHERE user_id = ? ORDER BY updated_at DESC",
            (current_user["id"],),
        ).fetchall()
        return [_serialize_case(conn, r) for r in rows]


@app.patch("/api/v1/cases/{case_id}")
def update_case(
    case_id: str,
    payload: CaseUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    now = _utc_now()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM cases WHERE id = ? AND user_id = ?",
            (case_id, current_user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Case not found"
            )
        new_notes = payload.notes if payload.notes is not None else row["notes"]
        conn.execute(
            "UPDATE cases SET status = ?, notes = ?, updated_at = ? WHERE id = ?",
            (payload.status, new_notes, now, case_id),
        )
        updated = conn.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
        return _serialize_case(conn, updated)


@app.get("/api/v1/reporting/destinations")
def get_reporting_destinations() -> List[Dict[str, Any]]:
    return REPORTING_DESTINATIONS


@app.post("/api/v1/reporting/records", status_code=status.HTTP_201_CREATED)
def record_external_submission(
    payload: ReportingRecordCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    now = _utc_now()
    rec_id = f"rep-rec-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        inc = conn.execute(
            "SELECT id FROM incidents WHERE id = ? AND user_id = ?",
            (payload.incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found"
            )
        conn.execute(
            """
            INSERT INTO reporting_records (
                id, incident_id, user_id, destination_id, destination_name,
                submission_date, reference_number, status, follow_up_date, notes, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted_by_user', ?, ?, ?)
            """,
            (
                rec_id,
                payload.incident_id,
                current_user["id"],
                payload.destination_id,
                payload.destination_name,
                payload.submission_date,
                payload.reference_number.strip(),
                payload.follow_up_date,
                payload.notes,
                now,
            ),
        )
        case_row = conn.execute(
            "SELECT * FROM cases WHERE incident_id = ? AND user_id = ?",
            (payload.incident_id, current_user["id"]),
        ).fetchone()
        if case_row:
            refs = json.loads(case_row["reporting_references"] or "[]")
            refs.append(
                {
                    "destination": payload.destination_name,
                    "ref_number": payload.reference_number.strip(),
                    "date": payload.submission_date,
                }
            )
            conn.execute(
                """
                UPDATE cases
                SET status = 'submitted_by_user', follow_up_date = ?, reporting_references = ?, updated_at = ?
                WHERE id = ?
                """,
                (payload.follow_up_date, json.dumps(refs), now, case_row["id"]),
            )
    return {
        "id": rec_id,
        "incident_id": payload.incident_id,
        "destination_id": payload.destination_id,
        "destination_name": payload.destination_name,
        "submission_date": payload.submission_date,
        "reference_number": payload.reference_number.strip(),
        "status": "submitted_by_user",
        "follow_up_date": payload.follow_up_date,
        "notes": payload.notes,
        "created_at": now,
    }


# ==========================================================
# DASHBOARD SUMMARY (Member 2)
# ==========================================================
@app.get("/api/v1/dashboard/summary")
def get_dashboard_summary(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    uid = current_user["id"]
    with get_db() as conn:
        inc_rows = conn.execute(
            "SELECT * FROM incidents WHERE user_id = ? ORDER BY created_at DESC",
            (uid,),
        ).fetchall()
        evi_rows = conn.execute(
            "SELECT * FROM evidence WHERE user_id = ? ORDER BY upload_timestamp DESC",
            (uid,),
        ).fetchall()
        active_cases = conn.execute(
            "SELECT COUNT(*) FROM cases WHERE user_id = ? AND status NOT IN ('closed', 'resolved')",
            (uid,),
        ).fetchone()[0]
        pending_follow_ups = conn.execute(
            "SELECT COUNT(*) FROM cases WHERE user_id = ? AND follow_up_date IS NOT NULL AND status NOT IN ('closed', 'resolved')",
            (uid,),
        ).fetchone()[0]
        med_count = conn.execute(
            "SELECT COUNT(*) FROM media_analyses WHERE user_id = ?", (uid,)
        ).fetchone()[0]
        thr_count = conn.execute(
            "SELECT COUNT(*) FROM threat_analyses WHERE user_id = ?", (uid,)
        ).fetchone()[0]

        recent_incidents = [_serialize_incident(conn, r) for r in inc_rows[:5]]
        recent_evidence = [_serialize_evidence(r) for r in evi_rows[:5]]

    return {
        "total_incidents": len(inc_rows),
        "active_cases": active_cases,
        "evidence_items": len(evi_rows),
        "analyses_completed": med_count + thr_count,
        "pending_follow_ups": pending_follow_ups,
        "recent_incidents": recent_incidents,
        "recent_evidence": recent_evidence,
    }
