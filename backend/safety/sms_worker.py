"""
SafeHER Durable Emergency SMS Queue & Background Worker
=======================================================
Provides:
- SQLite-backed durable notification queue (`sms_notifications`) surviving restarts
- Idempotency via unique `idempotency_key` (prevents duplicate emergency SMS)
- Bounded retries with exponential backoff and dead-letter state (`dead_letter`)
- Automatic monitoring of expired `journey_checkins` to trigger escalation alerts
- Strict enforcement of verified trusted contacts (`is_verified == 1`)
- Safe logging without secrets or survivor PII
"""

from __future__ import annotations

import datetime
import hashlib
import logging
import os
import secrets
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

from db import get_db
from safety.sms_service import (
    SmsConfigurationError,
    SmsProviderError,
    build_minimal_emergency_sms,
    generate_reference_code,
    get_sms_provider,
    map_twilio_status,
    mask_phone,
    normalize_e164,
)

logger = logging.getLogger("safeher.safety.sms_worker")

DEFAULT_MAX_ATTEMPTS = 3
BASE_RETRY_SECONDS = 5


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _utc_iso(dt: Optional[datetime.datetime] = None) -> str:
    return (dt or _utc_now()).isoformat()


def hash_verification_code(code: str) -> str:
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()


def request_contact_verification(contact_id: str, user_id: str) -> Dict[str, Any]:
    """
    Generates a 6-digit verification OTP for a trusted contact, stores its SHA-256 hash,
    and queues a verification SMS if an external SMS provider is configured.
    Never exposes the OTP in production API responses when SMS is configured.
    """
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM trusted_contacts WHERE id = ? AND user_id = ?",
            (str(contact_id), str(user_id)),
        ).fetchone()
        if not row:
            raise ValueError("Trusted contact not found.")

        phone = normalize_e164(row["phone_number"])
        otp = f"{secrets.randbelow(900000) + 100000}"
        otp_hash = hash_verification_code(otp)
        expires_iso = _utc_iso(_utc_now() + datetime.timedelta(minutes=15))

        conn.execute(
            """
            UPDATE trusted_contacts
            SET verification_code_hash = ?, verification_expires_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (otp_hash, expires_iso, str(contact_id), str(user_id)),
        )

    provider = get_sms_provider()
    if not provider.is_configured():
        return {
            "contact_id": contact_id,
            "recipient_masked": mask_phone(phone),
            "provider_configured": False,
            "status": "provider_unconfigured",
            "expires_at": expires_iso,
            "message": "External SMS provider is not configured. Verification SMS was not sent.",
        }

    notif = enqueue_sms_notification(
        user_id=user_id,
        contact_id=contact_id,
        to_phone=phone,
        event_type="contact_verification",
        idempotency_key=f"verify:{contact_id}:{otp_hash[:12]}",
        custom_body=f"SafeHER Verification Code: {otp}. Valid for 15 minutes.",
    )
    return {
        "contact_id": contact_id,
        "recipient_masked": mask_phone(phone),
        "provider_configured": True,
        "notification_id": notif["id"],
        "status": notif["status"],
        "expires_at": expires_iso,
    }


def verify_contact_code(contact_id: str, user_id: str, code: str) -> bool:
    """Verifies a trusted contact's 6-digit OTP and marks the contact as verified."""
    now_dt = _utc_now()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM trusted_contacts WHERE id = ? AND user_id = ?",
            (str(contact_id), str(user_id)),
        ).fetchone()
        if not row:
            return False
        stored_hash = row["verification_code_hash"]
        expires_at = row["verification_expires_at"]
        if not stored_hash or not expires_at:
            return False
        exp_dt = datetime.datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if now_dt > exp_dt:
            return False
        if hash_verification_code(code) != stored_hash:
            return False

        conn.execute(
            """
            UPDATE trusted_contacts
            SET is_verified = 1,
                verified_at = ?,
                verification_code_hash = NULL,
                verification_expires_at = NULL
            WHERE id = ? AND user_id = ?
            """,
            (_utc_iso(now_dt), str(contact_id), str(user_id)),
        )
        return True


def enqueue_sms_notification(
    user_id: str,
    to_phone: str,
    event_type: str,
    idempotency_key: str,
    contact_id: Optional[str] = None,
    journey_id: Optional[str] = None,
    custom_body: Optional[str] = None,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
) -> Dict[str, Any]:
    """
    Enqueues an SMS notification into the durable SQLite queue with idempotency protection.
    If `idempotency_key` already exists, returns the existing notification record without duplicating.
    """
    normalized_phone = normalize_e164(to_phone)
    masked = mask_phone(normalized_phone)
    ref_code = generate_reference_code()
    body = custom_body or build_minimal_emergency_sms(event_type, ref_code)
    now_iso = _utc_iso()
    notif_id = f"sms-{uuid.uuid4().hex[:10]}"
    corr_id = f"corr-{uuid.uuid4().hex[:12]}"
    provider = get_sms_provider()

    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM sms_notifications WHERE idempotency_key = ?",
            (idempotency_key,),
        ).fetchone()
        if existing:
            return _sanitize_notification_row(dict(existing))

        conn.execute(
            """
            INSERT INTO sms_notifications (
                id, user_id, contact_id, journey_id, correlation_id, idempotency_key,
                event_type, recipient_masked, recipient_phone_e164, message_body,
                reference_code, provider, status, attempts, max_attempts,
                next_retry_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?, ?, ?)
            """,
            (
                notif_id,
                str(user_id),
                str(contact_id) if contact_id else None,
                str(journey_id) if journey_id else None,
                corr_id,
                idempotency_key,
                event_type,
                masked,
                normalized_phone,
                body,
                ref_code,
                provider.provider_name,
                max_attempts,
                now_iso,
                now_iso,
                now_iso,
            ),
        )
        row = conn.execute("SELECT * FROM sms_notifications WHERE id = ?", (notif_id,)).fetchone()
        return _sanitize_notification_row(dict(row))


