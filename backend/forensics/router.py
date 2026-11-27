"""
SafeHER Stage 5 FastAPI Router
==============================
Authenticated, authorized, and audited API endpoints for:
- Evidence Intelligence Graph
- Normalized Incident Timeline
- Image Tampering Detection & Localization
- Advanced Case Management, Custody Verification & Investigation Summary
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from auth import get_current_user
from db import get_db, get_storage_dir
from ai.inference_queue import submit_analysis_job
from ai.tampering_localization import analyze_image_tampering
from forensics.metadata_service import analyze_evidence_metadata
from security.evidence_storage import encrypt_and_store_evidence, retrieve_and_decrypt_evidence
from schemas import (
    CaseAssignCollaboratorRequest,
    CaseCreateRequest,
    CaseEvidenceLinkRequest,
    CaseNoteCreateRequest,
    CaseUpdateRequest,
    CustodyTransferRequest,
    GraphEdgeCreateRequest,
    GraphEdgeReviewRequest,
    GraphNodeCreateRequest,
    TamperingAnalysisRequest,
    TamperingReviewRequest,
    TimelineEventNormalizedCreateRequest,
    TimelineEventUpdateRequest,
)
from forensics.graph_service import (
    build_and_suggest_graph_for_incident,
    create_edge,
    delete_user_edge,
    ensure_node,
    get_graph_for_incident,
    get_graph_neighborhood,
    review_edge,
)
from forensics.timeline_service import (
    create_normalized_event,
    get_event_detail_and_revisions,
    list_normalized_events,
    reconstruct_incident_timeline,
    update_timeline_event_with_revision,
)
from forensics.case_service import (
    add_case_note,
    assign_collaborator,
    check_case_access,
    generate_investigation_summary,
    link_evidence_to_case,
    log_case_activity,
    record_custody_event_chained,
    revoke_collaborator,
    transition_case_status,
    verify_custody_chain,
)

router = APIRouter(prefix="/api/v1", tags=["Stage 5 Forensics"])


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ==========================================================
# 1. EVIDENCE INTELLIGENCE GRAPH
# ==========================================================
@router.post("/graph/incidents/{incident_id}/sync")
def sync_incident_graph(
    incident_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return build_and_suggest_graph_for_incident(conn, incident_id=incident_id, owner_id=current_user["id"])
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/graph/incidents/{incident_id}")
def get_incident_graph(
    incident_id: str,
    relationship_type: Optional[str] = Query(default=None),
    verification_status: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        inc = conn.execute(
            "SELECT id FROM incidents WHERE id = ? AND user_id = ?",
            (incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        return get_graph_for_incident(
            conn,
            owner_id=current_user["id"],
            incident_id=incident_id,
            relationship_type=relationship_type,
            verification_status=verification_status,
            limit=limit,
            offset=offset,
        )


@router.get("/graph/nodes/{node_id}/neighborhood")
def get_node_neighborhood(
    node_id: str,
    depth: int = Query(default=1, ge=1, le=3),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return get_graph_neighborhood(conn, owner_id=current_user["id"], node_id=node_id, depth=depth)
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/graph/nodes", status_code=status.HTTP_201_CREATED)
def create_graph_node(
    payload: GraphNodeCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        inc = conn.execute(
            "SELECT id FROM incidents WHERE id = ? AND user_id = ?",
            (payload.incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        try:
            return ensure_node(
                conn,
                owner_id=current_user["id"],
                incident_id=payload.incident_id,
                case_id=payload.case_id,
                node_type=payload.node_type,
                label=payload.label,
                entity_ref_id=payload.entity_ref_id,
                metadata=payload.metadata,
                created_by=current_user["id"],
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc))


@router.post("/graph/edges", status_code=status.HTTP_201_CREATED)
def create_graph_edge(
    payload: GraphEdgeCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return create_edge(
                conn,
                owner_id=current_user["id"],
                incident_id=payload.incident_id,
                case_id=payload.case_id,
                source_node_id=payload.source_node_id,
                target_node_id=payload.target_node_id,
                relationship_type=payload.relationship_type,
                extraction_method="user_asserted",
                source_evidence_id=payload.source_evidence_id,
                supporting_ref=payload.supporting_ref,
                confidence_score=1.0,
                confidence_note=payload.confidence_note or "Directly asserted by user",
                verification_status="user_asserted",
                created_by=current_user["id"],
            )
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc))


@router.post("/graph/edges/{edge_id}/review")
def review_graph_edge(
    edge_id: str,
    payload: GraphEdgeReviewRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return review_edge(
                conn,
                edge_id=edge_id,
                owner_id=current_user["id"],
                reviewer_id=current_user["id"],
                new_status=payload.status,
                review_note=payload.review_note,
            )
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc))


@router.delete("/graph/edges/{edge_id}")
def remove_graph_edge(
    edge_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            deleted = delete_user_edge(conn, edge_id=edge_id, owner_id=current_user["id"])
            if not deleted:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Graph edge not found")
            return {"deleted": True, "edge_id": edge_id}
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


# ==========================================================
# 2. NORMALIZED INCIDENT TIMELINE
# ==========================================================
@router.post("/incidents/{incident_id}/timeline/reconstruct")
def reconstruct_timeline(
    incident_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return reconstruct_incident_timeline(conn, incident_id=incident_id, user_id=current_user["id"])
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/incidents/{incident_id}/timeline/normalized")
def get_normalized_timeline(
    incident_id: str,
    event_type: Optional[str] = Query(default=None),
    time_source: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        inc = conn.execute(
            "SELECT id FROM incidents WHERE id = ? AND user_id = ?",
            (incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        return list_normalized_events(
            conn,
            incident_id=incident_id,
            user_id=current_user["id"],
            event_type=event_type,
            time_source=time_source,
            search=search,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset,
        )


@router.post("/incidents/{incident_id}/timeline/normalized", status_code=status.HTTP_201_CREATED)
def add_normalized_timeline_event(
    incident_id: str,
    payload: TimelineEventNormalizedCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        inc = conn.execute(
            "SELECT id FROM incidents WHERE id = ? AND user_id = ?",
            (incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        if payload.related_evidence_id:
            evi = conn.execute(
                "SELECT id FROM evidence WHERE id = ? AND user_id = ?",
                (payload.related_evidence_id, current_user["id"]),
            ).fetchone()
            if not evi:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referenced evidence not found")
        return create_normalized_event(
            conn,
            incident_id=incident_id,
            user_id=current_user["id"],
            event_type=payload.event_type,
            source=payload.source,
            title=payload.title,
            description=payload.description,
            event_time_original=payload.event_time_original or _utc_now(),
            timezone_original=payload.timezone_original,
            time_precision=payload.time_precision,
            time_end_original=payload.time_end_original,
            time_source=payload.time_source,
            extraction_method="user_input",
            confidence_status="user_reported",
            verification_status="user_asserted",
            related_evidence_id=payload.related_evidence_id,
            raw_excerpt=payload.raw_excerpt,
            created_by=current_user["id"],
        )


@router.get("/timeline/{event_id}")
def get_timeline_event_detail(
    event_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return get_event_detail_and_revisions(conn, event_id=event_id, user_id=current_user["id"])
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/timeline/{event_id}")
def update_timeline_event(
    event_id: str,
    payload: TimelineEventUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return update_timeline_event_with_revision(
                conn,
                event_id=event_id,
                user_id=current_user["id"],
                editor_id=current_user["id"],
                title=payload.title,
                description=payload.description,
                event_time_original=payload.event_time_original,
                timezone_original=payload.timezone_original,
                time_precision=payload.time_precision,
                verification_status=payload.verification_status,
                reason=payload.reason,
            )
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc))


@router.get("/incidents/{incident_id}/timeline/export")
def export_incident_timeline(
    incident_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        inc = conn.execute(
            "SELECT * FROM incidents WHERE id = ? AND user_id = ?",
            (incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        events = list_normalized_events(conn, incident_id=incident_id, user_id=current_user["id"], limit=500)
        relations = conn.execute(
            "SELECT * FROM timeline_event_relations WHERE incident_id = ? AND owner_id = ?",
            (incident_id, current_user["id"]),
        ).fetchall()
        return {
            "exported_at": _utc_now(),
            "incident_id": incident_id,
            "incident_title": inc["title"],
            "event_count": len(events),
            "events": events,
            "correlations": [dict(r) for r in relations],
        }


# ==========================================================
# 3. IMAGE TAMPERING DETECTION & LOCALIZATION
# ==========================================================
@router.post("/tampering/{evidence_id}/analyze", status_code=status.HTTP_201_CREATED)
def run_tampering_localization(
    evidence_id: str,
    payload: Optional[TamperingAnalysisRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    req = payload or TamperingAnalysisRequest()
    with get_db() as conn:
        evi = conn.execute(
            "SELECT * FROM evidence WHERE id = ? AND user_id = ?",
            (evidence_id, current_user["id"]),
        ).fetchone()
        if not evi:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    if req.async_job:
        job = submit_analysis_job(
            evidence_id=evidence_id,
            owner_id=current_user["id"],
            model_type="tampering_localization",
        )
        return {"mode": "async", "job": job}

    evi_keys = evi.keys() if hasattr(evi, "keys") else []
    try:
        plaintext = retrieve_and_decrypt_evidence(
            evidence_id=evidence_id,
            user_id=current_user["id"],
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
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Evidence decryption failed: {exc}")

    res = analyze_image_tampering(plaintext, preferred_model=req.preferred_model)
    del plaintext

    analysis_id = f"tamp-{uuid.uuid4().hex[:10]}"
    now = _utc_now()
    heatmap_artifact_id: Optional[str] = None
    mask_artifact_id: Optional[str] = None

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO tampering_analyses (
                id, evidence_id, user_id, model_id, model_version, checkpoint_id,
                analysis_status, tampering_score, localization_available,
                heatmap_artifact_id, mask_artifact_id, input_width, input_height,
                original_width, original_height, coordinate_transform_json,
                processing_time_ms, device, warnings_json, limitations_json,
                review_status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unreviewed', ?)
            """,
            (
                analysis_id,
                evidence_id,
                current_user["id"],
                res["model_id"],
                res["model_version"],
                res.get("checkpoint_id"),
                res["analysis_status"],
                res.get("tampering_score"),
                1 if res["localization_available"] else 0,
                res.get("input_width"),
                res.get("input_height"),
                res.get("original_width"),
                res.get("original_height"),
                json.dumps(res.get("coordinate_transform", {})),
                res.get("processing_time_ms", 0.0),
                res.get("device", "cpu"),
                json.dumps(res.get("warnings", [])),
                json.dumps(res.get("limitations", [])),
                now,
            ),
        )

        storage_dir = get_storage_dir()
        for art_type, raw_bytes in [
            ("heatmap", res.get("heatmap_png_bytes")),
            ("mask", res.get("mask_png_bytes")),
        ]:
            if raw_bytes:
                art_id = f"tart-{uuid.uuid4().hex[:10]}"
                enc = encrypt_and_store_evidence(
                    content=raw_bytes,
                    evidence_id=art_id,
                    user_id=current_user["id"],
                    storage_dir=storage_dir,
                    original_filename=f"{analysis_id}_{art_type}.png",
                )
                conn.execute(
                    """
                    INSERT INTO tampering_artifacts (
                        id, analysis_id, evidence_id, user_id, artifact_type,
                        stored_filename, sha256_hash, encryption_version, data_nonce,
                        wrapped_dek, wrapping_nonce, key_id, key_version, width, height, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        art_id,
                        analysis_id,
                        evidence_id,
                        current_user["id"],
                        art_type,
                        enc.stored_filename,
                        enc.sha256_hash,
                        enc.encryption_version,
                        enc.data_nonce_hex,
                        enc.wrapped_dek_hex,
                        enc.wrapping_nonce_hex,
                        enc.key_id,
                        enc.key_version,
                        res.get("original_width"),
                        res.get("original_height"),
                        now,
                    ),
                )
                if art_type == "heatmap":
                    heatmap_artifact_id = art_id
                else:
                    mask_artifact_id = art_id

        if heatmap_artifact_id or mask_artifact_id:
            conn.execute(
                "UPDATE tampering_analyses SET heatmap_artifact_id = ?, mask_artifact_id = ? WHERE id = ?",
                (heatmap_artifact_id, mask_artifact_id, analysis_id),
            )

    return {
        "id": analysis_id,
        "evidence_id": evidence_id,
        "model_id": res["model_id"],
        "model_version": res["model_version"],
        "checkpoint_id": res.get("checkpoint_id"),
        "analysis_status": res["analysis_status"],
        "tampering_score": res.get("tampering_score"),
        "localization_available": res["localization_available"],
        "heatmap_reference": f"/api/v1/tampering/artifacts/{heatmap_artifact_id}" if heatmap_artifact_id else None,
        "mask_reference": f"/api/v1/tampering/artifacts/{mask_artifact_id}" if mask_artifact_id else None,
        "original_dimensions": [res.get("original_width"), res.get("original_height")],
        "input_dimensions": [res.get("input_width"), res.get("input_height")],
        "coordinate_transform": res.get("coordinate_transform", {}),
        "processing_time_ms": res.get("processing_time_ms", 0.0),
        "device": res.get("device", "cpu"),
        "warnings": res.get("warnings", []),
        "limitations": res.get("limitations", []),
        "review_status": "unreviewed",
        "created_at": now,
    }


@router.get("/tampering/{evidence_id}")
def list_tampering_analyses(
    evidence_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM tampering_analyses WHERE evidence_id = ? AND user_id = ? ORDER BY created_at DESC",
            (evidence_id, current_user["id"]),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "evidence_id": r["evidence_id"],
                "model_id": r["model_id"],
                "model_version": r["model_version"],
                "checkpoint_id": r["checkpoint_id"],
                "analysis_status": r["analysis_status"],
                "tampering_score": r["tampering_score"],
                "localization_available": bool(r["localization_available"]),
                "heatmap_reference": f"/api/v1/tampering/artifacts/{r['heatmap_artifact_id']}" if r["heatmap_artifact_id"] else None,
                "mask_reference": f"/api/v1/tampering/artifacts/{r['mask_artifact_id']}" if r["mask_artifact_id"] else None,
                "original_dimensions": [r["original_width"], r["original_height"]],
                "input_dimensions": [r["input_width"], r["input_height"]],
                "coordinate_transform": json.loads(r["coordinate_transform_json"] or "{}"),
                "processing_time_ms": r["processing_time_ms"],
                "device": r["device"],
                "warnings": json.loads(r["warnings_json"] or "[]"),
                "limitations": json.loads(r["limitations_json"] or "[]"),
                "review_status": r["review_status"],
                "reviewed_by": r["reviewed_by"],
                "review_notes": r["review_notes"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]


@router.get("/tampering/artifacts/{artifact_id}")
def get_tampering_artifact(
    artifact_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Response:
    with get_db() as conn:
        art = conn.execute(
            "SELECT * FROM tampering_artifacts WHERE id = ? AND user_id = ?",
            (artifact_id, current_user["id"]),
        ).fetchone()
        if not art:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tampering artifact not found")
        raw = retrieve_and_decrypt_evidence(
            evidence_id=art["id"],
            user_id=current_user["id"],
            stored_filename=art["stored_filename"],
            storage_dir=get_storage_dir(),
            wrapped_dek_hex=art["wrapped_dek"],
            wrapping_nonce_hex=art["wrapping_nonce"],
            data_nonce_hex=art["data_nonce"],
            key_id=art["key_id"],
            key_version=art["key_version"],
            encryption_version=art["encryption_version"],
            expected_sha256=art["sha256_hash"],
        )
        return Response(content=raw, media_type="image/png")


@router.post("/tampering/analyses/{analysis_id}/review")
def review_tampering_analysis(
    analysis_id: str,
    payload: TamperingReviewRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM tampering_analyses WHERE id = ? AND user_id = ?",
            (analysis_id, current_user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tampering analysis not found")
        conn.execute(
            "UPDATE tampering_analyses SET review_status = ?, reviewed_by = ?, review_notes = ? WHERE id = ?",
            (payload.review_status, current_user["id"], payload.review_notes, analysis_id),
        )
        return {
            "id": analysis_id,
            "review_status": payload.review_status,
            "reviewed_by": current_user["id"],
            "review_notes": payload.review_notes,
        }


# ==========================================================
# 4. ADVANCED CASE MANAGEMENT, CUSTODY & INVESTIGATION SUMMARY
# ==========================================================
@router.post("/cases", status_code=status.HTTP_201_CREATED)
def create_case(
    payload: CaseCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        inc = conn.execute(
            "SELECT id, title, category FROM incidents WHERE id = ? AND user_id = ?",
            (payload.incident_id, current_user["id"]),
        ).fetchone()
        if not inc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        case_id = f"case-{uuid.uuid4().hex[:8]}"
        now = _utc_now()
        conn.execute(
            """
            INSERT INTO cases (id, incident_id, user_id, status, title, description, updated_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                case_id,
                payload.incident_id,
                current_user["id"],
                payload.status,
                payload.title.strip(),
                payload.description,
                current_user["id"],
                now,
                now,
            ),
        )
        log_case_activity(
            conn,
            case_id=case_id,
            actor_id=current_user["id"],
            action="case_created",
            to_status=payload.status,
            reason="Initial case creation",
        )
        return {
            "id": case_id,
            "incident_id": payload.incident_id,
            "title": payload.title.strip(),
            "description": payload.description,
            "status": payload.status,
            "created_at": now,
            "updated_at": now,
        }


