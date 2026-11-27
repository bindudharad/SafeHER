"""
SafeHER Normalized Forensic Timeline Service (Stage 5)
======================================================
Timesketch-inspired normalized multi-source event timeline with strict
preservation of original timestamps, timezone uncertainty, source provenance,
revision history, and transparent correlation suggestions.

Design guarantees:
1. Never fabricates UTC conversion when original timezone is unknown.
2. Never conflates alleged occurrence time, evidence creation time (EXIF),
   SafeHER upload time, analysis execution time, and manual investigator entry.
3. Never silently merges conflicting events.
4. Every edit creates an immutable revision record in timeline_event_revisions.
"""

from __future__ import annotations

import io
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

VALID_TIME_PRECISIONS = {
    "exact",
    "approximate",
    "date_only",
    "unknown_timezone",
    "conflicting",
    "range",
}

VALID_TIME_SOURCES = {
    "alleged_occurrence",
    "evidence_created",
    "safeher_upload",
    "analysis_performed",
    "manual_entry",
}

VALID_VERIFICATION_STATUSES = {
    "unverified",
    "suggested",
    "user_asserted",
    "human_verified",
    "disputed",
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_timestamp(
    raw_time: str,
    timezone_hint: Optional[str] = None,
    time_precision: str = "exact",
) -> Tuple[Optional[str], Optional[str], str, str]:
    """
    Attempts safe ISO-8601 UTC normalization ONLY when timezone is explicitly known.
    Returns: (event_time_utc, timezone_original, timezone_confidence, resolved_precision)
    """
    raw = (raw_time or "").strip()
    if not raw:
        return None, timezone_hint, "unknown", "unknown_timezone"

    if time_precision == "date_only" or (len(raw) == 10 and raw[4] == "-" and raw[7] == "-"):
        return None, timezone_hint or "unknown", "unknown", "date_only"

    # Try parsing ISO string directly
    iso_candidate = raw.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(iso_candidate)
        if dt.tzinfo is not None:
            utc_iso = dt.astimezone(timezone.utc).isoformat()
            tz_name = timezone_hint or str(dt.tzinfo)
            return utc_iso, tz_name, "explicit", time_precision
        # Naive datetime: only convert if explicit IANA timezone_hint was supplied
        if timezone_hint and timezone_hint.lower() not in {"unknown", "none", ""}:
            try:
                zi = ZoneInfo(timezone_hint)
                dt_aware = dt.replace(tzinfo=zi)
                return dt_aware.astimezone(timezone.utc).isoformat(), timezone_hint, "user_supplied", time_precision
            except Exception:
                pass
        return None, timezone_hint or "unknown", "unknown", (
            "unknown_timezone" if time_precision == "exact" else time_precision
        )
    except Exception:
        return None, timezone_hint or "unknown", "unknown", (
            "unknown_timezone" if time_precision == "exact" else time_precision
        )


def _serialize_timeline_event(row: sqlite3.Row) -> Dict[str, Any]:
    keys = row.keys() if hasattr(row, "keys") else []
    def _get(col: str, default: Any = None) -> Any:
        return row[col] if col in keys else default

    return {
        "id": row["id"],
        "incident_id": row["incident_id"],
        "case_id": _get("case_id"),
        "event_type": row["event_type"],
        "source": row["source"],
        "title": row["title"],
        "description": row["description"],
        "related_evidence_id": row["related_evidence_id"],
        "timestamp": row["timestamp"],
        "event_time_original": _get("event_time_original") or row["timestamp"],
        "event_time_utc": _get("event_time_utc"),
        "timezone_original": _get("timezone_original") or "unknown",
        "timezone_confidence": _get("timezone_confidence") or "unknown",
        "time_precision": _get("time_precision") or "exact",
        "time_end_original": _get("time_end_original"),
        "time_source": _get("time_source") or "manual_entry",
        "extraction_method": _get("extraction_method") or "user_input",
        "confidence_status": _get("confidence_status") or "unverified",
        "verification_status": _get("verification_status") or "user_asserted",
        "reviewed_by": _get("reviewed_by"),
        "reviewed_at": _get("reviewed_at"),
        "created_at": _get("created_at") or row["timestamp"],
        "updated_at": _get("updated_at") or row["timestamp"],
        "created_by": _get("created_by") or row["user_id"],
    }


def create_normalized_event(
    conn: sqlite3.Connection,
    incident_id: str,
    user_id: str,
    event_type: str,
    title: str,
    description: str,
    event_time_original: str,
    source: str = "user",
    case_id: Optional[str] = None,
    timezone_original: Optional[str] = None,
    time_precision: str = "exact",
    time_end_original: Optional[str] = None,
    time_source: str = "manual_entry",
    extraction_method: str = "user_input",
    confidence_status: str = "medium",
    verification_status: str = "user_asserted",
    related_evidence_id: Optional[str] = None,
    raw_excerpt: Optional[str] = None,
    created_by: Optional[str] = None,
) -> Dict[str, Any]:
    if time_precision not in VALID_TIME_PRECISIONS:
        raise ValueError(f"Invalid time_precision: {time_precision}")
    if time_source not in VALID_TIME_SOURCES:
        raise ValueError(f"Invalid time_source: {time_source}")
    if verification_status not in VALID_VERIFICATION_STATUSES:
        raise ValueError(f"Invalid verification_status: {verification_status}")

    utc_ts, tz_orig, tz_conf, resolved_precision = normalize_timestamp(
        event_time_original, timezone_original, time_precision
    )
    sort_timestamp = utc_ts or event_time_original
    now = _utc_now()
    tl_id = f"tl-{uuid.uuid4().hex[:10]}"

    conn.execute(
        """
        INSERT INTO timeline_events (
            id, incident_id, user_id, event_type, source, title, description,
            related_evidence_id, timestamp, case_id, event_time_original, event_time_utc,
            timezone_original, timezone_confidence, time_precision, time_end_original,
            time_source, extraction_method, confidence_status, verification_status,
            created_at, updated_at, created_by, is_deleted
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """,
        (
            tl_id,
            incident_id,
            user_id,
            event_type,
            source,
            title.strip(),
            description.strip(),
            related_evidence_id,
            sort_timestamp,
            case_id,
            event_time_original,
            utc_ts,
            tz_orig,
            tz_conf,
            resolved_precision,
            time_end_original,
            time_source,
            extraction_method,
            confidence_status,
            verification_status,
            now,
            now,
            created_by or user_id,
        ),
    )

    if related_evidence_id or raw_excerpt:
        src_id = f"tlsrc-{uuid.uuid4().hex[:10]}"
        conn.execute(
            """
            INSERT INTO timeline_event_sources (
                id, event_id, evidence_id, source_type, extraction_method, raw_excerpt, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (src_id, tl_id, related_evidence_id, time_source, extraction_method, raw_excerpt, now),
        )

    row = conn.execute("SELECT * FROM timeline_events WHERE id = ?", (tl_id,)).fetchone()
    return _serialize_timeline_event(row)


def update_timeline_event_with_revision(
    conn: sqlite3.Connection,
    event_id: str,
    user_id: str,
    editor_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    event_time_original: Optional[str] = None,
    timezone_original: Optional[str] = None,
    time_precision: Optional[str] = None,
    verification_status: Optional[str] = None,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    row = conn.execute(
        "SELECT * FROM timeline_events WHERE id = ? AND user_id = ? AND COALESCE(is_deleted, 0) = 0",
        (event_id, user_id),
    ).fetchone()
    if not row:
        raise PermissionError("Timeline event not found or unauthorized.")

    prev_data = _serialize_timeline_event(row)
    new_title = title.strip() if title is not None else prev_data["title"]
    new_desc = description.strip() if description is not None else prev_data["description"]
    new_orig = event_time_original if event_time_original is not None else prev_data["event_time_original"]
    new_tz = timezone_original if timezone_original is not None else prev_data["timezone_original"]
    new_prec = time_precision if time_precision is not None else prev_data["time_precision"]
    new_ver = verification_status if verification_status is not None else prev_data["verification_status"]

    if new_prec not in VALID_TIME_PRECISIONS:
        raise ValueError(f"Invalid time_precision: {new_prec}")
    if new_ver not in VALID_VERIFICATION_STATUSES:
        raise ValueError(f"Invalid verification_status: {new_ver}")

    utc_ts, tz_orig, tz_conf, resolved_prec = normalize_timestamp(new_orig, new_tz, new_prec)
    sort_ts = utc_ts or new_orig
    now = _utc_now()
    reviewed_by = editor_id if verification_status in {"human_verified", "disputed"} else prev_data["reviewed_by"]
    reviewed_at = now if verification_status in {"human_verified", "disputed"} else prev_data["reviewed_at"]

    conn.execute(
        """
        UPDATE timeline_events
        SET title = ?, description = ?, event_time_original = ?, event_time_utc = ?,
            timezone_original = ?, timezone_confidence = ?, time_precision = ?,
            timestamp = ?, verification_status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            new_title,
            new_desc,
            new_orig,
            utc_ts,
            tz_orig,
            tz_conf,
            resolved_prec,
            sort_ts,
            new_ver,
            reviewed_by,
            reviewed_at,
            now,
            event_id,
        ),
    )

    updated = conn.execute("SELECT * FROM timeline_events WHERE id = ?", (event_id,)).fetchone()
    new_data = _serialize_timeline_event(updated)
    rev_id = f"tlrev-{uuid.uuid4().hex[:10]}"
    conn.execute(
        """
        INSERT INTO timeline_event_revisions (
            id, event_id, editor_id, previous_json, new_json, reason, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (rev_id, event_id, editor_id, json.dumps(prev_data), json.dumps(new_data), reason, now),
    )
    return new_data


def extract_exif_creation_time(image_bytes: bytes) -> Optional[str]:
    """Safely extracts EXIF DateTimeOriginal (tag 36867) or DateTime (306) without altering evidence."""
    try:
        from PIL import Image
        with Image.open(io.BytesIO(image_bytes)) as img:
            exif = img.getexif()
            if not exif:
                return None
            raw = exif.get(36867) or exif.get(306)
            if not raw or not isinstance(raw, str):
                return None
            # Convert "YYYY:MM:DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS"
            parts = raw.strip().split(" ")
            if len(parts) == 2:
                date_part = parts[0].replace(":", "-")
                return f"{date_part}T{parts[1]}"
            return raw.strip()
    except Exception:
        return None


def reconstruct_incident_timeline(
    conn: sqlite3.Connection,
    incident_id: str,
    user_id: str,
) -> Dict[str, Any]:
    """
    Modularly extracts missing normalized timeline events from incident metadata,
    evidence uploads, media/threat/tampering analyses, and generates transparent
    correlation suggestions without duplicating existing events.
    """
    inc = conn.execute(
        "SELECT * FROM incidents WHERE id = ? AND user_id = ?",
        (incident_id, user_id),
    ).fetchone()
    if not inc:
        raise PermissionError("Incident not found or unauthorized.")

    case_row = conn.execute(
        "SELECT id FROM cases WHERE incident_id = ? AND user_id = ? LIMIT 1",
        (incident_id, user_id),
    ).fetchone()
    case_id = case_row["id"] if case_row else None

    existing = conn.execute(
        "SELECT event_type, time_source, related_evidence_id, event_time_original FROM timeline_events WHERE incident_id = ? AND user_id = ? AND COALESCE(is_deleted, 0) = 0",
        (incident_id, user_id),
    ).fetchall()
    existing_keys = {
        (r["event_type"], r["time_source"], r["related_evidence_id"]) for r in existing
    }

    created_count = 0

    # 1. Alleged incident occurrence from incident record
    if ("incident_reported", "alleged_occurrence", None) not in existing_keys:
        raw_dt = inc["incident_date"]
        prec = "date_only"
        if inc["incident_time"]:
            raw_dt = f"{inc['incident_date']}T{inc['incident_time']}"
            prec = "unknown_timezone"
        create_normalized_event(
            conn,
            incident_id=incident_id,
            user_id=user_id,
            case_id=case_id,
            event_type="incident_reported",
            source="user",
            title=f"Alleged Incident: {inc['title']}",
            description=inc["description"][:400],
            event_time_original=raw_dt,
            timezone_original="unknown",
            time_precision=prec,
            time_source="alleged_occurrence",
            extraction_method="incident_metadata",
            confidence_status="user_reported",
            verification_status="user_asserted",
            created_by=user_id,
        )
        created_count += 1

    # 2. Evidence upload events
    evi_rows = conn.execute(
        "SELECT * FROM evidence WHERE incident_id = ? AND user_id = ?",
        (incident_id, user_id),
    ).fetchall()
    for evi in evi_rows:
        if ("evidence_uploaded", "safeher_upload", evi["id"]) not in existing_keys:
            create_normalized_event(
                conn,
                incident_id=incident_id,
                user_id=user_id,
                case_id=case_id,
                event_type="evidence_uploaded",
                source="system",
                title=f"Evidence Uploaded: {evi['original_filename']}",
                description=f"SHA-256: {evi['sha256_hash']} ({evi['file_type']})",
                event_time_original=evi["upload_timestamp"],
                timezone_original="UTC",
                time_precision="exact",
                time_source="safeher_upload",
                extraction_method="upload_audit",
                confidence_status="verified_system",
                verification_status="human_verified",
                related_evidence_id=evi["id"],
                created_by="system",
            )
            created_count += 1

    # 3. Media analysis & C2PA events
    med_rows = conn.execute(
        """
        SELECT m.* FROM media_analyses m
        JOIN evidence e ON m.evidence_id = e.id
        WHERE e.incident_id = ? AND m.user_id = ?
        """,
        (incident_id, user_id),
    ).fetchall()
    for med in med_rows:
        if ("media_analysis", "analysis_performed", med["evidence_id"]) not in existing_keys:
            create_normalized_event(
                conn,
                incident_id=incident_id,
                user_id=user_id,
                case_id=case_id,
                event_type="media_analysis",
                source="system",
                title=f"Media Forensics: {med['model_name']} ({med['decision']})",
                description=f"Deepfake score: {med['deepfake_score']:.2f}; C2PA: {med['c2pa_provenance'][:160]}",
                event_time_original=med["created_at"],
                timezone_original="UTC",
                time_precision="exact",
                time_source="analysis_performed",
                extraction_method="ai_analysis",
                confidence_status="machine_output",
                verification_status="suggested",
                related_evidence_id=med["evidence_id"],
                created_by="system",
            )
            created_count += 1

    # 4. Threat analysis events
    thr_rows = conn.execute(
        "SELECT * FROM threat_analyses WHERE incident_id = ? AND user_id = ?",
        (incident_id, user_id),
    ).fetchall()
    for thr in thr_rows:
        if ("threat_analysis", "analysis_performed", None) not in existing_keys:
            create_normalized_event(
                conn,
                incident_id=incident_id,
                user_id=user_id,
                case_id=case_id,
                event_type="threat_analysis",
                source="system",
                title=f"Threat Analysis ({thr['urgency_level']}): {thr['decision']}",
                description=thr["explanation"][:400],
                event_time_original=thr["created_at"],
                timezone_original="UTC",
                time_precision="exact",
                time_source="analysis_performed",
                extraction_method="nlp_analysis",
                confidence_status="machine_output",
                verification_status="suggested",
                created_by="system",
            )
            created_count += 1

    # 5. Transparent correlation suggestions between events sharing the same evidence
    events = list_normalized_events(conn, incident_id=incident_id, user_id=user_id)
    by_evi: Dict[str, List[Dict[str, Any]]] = {}
    for ev in events:
        if ev.get("related_evidence_id"):
            by_evi.setdefault(ev["related_evidence_id"], []).append(ev)

    correlations_added = 0
    for evi_id, ev_list in by_evi.items():
        if len(ev_list) > 1:
            anchor = ev_list[0]
            for other in ev_list[1:]:
                dup = conn.execute(
                    """
                    SELECT id FROM timeline_event_relations
                    WHERE incident_id = ? AND source_event_id = ? AND target_event_id = ?
                    LIMIT 1
                    """,
                    (incident_id, anchor["id"], other["id"]),
                ).fetchone()
                if not dup:
                    rel_id = f"tlrel-{uuid.uuid4().hex[:10]}"
                    conn.execute(
                        """
                        INSERT INTO timeline_event_relations (
                            id, incident_id, owner_id, source_event_id, target_event_id,
                            relation_type, correlation_rule, reason, supporting_evidence_id,
                            confidence, verification_status, created_at
                        )
                        VALUES (?, ?, ?, ?, ?, 'SHARED_EVIDENCE_SOURCE', 'same_evidence_id', ?, ?, 0.9, 'suggested', ?)
                        """,
                        (
                            rel_id,
                            incident_id,
                            user_id,
                            anchor["id"],
                            other["id"],
                            f"Both events reference the same preserved evidence item ({evi_id}).",
                            evi_id,
                            _utc_now(),
                        ),
                    )
                    correlations_added += 1

    return {
        "incident_id": incident_id,
        "events_created": created_count,
        "correlations_suggested": correlations_added,
        "events": list_normalized_events(conn, incident_id=incident_id, user_id=user_id),
    }


def list_normalized_events(
    conn: sqlite3.Connection,
    incident_id: str,
    user_id: str,
    event_type: Optional[str] = None,
    time_source: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    sql = """
        SELECT * FROM timeline_events
        WHERE incident_id = ? AND user_id = ? AND COALESCE(is_deleted, 0) = 0
    """
    params: List[Any] = [incident_id, user_id]
    if event_type:
        sql += " AND event_type = ?"
        params.append(event_type)
    if time_source:
        sql += " AND time_source = ?"
        params.append(time_source)
    if search:
        sql += " AND (title LIKE ? OR description LIKE ?)"
        q = f"%{search.strip()}%"
        params.extend([q, q])
    if start_date:
        sql += " AND timestamp >= ?"
        params.append(start_date)
    if end_date:
        sql += " AND timestamp <= ?"
        params.append(end_date)

    sql += " ORDER BY timestamp ASC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    rows = conn.execute(sql, tuple(params)).fetchall()
    return [_serialize_timeline_event(r) for r in rows]


def get_event_detail_and_revisions(
    conn: sqlite3.Connection,
    event_id: str,
    user_id: str,
) -> Dict[str, Any]:
    row = conn.execute(
        "SELECT * FROM timeline_events WHERE id = ? AND user_id = ? AND COALESCE(is_deleted, 0) = 0",
        (event_id, user_id),
    ).fetchone()
    if not row:
        raise PermissionError("Timeline event not found or unauthorized.")

    sources = conn.execute(
        "SELECT * FROM timeline_event_sources WHERE event_id = ? ORDER BY created_at ASC",
        (event_id,),
    ).fetchall()
    revisions = conn.execute(
        "SELECT * FROM timeline_event_revisions WHERE event_id = ? ORDER BY created_at DESC",
        (event_id,),
    ).fetchall()
    relations = conn.execute(
        """
        SELECT * FROM timeline_event_relations
        WHERE owner_id = ? AND (source_event_id = ? OR target_event_id = ?)
        ORDER BY created_at DESC
        """,
        (user_id, event_id, event_id),
    ).fetchall()

    return {
        "event": _serialize_timeline_event(row),
        "sources": [dict(s) for s in sources],
        "revisions": [dict(r) for r in revisions],
        "relations": [dict(rel) for rel in relations],
    }
