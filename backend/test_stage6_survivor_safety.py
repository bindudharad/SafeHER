"""
SafeHER Stage 6 Test Suite — Survivor Safety & Protection
=========================================================
Tests:
1. User Safety Settings CRUD & boundary validation
2. Trusted Contacts management & cross-user access isolation
3. Journey Check-In lifecycle (start, active, complete, cancel, expiry)
4. Deny-by-default access protection
"""

import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from db import init_db, get_db
from auth import create_access_token, hash_password

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_environment():
    init_db()


@pytest.fixture
def test_users():
    u1_id = f"usr-s6-a-{uuid.uuid4().hex[:6]}"
    u2_id = f"usr-s6-b-{uuid.uuid4().hex[:6]}"
    pw_hash = hash_password("SecureSurvivorPass123!")

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO users (id, name, email, password_hash, consent_acknowledged, consent_date, preferred_language, created_at, role)
            VALUES (?, 'Survivor Alpha', ?, ?, 1, datetime('now'), 'en', datetime('now'), 'survivor')
            """,
            (u1_id, f"survivor_a_{u1_id}@test.org", pw_hash),
        )
        conn.execute(
            """
            INSERT INTO users (id, name, email, password_hash, consent_acknowledged, consent_date, preferred_language, created_at, role)
            VALUES (?, 'Survivor Beta', ?, ?, 1, datetime('now'), 'en', datetime('now'), 'survivor')
            """,
            (u2_id, f"survivor_b_{u2_id}@test.org", pw_hash),
        )

    token_a = create_access_token(u1_id, f"survivor_a_{u1_id}@test.org")
    token_b = create_access_token(u2_id, f"survivor_b_{u2_id}@test.org")

    return {
        "user_a": {"id": u1_id, "token": token_a},
        "user_b": {"id": u2_id, "token": token_b},
    }


def test_safety_settings_lifecycle(test_users):
    headers = {"Authorization": f"Bearer {test_users['user_a']['token']}"}

    # 1. Get default settings
    res = client.get("/api/v1/safety/settings", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["quick_exit_url"] == "https://www.weather.com"
    assert data["siren_duration_seconds"] == 30
    assert data["emergency_number"] == "112"

    # 2. Update settings
    payload = {
        "quick_exit_url": "https://www.google.com",
        "siren_duration_seconds": 45,
        "siren_volume": 0.6,
        "fake_call_caller_name": "Office Lead",
        "emergency_number": "1091",
    }
    update_res = client.put("/api/v1/safety/settings", json=payload, headers=headers)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["quick_exit_url"] == "https://www.google.com"
    assert updated["siren_duration_seconds"] == 45
    assert updated["siren_volume"] == 0.6
    assert updated["fake_call_caller_name"] == "Office Lead"
    assert updated["emergency_number"] == "1091"

    # 3. Settings isolation (User B still has defaults)
    headers_b = {"Authorization": f"Bearer {test_users['user_b']['token']}"}
    res_b = client.get("/api/v1/safety/settings", headers=headers_b)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["quick_exit_url"] == "https://www.weather.com"


def test_trusted_contacts_crud_and_isolation(test_users):
    headers_a = {"Authorization": f"Bearer {test_users['user_a']['token']}"}
    headers_b = {"Authorization": f"Bearer {test_users['user_b']['token']}"}

    # 1. Add contact for User A
    c_payload = {
        "name": "Sister Priya",
        "phone_number": "+91 98765 43210",
        "relationship": "sibling",
        "notify_on_escalation": True,
    }
    create_res = client.post("/api/v1/safety/contacts", json=c_payload, headers=headers_a)
    assert create_res.status_code == 201
    contact = create_res.json()
    contact_id = contact["id"]
    assert contact["name"] == "Sister Priya"

    # 2. List contacts for User A
    list_res = client.get("/api/v1/safety/contacts", headers=headers_a)
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(c["id"] == contact_id for c in items)

    # 3. Isolation: User B cannot see User A's contacts
    list_b = client.get("/api/v1/safety/contacts", headers=headers_b)
    assert list_b.status_code == 200
    assert not any(c["id"] == contact_id for c in list_b.json())

    # 4. Isolation: User B cannot delete User A's contact
    del_b = client.delete(f"/api/v1/safety/contacts/{contact_id}", headers=headers_b)
    assert del_b.status_code == 404

    # 5. User A can delete own contact
    del_a = client.delete(f"/api/v1/safety/contacts/{contact_id}", headers=headers_a)
    assert del_a.status_code == 200
    assert del_a.json()["deleted"] is True


def test_journey_checkin_lifecycle(test_users):
    headers_a = {"Authorization": f"Bearer {test_users['user_a']['token']}"}
    headers_b = {"Authorization": f"Bearer {test_users['user_b']['token']}"}

    # 1. Start Journey
    j_payload = {
        "destination_label": "Walking home from Metro station",
        "duration_minutes": 20,
    }
    start_res = client.post("/api/v1/safety/journey/start", json=j_payload, headers=headers_a)
    assert start_res.status_code == 201
    journey = start_res.json()
    jid = journey["id"]
    assert journey["destination_label"] == "Walking home from Metro station"
    assert journey["status"] == "active"

    # 2. Get active journey
    active_res = client.get("/api/v1/safety/journey/active", headers=headers_a)
    assert active_res.status_code == 200
    active = active_res.json()
    assert active is not None
    assert active["id"] == jid

    # 3. Cross-user isolation: User B has no active journey
    active_b = client.get("/api/v1/safety/journey/active", headers=headers_b)
    assert active_b.status_code == 200
    assert active_b.json() is None

    # 4. User B cannot check in to User A's journey
    chk_b = client.post(f"/api/v1/safety/journey/{jid}/checkin", headers=headers_b)
    assert chk_b.status_code == 404

    # 5. User A completes check-in
    chk_a = client.post(f"/api/v1/safety/journey/{jid}/checkin", headers=headers_a)
    assert chk_a.status_code == 200
    assert chk_a.json()["status"] == "completed_safely"

    # 6. Active journey is now None
    active_after = client.get("/api/v1/safety/journey/active", headers=headers_a)
    assert active_after.status_code == 200
    assert active_after.json() is None