@router.get("/cases/{case_id}/workspace")
def get_case_workspace(
    case_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            case_row, role = check_case_access(conn, case_id, current_user["id"])
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

        owner_id = case_row["user_id"]
        inc = conn.execute("SELECT * FROM incidents WHERE id = ?", (case_row["incident_id"],)).fetchone()
        evi_rows = conn.execute(
            "SELECT * FROM evidence WHERE incident_id = ? AND user_id = ?",
            (case_row["incident_id"], owner_id),
        ).fetchall()
        linked = conn.execute(
            """
            SELECT e.* FROM evidence e
            JOIN case_evidence_links l ON l.evidence_id = e.id
            WHERE l.case_id = ?
            """,
            (case_id,),
        ).fetchall()
        seen = {r["id"]: r for r in evi_rows}
        for r in linked:
            seen[r["id"]] = r

        collabs = conn.execute(
            """
            SELECT a.*, u.name AS user_name, u.email AS user_email
            FROM case_assignments a
            JOIN users u ON u.id = a.user_id
            WHERE a.case_id = ?
            ORDER BY a.assigned_at DESC
            """,
            (case_id,),
        ).fetchall()
        notes = conn.execute(
            "SELECT * FROM case_notes WHERE case_id = ? ORDER BY created_at DESC",
            (case_id,),
        ).fetchall()
        activity = conn.execute(
            "SELECT * FROM case_activity WHERE case_id = ? ORDER BY created_at DESC LIMIT 100",
            (case_id,),
        ).fetchall()

        return {
            "case": {
                "id": case_row["id"],
                "incident_id": case_row["incident_id"],
                "title": case_row["title"] if "title" in case_row.keys() and case_row["title"] else (inc["title"] if inc else "Case"),
                "description": case_row["description"] if "description" in case_row.keys() else None,
                "status": case_row["status"],
                "notes": case_row["notes"],
                "created_at": case_row["created_at"],
                "updated_at": case_row["updated_at"],
            },
            "viewer_role": role,
            "incident": dict(inc) if inc else None,
            "evidence": [
                {
                    "id": r["id"],
                    "original_filename": r["original_filename"],
                    "file_type": r["file_type"],
                    "file_size": r["file_size"],
                    "sha256_hash": r["sha256_hash"],
                    "storage_status": r["storage_status"],
                    "upload_timestamp": r["upload_timestamp"],
                }
                for r in seen.values()
            ],
            "collaborators": [dict(c) for c in collabs],
            "case_notes": [dict(n) for n in notes],
            "activity": [dict(a) for a in activity],
        }


@router.patch("/cases/{case_id}/transition")
def transition_case(
    case_id: str,
    payload: CaseUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            updated = transition_case_status(
                conn,
                case_id=case_id,
                actor_id=current_user["id"],
                new_status=payload.status,
                reason=payload.reason,
                notes=payload.notes,
            )
            return {
                "id": updated["id"],
                "status": updated["status"],
                "notes": updated["notes"],
                "updated_at": updated["updated_at"],
            }
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc))