def enqueue_emergency_alerts_for_user(
    user_id: str,
    event_type: str,
    idempotency_prefix: str,
    journey_id: Optional[str] = None,
    specific_contact_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Enqueues emergency SMS alerts ONLY to verified contacts with notify_on_escalation=1.
    Never sends to unverified numbers.
    """
    with get_db() as conn:
        if specific_contact_id:
            contacts = conn.execute(
                """
                SELECT * FROM trusted_contacts
                WHERE id = ? AND user_id = ? AND is_verified = 1 AND notify_on_escalation = 1
                """,
                (str(specific_contact_id), str(user_id)),
            ).fetchall()
        else:
            contacts = conn.execute(
                """
                SELECT * FROM trusted_contacts
                WHERE user_id = ? AND is_verified = 1 AND notify_on_escalation = 1
                ORDER BY created_at ASC
                """,
                (str(user_id),),
            ).fetchall()

    if not contacts:
        return {
            "queued_count": 0,
            "notifications": [],
            "reason": "No verified trusted contacts with escalation notifications enabled.",
        }

    queued: List[Dict[str, Any]] = []
    for c in contacts:
        idem_key = f"{idempotency_prefix}:{c['id']}"
        notif = enqueue_sms_notification(
            user_id=user_id,
            contact_id=c["id"],
            journey_id=journey_id,
            to_phone=c["phone_number"],
            event_type=event_type,
            idempotency_key=idem_key,
        )
        queued.append(notif)

    return {
        "queued_count": len(queued),
        "notifications": queued,
        "provider_configured": get_sms_provider().is_configured(),
    }


def list_user_notifications(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT * FROM sms_notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (str(user_id), limit),
        ).fetchall()
        return [_sanitize_notification_row(dict(r)) for r in rows]


def update_notification_status_from_webhook(
    provider_message_sid: str,
    provider_status: str,
    error_message: Optional[str] = None,
) -> bool:
    """Updates notification status from an authenticated provider delivery callback."""
    canonical = map_twilio_status(provider_status)
    now_iso = _utc_iso()
    with get_db() as conn:
        if canonical == "delivered":
            cur = conn.execute(
                """
                UPDATE sms_notifications
                SET status = 'delivered', delivered_at = ?, updated_at = ?
                WHERE provider_message_sid = ?
                """,
                (now_iso, now_iso, provider_message_sid),
            )
        elif canonical == "failed":
            cur = conn.execute(
                """
                UPDATE sms_notifications
                SET status = 'failed', last_error = ?, updated_at = ?
                WHERE provider_message_sid = ?
                """,
                (error_message or f"Provider reported {provider_status}", now_iso, provider_message_sid),
            )
        else:
            cur = conn.execute(
                """
                UPDATE sms_notifications
                SET status = ?, updated_at = ?
                WHERE provider_message_sid = ?
                """,
                (canonical, now_iso, provider_message_sid),
            )
        return cur.rowcount > 0


def _sanitize_notification_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Strips raw E.164 phone number and internal message body from API responses."""
    return {
        "id": row["id"],
        "contact_id": row["contact_id"],
        "journey_id": row["journey_id"],
        "correlation_id": row["correlation_id"],
        "event_type": row["event_type"],
        "recipient_masked": row["recipient_masked"],
        "reference_code": row["reference_code"],
        "provider": row["provider"],
        "provider_message_sid": row["provider_message_sid"],
        "status": row["status"],
        "attempts": row["attempts"],
        "max_attempts": row["max_attempts"],
        "last_error": row["last_error"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "sent_at": row["sent_at"],
        "delivered_at": row["delivered_at"],
    }


class SmsQueueWorker:
    """Background worker processing expired journey escalations and queued SMS messages."""

    def __init__(self, poll_interval_seconds: float = 5.0):
        self.poll_interval_seconds = poll_interval_seconds
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._running = False

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, name="SafeHER-SMS-Worker", daemon=True)
        self._thread.start()
        self._running = True
        logger.info("SMS background worker started.")

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3.0)
        self._running = False

    def is_running(self) -> bool:
        return self._running and bool(self._thread and self._thread.is_alive())

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                self.check_expired_journeys()
                self.process_pending_once()
            except Exception as exc:
                logger.error("SMS worker loop error: %s", exc)
            self._stop_event.wait(self.poll_interval_seconds)

    def check_expired_journeys(self) -> int:
        """Finds active journeys past expires_at, marks them expired, and enqueues escalation SMS."""
        now_iso = _utc_iso()
        triggered = 0
        with get_db() as conn:
            expired_rows = conn.execute(
                "SELECT * FROM journey_checkins WHERE status = 'active' AND expires_at < ?",
                (now_iso,),
            ).fetchall()

        for j in expired_rows:
            with get_db() as conn:
                cur = conn.execute(
                    "UPDATE journey_checkins SET status = 'expired' WHERE id = ? AND status = 'active'",
                    (j["id"],),
                )
                if cur.rowcount == 0:
                    continue
            enqueue_emergency_alerts_for_user(
                user_id=j["user_id"],
                event_type="journey_escalation",
                idempotency_prefix=f"journey_exp:{j['id']}",
                journey_id=j["id"],
                specific_contact_id=j["contact_id"],
            )
            triggered += 1
        return triggered

    def process_pending_once(self, batch_size: int = 10) -> int:
        """Processes due queued/retrying SMS notifications once. Returns count processed."""
        now_dt = _utc_now()
        now_iso = _utc_iso(now_dt)
        provider = get_sms_provider()
        processed = 0

        with get_db() as conn:
            rows = conn.execute(
                """
                SELECT * FROM sms_notifications
                WHERE status = 'queued' AND (next_retry_at IS NULL OR next_retry_at <= ?)
                ORDER BY created_at ASC
                LIMIT ?
                """,
                (now_iso, batch_size),
            ).fetchall()

        for row in rows:
            notif_id = row["id"]
            attempts = int(row["attempts"]) + 1
            max_attempts = int(row["max_attempts"])

            with get_db() as conn:
                cur = conn.execute(
                    """
                    UPDATE sms_notifications
                    SET status = 'processing', attempts = ?, updated_at = ?
                    WHERE id = ? AND status = 'queued'
                    """,
                    (attempts, now_iso, notif_id),
                )
                if cur.rowcount == 0:
                    continue

            try:
                res = provider.send_sms(
                    to_phone=row["recipient_phone_e164"],
                    body=row["message_body"],
                    correlation_id=row["correlation_id"],
                )
                done_iso = _utc_iso()
                with get_db() as conn:
                    conn.execute(
                        """
                        UPDATE sms_notifications
                        SET provider = ?,
                            provider_message_sid = ?,
                            status = ?,
                            sent_at = CASE WHEN ? IN ('sent', 'delivered') THEN ? ELSE sent_at END,
                            delivered_at = CASE WHEN ? = 'delivered' THEN ? ELSE delivered_at END,
                            last_error = NULL,
                            updated_at = ?
                        WHERE id = ?
                        """,
                        (
                            res.provider,
                            res.provider_message_sid,
                            res.status,
                            res.status,
                            done_iso,
                            res.status,
                            done_iso,
                            done_iso,
                            notif_id,
                        ),
                    )
            except SmsConfigurationError as exc:
                with get_db() as conn:
                    conn.execute(
                        """
                        UPDATE sms_notifications
                        SET status = 'failed', last_error = ?, updated_at = ?
                        WHERE id = ?
                        """,
                        (str(exc), _utc_iso(), notif_id),
                    )
            except SmsProviderError as exc:
                err_iso = _utc_iso()
                if exc.retryable and attempts < max_attempts:
                    backoff_sec = BASE_RETRY_SECONDS * (2 ** (attempts - 1))
                    next_retry = _utc_iso(_utc_now() + datetime.timedelta(seconds=backoff_sec))
                    new_status = "queued"
                else:
                    next_retry = None
                    new_status = "dead_letter" if attempts >= max_attempts else "failed"

                with get_db() as conn:
                    conn.execute(
                        """
                        UPDATE sms_notifications
                        SET status = ?, next_retry_at = ?, last_error = ?, updated_at = ?
                        WHERE id = ?
                        """,
                        (new_status, next_retry, str(exc), err_iso, notif_id),
                    )
            processed += 1

        return processed


_GLOBAL_SMS_WORKER = SmsQueueWorker()


def get_sms_worker() -> SmsQueueWorker:
    return _GLOBAL_SMS_WORKER


def get_sms_operational_health() -> Dict[str, Any]:
    provider_health = get_sms_provider().health_check()
    with get_db() as conn:
        counts = conn.execute(
            """
            SELECT status, COUNT(*) as cnt
            FROM sms_notifications
            GROUP BY status
            """
        ).fetchall()
    queue_stats = {r["status"]: r["cnt"] for r in counts}
    return {
        "service": "emergency_sms",
        "provider": provider_health,
        "worker_running": _GLOBAL_SMS_WORKER.is_running(),
        "queue_counts": {
            "queued": queue_stats.get("queued", 0),
            "processing": queue_stats.get("processing", 0),
            "sent": queue_stats.get("sent", 0),
            "delivered": queue_stats.get("delivered", 0),
            "failed": queue_stats.get("failed", 0),
            "dead_letter": queue_stats.get("dead_letter", 0),
        },
    }
