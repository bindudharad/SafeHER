"""
SafeHER Advanced Digital Case Management & Custody Service (Stage 5)
====================================================================
DEMS-inspired case lifecycle, deny-by-default RBAC collaborator assignments,
evidence reference linking, investigation notes, tamper-evident hash-chained
custody verification, and source-linked Forensic Investigation Summary.

Design guarantees:
1. Deny-by-default access: only the case owner or an active assigned
   collaborator can access a case or its linked resources.
2. Administrators do NOT get automatic access to private survivor evidence.
3. Validated case lifecycle state transitions with full actor + reason audit trail.
4. Chain-of-custody hash-chain verification detects tampering or deletion.
5. Investigation summaries link every finding to its source evidence ID and
   clearly distinguish machine-generated signals from human-confirmed facts.
   Never claims court-admissibility or makes legal conclusions.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

VALID_CASE_STATUSES = {
    "draft",
    "open",
    "under_review",
    "evidence_collection",
    "ready_for_submission",
    "submitted",
    "submitted_by_user",
    "awaiting_response",
    "follow_up_required",
    "resolved",
    "closed",
    "archived",
    "prepared",
}

VALID_CASE_TRANSITIONS: Dict[str, Set[str]] = {
    "draft": {"open", "evidence_collection", "under_review", "ready_for_submission", "prepared", "archived"},
    "open": {"evidence_collection", "under_review", "ready_for_submission", "resolved", "closed", "archived"},
    "evidence_collection": {"under_review", "ready_for_submission", "open", "closed", "archived"},
    "under_review": {"evidence_collection", "ready_for_submission", "follow_up_required", "resolved", "closed", "archived"},
    "prepared": {"ready_for_submission", "submitted_by_user", "submitted", "closed"},
    "ready_for_submission": {"submitted", "submitted_by_user", "under_review", "closed", "archived"},
    "submitted": {"awaiting_response", "follow_up_required", "under_review", "resolved", "closed"},
    "submitted_by_user": {"awaiting_response", "follow_up_required", "under_review", "resolved", "closed"},
    "awaiting_response": {"follow_up_required", "under_review", "resolved", "closed"},
    "follow_up_required": {"under_review", "ready_for_submission", "submitted", "resolved", "closed"},
    "resolved": {"closed", "archived", "under_review"},
    "closed": {"archived", "under_review"},
    "archived": {"under_review"},
}

VALID_COLLABORATOR_ROLES = {"collaborator", "investigator", "legal_adviser"}
VALID_NOTE_TYPES = {"investigation", "evidence", "review", "finding"}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def check_case_access(
    conn: sqlite3.Connection,
    case_id: str,
    user_id: str,
    require_owner: bool = False,
) -> Tuple[sqlite3.Row, str]:
    """
    Deny-by-default case authorization.
    Returns (case_row, effective_role) where effective_role is 'owner' or assignment role.
    Raises PermissionError if unauthorized or not found.
    """
    case_row = conn.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
    if not case_row:
        raise PermissionError("Case not found or access denied.")

    if str(case_row["user_id"]) == str(user_id):
        return case_row, "owner"

    if require_owner:
        raise PermissionError("Only the case owner may perform this action.")

    assign = conn.execute(
        """
        SELECT role FROM case_assignments
        WHERE case_id = ? AND user_id = ? AND status = 'active'
        LIMIT 1
        """,
        (case_id, user_id),
    ).fetchone()
    if not assign:
        raise PermissionError("Access denied: you are not assigned to this case.")
    return case_row, assign["role"]


def log_case_activity(
    conn: sqlite3.Connection,
    case_id: str,
    actor_id: str,
    action: str,
    from_status: Optional[str] = None,
    to_status: Optional[str] = None,
    reason: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    act_id = f"cact-{uuid.uuid4().hex[:10]}"
    now = _utc_now()
    conn.execute(
        """
        INSERT INTO case_activity (
            id, case_id, actor_id, action, from_status, to_status, reason, details_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (act_id, case_id, actor_id, action, from_status, to_status, reason, json.dumps(details or {}), now),
    )
    return {
        "id": act_id,
        "case_id": case_id,
        "actor_id": actor_id,
        "action": action,
        "from_status": from_status,
        "to_status": to_status,
        "reason": reason,
        "details": details or {},
        "created_at": now,
    }


