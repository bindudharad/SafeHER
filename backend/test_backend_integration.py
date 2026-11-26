import hashlib
import io
import os
import tempfile
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

# Configure isolated test DB & storage BEFORE importing app
_tmp_dir = tempfile.mkdtemp(prefix="safeher_test_")
os.environ["SAFEHER_DB_PATH"] = os.path.join(_tmp_dir, "test_safeher.db")
os.environ["SAFEHER_STORAGE_DIR"] = os.path.join(_tmp_dir, "evidence_storage")
os.environ["SAFEHER_SEED_DEMO"] = "false"

from app import app  # noqa: E402
from db import init_db  # noqa: E402


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        yield c


def _make_test_png_bytes(color=(139, 124, 255)) -> bytes:
    img = Image.new("RGB", (64, 64), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _register_and_login(client: TestClient, name: str, email: str, password: str = "StrongPass123!") -> str:
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "name": name,
            "email": email,
            "password": password,
            "consent_acknowledged": True,
        },
    )
    assert reg.status_code == 201, reg.text
    return reg.json()["access_token"]


def test_health_and_root(client: TestClient):
    r_root = client.get("/")
    assert r_root.status_code == 200
    assert r_root.json()["status"] == "ok"

    r_health = client.get("/api/v1/health")
    assert r_health.status_code == 200
    data = r_health.json()
    assert data["database"] == "connected"
    assert "text_model" in data["ai"]
    assert "image_model" in data["ai"]


def test_auth_and_cross_user_isolation(client: TestClient):
    # Unauthenticated access blocked
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/incidents").status_code == 401

    token_a = _register_and_login(client, "User A", "usera@example.com")
    token_b = _register_and_login(client, "User B", "userb@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates an incident
    inc_res = client.post(
        "/api/v1/incidents",
        headers=headers_a,
        json={
            "title": "Harassment on Instagram",
            "category": "harassment",
            "description": "Repeated abusive messages from unknown account.",
            "platform": "Instagram",
            "incident_date": "2026-11-20",
            "relevant_urls": ["https://instagram.com/fake_handle"],
        },
    )
    assert inc_res.status_code == 201
    inc_a_id = inc_res.json()["id"]

    # User B cannot see or access User A's incident
    assert client.get("/api/v1/incidents", headers=headers_b).json() == []
    assert client.get(f"/api/v1/incidents/{inc_a_id}", headers=headers_b).status_code == 404


def test_evidence_upload_integrity_download_and_delete(client: TestClient):
    token = _register_and_login(client, "Evidence User", "evidence@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    inc_id = client.post(
        "/api/v1/incidents",
        headers=headers,
        json={
            "title": "Deepfake Image Report",
            "category": "deepfake_media",
            "description": "Altered portrait shared without consent.",
            "platform": "Telegram",
            "incident_date": "2026-11-21",
        },
    ).json()["id"]

    png_bytes = _make_test_png_bytes()
    sha256_hex = hashlib.sha256(png_bytes).hexdigest()

    # Mismatched SHA-256 must fail
    bad_hash_res = client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        headers=headers,
        files={"file": ("sample.png", png_bytes, "image/png")},
        data={"sha256": "0" * 64},
    )
    assert bad_hash_res.status_code == 400

    # Unsupported extension must fail
    bad_ext_res = client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        headers=headers,
        files={"file": ("malware.exe", b"MZ...", "application/octet-stream")},
    )
    assert bad_ext_res.status_code == 422

    # Valid upload
    up_res = client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        headers=headers,
        files={"file": ("sample.png", png_bytes, "image/png")},
        data={"sha256": sha256_hex, "notes": "Original screenshot"},
    )
    assert up_res.status_code == 201, up_res.text
    evi = up_res.json()
    assert evi["sha256_hash"] == sha256_hex
    assert evi["duplicate_status"] == "unique"

    # Duplicate upload flagged
    dup_res = client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        headers=headers,
        files={"file": ("sample_copy.png", png_bytes, "image/png")},
        data={"sha256": sha256_hex},
    )
    assert dup_res.status_code == 201
    assert dup_res.json()["duplicate_status"] == "duplicate"

    # Download verifies exact unmodified bytes
    dl_res = client.get(f"/api/v1/evidence/{evi['id']}/download", headers=headers)
    assert dl_res.status_code == 200
    assert dl_res.content == png_bytes

    # Delete removes evidence
    del_res = client.delete(f"/api/v1/evidence/{evi['id']}", headers=headers)
    assert del_res.status_code == 200
    assert client.get(f"/api/v1/evidence/{evi['id']}/download", headers=headers).status_code == 404


