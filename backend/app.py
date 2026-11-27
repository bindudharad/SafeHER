"""
SafeHER Unified FastAPI Application (Member 1 AI + Member 2 Backend & DB).
"""

import hashlib
import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from ai_service import analyze_image, analyze_text, get_ai_health
from ai.inference_queue import (
    submit_analysis_job,
    get_job_status,
    cancel_job,
    list_jobs,
    get_all_models_health,
)
from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    revoke_token,
    validate_jwt_configuration,
    verify_password,
)
from db import (
    get_db,
    get_storage_dir,
    init_db,
    get_or_create_safety_settings,
    update_safety_settings,
    list_trusted_contacts,
    add_trusted_contact,
    delete_trusted_contact,
    start_journey_checkin,
    complete_journey_checkin,
    cancel_journey_checkin,
    get_active_journey_checkin,
    log_malware_scan,
    get_malware_scan_log,
)
from schemas import (
    AnalysisJobSubmitRequest,
    CaseUpdateRequest,
    ComplaintGenerateRequest,
    ComplaintUpdateRequest,
    IncidentCreateRequest,
    LoginRequest,
    RegisterRequest,
    ReportingRecordCreateRequest,
    ThreatAnalysisFeedbackRequest,
    ThreatAnalysisRequest,
    TimelineEventCreateRequest,
    SafetySettingsUpdateRequest,
    TrustedContactCreateRequest,
    JourneyCheckinStartRequest,
)
from security.evidence_storage import (
    encrypt_and_store_evidence,
    retrieve_and_decrypt_evidence,
    verify_evidence_integrity,
)
from security.malware_scanner import (
    scan_file_content,
    quarantine_file,
    get_malware_scanner_health,
)

from forensics.router import router as stage5_forensics_router

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
    from safety.sms_worker import get_sms_worker

    worker = get_sms_worker()
    worker.start()
    try:
        yield
    finally:
        worker.stop()


app = FastAPI(
    title="SafeHER Unified API",
    version="1.0.0",
    description="Integrated FastAPI backend combining Member 1 AI models and Member 2 persistence.",
    lifespan=lifespan,
)

_raw_cors = os.environ.get("SAFEHER_CORS_ORIGINS", "").strip()
_cors_origins = (
    [o.strip() for o in _raw_cors.split(",") if o.strip()]
    if _raw_cors
    else [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

    _trusted_proxies = os.environ.get("SAFEHER_TRUSTED_PROXIES", "127.0.0.1,172.16.0.0/12,10.0.0.0/8")
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=[h.strip() for h in _trusted_proxies.split(",") if h.strip()])
except Exception:
    pass

# SlowAPI Rate Limiting configuration
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
    enabled=os.environ.get("SAFEHER_ENV") != "test",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
    forwarded_proto = request.headers.get("x-forwarded-proto", "").lower()
    if forwarded_proto == "https" or os.environ.get("SAFEHER_ENV") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    else:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Antivirus & Upload Safety Heuristic Scanner
EICAR_SIGNATURE = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"


def scan_upload_safety(content: bytes, filename: str) -> Tuple[bool, str]:
    """
    Scans uploaded content for malware test signatures, polyglots, and disguised executables.
    Delegates to modular malware inspection engine.
    """
    res = scan_file_content(content, filename)
    if not res.is_clean:
        return False, "; ".join(res.threats_detected) if res.threats_detected else "Malicious content detected"
    return True, "clean"


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
# AUTHENTICATION (Member 2 Hardened)
# ==========================================================
@app.post("/api/v1/auth/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(request: Request, payload: RegisterRequest) -> Dict[str, Any]:
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
            INSERT INTO users (id, name, email, password_hash, consent_acknowledged, consent_date, preferred_language, created_at, role)
            VALUES (?, ?, ?, ?, 1, ?, 'en', ?, 'user')
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

    token = create_access_token(user_id, email, role="user")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": payload.name.strip(),
            "email": email,
            "role": "user",
            "consent_acknowledged": True,
            "consent_date": now,
            "preferred_language": "en",
            "created_at": now,
        },
    }


@app.post("/api/v1/auth/login")
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest) -> Dict[str, Any]:
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
    role = row["role"] if "role" in row.keys() and row["role"] else "user"
    token = create_access_token(row["id"], row["email"], role=role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "role": role,
            "consent_acknowledged": bool(row["consent_acknowledged"]),
            "consent_date": row["consent_date"],
            "preferred_language": row["preferred_language"],
            "created_at": row["created_at"],
        },
    }


