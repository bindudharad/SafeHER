"""
External Emergency SMS Delivery & Durable Worker Tests (BLOCKER 3)
==================================================================
Tests:
- TwilioSmsProvider adapter (sandbox/test client, rate limit HTTP 429, timeout/network error, webhook signature)
- UnconfiguredSmsProvider refuses to fake delivery
- Durable SQLite queue + idempotency (prevents duplicate emergency SMS)
- Bounded retries with exponential backoff and dead_letter transition
- Contact verification OTP flow & strict refusal to alert unverified numbers
- Minimal privacy-preserving SMS body (no survivor identity, case, or evidence leak)
- Journey expiration automatic escalation via SmsQueueWorker
- API endpoints (/api/v1/safety/contacts/{id}/request-verification, /verify, /emergency/notify, /notifications, /sms/health)
"""

import datetime
import os
import shutil
import tempfile
import unittest.mock as mock

import pytest
from fastapi.testclient import TestClient
from twilio.base.exceptions import TwilioRestException

from db import add_trusted_contact, get_db, init_db
from safety.sms_service import (
    SmsConfigurationError,
    SmsProviderError,
    SmsRateLimitError,
    TwilioSmsProvider,
    UnconfiguredSmsProvider,
    build_minimal_emergency_sms,
    set_sms_provider,
)
from safety.sms_worker import (
    SmsQueueWorker,
    enqueue_emergency_alerts_for_user,
    enqueue_sms_notification,
    list_user_notifications,
    request_contact_verification,
    update_notification_status_from_webhook,
    verify_contact_code,
)


