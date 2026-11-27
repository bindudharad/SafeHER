"""
SafeHER External Emergency SMS Provider Layer
=============================================
Implements a clean provider abstraction for emergency SMS notifications:
- BaseSmsProvider: abstract interface (send_sms, health_check)
- TwilioSmsProvider: production Twilio REST API adapter with timeout, rate-limit,
  sandbox/test-credential support, and signature verification
- UnconfiguredSmsProvider: explicit unconfigured state (never fakes delivery)

Privacy & Safety Rules:
- Never log raw phone numbers, auth tokens, or message bodies containing PII.
- Never include survivor identity, case details, or evidence contents in SMS text.
- Never represent a queued or submitted message as delivered; only provider-confirmed
  status callbacks or provider responses can mark a message 'delivered'.
"""

from __future__ import annotations

import abc
import logging
import os
import re
import secrets
from dataclasses import dataclass
from typing import Any, Dict, Optional

logger = logging.getLogger("safeher.safety.sms")

E164_RE = re.compile(r"^\+[1-9]\d{6,14}$")


class SmsProviderError(Exception):
    """Base error for SMS delivery failures."""

    def __init__(self, message: str, retryable: bool = True, error_code: Optional[str] = None):
        super().__init__(message)
        self.retryable = retryable
        self.error_code = error_code


class SmsRateLimitError(SmsProviderError):
    """Raised when the SMS gateway rate-limits requests."""


class SmsConfigurationError(SmsProviderError):
    """Raised when SMS provider credentials or sender configuration are missing/invalid."""

    def __init__(self, message: str):
        super().__init__(message, retryable=False, error_code="CONFIG_ERROR")


@dataclass
class SmsSendResult:
    provider: str
    provider_message_sid: Optional[str]
    status: str  # 'queued', 'processing', 'sent', 'delivered', 'failed'
    raw_status: str


def normalize_e164(phone_number: str) -> str:
    """Normalizes a phone number to E.164 format and validates it."""
    cleaned = re.sub(r"[\s\-\(\)]", "", (phone_number or "").strip())
    if not cleaned.startswith("+") and len(cleaned) == 10 and cleaned.isdigit():
        # Default to +91 (India) if 10-digit local number? No: require explicit country code or +1/+91?
        # Keep strict E.164 validation, or allow 10-digit only if prefixed; better: require '+' or raise ValueError
        raise ValueError("Phone number must be in E.164 format starting with '+' and country code (e.g. +919876543210 or +15005550006).")
    if not E164_RE.match(cleaned):
        raise ValueError("Invalid E.164 phone number format.")
    return cleaned


def mask_phone(phone_number: str) -> str:
    """Masks a phone number for safe logging and UI summaries."""
    s = (phone_number or "").strip()
    if len(s) <= 4:
        return "****"
    return f"{'*' * max(4, len(s) - 4)}{s[-4:]}"


def generate_reference_code() -> str:
    """Generates a non-guessable short reference token for emergency SMS messages."""
    return f"SH-{secrets.token_urlsafe(6).upper()}"


def build_minimal_emergency_sms(event_type: str, reference_code: str) -> str:
    """
    Constructs a minimal, privacy-preserving emergency SMS body.
    Never includes survivor name, case details, or evidence contents.
    """
    if event_type == "journey_escalation":
        return (
            f"SafeHER Safety Alert: A trusted contact missed a scheduled check-in. "
            f"Ref: {reference_code}. Please check on them."
        )
    if event_type == "manual_sos":
        return (
            f"SafeHER Urgent Alert: A trusted contact triggered an emergency check-in request. "
            f"Ref: {reference_code}. Please reach out to them."
        )
    raise ValueError(f"Unsupported emergency event_type: {event_type}")


def map_twilio_status(twilio_status: Optional[str]) -> str:
    """Maps Twilio message statuses to SafeHER's canonical notification states."""
    st = (twilio_status or "").strip().lower()
    if st in ("accepted", "scheduled", "queued"):
        return "queued"
    if st in ("sending",):
        return "processing"
    if st in ("sent",):
        return "sent"
    if st in ("delivered",):
        return "delivered"
    if st in ("undelivered", "failed", "canceled"):
        return "failed"
    return "queued"


class BaseSmsProvider(abc.ABC):
    provider_name: str = "base"

    @abc.abstractmethod
    def is_configured(self) -> bool:
        pass

    @abc.abstractmethod
    def send_sms(
        self,
        to_phone: str,
        body: str,
        correlation_id: str,
        status_callback_url: Optional[str] = None,
    ) -> SmsSendResult:
        pass

    @abc.abstractmethod
    def health_check(self) -> Dict[str, Any]:
        pass


class UnconfiguredSmsProvider(BaseSmsProvider):
    provider_name = "unconfigured"

    def is_configured(self) -> bool:
        return False

    def send_sms(
        self,
        to_phone: str,
        body: str,
        correlation_id: str,
        status_callback_url: Optional[str] = None,
    ) -> SmsSendResult:
        raise SmsConfigurationError(
            "External SMS provider is not configured. Supply TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER."
        )

    def health_check(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "configured": False,
            "status": "unconfigured",
            "sandbox_mode": False,
            "message": "External SMS delivery is unconfigured; supply provider credentials to enable.",
        }