@router.post("/cases/{case_id}/evidence", status_code=status.HTTP_201_CREATED)
def link_case_evidence(
    case_id: str,
    payload: CaseEvidenceLinkRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return link_evidence_to_case(
                conn,
                case_id=case_id,
                evidence_id=payload.evidence_id,
                actor_id=current_user["id"],
                link_reason=payload.link_reason,
            )
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.post("/cases/{case_id}/collaborators", status_code=status.HTTP_201_CREATED)
def assign_case_collaborator(
    case_id: str,
    payload: CaseAssignCollaboratorRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return assign_collaborator(
                conn,
                case_id=case_id,
                owner_id=current_user["id"],
                target_user_email=payload.email,
                role=payload.role,
            )
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/cases/{case_id}/collaborators/{target_user_id}")
def revoke_case_collaborator(
    case_id: str,
    target_user_id: str,
    reason: Optional[str] = Query(default=None),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            ok = revoke_collaborator(
                conn,
                case_id=case_id,
                owner_id=current_user["id"],
                target_user_id=target_user_id,
                revoke_reason=reason,
            )
            if not ok:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active collaborator assignment not found")
            return {"revoked": True, "user_id": target_user_id}
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.post("/cases/{case_id}/notes", status_code=status.HTTP_201_CREATED)
def create_case_note(
    case_id: str,
    payload: CaseNoteCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return add_case_note(
                conn,
                case_id=case_id,
                author_id=current_user["id"],
                content=payload.content,
                note_type=payload.note_type,
                evidence_id=payload.evidence_id,
            )
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc))


@router.get("/cases/{case_id}/activity")
def get_case_activity(
    case_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        try:
            check_case_access(conn, case_id, current_user["id"])
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        rows = conn.execute(
            "SELECT * FROM case_activity WHERE case_id = ? ORDER BY created_at DESC LIMIT 200",
            (case_id,),
        ).fetchall()
        return [dict(r) for r in rows]


@router.post("/evidence/{evidence_id}/custody", status_code=status.HTTP_201_CREATED)
def create_custody_record(
    evidence_id: str,
    payload: CustodyTransferRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        evi = conn.execute(
            "SELECT * FROM evidence WHERE id = ? AND user_id = ?",
            (evidence_id, current_user["id"]),
        ).fetchone()
        if not evi:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
        return record_custody_event_chained(
            conn,
            evidence_id=evidence_id,
            actor_id=current_user["id"],
            action=payload.action,
            details=f"{payload.purpose} ({payload.transfer_reason or 'no additional notes'})",
            case_id=payload.case_id,
            prev_custody_holder=current_user["id"],
            new_custody_holder=payload.new_custody_holder or current_user["id"],
            purpose=payload.purpose,
            transfer_reason=payload.transfer_reason,
            integrity_hash=evi["sha256_hash"],
            verification_result="sha256_matched",
        )


@router.get("/evidence/{evidence_id}/custody/verify")
def verify_evidence_custody(
    evidence_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return verify_custody_chain(conn, evidence_id=evidence_id, owner_id=current_user["id"])
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/cases/{case_id}/investigation-summary")
def get_investigation_summary(
    case_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        try:
            return generate_investigation_summary(conn, case_id=case_id, actor_id=current_user["id"])
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.get("/evidence/{evidence_id}/metadata")
def get_evidence_forensic_metadata(
    evidence_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Decrypts stored evidence in-memory and extracts magic-byte file type,
    EXIF metadata summary, and perceptual hashes (pHash, dHash, aHash).
    """
    with get_db() as conn:
        evi = conn.execute(
            "SELECT * FROM evidence WHERE id = ? AND user_id = ?",
            (evidence_id, current_user["id"]),
        ).fetchone()
        if not evi:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    evi_keys = evi.keys() if hasattr(evi, "keys") else []
    try:
        plaintext = retrieve_and_decrypt_evidence(
            evidence_id=evidence_id,
            user_id=current_user["id"],
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
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Evidence decryption failed: {exc}")

    try:
        metadata = analyze_evidence_metadata(
            content=plaintext,
            filename=evi["original_filename"] if "original_filename" in evi_keys else None,
            claimed_mime=evi["mime_type"] if "mime_type" in evi_keys else None,
        )
    finally:
        del plaintext

    return {
        "evidence_id": evidence_id,
        "original_filename": evi["original_filename"] if "original_filename" in evi_keys else None,
        **metadata,
    }