def test_ai_text_analysis_real_model_and_validation(client: TestClient):
    token = _register_and_login(client, "AI Text User", "aitext@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Empty text rejected
    assert (
        client.post(
            "/api/v1/analysis/threat",
            headers=headers,
            json={"text": "   "},
        ).status_code
        == 422
    )

    # Real Mem_1 toxic-bert inference on threatening text
    res = client.post(
        "/api/v1/analysis/threat",
        headers=headers,
        json={
            "text": "Pay 0.5 BTC or I will destroy your reputation and leak your photos."
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["decision"] in {"SAFE", "WARNING", "BLOCKED"}
    assert body["urgency_level"] in {"low", "medium", "high", "critical"}
    assert len(body["limitations"]) >= 1

    # Persisted in history
    hist = client.get("/api/v1/analysis/history", headers=headers)
    assert hist.status_code == 200
    assert len(hist.json()["threat_analyses"]) == 1


def test_ai_image_validation_and_schema(client: TestClient):
    token = _register_and_login(client, "AI Image User", "aiimage@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Invalid image bytes rejected cleanly with 422
    bad_img = client.post(
        "/api/v1/analysis/media",
        headers=headers,
        files={"file": ("not_an_image.txt", b"hello world", "text/plain")},
    )
    assert bad_img.status_code == 422

    # Valid PNG with mocked image pipeline to test schema + persistence deterministically
    png_bytes = _make_test_png_bytes()
    with patch("ai_service._get_image_pipeline") as mock_pipe:
        mock_pipe.return_value = lambda img: [
            {"label": "normal", "score": 0.94},
            {"label": "nsfw", "score": 0.06},
        ]
        res = client.post(
            "/api/v1/analysis/media",
            headers=headers,
            files={"file": ("portrait.png", png_bytes, "image/png")},
        )
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["is_calibrated"] is False
        assert data["nudity_score"] == 0.06
        assert data["decision"] in {"SAFE", "SUSPICIOUS", "BLOCKED"}
        assert len(data["limitations"]) >= 1


def test_complaints_cases_reporting_and_dashboard_workflow(client: TestClient):
    token = _register_and_login(client, "Workflow User", "workflow@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create incident
    inc = client.post(
        "/api/v1/incidents",
        headers=headers,
        json={
            "title": "WhatsApp Extortion",
            "category": "blackmail_extortion",
            "description": "Demand for money with threat to circulate edited photos.",
            "platform": "WhatsApp",
            "incident_date": "2026-11-22",
        },
    ).json()

    # 2. Upload evidence
    png_bytes = _make_test_png_bytes()
    evi = client.post(
        f"/api/v1/incidents/{inc['id']}/evidence",
        headers=headers,
        files={"file": ("chat_proof.png", png_bytes, "image/png")},
    ).json()

    # 3. Generate & confirm complaint
    cmp_res = client.post(
        "/api/v1/complaints/generate",
        headers=headers,
        json={
            "incident_id": inc["id"],
            "evidence_ids": [evi["id"]],
            "confirmed_facts": "Unknown sender demanded payment via WhatsApp.",
        },
    )
    assert cmp_res.status_code == 201
    draft = cmp_res.json()
    assert evi["sha256_hash"] in draft["full_draft_text"]
    assert draft["is_user_confirmed"] is False

    upd_cmp = client.put(
        f"/api/v1/complaints/{draft['id']}",
        headers=headers,
        json={
            "full_draft_text": draft["full_draft_text"] + "\nConfirmed by user.",
            "is_user_confirmed": True,
        },
    )
    assert upd_cmp.status_code == 200
    assert upd_cmp.json()["is_user_confirmed"] is True

    # 4. Record external submission -> updates Case status automatically
    rep_res = client.post(
        "/api/v1/reporting/records",
        headers=headers,
        json={
            "incident_id": inc["id"],
            "destination_id": "dest-ncrp-india",
            "destination_name": "National Cyber Crime Reporting Portal (India)",
            "reference_number": "NCRP-2026-998811",
            "submission_date": "2026-11-25",
            "follow_up_date": "2026-12-02",
        },
    )
    assert rep_res.status_code == 201

    cases = client.get("/api/v1/cases", headers=headers).json()
    assert len(cases) == 1
    assert cases[0]["status"] == "submitted_by_user"
    assert cases[0]["reporting_references"][0]["ref_number"] == "NCRP-2026-998811"

    # 5. Dashboard reflects real counts
    summary = client.get("/api/v1/dashboard/summary", headers=headers).json()
    assert summary["total_incidents"] == 1
    assert summary["evidence_items"] == 1
    assert summary["active_cases"] == 1