class TwilioSmsProvider(BaseSmsProvider):
    """
    Production Twilio SMS Gateway Adapter.
    Supports both live Twilio accounts and Twilio official Test Credentials / Magic Numbers.
    """

    provider_name = "twilio"

    def __init__(
        self,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
        from_number: Optional[str] = None,
        messaging_service_sid: Optional[str] = None,
        timeout_seconds: float = 10.0,
        sandbox_mode: Optional[bool] = None,
        client: Optional[Any] = None,
    ):
        self.account_sid = (account_sid or os.environ.get("TWILIO_ACCOUNT_SID", "")).strip()
        self.auth_token = (auth_token or os.environ.get("TWILIO_AUTH_TOKEN", "")).strip()
        self.from_number = (from_number or os.environ.get("TWILIO_FROM_NUMBER", "")).strip()
        self.messaging_service_sid = (
            messaging_service_sid or os.environ.get("TWILIO_MESSAGING_SERVICE_SID", "")
        ).strip()
        self.timeout_seconds = float(os.environ.get("SAFEHER_SMS_TIMEOUT_SECONDS", timeout_seconds))
        if sandbox_mode is None:
            self.sandbox_mode = os.environ.get("SAFEHER_SMS_SANDBOX_MODE", "false").lower() in ("true", "1")
        else:
            self.sandbox_mode = sandbox_mode
        self._client = client

    def is_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and (self.from_number or self.messaging_service_sid))

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client
        if not self.is_configured():
            raise SmsConfigurationError(
                "Twilio credentials incomplete: require TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER (or TWILIO_MESSAGING_SERVICE_SID)."
            )
        from twilio.http.http_client import TwilioHttpClient
        from twilio.rest import Client

        http_client = TwilioHttpClient(timeout=self.timeout_seconds)
        self._client = Client(self.account_sid, self.auth_token, http_client=http_client)
        return self._client

    def send_sms(
        self,
        to_phone: str,
        body: str,
        correlation_id: str,
        status_callback_url: Optional[str] = None,
    ) -> SmsSendResult:
        normalized_to = normalize_e164(to_phone)
        client = self._get_client()

        kwargs: Dict[str, Any] = {
            "to": normalized_to,
            "body": body,
        }
        if self.messaging_service_sid:
            kwargs["messaging_service_sid"] = self.messaging_service_sid
        else:
            kwargs["from_"] = self.from_number

        cb_url = status_callback_url or os.environ.get("SAFEHER_SMS_STATUS_CALLBACK_URL", "").strip()
        if cb_url:
            kwargs["status_callback"] = cb_url

        try:
            msg = client.messages.create(**kwargs)
            raw_status = str(getattr(msg, "status", "queued") or "queued")
            mapped_status = map_twilio_status(raw_status)
            sid = getattr(msg, "sid", None)
            logger.info(
                "sms_event=send provider=twilio correlation_id=%s recipient=%s status=%s sid=%s",
                correlation_id,
                mask_phone(normalized_to),
                mapped_status,
                sid,
            )
            return SmsSendResult(
                provider=self.provider_name,
                provider_message_sid=sid,
                status=mapped_status,
                raw_status=raw_status,
            )
        except Exception as exc:
            from twilio.base.exceptions import TwilioRestException

            if isinstance(exc, TwilioRestException):
                status_code = getattr(exc, "status", None)
                err_code = str(getattr(exc, "code", "") or "")
                logger.warning(
                    "sms_event=provider_error provider=twilio correlation_id=%s recipient=%s http_status=%s code=%s",
                    correlation_id,
                    mask_phone(normalized_to),
                    status_code,
                    err_code,
                )
                if status_code == 429:
                    raise SmsRateLimitError(
                        f"Twilio rate limit exceeded (HTTP 429, code {err_code}).",
                        retryable=True,
                        error_code=err_code,
                    ) from exc
                # Non-retryable client errors (invalid 'To' number, unverified trial number, etc.)
                retryable = status_code is None or status_code >= 500
                raise SmsProviderError(
                    f"Twilio API error (HTTP {status_code}, code {err_code}).",
                    retryable=retryable,
                    error_code=err_code,
                ) from exc

            logger.warning(
                "sms_event=network_error provider=twilio correlation_id=%s recipient=%s error_type=%s",
                correlation_id,
                mask_phone(normalized_to),
                type(exc).__name__,
            )
            raise SmsProviderError(
                f"Twilio transport/timeout error: {type(exc).__name__}",
                retryable=True,
                error_code="TRANSPORT_ERROR",
            ) from exc

    def validate_webhook_signature(self, url: str, params: Dict[str, Any], signature: str) -> bool:
        if not self.auth_token or not signature:
            return False
        from twilio.request_validator import RequestValidator

        return bool(RequestValidator(self.auth_token).validate(url, params, signature))

    def health_check(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "provider": self.provider_name,
            "configured": configured,
            "status": "operational" if configured else "unconfigured",
            "sandbox_mode": self.sandbox_mode,
            "from_configured": bool(self.from_number or self.messaging_service_sid),
        }


_SMS_PROVIDER_OVERRIDE: Optional[BaseSmsProvider] = None


def get_sms_provider() -> BaseSmsProvider:
    if _SMS_PROVIDER_OVERRIDE is not None:
        return _SMS_PROVIDER_OVERRIDE

    provider_name = os.environ.get("SAFEHER_SMS_PROVIDER", "").strip().lower()
    if provider_name == "twilio" or (
        not provider_name and os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    ):
        provider = TwilioSmsProvider()
        if provider.is_configured():
            return provider
    return UnconfiguredSmsProvider()


def set_sms_provider(provider: Optional[BaseSmsProvider]) -> None:
    global _SMS_PROVIDER_OVERRIDE
    _SMS_PROVIDER_OVERRIDE = provider