def transition_case_status(
    conn: sqlite3.Connection,
    case_id: str,
    actor_id: str,
    new_status: str,
    reason: Optional[str] = None,
    notes: Optional[str] = None,
) -> sqlite3.Row:
    if new_status not in VALID_CASE_STATUSES:
        raise ValueError(f"Unsupported case status: {new_status}")

    case_row, role = check_case_access(conn, case_id, actor_id)
    if role == "legal_adviser":
        raise PermissionError("Legal advisers have read/review access and cannot transition case status.")

    current_status = case_row["status"]
    if new_status != current_status:
        allowed = VALID_CASE_TRANSITIONS.get(current_status, set())
        if new_status not in allowed:
            raise ValueError(
                f"Invalid case transition from '{current_status}' to '{new_status}'. "
                f"Allowed: {sorted(allowed)}"
            )

    now = _utc_now()
    updated_notes = notes if notes is not None else case_row["notes"]
    conn.execute(
        "UPDATE cases SET status = ?, notes = ?, updated_by = ?, updated_at = ? WHERE id = ?",
        (new_status, updated_notes, actor_id, now, case_id),
    )
    log_case_activity(
        conn,
        case_id=case_id,
        actor_id=actor_id,
        action="status_transition",
        from_status=current_status,
        to_status=new_status,
        reason=reason or "User updated case status",
    )
    return conn.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()