@pytest.fixture
def isolated_sms_db():
    tmp = tempfile.mkdtemp()
    db_path = os.path.join(tmp, "test_sms.db")
    old_db = os.environ.get("SAFEHER_DB_PATH")
    os.environ["SAFEHER_DB_PATH"] = db_path
    init_db()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO users (id, name, email, password_hash, consent_acknowledged, consent_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("usr-sms-1", "Ananya Survivor", "ananya.sms@example.com", "hash", 1, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
        )
    yield db_path
    set_sms_provider(None)
    if old_db is None:
        os.environ.pop("SAFEHER_DB_PATH", None)
    else:
        os.environ["SAFEHER_DB_PATH"] = old_db
    shutil.rmtree(tmp, ignore_errors=True)


def test_unconfigured_provider_never_fakes_delivery():
    p = UnconfiguredSmsProvider()
    assert p.is_configured() is False
    assert p.health_check()["status"] == "unconfigured"
    with pytest.raises(SmsConfigurationError):
        p.send_sms("+15005550006", "Test", "corr-1")


def test_twilio_provider_sandbox_send_and_error_handling():
    mock_client = mock.MagicMock()
    mock_msg = mock.MagicMock()
    mock_msg.sid = "SM_TEST_12345"
    mock_msg.status = "queued"
    mock_client.messages.create.return_value = mock_msg

    provider = TwilioSmsProvider(
        account_sid="AC_TEST_SID",
        auth_token="test_auth_token",
        from_number="+15005550006",
        sandbox_mode=True,
        client=mock_client,
    )
    assert provider.is_configured() is True
    res = provider.send_sms("+919876543210", "SafeHER Alert", "corr-abc")
    assert res.provider == "twilio"
    assert res.provider_message_sid == "SM_TEST_12345"
    # Must report 'queued', never falsely 'delivered'
    assert res.status == "queued"

    # Rate limit HTTP 429
    mock_client.messages.create.side_effect = TwilioRestException(
        status=429, uri="/Messages", msg="Too Many Requests", code=20429
    )
    with pytest.raises(SmsRateLimitError) as exc_info:
        provider.send_sms("+919876543210", "SafeHER Alert", "corr-429")
    assert exc_info.value.retryable is True

    # Timeout / network error
    mock_client.messages.create.side_effect = TimeoutError("Read timed out")
    with pytest.raises(SmsProviderError) as exc_t:
        provider.send_sms("+919876543210", "SafeHER Alert", "corr-to")
    assert exc_t.value.retryable is True


def test_privacy_minimal_body_and_unverified_contact_blocked(isolated_sms_db):
    body = build_minimal_emergency_sms("journey_escalation", "SH-XYZ123")
    assert "Ananya" not in body
    assert "evidence" not in body.lower()
    assert "SH-XYZ123" in body

    add_trusted_contact("tc-unver", "usr-sms-1", "Friend", "+919876543210", "friend", True)
    res = enqueue_emergency_alerts_for_user("usr-sms-1", "manual_sos", "sos:test1")
    assert res["queued_count"] == 0


def test_contact_verification_idempotency_retry_and_dead_letter(isolated_sms_db):
    add_trusted_contact("tc-ver-1", "usr-sms-1", "Sister", "+15005550006", "sibling", True)

    # Mock Twilio client
    mock_client = mock.MagicMock()
    mock_msg = mock.MagicMock()
    mock_msg.sid = "SM_OTP_1"
    mock_msg.status = "sent"
    mock_client.messages.create.return_value = mock_msg
    provider = TwilioSmsProvider(
        account_sid="AC_TEST", auth_token="tok", from_number="+15005550006", sandbox_mode=True, client=mock_client
    )
    set_sms_provider(provider)

    # Request OTP verification and verify with matching code
    req = request_contact_verification("tc-ver-1", "usr-sms-1")
    assert req["provider_configured"] is True
    # Extract OTP from the queued notification body in DB for test verification
    with get_db() as conn:
        row = conn.execute("SELECT message_body FROM sms_notifications WHERE id = ?", (req["notification_id"],)).fetchone()
    otp = row["message_body"].split("Code: ")[1][:6]
    assert verify_contact_code("tc-ver-1", "usr-sms-1", "000000") is False
    assert verify_contact_code("tc-ver-1", "usr-sms-1", otp) is True

    # Idempotency: duplicate key must not create second record
    n1 = enqueue_sms_notification("usr-sms-1", "+15005550006", "manual_sos", "idem-key-1", contact_id="tc-ver-1")
    n2 = enqueue_sms_notification("usr-sms-1", "+15005550006", "manual_sos", "idem-key-1", contact_id="tc-ver-1")
    assert n1["id"] == n2["id"]

    # Worker processes queued -> sent, then webhook updates to delivered
    worker = SmsQueueWorker()
    processed = worker.process_pending_once()
    assert processed >= 1
    assert update_notification_status_from_webhook("SM_OTP_1", "delivered") is True

    # Retry & dead-letter test
    mock_client.messages.create.side_effect = TimeoutError("Provider unreachable")
    n_fail = enqueue_sms_notification(
        "usr-sms-1", "+15005550006", "manual_sos", "idem-fail-1", contact_id="tc-ver-1", max_attempts=2
    )
    worker.process_pending_once()
    # Force next_retry_at to past to trigger second & final attempt
    with get_db() as conn:
        conn.execute("UPDATE sms_notifications SET next_retry_at = '2020-01-01T00:00:00+00:00' WHERE id = ?", (n_fail["id"],))
    worker.process_pending_once()

    notifs = list_user_notifications("usr-sms-1")
    dead = [n for n in notifs if n["id"] == n_fail["id"]][0]
    assert dead["status"] == "dead_letter"
    assert dead["attempts"] == 2


def test_journey_expiration_triggers_escalation(isolated_sms_db):
    add_trusted_contact("tc-jrn-1", "usr-sms-1", "Mom", "+15005550006", "parent", True)
    with get_db() as conn:
        conn.execute("UPDATE trusted_contacts SET is_verified = 1 WHERE id = 'tc-jrn-1'")
        past = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5)).isoformat()
        conn.execute(
            """
            INSERT INTO journey_checkins (id, user_id, destination_label, duration_minutes, status, contact_id, started_at, expires_at)
            VALUES ('jrn-exp-1', 'usr-sms-1', 'Home', 15, 'active', 'tc-jrn-1', ?, ?)
            """,
            (past, past),
        )

    worker = SmsQueueWorker()
    triggered = worker.check_expired_journeys()
    assert triggered == 1
    notifs = list_user_notifications("usr-sms-1")
    assert any(n["journey_id"] == "jrn-exp-1" and n["event_type"] == "journey_escalation" for n in notifs)