@app.post("/api/v1/auth/logout")
def logout(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif "authorization" in request.headers:
        auth_header = request.headers["authorization"]
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
    if token:
        revoke_token(token)
    return {"message": "Logged out successfully", "status": "revoked"}


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
# EVIDENCE VAULT (Member 2 Hardened with AES-256-GCM)
# ==========================================================
def _serialize_evidence(row) -> Dict[str, Any]:
    row_keys = row.keys() if hasattr(row, "keys") else []
    data = {
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
    if "encryption_algorithm" in row_keys:
        data["encryption_algorithm"] = row["encryption_algorithm"] or "AES-256-GCM"
    if "encryption_version" in row_keys:
        data["encryption_version"] = row["encryption_version"]
    if "key_id" in row_keys:
        data["key_id"] = row["key_id"]
    if "key_version" in row_keys:
        data["key_version"] = row["key_version"]
    if "wrapping_nonce" in row_keys:
        data["wrapping_nonce"] = row["wrapping_nonce"]
    if "ciphertext_sha256" in row_keys:
        data["ciphertext_sha256"] = row["ciphertext_sha256"]
    if "encryption_timestamp" in row_keys:
        data["encryption_timestamp"] = row["encryption_timestamp"]
    if "signature" in row_keys:
        data["signature_status"] = "verified" if row["signature"] else "none"
    return data


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
@limiter.limit("30/minute")
async def upload_evidence(
    incident_id: str,
    request: Request,
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

    # 1. Antivirus & Malware inspection
    storage_dir = get_storage_dir()
    scan_res = scan_file_content(content, original_name)
    if not scan_res.is_clean:
        # Quarantine the malicious payload securely
        quarantine_p = quarantine_file(content, f"temp_{uuid.uuid4().hex[:8]}", original_name, storage_dir)
        try:
            log_malware_scan(
                scan_id=f"mscan-{uuid.uuid4().hex[:10]}",
                evidence_id=None,
                user_id=current_user["id"],
                filename=original_name,
                scan_status="quarantined",
                scanner_engine=scan_res.scanner_engine,
                threats_detected=scan_res.threats_detected,
                scan_duration_ms=scan_res.scan_duration_ms,
                quarantine_path=quarantine_p,
            )
        except Exception:
            pass

        threat_msg = "; ".join(scan_res.threats_detected) if scan_res.threats_detected else "Malicious content detected"
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Upload rejected by security filter: {threat_msg}",
        )

    # 2. SHA-256 Integrity Verification
    server_sha256 = hashlib.sha256(content).hexdigest()
    if sha256 and sha256.strip().lower() != server_sha256.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client SHA-256 digest does not match uploaded file bytes.",
        )

    evi_id = f"evi-{uuid.uuid4().hex[:8]}"

    # 3. Secure AES-256-GCM Envelope Encryption & Storage
    storage_res = encrypt_and_store_evidence(
        content=content,
        evidence_id=evi_id,
        user_id=current_user["id"],
        storage_dir=storage_dir,
        original_filename=original_name,
    )

    now = _utc_now()
    client_ip = request.client.host if request.client else "127.0.0.1"

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
                processing_status, duplicate_status, notes,
                encryption_algorithm, encryption_version, data_nonce,
                wrapped_dek, wrapping_nonce, key_id, key_version,
                original_sha256, ciphertext_sha256, encryption_timestamp,
                wrapped_key, signature
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'passed', ?, 'ready', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                evi_id,
                incident_id,
                current_user["id"],
                original_name,
                storage_res.stored_filename,
                file.content_type or "application/octet-stream",
                storage_res.file_size,
                storage_res.sha256_hash,
                now,
                storage_res.storage_status,
                scan_res.status,
                duplicate_status,
                notes,
                storage_res.encryption_algorithm,
                storage_res.encryption_version,
                storage_res.data_nonce_hex,
                storage_res.wrapped_dek_hex,
                storage_res.wrapping_nonce_hex,
                storage_res.key_id,
                storage_res.key_version,
                storage_res.sha256_hash,
                storage_res.ciphertext_sha256,
                storage_res.encryption_timestamp,
                storage_res.wrapped_dek_hex,
                storage_res.signature_hex,
            ),
        )

        # Log malware scan audit entry for clean uploaded evidence
        try:
            log_malware_scan(
                scan_id=f"mscan-{uuid.uuid4().hex[:10]}",
                evidence_id=evi_id,
                user_id=current_user["id"],
                filename=original_name,
                scan_status=scan_res.status,
                scanner_engine=scan_res.scanner_engine,
                threats_detected=scan_res.threats_detected,
                scan_duration_ms=scan_res.scan_duration_ms,
                quarantine_path=None,
            )
        except Exception:
            pass

        # 4. Chain of Custody Record
        upload_details = json.dumps({
            "actor": current_user["email"],
            "reason": "AES-256-GCM envelope encryption and SHA-256 preservation",
            "sha256_hash": storage_res.sha256_hash,
            "signature": storage_res.signature_hex,
        })
        conn.execute(
            """
            INSERT INTO custody_records (id, evidence_id, user_id, action, details, timestamp, ip_address)
            VALUES (?, ?, ?, 'evidence_uploaded', ?, ?, ?)
            """,
            (
                f"cst-{uuid.uuid4().hex[:8]}",
                evi_id,
                current_user["id"],
                upload_details,
                now,
                client_ip,
            ),
        )

        conn.execute(
            """
            INSERT INTO timeline_events (id, incident_id, user_id, event_type, source, title, description, related_evidence_id, timestamp)
            VALUES (?, ?, ?, 'evidence_uploaded', 'system', 'Evidence Preserved & Encrypted (AES-256-GCM)', ?, ?, ?)
            """,
            (
                f"tl-{uuid.uuid4().hex[:8]}",
                incident_id,
                current_user["id"],
                f"Preserved '{original_name}' ({len(content)} bytes), SHA-256: {server_sha256[:16]}..., Encrypted with AES-256-GCM.",
                evi_id,
                now,
            ),
        )
        row = conn.execute("SELECT * FROM evidence WHERE id = ?", (evi_id,)).fetchone()
        return _serialize_evidence(row)