def link_evidence_to_case(
    conn: sqlite3.Connection,
    case_id: str,
    evidence_id: str,
    actor_id: str,
    link_reason: Optional[str] = None,
) -> Dict[str, Any]:
    case_row, _ = check_case_access(conn, case_id, actor_id, require_owner=True)
    evi = conn.execute(
        "SELECT id, user_id FROM evidence WHERE id = ? AND user_id = ?",
        (evidence_id, case_row["user_id"]),
    ).fetchone()
    if not evi:
        raise PermissionError("Evidence not found or does not belong to the case owner.")

    dup = conn.execute(
        "SELECT * FROM case_evidence_links WHERE case_id = ? AND evidence_id = ?",
        (case_id, evidence_id),
    ).fetchone()
    if dup:
        return dict(dup)

    link_id = f"clink-{uuid.uuid4().hex[:10]}"
    now = _utc_now()
    conn.execute(
        """
        INSERT INTO case_evidence_links (id, case_id, evidence_id, linked_by, link_reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (link_id, case_id, evidence_id, actor_id, link_reason, now),
    )
    log_case_activity(
        conn,
        case_id=case_id,
        actor_id=actor_id,
        action="evidence_linked",
        reason=link_reason,
        details={"evidence_id": evidence_id},
    )
    return {
        "id": link_id,
        "case_id": case_id,
        "evidence_id": evidence_id,
        "linked_by": actor_id,
        "link_reason": link_reason,
        "created_at": now,
    }


def assign_collaborator(
    conn: sqlite3.Connection,
    case_id: str,
    owner_id: str,
    target_user_email: str,
    role: str,
) -> Dict[str, Any]:
    if role not in VALID_COLLABORATOR_ROLES:
        raise ValueError(f"Invalid collaborator role: {role}")

    check_case_access(conn, case_id, owner_id, require_owner=True)
    target = conn.execute(
        "SELECT id, name, email FROM users WHERE LOWER(email) = LOWER(?)",
        (target_user_email.strip(),),
    ).fetchone()
    if not target:
        raise ValueError("Target collaborator user account not found.")
    if str(target["id"]) == str(owner_id):
        raise ValueError("Case owner cannot be added as a collaborator.")

    now = _utc_now()
    existing = conn.execute(
        "SELECT * FROM case_assignments WHERE case_id = ? AND user_id = ? AND status = 'active'",
        (case_id, target["id"]),
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE case_assignments SET role = ?, assigned_by = ?, assigned_at = ? WHERE id = ?",
            (role, owner_id, now, existing["id"]),
        )
        assign_id = existing["id"]
    else:
        assign_id = f"cassign-{uuid.uuid4().hex[:10]}"
        conn.execute(
            """
            INSERT INTO case_assignments (id, case_id, user_id, role, assigned_by, status, assigned_at)
            VALUES (?, ?, ?, ?, ?, 'active', ?)
            """,
            (assign_id, case_id, target["id"], role, owner_id, now),
        )

    log_case_activity(
        conn,
        case_id=case_id,
        actor_id=owner_id,
        action="collaborator_assigned",
        details={"collaborator_id": target["id"], "role": role},
    )
    return {
        "id": assign_id,
        "case_id": case_id,
        "user_id": target["id"],
        "user_name": target["name"],
        "user_email": target["email"],
        "role": role,
        "status": "active",
        "assigned_at": now,
    }


def revoke_collaborator(
    conn: sqlite3.Connection,
    case_id: str,
    owner_id: str,
    target_user_id: str,
    revoke_reason: Optional[str] = None,
) -> bool:
    check_case_access(conn, case_id, owner_id, require_owner=True)
    now = _utc_now()
    cur = conn.execute(
        """
        UPDATE case_assignments
        SET status = 'revoked', revoked_at = ?, revoke_reason = ?
        WHERE case_id = ? AND user_id = ? AND status = 'active'
        """,
        (now, revoke_reason, case_id, target_user_id),
    )
    if cur.rowcount > 0:
        log_case_activity(
            conn,
            case_id=case_id,
            actor_id=owner_id,
            action="collaborator_revoked",
            reason=revoke_reason,
            details={"collaborator_id": target_user_id},
        )
        return True
    return False


def add_case_note(
    conn: sqlite3.Connection,
    case_id: str,
    author_id: str,
    content: str,
    note_type: str = "investigation",
    evidence_id: Optional[str] = None,
) -> Dict[str, Any]:
    if note_type not in VALID_NOTE_TYPES:
        raise ValueError(f"Invalid note_type: {note_type}")
    case_row, _ = check_case_access(conn, case_id, author_id)
    if evidence_id:
        evi = conn.execute(
            "SELECT id FROM evidence WHERE id = ? AND user_id = ?",
            (evidence_id, case_row["user_id"]),
        ).fetchone()
        if not evi:
            raise PermissionError("Referenced evidence not found for this case.")

    note_id = f"cnote-{uuid.uuid4().hex[:10]}"
    now = _utc_now()
    conn.execute(
        """
        INSERT INTO case_notes (
            id, case_id, evidence_id, author_id, note_type, content,
            is_system_generated, revision_number, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)
        """,
        (note_id, case_id, evidence_id, author_id, note_type, content.strip(), now, now),
    )
    log_case_activity(
        conn,
        case_id=case_id,
        actor_id=author_id,
        action="note_added",
        details={"note_id": note_id, "note_type": note_type, "evidence_id": evidence_id},
    )
    return {
        "id": note_id,
        "case_id": case_id,
        "evidence_id": evidence_id,
        "author_id": author_id,
        "note_type": note_type,
        "content": content.strip(),
        "is_system_generated": False,
        "revision_number": 1,
        "created_at": now,
        "updated_at": now,
    }


def record_custody_event_chained(
    conn: sqlite3.Connection,
    evidence_id: str,
    actor_id: str,
    action: str,
    details: str,
    case_id: Optional[str] = None,
    prev_custody_holder: Optional[str] = None,
    new_custody_holder: Optional[str] = None,
    purpose: Optional[str] = None,
    transfer_reason: Optional[str] = None,
    integrity_hash: Optional[str] = None,
    verification_result: Optional[str] = None,
) -> Dict[str, Any]:
    """Appends a hash-chained custody event for tamper-evident auditability."""
    last = conn.execute(
        "SELECT record_hash FROM custody_records WHERE evidence_id = ? ORDER BY timestamp DESC, rowid DESC LIMIT 1",
        (evidence_id,),
    ).fetchone()
    prev_hash = (last["record_hash"] if last and last["record_hash"] else "GENESIS")
    now = _utc_now()
    rec_id = f"cust-{uuid.uuid4().hex[:10]}"
    payload_str = f"{prev_hash}|{evidence_id}|{actor_id}|{action}|{now}|{details}|{integrity_hash or ''}"
    rec_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

    conn.execute(
        """
        INSERT INTO custody_records (
            id, evidence_id, user_id, action, details, timestamp,
            prev_record_hash, record_hash, case_id, prev_custody_holder,
            new_custody_holder, purpose, transfer_reason, integrity_hash, verification_result
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            rec_id,
            evidence_id,
            actor_id,
            action,
            details,
            now,
            prev_hash,
            rec_hash,
            case_id,
            prev_custody_holder,
            new_custody_holder,
            purpose,
            transfer_reason,
            integrity_hash,
            verification_result,
        ),
    )
    return {
        "id": rec_id,
        "evidence_id": evidence_id,
        "actor_id": actor_id,
        "action": action,
        "details": details,
        "timestamp": now,
        "prev_record_hash": prev_hash,
        "record_hash": rec_hash,
        "case_id": case_id,
        "purpose": purpose,
        "transfer_reason": transfer_reason,
        "integrity_hash": integrity_hash,
        "verification_result": verification_result,
    }


