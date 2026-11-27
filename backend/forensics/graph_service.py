"""
SafeHER Evidence Intelligence Graph Service (Stage 5)
=====================================================
Connects incidents, cases, evidence items, timeline events, analysis outputs,
URLs, and account identifiers through verifiable, provenance-tracked relationships.

Design guarantees:
1. Strict owner/incident/case isolation on all queries and mutations.
2. Machine-generated suggestions ('suggested') are strictly separated from
   human-confirmed facts ('user_asserted', 'human_verified').
3. Never infers real-world identity or merges distinct account identifiers.
4. Every relationship preserves extraction method, source evidence, confidence
   interpretation, and review history.
"""

from __future__ import annotations

import json
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

VALID_NODE_TYPES = {
    "incident",
    "case",
    "evidence",
    "screenshot",
    "image",
    "video",
    "audio",
    "message",
    "url",
    "account_identifier",
    "phone_number",
    "email_address",
    "timeline_event",
    "threat_analysis",
    "deepfake_analysis",
    "tampering_analysis",
    "c2pa_provenance",
    "annotation",
}

VALID_RELATIONSHIP_TYPES = {
    "BELONGS_TO_INCIDENT",
    "ASSOCIATED_WITH_CASE",
    "UPLOADED_BY",
    "CONTAINS_EVENT",
    "REFERENCES_URL",
    "MENTIONS_ACCOUNT",
    "HAS_TIMESTAMP",
    "DERIVED_FROM",
    "CORROBORATES",
    "CONTRADICTS",
    "DUPLICATE_OF",
    "ANALYZED_BY",
    "ANNOTATED_BY",
}

VALID_EXTRACTION_METHODS = {
    "user_asserted",
    "metadata_extracted",
    "analysis_tool",
    "correlation_rule",
    "human_verified",
}

VALID_VERIFICATION_STATUSES = {
    "suggested",
    "user_asserted",
    "human_verified",
    "disputed",
    "rejected",
}