@app.get("/api/v1/evidence/{evidence_id}/download")
def download_evidence(
    evidence_id: str,
    request: Request,
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

        now = _utc_now()
        client_ip = request.client.host if request.client else "127.0.0.1"
        row_keys = row.keys() if hasattr(row, "keys") else []
        sig = row["signature"] if "signature" in row_keys else None

        # Chain of Custody Record for download
        download_details = json.dumps({
            "actor": current_user["email"],
            "reason": "Decrypted in-memory download by owner",
            "sha256_hash": row["sha256_hash"],
            "signature": sig,
        })
        conn.execute(
            """
            INSERT INTO custody_records (id, evidence_id, user_id, action, details, timestamp, ip_address)
            VALUES (?, ?, ?, 'evidence_downloaded', ?, ?, ?)
            """,
            (
                f"cst-{uuid.uuid4().hex[:8]}",
                evidence_id,
                current_user["id"],
                download_details,
                now,
                client_ip,
            ),
        )

    try:
        wrapped_key = row["wrapped_dek"] if "wrapped_dek" in row_keys and row["wrapped_dek"] else (row["wrapped_key"] if "wrapped_key" in row_keys else None)
        wrapping_nonce = row["wrapping_nonce"] if "wrapping_nonce" in row_keys else None
        key_id = row["key_id"] if "key_id" in row_keys else None
        key_version = row["key_version"] if "key_version" in row_keys else None
        enc_version = row["encryption_version"] if "encryption_version" in row_keys and row["encryption_version"] else "v2"

        decrypted_bytes = retrieve_and_decrypt_evidence(
            evidence_id=evidence_id,
            user_id=current_user["id"],
            stored_filename=row["stored_filename"],
            storage_dir=get_storage_dir(),
            wrapped_key_hex=wrapped_key,
            expected_sha256=row["sha256_hash"],
            wrapping_nonce_hex=wrapping_nonce,
            key_id=key_id,
            key_version=key_version,
            encryption_version=enc_version,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored evidence file not found on disk.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence decryption or integrity check failed: {exc}",
        )

    import urllib.parse
    encoded_fn = urllib.parse.quote(row["original_filename"])
    return Response(
        content=decrypted_bytes,
        media_type=row["file_type"] or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{row["original_filename"]}"; filename*=UTF-8\'\'{encoded_fn}'
        },
    )


