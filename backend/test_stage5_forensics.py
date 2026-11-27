"""
SafeHER Stage 5 Comprehensive Test Suite
========================================
Covers:
A. Evidence Intelligence Graph (nodes, edges, provenance, review states, neighborhood, isolation)
B. Normalized Incident Timeline (UTC, local TZ, unknown TZ, date-only, revisions, filtering, isolation)
C. Image Tampering Localization (authentic/unavailable honesty, corrupt, unsupported, low-res, persistence)
D. Advanced Case Management & Custody (lifecycle transitions, RBAC, collaborators, revocation, notes, custody chain, summary)
"""

import hashlib
import io
import os
import tempfile
import uuid

import pytest
from fastapi.testclient import TestClient
from PIL import Image

# Use isolated temporary DB and storage for Stage 5 tests
_TMP_DIR = tempfile.mkdtemp(prefix="safeher_stage5_test_")
_STAGE5_DB = os.path.join(_TMP_DIR, "test_stage5.db")
_STAGE5_STORAGE = os.path.join(_TMP_DIR, "evidence")
os.environ["SAFEHER_DB_PATH"] = _STAGE5_DB
os.environ["SAFEHER_STORAGE_DIR"] = _STAGE5_STORAGE
os.environ["SAFEHER_ENV"] = "test"

from app import app  # noqa: E402
from db import init_db  # noqa: E402
from ai.tampering_localization import analyze_image_tampering  # noqa: E402
from forensics.timeline_service import normalize_timestamp, extract_exif_creation_time  # noqa: E402

client = TestClient(app)


@pytest.fixture(autouse=True)
def _isolated_stage5_db(monkeypatch):
    monkeypatch.setenv("SAFEHER_DB_PATH", _STAGE5_DB)
    monkeypatch.setenv("SAFEHER_STORAGE_DIR", _STAGE5_STORAGE)
    init_db()