def verify_custody_chain(conn: sqlite3.Connection, evidence_id: str, owner_id: str) -> Dict[str, Any]:
    """Verifies the integrity of the hash-chained custody log for an authorized evidence item."""
    evi = conn.execute(
        "SELECT id, user_id, sha256_hash FROM evidence WHERE id = ? AND user_id = ?",
        (evidence_id, owner_id),
    ).fetchone()
    if not evi:
        raise PermissionError("Evidence not found or unauthorized.")

    rows = conn.execute(
        "SELECT * FROM custody_records WHERE evidence_id = ? ORDER BY timestamp ASC, rowid ASC",
        (evidence_id,),
    ).fetchall()

    chain_valid = True
    broken_links: List[str] = []
    expected_prev = "GENESIS"
    hashed_count = 0

    for idx, r in enumerate(rows):
        if r["record_hash"]:
            hashed_count += 1
            if idx > 0 and r["prev_record_hash"] and r["prev_record_hash"] != expected_prev:
                # Only flag if previous record also had a hash
                if rows[idx - 1]["record_hash"]:
                    chain_valid = False
                    broken_links.append(r["id"])
            expected_prev = r["record_hash"]

    return {
        "evidence_id": evidence_id,
        "total_records": len(rows),
        "hashed_records": hashed_count,
        "chain_valid": chain_valid,
        "broken_links": broken_links,
        "records": [dict(r) for r in rows],
    }