@app.delete("/api/v1/evidence/{evidence_id}", status_code=status.HTTP_200_OK)
def delete_evidence(
    evidence_id: str,
    request: Request,
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

        now = _utc_now()
        client_ip = request.client.host if request.client else "127.0.0.1"
        row_keys = row.keys() if hasattr(row, "keys") else []
        sig = row["signature"] if "signature" in row_keys else None

        # Chain of Custody Record for deletion
        delete_details = json.dumps({
            "actor": current_user["email"],
            "reason": "Evidence purged from vault by owner",
            "sha256_hash": row["sha256_hash"],
            "signature": sig,
        })
        conn.execute(
            """
            INSERT INTO custody_records (id, evidence_id, user_id, action, details, timestamp, ip_address)
            VALUES (?, ?, ?, 'evidence_deleted', ?, ?, ?)
            """,
            (
                f"cst-{uuid.uuid4().hex[:8]}",
                evidence_id,
                current_user["id"],
                delete_details,
                now,
                client_ip,
            ),
        )
        conn.execute("DELETE FROM evidence WHERE id = ?", (evidence_id,))

    if os.path.exists(file_path):
        os.remove(file_path)
    return {"status": "deleted", "id": evidence_id}


@app.get("/api/v1/evidence/{evidence_id}/custody")
def get_evidence_custody(
    evidence_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        inc = conn.execute(
            "SELECT id FROM evidence WHERE id = ? AND user_id = ?",
            (evidence_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence not found or access denied.",
            )
        records = conn.execute(
            "SELECT * FROM custody_records WHERE evidence_id = ? ORDER BY timestamp ASC",
            (evidence_id,),
        ).fetchall()
        result = []
        for r in records:
            det = {}
            if r["details"]:
                try:
                    det = json.loads(r["details"])
                except Exception:
                    det = {"reason": r["details"]}
            result.append(
                {
                    "id": r["id"],
                    "evidence_id": r["evidence_id"],
                    "action": r["action"],
                    "actor": det.get("actor", current_user["email"]),
                    "reason": det.get("reason", r["details"]),
                    "ip_address": r["ip_address"],
                    "sha256_hash": det.get("sha256_hash"),
                    "signature": det.get("signature"),
                    "timestamp": r["timestamp"],
                }
            )
        return result


@app.get("/api/v1/evidence/{evidence_id}/receipt")
def get_evidence_receipt(
    evidence_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM evidence WHERE id = ? AND user_id = ?",
            (evidence_id, current_user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence not found or access denied.",
            )

    row_keys = row.keys() if hasattr(row, "keys") else []
    wrapped_key = row["wrapped_key"] if "wrapped_key" in row_keys else None
    sig = row["signature"] if "signature" in row_keys else None
    enc_algo = row["encryption_algorithm"] if "encryption_algorithm" in row_keys else "AES-256-GCM"
    key_id = row["key_id"] if "key_id" in row_keys else None

    audit = verify_evidence_integrity(
        evidence_id=evidence_id,
        user_id=current_user["id"],
        stored_filename=row["stored_filename"],
        storage_dir=get_storage_dir(),
        wrapped_key_hex=wrapped_key,
        expected_sha256=row["sha256_hash"],
        signature_hex=sig,
    )

    return {
        "evidence_id": evidence_id,
        "original_filename": row["original_filename"],
        "file_size": row["file_size"],
        "sha256_hash": row["sha256_hash"],
        "storage_status": row["storage_status"],
        "encryption_algorithm": enc_algo,
        "key_id": key_id,
        "signature_present": bool(sig),
        "audit": audit,
    }


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
    multilingual_meta = {
        "analysis_id": ai_res["analysis_id"],
        "model_id": ai_res["model_id"],
        "model_version": ai_res["model_version"],
        "models_used": ai_res["models_used"],
        "language": ai_res["language"],
        "language_name": ai_res["language_name"],
        "script": ai_res["script"],
        "is_mixed_language": ai_res["is_mixed_language"],
        "supported_language": ai_res["supported_language"],
        "language_confidence": ai_res["language_confidence"],
        "predicted_categories": ai_res["predicted_categories"],
        "category_scores": ai_res["category_scores"],
        "severity": ai_res["severity"],
        "confidence_status": ai_res["confidence_status"],
        "analysis_status": ai_res["analysis_status"],
        "requires_human_review": ai_res["requires_human_review"],
        "warnings": ai_res["warnings"],
        "inference_time_ms": ai_res["inference_time_ms"],
    }

    with get_db() as conn:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(threat_analyses)").fetchall()}
        if "multilingual_metadata" not in cols:
            conn.execute("ALTER TABLE threat_analyses ADD COLUMN multilingual_metadata TEXT")
        conn.execute(
            """
            INSERT INTO threat_analyses (
                id, incident_id, user_id, input_text,
                toxicity_score, insult_score, threat_score,
                harassment_score, blackmail_score, extortion_score,
                urgency_level, decision, detected_signals,
                explanation, limitations, suggested_steps, multilingual_metadata, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                json.dumps(multilingual_meta),
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
                    f"Decision: {ai_res['decision']} (Severity: {ai_res['severity']}, Lang: {ai_res['language']})",
                    now,
                ),
            )

    return {
        "id": an_id,
        "incident_id": payload.incident_id,
        "input_text": payload.text.strip(),
        **multilingual_meta,
        "toxicity_score": ai_res["toxicity"],
        "insult_score": ai_res["insult"],
        "threat_score": ai_res["threat"],
        "harassment_score": ai_res["harassment_score"],
        "blackmail_score": ai_res["blackmail_score"],
        "extortion_score": ai_res["extortion_score"],
        "urgency_level": ai_res["urgency_level"],
        "decision": ai_res["decision"],
        "detected_signals": ai_res["detected_signals"],
        "language_detected": ai_res["language_detected"],
        "explanation": ai_res["explanation"],
        "limitations": ai_res["limitations"],
        "suggested_steps": ai_res["suggested_steps"],
        "created_at": now,
    }


@app.post("/api/v1/analysis/threat/{analysis_id}/feedback", status_code=status.HTTP_201_CREATED)
def submit_threat_analysis_feedback(
    analysis_id: str,
    payload: ThreatAnalysisFeedbackRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Records human review/correction for a threat analysis separately from original
    evidence. Never triggers automatic model training.
    """
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM threat_analyses WHERE id = ? AND user_id = ?",
            (analysis_id, current_user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Threat analysis record not found or access denied.",
            )
        fb_id = f"fb-{uuid.uuid4().hex[:8]}"
        now = _utc_now()
        conn.execute(
            """
            INSERT INTO threat_analysis_feedback (
                id, analysis_id, user_id, corrected_categories,
                corrected_severity, is_false_positive, notes, used_for_training, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (
                fb_id,
                analysis_id,
                current_user["id"],
                json.dumps(payload.corrected_categories),
                payload.corrected_severity,
                1 if payload.is_false_positive else 0,
                payload.notes,
                now,
            ),
        )
    return {
        "id": fb_id,
        "analysis_id": analysis_id,
        "corrected_categories": payload.corrected_categories,
        "corrected_severity": payload.corrected_severity,
        "is_false_positive": payload.is_false_positive,
        "used_for_training": False,
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
            row_keys = row.keys() if hasattr(row, "keys") else []
            wrapped_key = row["wrapped_key"] if "wrapped_key" in row_keys else None
            wrapped_dek = row["wrapped_dek"] if "wrapped_dek" in row_keys else None
            wrapping_nonce = row["wrapping_nonce"] if "wrapping_nonce" in row_keys else None
            data_nonce = row["data_nonce"] if "data_nonce" in row_keys else None
            key_id = row["key_id"] if "key_id" in row_keys else None
            key_version = row["key_version"] if "key_version" in row_keys else None
            enc_version = row["encryption_version"] if "encryption_version" in row_keys else "v2"
            expected_hash = (row["original_sha256"] if ("original_sha256" in row_keys and row["original_sha256"]) else row["sha256_hash"])
            try:
                content = retrieve_and_decrypt_evidence(
                    evidence_id=evidence_id,
                    user_id=current_user["id"],
                    stored_filename=row["stored_filename"],
                    storage_dir=get_storage_dir(),
                    wrapped_key_hex=wrapped_key,
                    wrapped_dek_hex=wrapped_dek,
                    wrapping_nonce_hex=wrapping_nonce,
                    data_nonce_hex=data_nonce,
                    key_id=key_id,
                    key_version=key_version,
                    encryption_version=enc_version,
                    expected_sha256=expected_hash,
                )
            except FileNotFoundError:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Evidence file missing on disk.",
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Evidence decryption failed: {exc}",
                )
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
                c2pa_result, face_localization, model_a_result, model_b_result,
                limitations, recommended_next_steps, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                json.dumps(ai_res.get("c2pa_analysis", {})),
                json.dumps(ai_res.get("face_localization", {})),
                json.dumps(ai_res.get("model_a_result", {})),
                json.dumps(ai_res.get("model_b_result", {})),
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
        "c2pa_analysis": ai_res.get("c2pa_analysis", {}),
        "face_localization": ai_res.get("face_localization", {}),
        "faces": ai_res.get("faces", []),
        "model_a_result": ai_res.get("model_a_result", {}),
        "model_b_result": ai_res.get("model_b_result", {}),
        "limitations": ai_res["limitations"],
        "recommended_next_steps": ai_res["recommended_next_steps"],
        "created_at": now,
    }


def _serialize_media_analysis(row) -> Dict[str, Any]:
    row_keys = row.keys() if hasattr(row, "keys") else []
    res = {
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
    if "c2pa_result" in row_keys and row["c2pa_result"]:
        try:
            res["c2pa_analysis"] = json.loads(row["c2pa_result"])
        except Exception:
            res["c2pa_analysis"] = {}
    if "face_localization" in row_keys and row["face_localization"]:
        try:
            res["face_localization"] = json.loads(row["face_localization"])
            res["faces"] = res["face_localization"].get("faces", [])
        except Exception:
            res["face_localization"] = {}
            res["faces"] = []
    if "model_a_result" in row_keys and row["model_a_result"]:
        try:
            res["model_a_result"] = json.loads(row["model_a_result"])
        except Exception:
            res["model_a_result"] = {}
    if "model_b_result" in row_keys and row["model_b_result"]:
        try:
            res["model_b_result"] = json.loads(row["model_b_result"])
        except Exception:
            res["model_b_result"] = {}
    return res


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


@app.get("/api/v1/ai/health")
def api_get_all_ai_health(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    return get_all_models_health()


@app.post("/api/v1/evidence/{evidence_id}/jobs", status_code=status.HTTP_202_ACCEPTED)
def api_submit_analysis_job(
    evidence_id: str,
    payload: Optional[AnalysisJobSubmitRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        evi = conn.execute("SELECT * FROM evidence WHERE id = ?", (str(evidence_id),)).fetchone()
        if not evi:
            raise HTTPException(status_code=404, detail="Evidence not found")
        if str(evi["user_id"]) != str(current_user["id"]):
            raise HTTPException(status_code=403, detail="Not authorized to analyze this evidence")

    model_type = payload.model_type if payload else "full_forensics"
    try:
        job = submit_analysis_job(
            evidence_id=str(evidence_id),
            owner_id=str(current_user["id"]),
            model_type=model_type,
        )
        return {
            "job_id": job["id"],
            "evidence_id": job["evidence_id"],
            "model_type": job["model_type"],
            "status": job["status"],
            "created_at": job["created_at"],
            "message": "Analysis job submitted to isolated background worker.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/evidence/{evidence_id}/jobs/{job_id}")
def api_get_analysis_job_status(
    evidence_id: str,
    job_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        job = get_job_status(job_id=job_id, owner_id=str(current_user["id"]))
        if not job:
            raise HTTPException(status_code=404, detail="Analysis job not found")
        if str(job["evidence_id"]) != str(evidence_id):
            raise HTTPException(status_code=400, detail="Job evidence ID mismatch")
        return job
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not authorized to view this analysis job")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/evidence/{evidence_id}/jobs/{job_id}/cancel")
def api_cancel_analysis_job(
    evidence_id: str,
    job_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        success = cancel_job(job_id=job_id, owner_id=str(current_user["id"]))
        if not success:
            raise HTTPException(status_code=400, detail="Job cannot be cancelled (may be already completed, failed, or does not exist)")
        return {"job_id": job_id, "status": "cancelled", "message": "Job cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/evidence/{evidence_id}/jobs")
def api_list_analysis_jobs(
    evidence_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        evi = conn.execute("SELECT * FROM evidence WHERE id = ?", (str(evidence_id),)).fetchone()
        if not evi:
            raise HTTPException(status_code=404, detail="Evidence not found")
        if str(evi["user_id"]) != str(current_user["id"]):
            raise HTTPException(status_code=403, detail="Not authorized to view jobs for this evidence")

    return list_jobs(evidence_id=str(evidence_id), owner_id=str(current_user["id"]))


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
            """
            SELECT DISTINCT c.* FROM cases c
            LEFT JOIN case_assignments ca ON ca.case_id = c.id AND ca.user_id = ? AND ca.status = 'active'
            WHERE c.user_id = ? OR ca.id IS NOT NULL
            ORDER BY c.updated_at DESC
            """,
            (current_user["id"], current_user["id"]),
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


# ==========================================================
# STAGE 6: SURVIVOR SAFETY, TRUSTED CONTACTS & JOURNEY CHECK-IN
# ==========================================================

@app.get("/api/v1/safety/settings")
def get_safety_settings_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    return get_or_create_safety_settings(current_user["id"])


@app.put("/api/v1/safety/settings")
def update_safety_settings_endpoint(
    payload: SafetySettingsUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    updates = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)
    return update_safety_settings(current_user["id"], updates)


@app.get("/api/v1/safety/contacts")
def list_contacts_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    return list_trusted_contacts(current_user["id"])


@app.post("/api/v1/safety/contacts", status_code=status.HTTP_201_CREATED)
def add_contact_endpoint(
    payload: TrustedContactCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    cid = f"tc-{uuid.uuid4().hex[:8]}"
    return add_trusted_contact(
        contact_id=cid,
        user_id=current_user["id"],
        name=payload.name,
        phone_number=payload.phone_number,
        relationship=payload.relationship,
        notify_on_escalation=payload.notify_on_escalation,
    )


@app.delete("/api/v1/safety/contacts/{contact_id}")
def delete_contact_endpoint(
    contact_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    deleted = delete_trusted_contact(contact_id, current_user["id"])
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found or does not belong to the authenticated user.",
        )
    return {"message": "Contact deleted successfully", "deleted": True}


@app.post("/api/v1/safety/journey/start", status_code=status.HTTP_201_CREATED)
def start_journey_endpoint(
    payload: JourneyCheckinStartRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    jid = f"jrn-{uuid.uuid4().hex[:8]}"
    if payload.contact_id:
        with get_db() as conn:
            c_row = conn.execute(
                "SELECT id FROM trusted_contacts WHERE id = ? AND user_id = ?",
                (payload.contact_id, current_user["id"]),
            ).fetchone()
            if not c_row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Specified contact_id does not exist or belong to user.",
                )
    return start_journey_checkin(
        journey_id=jid,
        user_id=current_user["id"],
        destination_label=payload.destination_label,
        duration_minutes=payload.duration_minutes,
        contact_id=payload.contact_id,
    )


@app.post("/api/v1/safety/journey/{journey_id}/checkin")
def complete_journey_endpoint(
    journey_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    ok = complete_journey_checkin(journey_id, current_user["id"])
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active journey check-in not found or not owned by user.",
        )
    return {"message": "Journey check-in completed safely", "status": "completed_safely"}


@app.post("/api/v1/safety/journey/{journey_id}/cancel")
def cancel_journey_endpoint(
    journey_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    ok = cancel_journey_checkin(journey_id, current_user["id"])
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active journey check-in not found or not owned by user.",
        )
    return {"message": "Journey check-in cancelled", "status": "cancelled"}


@app.get("/api/v1/safety/journey/active")
def get_active_journey_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Optional[Dict[str, Any]]:
    return get_active_journey_checkin(current_user["id"])


@app.post("/api/v1/safety/contacts/{contact_id}/request-verification")
def request_contact_verification_endpoint(
    contact_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    from safety.sms_worker import request_contact_verification

    try:
        return request_contact_verification(contact_id, current_user["id"])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.post("/api/v1/safety/contacts/{contact_id}/verify")
def verify_contact_endpoint(
    contact_id: str,
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    from safety.sms_worker import verify_contact_code

    code = str(payload.get("code", "")).strip()
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code is required.")
    ok = verify_contact_code(contact_id, current_user["id"], code)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code.")
    return {"verified": True, "contact_id": contact_id}


@app.post("/api/v1/safety/emergency/notify", status_code=status.HTTP_202_ACCEPTED)
def trigger_emergency_sms_endpoint(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    from safety.sms_worker import enqueue_emergency_alerts_for_user

    if not payload.get("confirm_send"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit confirm_send=true is required to trigger emergency SMS alerts.",
        )
    idem_key = str(payload.get("idempotency_key") or f"sos:{current_user['id']}:{uuid.uuid4().hex[:10]}")
    res = enqueue_emergency_alerts_for_user(
        user_id=current_user["id"],
        event_type="manual_sos",
        idempotency_prefix=idem_key,
        specific_contact_id=payload.get("contact_id"),
    )
    if res["queued_count"] == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("reason", "No verified trusted contacts available."),
        )
    return res


@app.get("/api/v1/safety/notifications")
def list_safety_notifications_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    from safety.sms_worker import list_user_notifications

    return list_user_notifications(current_user["id"])


@app.get("/api/v1/safety/sms/health")
def sms_health_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    from safety.sms_worker import get_sms_operational_health

    return get_sms_operational_health()


@app.post("/api/v1/safety/sms/webhook")
async def twilio_sms_status_webhook(request: Request) -> Dict[str, Any]:
    from safety.sms_service import TwilioSmsProvider, get_sms_provider
    from safety.sms_worker import update_notification_status_from_webhook

    form_data = dict(await request.form())
    provider = get_sms_provider()
    if isinstance(provider, TwilioSmsProvider) and provider.is_configured():
        sig = request.headers.get("X-Twilio-Signature", "")
        if not provider.validate_webhook_signature(str(request.url), form_data, sig):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Twilio webhook signature.")

    sid = str(form_data.get("MessageSid", "")).strip()
    msg_status = str(form_data.get("MessageStatus", "")).strip()
    err_msg = form_data.get("ErrorMessage")
    if not sid or not msg_status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing MessageSid or MessageStatus.")
    updated = update_notification_status_from_webhook(sid, msg_status, str(err_msg) if err_msg else None)
    return {"updated": updated, "message_sid": sid, "status": msg_status}


# ==========================================================
# STAGE 7: PRODUCTION MALWARE SCANNING & SECURITY AUDIT
# ==========================================================

@app.get("/api/v1/security/malware/health")
def malware_scanner_health_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    return get_malware_scanner_health()


@app.get("/api/v1/security/kms/health")
def kms_health_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    from security.key_provider import get_key_provider

    health_info = get_key_provider().health_check()
    # Redact sensitive ARN/infrastructure details for non-admin users
    if current_user.get("role") not in ("admin", "analyst"):
        return {
            "provider": health_info.get("provider"),
            "status": health_info.get("status"),
            "hardware_backed": health_info.get("hardware_backed", False),
        }
    return health_info


@app.get("/api/v1/security/operational/health")
def operational_health_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    from ai.tampering_localization import get_tampering_health
    from safety.sms_worker import get_sms_operational_health
    from security.key_provider import get_key_provider

    is_privileged = current_user.get("role") in ("admin", "analyst")
    kms_h = get_key_provider().health_check()
    malware_h = get_malware_scanner_health()
    sms_h = get_sms_operational_health()
    tamp_h = get_tampering_health()

    if not is_privileged:
        return {
            "kms": {"provider": kms_h.get("provider"), "status": kms_h.get("status")},
            "malware": {"status": malware_h.get("status"), "clamav_online": malware_h.get("clamav_online")},
            "sms": {"configured": sms_h["provider"].get("configured"), "status": sms_h["provider"].get("status")},
            "tampering_localization": {"status": tamp_h.get("status"), "model_id": tamp_h.get("model_id")},
        }

    return {
        "kms": kms_h,
        "malware": malware_h,
        "sms": sms_h,
        "tampering_localization": tamp_h,
    }


@app.get("/api/v1/evidence/{evidence_id}/malware-scan")
def get_evidence_malware_scan_endpoint(
    evidence_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        evi_row = conn.execute(
            "SELECT * FROM evidence WHERE id = ?", (evidence_id,)
        ).fetchone()
        if not evi_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence record not found.",
            )
        # Deny cross-user access unless admin or analyst
        if evi_row["user_id"] != current_user["id"] and current_user.get("role") not in ("admin", "analyst"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot access another user's evidence scan.",
            )
    scan_log = get_malware_scan_log(evidence_id)
    if not scan_log:
        return {
            "evidence_id": evidence_id,
            "scan_status": evi_row["malware_status"] or "clean",
            "scanner_engine": "SafeHER-Heuristic-Signature-Scanner v3.0",
            "threats_detected": [],
            "scan_duration_ms": 0.0,
            "quarantine_path": None,
            "created_at": evi_row["upload_timestamp"],
        }
    return scan_log


app.include_router(stage5_forensics_router)
