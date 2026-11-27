"""
SafeHER End-to-End 20-Step Synthetic User Workflow Test (Section 12)
====================================================================
Exercises the complete survivor + forensic journey from registration to
token revocation using isolated synthetic data.
"""

from __future__ import annotations

import io
import os
import sys
import uuid

from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from db import init_db


def _make_sample_jpeg() -> bytes:
    img = Image.new("RGB", (96, 96), color=(60, 110, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def test_complete_20_step_user_journey():
    init_db()
    client = TestClient(app)

    email_a = f"e2e_a_{uuid.uuid4().hex[:8]}@example.com"
    email_b = f"e2e_b_{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword!123"

    # 1. Register User A & User B
    r_reg_a = client.post(
        "/api/v1/auth/register",
        json={"email": email_a, "password": password, "name": "Survivor A", "consent_acknowledged": True},
    )
    assert r_reg_a.status_code == 201
    r_reg_b = client.post(
        "/api/v1/auth/register",
        json={"email": email_b, "password": password, "name": "Other User B", "consent_acknowledged": True},
    )
    assert r_reg_b.status_code == 201
    headers_b = {"Authorization": f"Bearer {r_reg_b.json()['access_token']}"}

    # 2. Sign in as User A
    r_login = client.post("/api/v1/auth/login", json={"email": email_a, "password": password})
    assert r_login.status_code == 200
    token_a = r_login.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 3. Create an Incident
    r_inc = client.post(
        "/api/v1/incidents",
        json={
            "title": "E2E Synthetic Extortion Incident",
            "category": "blackmail_extortion",
            "description": "Synthetic E2E test incident for full workflow verification.",
            "platform": "WhatsApp",
            "incident_date": "2026-11-27",
        },
        headers=headers_a,
    )
    assert r_inc.status_code == 201
    inc_id = r_inc.json()["id"]

    # 4. Create a Case
    r_case = client.post(
        "/api/v1/cases",
        json={"title": "E2E Case File", "incident_id": inc_id, "priority": "high"},
        headers=headers_a,
    )
    assert r_case.status_code == 201
    case_id = r_case.json()["id"]

    # 5-6. Upload & Encrypt Evidence
    jpeg_bytes = _make_sample_jpeg()
    r_up = client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        files={"file": ("e2e_evidence.jpg", jpeg_bytes, "image/jpeg")},
        headers=headers_a,
    )
    assert r_up.status_code == 201
    evi_data = r_up.json()
    evi_id = evi_data["id"]
    assert evi_data["storage_status"] == "stored_encrypted"

    # Link evidence to case
    r_link = client.post(
        f"/api/v1/cases/{case_id}/evidence",
        json={"evidence_id": evi_id},
        headers=headers_a,
    )
    assert r_link.status_code == 201

    # 7. Verify Integrity Receipt & Forensic Metadata
    r_rcpt = client.get(f"/api/v1/evidence/{evi_id}/receipt", headers=headers_a)
    assert r_rcpt.status_code == 200
    assert r_rcpt.json()["sha256_hash"] == evi_data["sha256_hash"]

    r_meta = client.get(f"/api/v1/evidence/{evi_id}/metadata", headers=headers_a)
    assert r_meta.status_code == 200
    assert r_meta.json()["file_type"]["detected_mime"] == "image/jpeg"
    assert r_meta.json()["perceptual_hashes"]["available"] is True

    # 8-11. Run Media Analysis (C2PA + RetinaFace + AI)
    r_media = client.post(
        "/api/v1/analysis/media",
        data={"evidence_id": evi_id, "media_type": "image"},
        headers=headers_a,
    )
    assert r_media.status_code == 201
    media_json = r_media.json()
    assert "c2pa_provenance" in media_json

    # 12. Analyze Multilingual Text
    r_nlp = client.post(
        "/api/v1/analysis/threat",
        json={
            "text": "Send 5000 rupees or else I will leak your private photos online",
            "incident_id": inc_id,
        },
        headers=headers_a,
    )
    assert r_nlp.status_code == 201
    assert r_nlp.json()["severity"] in ("URGENT_REVIEW", "HIGH", "MEDIUM")
    assert "FINANCIAL_EXTORTION" in r_nlp.json()["predicted_categories"]

    # 13. View Evidence Graph
    r_sync = client.post(f"/api/v1/graph/incidents/{inc_id}/sync", headers=headers_a)
    assert r_sync.status_code == 200
    r_graph = client.get(f"/api/v1/graph/incidents/{inc_id}", headers=headers_a)
    assert r_graph.status_code == 200
    assert len(r_graph.json()["nodes"]) >= 1

    # 14. Reconstruct & Review Timeline
    r_tl_rec = client.post(f"/api/v1/incidents/{inc_id}/timeline/reconstruct", headers=headers_a)
    assert r_tl_rec.status_code == 200
    r_tl = client.get(f"/api/v1/incidents/{inc_id}/timeline/normalized", headers=headers_a)
    assert r_tl.status_code == 200

    # 15-17. Add Case Note/Annotation, Verify Custody & Investigation Summary
    r_note = client.post(
        f"/api/v1/cases/{case_id}/notes",
        json={"content": "Verified SHA-256 and magic-byte JPEG header.", "note_type": "investigation", "evidence_id": evi_id},
        headers=headers_a,
    )
    assert r_note.status_code == 201

    r_cust = client.get(f"/api/v1/evidence/{evi_id}/custody/verify", headers=headers_a)
    assert r_cust.status_code == 200

    r_sum = client.get(f"/api/v1/cases/{case_id}/investigation-summary", headers=headers_a)
    assert r_sum.status_code == 200

    # 18 & 20. Cross-user unauthorized access rejected
    assert client.get(f"/api/v1/incidents/{inc_id}", headers=headers_b).status_code in (403, 404)
    assert client.get(f"/api/v1/evidence/{evi_id}/metadata", headers=headers_b).status_code in (403, 404)
    assert client.get(f"/api/v1/cases/{case_id}/workspace", headers=headers_b).status_code in (403, 404)

    # 19. Logout & Token Revocation
    r_out = client.post("/api/v1/auth/logout", headers=headers_a)
    assert r_out.status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers_a).status_code == 401