_URL_RE = re.compile(r"https?://[^\s<>\"'\]\)]+", re.IGNORECASE)
_HANDLE_RE = re.compile(r"(?<!\w)@([A-Za-z0-9_.]{2,40})")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serialize_node(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "owner_id": row["owner_id"],
        "incident_id": row["incident_id"],
        "case_id": row["case_id"],
        "node_type": row["node_type"],
        "label": row["label"],
        "entity_ref_id": row["entity_ref_id"],
        "metadata": json.loads(row["metadata_json"] or "{}"),
        "privacy_redacted": bool(row["privacy_redacted"]),
        "created_by": row["created_by"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_edge(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "owner_id": row["owner_id"],
        "incident_id": row["incident_id"],
        "case_id": row["case_id"],
        "source_node_id": row["source_node_id"],
        "target_node_id": row["target_node_id"],
        "relationship_type": row["relationship_type"],
        "extraction_method": row["extraction_method"],
        "source_evidence_id": row["source_evidence_id"],
        "supporting_ref": row["supporting_ref"],
        "confidence_score": row["confidence_score"],
        "confidence_note": row["confidence_note"],
        "verification_status": row["verification_status"],
        "reviewed_by": row["reviewed_by"],
        "reviewed_at": row["reviewed_at"],
        "created_by": row["created_by"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def ensure_node(
    conn: sqlite3.Connection,
    owner_id: str,
    incident_id: str,
    node_type: str,
    label: str,
    created_by: str,
    case_id: Optional[str] = None,
    entity_ref_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    privacy_redacted: bool = False,
) -> Dict[str, Any]:
    """Creates a graph node or returns an existing matching node for the same entity_ref_id/label."""
    if node_type not in VALID_NODE_TYPES:
        raise ValueError(f"Unsupported node_type: {node_type}")

    if entity_ref_id:
        existing = conn.execute(
            """
            SELECT * FROM evidence_graph_nodes
            WHERE owner_id = ? AND incident_id = ? AND node_type = ? AND entity_ref_id = ?
            LIMIT 1
            """,
            (owner_id, incident_id, node_type, entity_ref_id),
        ).fetchone()
        if existing:
            return _serialize_node(existing)
    else:
        existing = conn.execute(
            """
            SELECT * FROM evidence_graph_nodes
            WHERE owner_id = ? AND incident_id = ? AND node_type = ? AND label = ?
            LIMIT 1
            """,
            (owner_id, incident_id, node_type, label.strip()),
        ).fetchone()
        if existing:
            return _serialize_node(existing)

    now = _utc_now()
    node_id = f"gnode-{uuid.uuid4().hex[:10]}"
    conn.execute(
        """
        INSERT INTO evidence_graph_nodes (
            id, owner_id, incident_id, case_id, node_type, label, entity_ref_id,
            metadata_json, privacy_redacted, created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            node_id,
            owner_id,
            incident_id,
            case_id,
            node_type,
            label.strip()[:240],
            entity_ref_id,
            json.dumps(metadata or {}),
            1 if privacy_redacted else 0,
            created_by,
            now,
            now,
        ),
    )
    row = conn.execute("SELECT * FROM evidence_graph_nodes WHERE id = ?", (node_id,)).fetchone()
    return _serialize_node(row)


def create_edge(
    conn: sqlite3.Connection,
    owner_id: str,
    incident_id: str,
    source_node_id: str,
    target_node_id: str,
    relationship_type: str,
    extraction_method: str,
    created_by: str,
    case_id: Optional[str] = None,
    source_evidence_id: Optional[str] = None,
    supporting_ref: Optional[str] = None,
    confidence_score: Optional[float] = None,
    confidence_note: Optional[str] = None,
    verification_status: str = "user_asserted",
) -> Dict[str, Any]:
    """Creates a provenance-backed relationship edge between two authorized nodes."""
    if relationship_type not in VALID_RELATIONSHIP_TYPES:
        raise ValueError(f"Unsupported relationship_type: {relationship_type}")
    if extraction_method not in VALID_EXTRACTION_METHODS:
        raise ValueError(f"Unsupported extraction_method: {extraction_method}")
    if verification_status not in VALID_VERIFICATION_STATUSES:
        raise ValueError(f"Unsupported verification_status: {verification_status}")
    if source_node_id == target_node_id:
        raise ValueError("Self-referential graph edges are not permitted.")

    src = conn.execute(
        "SELECT id, incident_id FROM evidence_graph_nodes WHERE id = ? AND owner_id = ?",
        (source_node_id, owner_id),
    ).fetchone()
    tgt = conn.execute(
        "SELECT id, incident_id FROM evidence_graph_nodes WHERE id = ? AND owner_id = ?",
        (target_node_id, owner_id),
    ).fetchone()
    if not src or not tgt:
        raise PermissionError("Source or target node not found or unauthorized.")
    if src["incident_id"] != incident_id or tgt["incident_id"] != incident_id:
        raise PermissionError("Cross-incident graph edges require explicit authorized linking within the same incident scope.")

    if source_evidence_id:
        evi = conn.execute(
            "SELECT id FROM evidence WHERE id = ? AND user_id = ?",
            (source_evidence_id, owner_id),
        ).fetchone()
        if not evi:
            raise PermissionError("Referenced source_evidence_id not found or unauthorized.")

    # Prevent duplicate identical edges
    dup = conn.execute(
        """
        SELECT * FROM evidence_graph_edges
        WHERE owner_id = ? AND incident_id = ? AND source_node_id = ? AND target_node_id = ? AND relationship_type = ?
        LIMIT 1
        """,
        (owner_id, incident_id, source_node_id, target_node_id, relationship_type),
    ).fetchone()
    if dup:
        return _serialize_edge(dup)

    now = _utc_now()
    edge_id = f"gedge-{uuid.uuid4().hex[:10]}"
    conn.execute(
        """
        INSERT INTO evidence_graph_edges (
            id, owner_id, incident_id, case_id, source_node_id, target_node_id,
            relationship_type, extraction_method, source_evidence_id, supporting_ref,
            confidence_score, confidence_note, verification_status,
            created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            edge_id,
            owner_id,
            incident_id,
            case_id,
            source_node_id,
            target_node_id,
            relationship_type,
            extraction_method,
            source_evidence_id,
            supporting_ref,
            confidence_score,
            confidence_note,
            verification_status,
            created_by,
            now,
            now,
        ),
    )
    row = conn.execute("SELECT * FROM evidence_graph_edges WHERE id = ?", (edge_id,)).fetchone()
    return _serialize_edge(row)


def review_edge(
    conn: sqlite3.Connection,
    edge_id: str,
    owner_id: str,
    reviewer_id: str,
    new_status: str,
    review_note: Optional[str] = None,
) -> Dict[str, Any]:
    """Transitions an edge verification status ('human_verified', 'disputed', 'rejected') with audit history."""
    if new_status not in {"human_verified", "disputed", "rejected"}:
        raise ValueError("Review status must be 'human_verified', 'disputed', or 'rejected'.")

    row = conn.execute(
        "SELECT * FROM evidence_graph_edges WHERE id = ? AND owner_id = ?",
        (edge_id, owner_id),
    ).fetchone()
    if not row:
        raise PermissionError("Graph edge not found or unauthorized.")

    now = _utc_now()
    prev_status = row["verification_status"]
    conn.execute(
        """
        UPDATE evidence_graph_edges
        SET verification_status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
        WHERE id = ?
        """,
        (new_status, reviewer_id, now, now, edge_id),
    )
    rev_id = f"grev-{uuid.uuid4().hex[:10]}"
    conn.execute(
        """
        INSERT INTO relationship_reviews (
            id, edge_id, owner_id, reviewer_id, previous_status, new_status, review_note, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (rev_id, edge_id, owner_id, reviewer_id, prev_status, new_status, review_note, now),
    )
    updated = conn.execute("SELECT * FROM evidence_graph_edges WHERE id = ?", (edge_id,)).fetchone()
    return _serialize_edge(updated)


def delete_user_edge(conn: sqlite3.Connection, edge_id: str, owner_id: str) -> bool:
    """Allows deleting an incorrect user-asserted edge (preserves human-verified auditability via policy)."""
    row = conn.execute(
        "SELECT * FROM evidence_graph_edges WHERE id = ? AND owner_id = ?",
        (edge_id, owner_id),
    ).fetchone()
    if not row:
        return False
    if row["extraction_method"] not in {"user_asserted", "correlation_rule"} and row["verification_status"] == "human_verified":
        raise PermissionError("Cannot delete a human-verified forensic relationship; dispute it instead.")
    cur = conn.execute("DELETE FROM evidence_graph_edges WHERE id = ? AND owner_id = ?", (edge_id, owner_id))
    return cur.rowcount > 0


def build_and_suggest_graph_for_incident(
    conn: sqlite3.Connection,
    incident_id: str,
    owner_id: str,
) -> Dict[str, Any]:
    """
    Synchronizes real SafeHER entities (incident, case, evidence, analyses, timeline events,
    URLs, and explicit @account handles) into the graph and proposes transparent 'suggested'
    correlations without fabricating identity links.
    """
    inc = conn.execute(
        "SELECT * FROM incidents WHERE id = ? AND user_id = ?",
        (incident_id, owner_id),
    ).fetchone()
    if not inc:
        raise PermissionError("Incident not found or unauthorized.")

    case_row = conn.execute(
        "SELECT * FROM cases WHERE incident_id = ? AND user_id = ? LIMIT 1",
        (incident_id, owner_id),
    ).fetchone()
    case_id = case_row["id"] if case_row else None

    inc_node = ensure_node(
        conn,
        owner_id=owner_id,
        incident_id=incident_id,
        case_id=case_id,
        node_type="incident",
        label=inc["title"],
        entity_ref_id=incident_id,
        metadata={"category": inc["category"], "platform": inc["platform"], "incident_date": inc["incident_date"]},
        created_by="system",
    )

    if case_row:
        case_node = ensure_node(
            conn,
            owner_id=owner_id,
            incident_id=incident_id,
            case_id=case_id,
            node_type="case",
            label=case_row["title"] or f"Case {case_id}",
            entity_ref_id=case_id,
            metadata={"status": case_row["status"]},
            created_by="system",
        )
        create_edge(
            conn,
            owner_id=owner_id,
            incident_id=incident_id,
            case_id=case_id,
            source_node_id=inc_node["id"],
            target_node_id=case_node["id"],
            relationship_type="ASSOCIATED_WITH_CASE",
            extraction_method="metadata_extracted",
            supporting_ref=f"case:{case_id}",
            confidence_score=1.0,
            confidence_note="Direct database foreign-key association",
            verification_status="user_asserted",
            created_by="system",
        )

    # URLs from incident
    for url in json.loads(inc["relevant_urls"] or "[]"):
        if isinstance(url, str) and url.strip():
            url_node = ensure_node(
                conn,
                owner_id=owner_id,
                incident_id=incident_id,
                case_id=case_id,
                node_type="url",
                label=url.strip(),
                metadata={"source": "incident_relevant_urls"},
                created_by="system",
            )
            create_edge(
                conn,
                owner_id=owner_id,
                incident_id=incident_id,
                case_id=case_id,
                source_node_id=inc_node["id"],
                target_node_id=url_node["id"],
                relationship_type="REFERENCES_URL",
                extraction_method="user_asserted",
                supporting_ref=f"incident:{incident_id}",
                confidence_score=1.0,
                confidence_note="Provided in incident record",
                verification_status="user_asserted",
                created_by="system",
            )

    # Evidence items & duplicate SHA-256 correlation
    evi_rows = conn.execute(
        "SELECT * FROM evidence WHERE incident_id = ? AND user_id = ?",
        (incident_id, owner_id),
    ).fetchall()
    sha_map: Dict[str, List[str]] = {}
    evi_node_map: Dict[str, str] = {}

    for evi in evi_rows:
        ftype = (evi["file_type"] or "").lower()
        ntype = "evidence"
        if "image" in ftype:
            ntype = "image"
        elif "video" in ftype:
            ntype = "video"
        elif "audio" in ftype:
            ntype = "audio"

        evi_node = ensure_node(
            conn,
            owner_id=owner_id,
            incident_id=incident_id,
            case_id=case_id,
            node_type=ntype,
            label=evi["original_filename"],
            entity_ref_id=evi["id"],
            metadata={
                "file_type": evi["file_type"],
                "sha256_hash": evi["sha256_hash"],
                "upload_timestamp": evi["upload_timestamp"],
                "storage_status": evi["storage_status"],
            },
            created_by="system",
        )
        evi_node_map[evi["id"]] = evi_node["id"]
        sha_map.setdefault(evi["sha256_hash"], []).append(evi_node["id"])

        create_edge(
            conn,
            owner_id=owner_id,
            incident_id=incident_id,
            case_id=case_id,
            source_node_id=evi_node["id"],
            target_node_id=inc_node["id"],
            relationship_type="BELONGS_TO_INCIDENT",
            extraction_method="metadata_extracted",
            source_evidence_id=evi["id"],
            supporting_ref=f"evidence:{evi['id']}",
            confidence_score=1.0,
            confidence_note="Direct upload association",
            verification_status="user_asserted",
            created_by="system",
        )

        # Link media_analyses for this evidence
        med_rows = conn.execute(
            "SELECT * FROM media_analyses WHERE evidence_id = ? AND user_id = ?",
            (evi["id"], owner_id),
        ).fetchall()
        for med in med_rows:
            med_node = ensure_node(
                conn,
                owner_id=owner_id,
                incident_id=incident_id,
                case_id=case_id,
                node_type="deepfake_analysis",
                label=f"{med['model_name']} ({med['decision']})",
                entity_ref_id=med["id"],
                metadata={
                    "deepfake_score": med["deepfake_score"],
                    "c2pa_provenance": med["c2pa_provenance"],
                    "created_at": med["created_at"],
                },
                created_by="system",
            )
            create_edge(
                conn,
                owner_id=owner_id,
                incident_id=incident_id,
                case_id=case_id,
                source_node_id=evi_node["id"],
                target_node_id=med_node["id"],
                relationship_type="ANALYZED_BY",
                extraction_method="analysis_tool",
                source_evidence_id=evi["id"],
                supporting_ref=f"media_analysis:{med['id']}",
                confidence_score=None,
                confidence_note="Automated media analysis execution record",
                verification_status="suggested",
                created_by="system",
            )

        # Link tampering_analyses for this evidence
        tamp_rows = conn.execute(
            "SELECT * FROM tampering_analyses WHERE evidence_id = ? AND user_id = ?",
            (evi["id"], owner_id),
        ).fetchall()
        for tamp in tamp_rows:
            tamp_node = ensure_node(
                conn,
                owner_id=owner_id,
                incident_id=incident_id,
                case_id=case_id,
                node_type="tampering_analysis",
                label=f"Tampering ({tamp['model_id']}: {tamp['analysis_status']})",
                entity_ref_id=tamp["id"],
                metadata={
                    "analysis_status": tamp["analysis_status"],
                    "tampering_score": tamp["tampering_score"],
                    "localization_available": bool(tamp["localization_available"]),
                },
                created_by="system",
            )
            create_edge(
                conn,
                owner_id=owner_id,
                incident_id=incident_id,
                case_id=case_id,
                source_node_id=evi_node["id"],
                target_node_id=tamp_node["id"],
                relationship_type="ANALYZED_BY",
                extraction_method="analysis_tool",
                source_evidence_id=evi["id"],
                supporting_ref=f"tampering_analysis:{tamp['id']}",
                confidence_score=tamp["tampering_score"],
                confidence_note="Tampering localization execution record",
                verification_status="suggested",
                created_by="system",
            )

    # Suggest DUPLICATE_OF for identical SHA-256 digests
    for sha, nids in sha_map.items():
        if len(nids) > 1:
            primary = nids[0]
            for dup_nid in nids[1:]:
                create_edge(
                    conn,
                    owner_id=owner_id,
                    incident_id=incident_id,
                    case_id=case_id,
                    source_node_id=dup_nid,
                    target_node_id=primary,
                    relationship_type="DUPLICATE_OF",
                    extraction_method="correlation_rule",
                    supporting_ref=f"sha256:{sha}",
                    confidence_score=1.0,
                    confidence_note="Exact cryptographic SHA-256 digest match",
                    verification_status="suggested",
                    created_by="system",
                )

    # Threat analyses & handle/URL suggestions
    thr_rows = conn.execute(
        "SELECT * FROM threat_analyses WHERE incident_id = ? AND user_id = ?",
        (incident_id, owner_id),
    ).fetchall()
    for thr in thr_rows:
        thr_node = ensure_node(
            conn,
            owner_id=owner_id,
            incident_id=incident_id,
            case_id=case_id,
            node_type="threat_analysis",
            label=f"Threat ({thr['urgency_level']}: {thr['decision']})",
            entity_ref_id=thr["id"],
            metadata={"urgency_level": thr["urgency_level"], "decision": thr["decision"]},
            created_by="system",
        )
        create_edge(
            conn,
            owner_id=owner_id,
            incident_id=incident_id,
            case_id=case_id,
            source_node_id=inc_node["id"],
            target_node_id=thr_node["id"],
            relationship_type="ANALYZED_BY",
            extraction_method="analysis_tool",
            supporting_ref=f"threat_analysis:{thr['id']}",
            confidence_score=thr["threat_score"],
            confidence_note="Automated threat analysis result",
            verification_status="suggested",
            created_by="system",
        )
        # Extract URLs or @handles from analyzed text as unverified suggestions
        for match_url in _URL_RE.findall(thr["input_text"] or "")[:5]:
            u_node = ensure_node(
                conn,
                owner_id=owner_id,
                incident_id=incident_id,
                case_id=case_id,
                node_type="url",
                label=match_url,
                metadata={"extracted_from": f"threat_analysis:{thr['id']}"},
                created_by="system",
            )
            create_edge(
                conn,
                owner_id=owner_id,
                incident_id=incident_id,
                case_id=case_id,
                source_node_id=thr_node["id"],
                target_node_id=u_node["id"],
                relationship_type="REFERENCES_URL",
                extraction_method="correlation_rule",
                supporting_ref=f"threat_analysis:{thr['id']}",
                confidence_score=0.7,
                confidence_note="URL regex match in analyzed message text; requires human review",
                verification_status="suggested",
                created_by="system",
            )
        for handle in _HANDLE_RE.findall(thr["input_text"] or "")[:5]:
            h_node = ensure_node(
                conn,
                owner_id=owner_id,
                incident_id=incident_id,
                case_id=case_id,
                node_type="account_identifier",
                label=f"@{handle}",
                metadata={"extracted_from": f"threat_analysis:{thr['id']}"},
                created_by="system",
            )
            create_edge(
                conn,
                owner_id=owner_id,
                incident_id=incident_id,
                case_id=case_id,
                source_node_id=thr_node["id"],
                target_node_id=h_node["id"],
                relationship_type="MENTIONS_ACCOUNT",
                extraction_method="correlation_rule",
                supporting_ref=f"threat_analysis:{thr['id']}",
                confidence_score=0.65,
                confidence_note="Handle pattern match; does not identify real-world person",
                verification_status="suggested",
                created_by="system",
            )

    # Timeline events
    tl_rows = conn.execute(
        "SELECT * FROM timeline_events WHERE incident_id = ? AND user_id = ? AND COALESCE(is_deleted, 0) = 0",
        (incident_id, owner_id),
    ).fetchall()
    for tl in tl_rows:
        tl_node = ensure_node(
            conn,
            owner_id=owner_id,
            incident_id=incident_id,
            case_id=case_id,
            node_type="timeline_event",
            label=tl["title"],
            entity_ref_id=tl["id"],
            metadata={"event_type": tl["event_type"], "timestamp": tl["timestamp"]},
            created_by="system",
        )
        create_edge(
            conn,
            owner_id=owner_id,
            incident_id=incident_id,
            case_id=case_id,
            source_node_id=inc_node["id"],
            target_node_id=tl_node["id"],
            relationship_type="CONTAINS_EVENT",
            extraction_method="metadata_extracted",
            supporting_ref=f"timeline:{tl['id']}",
            confidence_score=1.0,
            confidence_note="Timeline event linked to incident",
            verification_status="user_asserted",
            created_by="system",
        )
        if tl["related_evidence_id"] and tl["related_evidence_id"] in evi_node_map:
            create_edge(
                conn,
                owner_id=owner_id,
                incident_id=incident_id,
                case_id=case_id,
                source_node_id=tl_node["id"],
                target_node_id=evi_node_map[tl["related_evidence_id"]],
                relationship_type="DERIVED_FROM",
                extraction_method="metadata_extracted",
                source_evidence_id=tl["related_evidence_id"],
                supporting_ref=f"timeline:{tl['id']}",
                confidence_score=1.0,
                confidence_note="Timeline event references source evidence",
                verification_status="user_asserted",
                created_by="system",
            )

    return get_graph_for_incident(conn, owner_id=owner_id, incident_id=incident_id)


def get_graph_for_incident(
    conn: sqlite3.Connection,
    owner_id: str,
    incident_id: str,
    relationship_type: Optional[str] = None,
    verification_status: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> Dict[str, Any]:
    """Returns paginated nodes and filtered edges for an authorized incident."""
    nodes = conn.execute(
        """
        SELECT * FROM evidence_graph_nodes
        WHERE owner_id = ? AND incident_id = ?
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
        """,
        (owner_id, incident_id, limit, offset),
    ).fetchall()

    edge_sql = "SELECT * FROM evidence_graph_edges WHERE owner_id = ? AND incident_id = ?"
    params: List[Any] = [owner_id, incident_id]
    if relationship_type:
        edge_sql += " AND relationship_type = ?"
        params.append(relationship_type)
    if verification_status:
        edge_sql += " AND verification_status = ?"
        params.append(verification_status)
    edge_sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    edges = conn.execute(edge_sql, tuple(params)).fetchall()
    return {
        "incident_id": incident_id,
        "nodes": [_serialize_node(r) for r in nodes],
        "edges": [_serialize_edge(r) for r in edges],
        "node_count": len(nodes),
        "edge_count": len(edges),
    }


def get_graph_neighborhood(
    conn: sqlite3.Connection,
    owner_id: str,
    node_id: str,
    depth: int = 1,
) -> Dict[str, Any]:
    """Retrieves bounded k-hop neighborhood around a specific authorized node."""
    root = conn.execute(
        "SELECT * FROM evidence_graph_nodes WHERE id = ? AND owner_id = ?",
        (node_id, owner_id),
    ).fetchone()
    if not root:
        raise PermissionError("Graph node not found or unauthorized.")

    depth = max(1, min(depth, 3))
    visited_nodes: Set[str] = {node_id}
    frontier: Set[str] = {node_id}
    collected_edges: Dict[str, Dict[str, Any]] = {}

    for _ in range(depth):
        if not frontier:
            break
        placeholders = ",".join("?" for _ in frontier)
        rows = conn.execute(
            f"""
            SELECT * FROM evidence_graph_edges
            WHERE owner_id = ? AND (source_node_id IN ({placeholders}) OR target_node_id IN ({placeholders}))
            """,
            (owner_id, *frontier, *frontier),
        ).fetchall()
        next_frontier: Set[str] = set()
        for r in rows:
            collected_edges[r["id"]] = _serialize_edge(r)
            for nid in (r["source_node_id"], r["target_node_id"]):
                if nid not in visited_nodes:
                    visited_nodes.add(nid)
                    next_frontier.add(nid)
        frontier = next_frontier

    placeholders = ",".join("?" for _ in visited_nodes)
    node_rows = conn.execute(
        f"SELECT * FROM evidence_graph_nodes WHERE owner_id = ? AND id IN ({placeholders})",
        (owner_id, *visited_nodes),
    ).fetchall()

    return {
        "center_node_id": node_id,
        "depth": depth,
        "nodes": [_serialize_node(r) for r in node_rows],
        "edges": list(collected_edges.values()),
    }