def generate_investigation_summary(
    conn: sqlite3.Connection,
    case_id: str,
    actor_id: str,
) -> Dict[str, Any]:
    """
    Generates a structured, source-linked Forensic Investigation Summary.
    Distinguishes machine-generated findings from human-confirmed facts and
    explicitly avoids legal conclusions or claims of automatic court admissibility.
    """
    case_row, role = check_case_access(conn, case_id, actor_id)
    owner_id = case_row["user_id"]
    incident_id = case_row["incident_id"]

    inc = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    evi_rows = conn.execute(
        "SELECT * FROM evidence WHERE incident_id = ? AND user_id = ?",
        (incident_id, owner_id),
    ).fetchall()
    linked_rows = conn.execute(
        """
        SELECT e.* FROM evidence e
        JOIN case_evidence_links l ON l.evidence_id = e.id
        WHERE l.case_id = ?
        """,
        (case_id,),
    ).fetchall()
    seen_evi: Dict[str, sqlite3.Row] = {r["id"]: r for r in evi_rows}
    for r in linked_rows:
        seen_evi[r["id"]] = r

    evidence_inventory = [
        {
            "evidence_id": r["id"],
            "filename": r["original_filename"],
            "file_type": r["file_type"],
            "sha256_hash": r["sha256_hash"],
            "upload_timestamp": r["upload_timestamp"],
            "storage_status": r["storage_status"],
        }
        for r in seen_evi.values()
    ]

    tl_rows = conn.execute(
        "SELECT * FROM timeline_events WHERE incident_id = ? AND user_id = ? AND COALESCE(is_deleted, 0) = 0 ORDER BY timestamp ASC",
        (incident_id, owner_id),
    ).fetchall()
    edges = conn.execute(
        "SELECT * FROM evidence_graph_edges WHERE incident_id = ? AND owner_id = ?",
        (incident_id, owner_id),
    ).fetchall()

    confirmed_relationships = [dict(e) for e in edges if e["verification_status"] in {"user_asserted", "human_verified"}]
    suggested_relationships = [dict(e) for e in edges if e["verification_status"] == "suggested"]
    disputed_relationships = [dict(e) for e in edges if e["verification_status"] == "disputed"]

    media_results = []
    tampering_results = []
    for eid in seen_evi:
        m = conn.execute(
            "SELECT * FROM media_analyses WHERE evidence_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1",
            (eid, owner_id),
        ).fetchone()
        if m:
            media_results.append({
                "analysis_id": m["id"],
                "evidence_id": eid,
                "model_name": m["model_name"],
                "model_version": m["model_version"],
                "deepfake_score": m["deepfake_score"],
                "decision": m["decision"],
                "c2pa_provenance": m["c2pa_provenance"],
                "created_at": m["created_at"],
                "human_review_status": "unreviewed",
            })
        t = conn.execute(
            "SELECT * FROM tampering_analyses WHERE evidence_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1",
            (eid, owner_id),
        ).fetchone()
        if t:
            tampering_results.append({
                "analysis_id": t["id"],
                "evidence_id": eid,
                "model_id": t["model_id"],
                "model_version": t["model_version"],
                "checkpoint_id": t["checkpoint_id"],
                "analysis_status": t["analysis_status"],
                "tampering_score": t["tampering_score"],
                "localization_available": bool(t["localization_available"]),
                "warnings": json.loads(t["warnings_json"] or "[]"),
                "human_review_status": t["review_status"],
                "created_at": t["created_at"],
            })

    thr_rows = conn.execute(
        "SELECT * FROM threat_analyses WHERE incident_id = ? AND user_id = ? ORDER BY created_at DESC",
        (incident_id, owner_id),
    ).fetchall()
    threat_results = [
        {
            "analysis_id": r["id"],
            "incident_id": r["incident_id"],
            "urgency_level": r["urgency_level"],
            "decision": r["decision"],
            "threat_score": r["threat_score"],
            "blackmail_score": r["blackmail_score"],
            "extortion_score": r["extortion_score"],
            "created_at": r["created_at"],
        }
        for r in thr_rows
    ]

    notes = conn.execute(
        "SELECT * FROM case_notes WHERE case_id = ? ORDER BY created_at ASC",
        (case_id,),
    ).fetchall()

    missing_evidence_notes = []
    if not evidence_inventory:
        missing_evidence_notes.append("No preserved evidence files are linked to this case yet.")
    if not tampering_results and any("image" in (e["file_type"] or "").lower() for e in evidence_inventory):
        missing_evidence_notes.append("Image tampering localization has not been run on attached image evidence.")

    return {
        "report_id": f"rep-{uuid.uuid4().hex[:10]}",
        "generated_at": _utc_now(),
        "case_id": case_id,
        "case_status": case_row["status"],
        "viewer_role": role,
        "disclaimer": (
            "This structured investigation summary organizes preserved evidence and analytical signals. "
            "Machine-generated scores are investigative indicators, not standalone proof or legal conclusions, "
            "and this report is not automatically court-admissible."
        ),
        "incident_overview": {
            "incident_id": incident_id,
            "title": inc["title"] if inc else "Unknown",
            "category": inc["category"] if inc else "other",
            "platform": inc["platform"] if inc else "unknown",
            "incident_date": inc["incident_date"] if inc else None,
            "description": inc["description"] if inc else "",
        },
        "evidence_references": evidence_inventory,
        "timeline": [
            {
                "event_id": t["id"],
                "title": t["title"],
                "event_type": t["event_type"],
                "timestamp": t["timestamp"],
                "related_evidence_id": t["related_evidence_id"],
                "verification_status": t["verification_status"] if "verification_status" in t.keys() else "user_asserted",
            }
            for t in tl_rows
        ],
        "confirmed_relationships": confirmed_relationships,
        "suggested_relationships": suggested_relationships,
        "unresolved_contradictions": disputed_relationships,
        "tampering_analysis_results": tampering_results,
        "media_and_deepfake_results": media_results,
        "threat_analysis_results": threat_results,
        "missing_evidence": missing_evidence_notes,
        "human_review_notes": [dict(n) for n in notes],
    }