def _register_and_login(email_prefix: str) -> dict:
    email = f"{email_prefix}_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "TestPassword!123"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "name": email_prefix.title(),
            "email": email,
            "password": pwd,
            "consent_acknowledged": True,
        },
    )
    assert reg.status_code in (200, 201), reg.text
    data = reg.json()
    return {"token": data["access_token"], "user": data["user"], "email": email}


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _make_png_bytes(width: int = 256, height: int = 256) -> bytes:
    img = Image.new("RGB", (width, height), color=(120, 140, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _create_incident_and_evidence(token: str):
    inc_res = client.post(
        "/api/v1/incidents",
        headers=_auth_headers(token),
        json={
            "title": "Stage 5 Harassment Incident",
            "category": "harassment",
            "description": "Received threatening messages from @bad_actor_99 with https://evil.example/post",
            "platform": "Instagram",
            "incident_date": "2026-11-25",
            "incident_time": "14:30:00",
            "relevant_urls": ["https://evil.example/post"],
        },
    )
    assert inc_res.status_code == 201, inc_res.text
    inc = inc_res.json()

    png_bytes = _make_png_bytes()
    sha = hashlib.sha256(png_bytes).hexdigest()
    evi_res = client.post(
        f"/api/v1/incidents/{inc['id']}/evidence",
        headers=_auth_headers(token),
        data={"client_sha256": sha, "notes": "Primary screenshot"},
        files={"file": ("screenshot.png", png_bytes, "image/png")},
    )
    assert evi_res.status_code == 201, evi_res.text
    evi = evi_res.json()
    return inc, evi


# ==========================================================
# A. EVIDENCE INTELLIGENCE GRAPH TESTS
# ==========================================================
def test_evidence_graph_lifecycle_and_isolation():
    u1 = _register_and_login("graph_u1")
    u2 = _register_and_login("graph_u2")
    inc, evi = _create_incident_and_evidence(u1["token"])

    # Sync graph from real incident & evidence
    sync_res = client.post(f"/api/v1/graph/incidents/{inc['id']}/sync", headers=_auth_headers(u1["token"]))
    assert sync_res.status_code == 200, sync_res.text
    graph = sync_res.json()
    assert graph["node_count"] >= 3
    assert graph["edge_count"] >= 2

    # Create custom account node & user-asserted edge
    n1 = client.post(
        "/api/v1/graph/nodes",
        headers=_auth_headers(u1["token"]),
        json={"incident_id": inc["id"], "node_type": "account_identifier", "label": "@suspect_handle"},
    ).json()
    evi_node = next(n for n in graph["nodes"] if n["entity_ref_id"] == evi["id"])

    edge_res = client.post(
        "/api/v1/graph/edges",
        headers=_auth_headers(u1["token"]),
        json={
            "incident_id": inc["id"],
            "source_node_id": evi_node["id"],
            "target_node_id": n1["id"],
            "relationship_type": "MENTIONS_ACCOUNT",
            "source_evidence_id": evi["id"],
            "confidence_note": "Visible in screenshot",
        },
    )
    assert edge_res.status_code == 201, edge_res.text
    edge = edge_res.json()
    assert edge["verification_status"] == "user_asserted"

    # Self-referential edge must fail
    self_edge = client.post(
        "/api/v1/graph/edges",
        headers=_auth_headers(u1["token"]),
        json={
            "incident_id": inc["id"],
            "source_node_id": n1["id"],
            "target_node_id": n1["id"],
            "relationship_type": "CORROBORATES",
        },
    )
    assert self_edge.status_code == 422

    # Human review transitions: confirm -> dispute -> reject
    for st in ("human_verified", "disputed", "rejected"):
        rev = client.post(
            f"/api/v1/graph/edges/{edge['id']}/review",
            headers=_auth_headers(u1["token"]),
            json={"status": st, "review_note": f"Reviewed as {st}"},
        )
        assert rev.status_code == 200
        assert rev.json()["verification_status"] == st

    # Neighborhood query
    nb = client.get(f"/api/v1/graph/nodes/{evi_node['id']}/neighborhood?depth=1", headers=_auth_headers(u1["token"]))
    assert nb.status_code == 200
    assert len(nb.json()["nodes"]) >= 2

    # Cross-user isolation
    iso = client.get(f"/api/v1/graph/incidents/{inc['id']}", headers=_auth_headers(u2["token"]))
    assert iso.status_code == 404


# ==========================================================
# B. NORMALIZED TIMELINE TESTS
# ==========================================================
def test_timestamp_normalization_rules():
    # 1. Explicit UTC
    utc, tz, conf, prec = normalize_timestamp("2026-11-26T10:00:00Z")
    assert utc is not None and utc.startswith("2026-11-26T10:00:00")
    assert conf == "explicit"

    # 2. Local timezone (Asia/Kolkata -> UTC - 5:30)
    utc2, tz2, conf2, _ = normalize_timestamp("2026-11-26T15:30:00", timezone_hint="Asia/Kolkata")
    assert utc2 is not None and "10:00:00" in utc2
    assert tz2 == "Asia/Kolkata"
    assert conf2 == "user_supplied"

    # 3. Unknown timezone -> must NOT invent UTC
    utc3, tz3, conf3, prec3 = normalize_timestamp("2026-11-26T15:30:00", timezone_hint=None)
    assert utc3 is None
    assert prec3 == "unknown_timezone"

    # 4. Date-only
    utc4, _, _, prec4 = normalize_timestamp("2026-11-26", time_precision="date_only")
    assert utc4 is None
    assert prec4 == "date_only"


def test_timeline_reconstruction_revisions_and_isolation():
    u1 = _register_and_login("tl_u1")
    u2 = _register_and_login("tl_u2")
    inc, evi = _create_incident_and_evidence(u1["token"])

    rec = client.post(f"/api/v1/incidents/{inc['id']}/timeline/reconstruct", headers=_auth_headers(u1["token"]))
    assert rec.status_code == 200, rec.text
    events = rec.json()["events"]
    assert len(events) >= 2
    assert any(e["time_source"] == "safeher_upload" for e in events)
    assert any(e["time_source"] == "alleged_occurrence" for e in events)

    # Add manual event with local timezone
    add_res = client.post(
        f"/api/v1/incidents/{inc['id']}/timeline/normalized",
        headers=_auth_headers(u1["token"]),
        json={
            "event_type": "threat_message",
            "title": "Blackmail DM received",
            "description": "Direct message demanding money",
            "event_time_original": "2026-11-25T19:00:00",
            "timezone_original": "Asia/Kolkata",
            "time_precision": "exact",
            "time_source": "alleged_occurrence",
            "related_evidence_id": evi["id"],
        },
    )
    assert add_res.status_code == 201, add_res.text
    ev = add_res.json()
    assert ev["event_time_original"] == "2026-11-25T19:00:00"
    assert "13:30:00" in ev["event_time_utc"]

    # Update event -> creates revision history
    upd = client.patch(
        f"/api/v1/timeline/{ev['id']}",
        headers=_auth_headers(u1["token"]),
        json={"verification_status": "human_verified", "reason": "Confirmed by survivor"},
    )
    assert upd.status_code == 200
    detail = client.get(f"/api/v1/timeline/{ev['id']}", headers=_auth_headers(u1["token"])).json()
    assert len(detail["revisions"]) == 1

    # Cross-user isolation
    assert client.get(f"/api/v1/timeline/{ev['id']}", headers=_auth_headers(u2["token"])).status_code == 404


# ==========================================================
# C. TAMPERING LOCALIZATION TESTS
# ==========================================================
def test_tampering_localization_honesty_and_edge_cases():
    # When an IMDL model checkpoint (e.g. catnet) is not installed -> must be unavailable, NO fake heatmap
    res_auth = analyze_image_tampering(_make_png_bytes(256, 256), preferred_model="catnet")
    assert res_auth["analysis_status"] == "unavailable"
    assert res_auth["localization_available"] is False
    assert res_auth["heatmap_png_bytes"] is None
    assert res_auth["original_width"] == 256

    # Low-resolution warning
    res_low = analyze_image_tampering(_make_png_bytes(64, 64), preferred_model="catnet")
    assert res_low["analysis_status"] == "unavailable"
    assert any("Low-resolution" in w for w in res_low["warnings"])

    # Corrupt image
    res_corrupt = analyze_image_tampering(b"not-an-image-bytes")
    assert res_corrupt["analysis_status"] == "failed"
    assert res_corrupt["localization_available"] is False

    # End-to-end API persistence & isolation
    u1 = _register_and_login("tamp_u1")
    u2 = _register_and_login("tamp_u2")
    _, evi = _create_incident_and_evidence(u1["token"])

    api_res = client.post(
        f"/api/v1/tampering/{evi['id']}/analyze",
        headers=_auth_headers(u1["token"]),
        json={"preferred_model": "trufor", "async_job": False},
    )
    assert api_res.status_code == 201, api_res.text
    body = api_res.json()
    assert body["analysis_status"] == "completed"
    assert body["localization_available"] is True
    assert body["heatmap_reference"] is not None
    hm_resp = client.get(body["heatmap_reference"], headers=_auth_headers(u1["token"]))
    assert hm_resp.status_code == 200
    assert hm_resp.headers.get("content-type") == "image/png"

    # User 2 cannot analyze user 1's evidence
    iso = client.post(
        f"/api/v1/tampering/{evi['id']}/analyze",
        headers=_auth_headers(u2["token"]),
        json={"preferred_model": "trufor", "async_job": False},
    )
    assert iso.status_code == 404


# ==========================================================
# D. ADVANCED CASE MANAGEMENT & CUSTODY TESTS
# ==========================================================
def test_case_management_rbac_custody_and_summary():
    owner = _register_and_login("case_owner")
    investigator = _register_and_login("case_inv")
    legal = _register_and_login("case_legal")
    outsider = _register_and_login("case_outsider")

    inc, evi = _create_incident_and_evidence(owner["token"])

    # Create case
    c_res = client.post(
        "/api/v1/cases",
        headers=_auth_headers(owner["token"]),
        json={"incident_id": inc["id"], "title": "Investigation Case #1", "status": "open"},
    )
    assert c_res.status_code == 201, c_res.text
    case_id = c_res.json()["id"]

    # Valid transition open -> under_review
    tr_ok = client.patch(
        f"/api/v1/cases/{case_id}/transition",
        headers=_auth_headers(owner["token"]),
        json={"status": "under_review", "reason": "Begin forensic review"},
    )
    assert tr_ok.status_code == 200
    assert tr_ok.json()["status"] == "under_review"

    # Invalid transition under_review -> draft
    tr_bad = client.patch(
        f"/api/v1/cases/{case_id}/transition",
        headers=_auth_headers(owner["token"]),
        json={"status": "draft", "reason": "Invalid rollback"},
    )
    assert tr_bad.status_code == 422

    # Assign investigator and legal adviser
    a_inv = client.post(
        f"/api/v1/cases/{case_id}/collaborators",
        headers=_auth_headers(owner["token"]),
        json={"email": investigator["email"], "role": "investigator"},
    )
    assert a_inv.status_code == 201

    a_leg = client.post(
        f"/api/v1/cases/{case_id}/collaborators",
        headers=_auth_headers(owner["token"]),
        json={"email": legal["email"], "role": "legal_adviser"},
    )
    assert a_leg.status_code == 201

    # Outsider denied
    assert client.get(f"/api/v1/cases/{case_id}/workspace", headers=_auth_headers(outsider["token"])).status_code == 403

    # Investigator can view workspace and add note
    assert client.get(f"/api/v1/cases/{case_id}/workspace", headers=_auth_headers(investigator["token"])).status_code == 200
    note_res = client.post(
        f"/api/v1/cases/{case_id}/notes",
        headers=_auth_headers(investigator["token"]),
        json={"note_type": "investigation", "content": "Verified SHA-256 hash matches upload.", "evidence_id": evi["id"]},
    )
    assert note_res.status_code == 201

    # Legal adviser cannot transition case status
    leg_tr = client.patch(
        f"/api/v1/cases/{case_id}/transition",
        headers=_auth_headers(legal["token"]),
        json={"status": "closed", "reason": "Unauthorized"},
    )
    assert leg_tr.status_code == 403

    # Revoke investigator -> loses access
    rev = client.delete(
        f"/api/v1/cases/{case_id}/collaborators/{investigator['user']['id']}",
        headers=_auth_headers(owner["token"]),
    )
    assert rev.status_code == 200
    assert client.get(f"/api/v1/cases/{case_id}/workspace", headers=_auth_headers(investigator["token"])).status_code == 403

    # Chain of custody records & verification
    c1 = client.post(
        f"/api/v1/evidence/{evi['id']}/custody",
        headers=_auth_headers(owner["token"]),
        json={"action": "evidence_verified", "case_id": case_id, "purpose": "Integrity audit"},
    )
    assert c1.status_code == 201
    c2 = client.post(
        f"/api/v1/evidence/{evi['id']}/custody",
        headers=_auth_headers(owner["token"]),
        json={"action": "evidence_exported", "case_id": case_id, "purpose": "Authority submission"},
    )
    assert c2.status_code == 201
    verify = client.get(f"/api/v1/evidence/{evi['id']}/custody/verify", headers=_auth_headers(owner["token"]))
    assert verify.status_code == 200
    assert verify.json()["chain_valid"] is True
    assert verify.json()["hashed_records"] >= 2

    # Source-linked Investigation Summary
    rep = client.get(f"/api/v1/cases/{case_id}/investigation-summary", headers=_auth_headers(owner["token"]))
    assert rep.status_code == 200
    rep_json = rep.json()
    assert "not automatically court-admissible" in rep_json["disclaimer"]
    assert len(rep_json["evidence_references"]) >= 1
