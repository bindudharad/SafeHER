"""
SafeHER Key Provider & Lifecycle System
=======================================
Implements envelope encryption key management:
- Key Provider interface (wrap_key, unwrap_key, get_key_id, get_key_version, health_check)
- LocalEnvKEKProvider: 32-byte symmetric KEK via SAFEHER_KEK_B64 / SAFEHER_KEK_HEX
- AwsKmsKeyProvider: Production AWS KMS envelope encryption using boto3
- Extensible provider registry (AWS KMS, Azure Key Vault, Google Cloud KMS)
- Key rotation, DEK re-wrapping (kms:ReEncrypt), and legacy local-key read compatibility
- Refusal to silently fall back to weaker providers when Cloud KMS is unavailable
"""

from __future__ import annotations

import abc
import base64
import logging
import os
import threading
import time
from typing import Any, Dict, Optional, Tuple

from security.crypto import (
    CryptoError,
    AuthenticationError,
    wrap_dek_aes_gcm,
    unwrap_dek_aes_gcm,
    AES_KEY_BYTES,
)

logger = logging.getLogger("safeher.security.kms")

DEFAULT_KEK_ID = "kek-local-v1"
DEFAULT_KEK_VERSION = "1"
KMS_WRAPPING_NONCE_SENTINEL = b"aws-kms-env1"  # 12-byte sentinel for DB/API compatibility
KEK_STORAGE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "keys"
)


class KMSUnavailableError(CryptoError):
    """Raised when the configured Cloud KMS endpoint cannot be reached or times out."""


class KMSAccessError(CryptoError):
    """Raised when Cloud KMS denies access, or the key is disabled/revoked/pending deletion."""


class BaseKeyProvider(abc.ABC):
    """Abstract Base Class for SafeHER Key Providers (Local KEK, AWS KMS, Azure Key Vault, GCP KMS)."""

    provider_name: str = "base"

    @abc.abstractmethod
    def wrap_key(self, dek: bytes, aad: Optional[bytes] = None) -> Tuple[bytes, bytes, str, str]:
        """
        Wraps a 256-bit DEK.
        Returns: (wrapped_dek, wrapping_nonce, key_id, key_version)
        """
        pass

    @abc.abstractmethod
    def unwrap_key(
        self,
        wrapped_dek: bytes,
        wrapping_nonce: bytes,
        key_id: str,
        key_version: str,
        aad: Optional[bytes] = None,
    ) -> bytes:
        """
        Unwraps a wrapped DEK given its wrapping nonce, key_id, and key_version.
        Returns the original 256-bit DEK.
        """
        pass

    @abc.abstractmethod
    def get_key_id(self) -> str:
        """Returns active Key Identifier."""
        pass

    @abc.abstractmethod
    def get_key_version(self) -> str:
        """Returns active Key Version."""
        pass

    def health_check(self) -> Dict[str, Any]:
        """Reports provider configuration and live connectivity state."""
        return {
            "provider": self.provider_name,
            "status": "operational",
            "key_id": self.get_key_id(),
            "key_version": self.get_key_version(),
        }


class LocalEnvKEKProvider(BaseKeyProvider):
    """
    Symmetric AES-256-GCM Key Encryption Key (KEK) provider.
    Reads 32-byte master key from SAFEHER_KEK_B64 or SAFEHER_KEK_HEX.
    Falls back to a securely persisted local file in development.
    Never silently generates a replacement key if an existing key is lost.
    """

    provider_name = "local_env"

    def __init__(
        self,
        key_id: str = DEFAULT_KEK_ID,
        key_version: str = DEFAULT_KEK_VERSION,
        keys_dir: Optional[str] = None,
        key_file_path: Optional[str] = None,
        allow_generate: bool = True,
    ):
        self.key_id = key_id
        self.key_version = key_version
        self.key_file_path = key_file_path
        self.allow_generate = allow_generate
        self.keys_dir = keys_dir or os.environ.get("SAFEHER_KEY_DIR", KEK_STORAGE_DIR)
        self._keys: Dict[str, bytes] = {}  # key_id -> 32-byte key
        self._load_keys()

    def _load_keys(self) -> None:
        """Loads and validates the active KEK from environment or persistent file."""
        b64_val = os.environ.get("SAFEHER_KEK_B64")
        if b64_val:
            try:
                raw = base64.b64decode(b64_val.strip())
                if len(raw) != AES_KEY_BYTES:
                    raise CryptoError(
                        f"SAFEHER_KEK_B64 must decode to exactly {AES_KEY_BYTES} bytes, got {len(raw)}"
                    )
                self._keys[self.key_id] = raw
                return
            except Exception as e:
                raise CryptoError(f"Failed to decode SAFEHER_KEK_B64: {e}") from e

        hex_val = os.environ.get("SAFEHER_KEK_HEX")
        if hex_val:
            try:
                raw = bytes.fromhex(hex_val.strip())
                if len(raw) != AES_KEY_BYTES:
                    raise CryptoError(
                        f"SAFEHER_KEK_HEX must decode to exactly {AES_KEY_BYTES} bytes, got {len(raw)}"
                    )
                self._keys[self.key_id] = raw
                return
            except Exception as e:
                raise CryptoError(f"Failed to decode SAFEHER_KEK_HEX: {e}") from e

        if self.key_file_path:
            key_file = self.key_file_path
        else:
            os.makedirs(self.keys_dir, exist_ok=True)
            key_file = os.path.join(self.keys_dir, f"{self.key_id}.key")

        if os.path.exists(key_file):
            with open(key_file, "rb") as f:
                raw = f.read()
            if len(raw) != AES_KEY_BYTES:
                raise CryptoError(
                    f"Corrupt KEK file at '{key_file}': expected {AES_KEY_BYTES} bytes, found {len(raw)}. "
                    "Refusing to start with invalid key."
                )
            self._keys[self.key_id] = raw
        else:
            is_prod = (
                os.environ.get("ENVIRONMENT") == "production"
                or os.environ.get("SAFEHER_ENV") == "production"
            )
            if is_prod or not self.allow_generate:
                raise CryptoError(
                    f"Master Key Encryption Key (KEK) not found for '{self.key_id}' at '{key_file}'. "
                    "In production environments, an explicit KEK must be configured via SAFEHER_KEK_B64 or SAFEHER_KEK_HEX; "
                    "refusing to auto-generate a fallback key."
                )
            import secrets

            raw = secrets.token_bytes(AES_KEY_BYTES)
            os.makedirs(os.path.dirname(os.path.abspath(key_file)), exist_ok=True)
            with open(key_file, "wb") as f:
                f.write(raw)
            self._keys[self.key_id] = raw

    def wrap_key(self, dek: bytes, aad: Optional[bytes] = None) -> Tuple[bytes, bytes, str, str]:
        kek = self._keys.get(self.key_id)
        if not kek:
            raise CryptoError(f"Active KEK '{self.key_id}' is not loaded.")
        wrapped_dek, wrapping_nonce = wrap_dek_aes_gcm(kek, dek, aad=aad)
        logger.info("kms_event=wrap_key provider=local_env key_id=%s key_version=%s", self.key_id, self.key_version)
        return wrapped_dek, wrapping_nonce, self.key_id, self.key_version

    def unwrap_key(
        self,
        wrapped_dek: bytes,
        wrapping_nonce: bytes,
        key_id: str,
        key_version: str,
        aad: Optional[bytes] = None,
    ) -> bytes:
        kek = self._keys.get(key_id)
        if not kek:
            key_file = os.path.join(self.keys_dir, f"{key_id}.key")
            if os.path.exists(key_file):
                with open(key_file, "rb") as f:
                    raw = f.read()
                if len(raw) == AES_KEY_BYTES:
                    self._keys[key_id] = raw
                    kek = raw
            if not kek:
                raise CryptoError(f"Required KEK '{key_id}' is not available for evidence decryption.")

        return unwrap_dek_aes_gcm(kek, wrapped_dek, wrapping_nonce, aad=aad)

    def get_key_id(self) -> str:
        return self.key_id

    def get_key_version(self) -> str:
        return self.key_version

    def health_check(self) -> Dict[str, Any]:
        loaded = self.key_id in self._keys
        return {
            "provider": self.provider_name,
            "status": "operational" if loaded else "unavailable",
            "key_id": self.key_id,
            "key_version": self.key_version,
            "hardware_backed": False,
        }


class AwsKmsKeyProvider(BaseKeyProvider):
    """
    Production AWS KMS Key Provider using boto3.
    Supports:
    - kms:Encrypt / kms:Decrypt with EncryptionContext bound to evidence AAD
    - kms:GenerateDataKey for hardware-generated AES-256 DEKs
    - kms:ReEncrypt for zero-plaintext-exposure key rotation & rewrapping
    - kms:DescribeKey & kms:GetKeyRotationStatus for health and rotation tracking
    - Bounded retries on throttling and strict failure on outage/access denial (no silent fallback)
    """

    provider_name = "aws_kms"

    def __init__(
        self,
        kms_key_id: str,
        region_name: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        key_version: Optional[str] = None,
        timeout_seconds: float = 5.0,
        max_retries: int = 3,
        kms_client: Optional[Any] = None,
    ):
        if not kms_key_id or not kms_key_id.strip():
            raise CryptoError("AwsKmsKeyProvider requires a non-empty KMS Key ID or ARN.")
        self.kms_key_id = kms_key_id.strip()
        self.region_name = (
            region_name
            or os.environ.get("AWS_REGION")
            or os.environ.get("AWS_DEFAULT_REGION")
            or self._infer_region_from_arn(self.kms_key_id)
            or "us-east-1"
        )
        self.endpoint_url = endpoint_url or os.environ.get("SAFEHER_KMS_ENDPOINT_URL") or None
        self.key_version = key_version or os.environ.get("SAFEHER_KMS_KEY_VERSION", "1")
        self.timeout_seconds = float(os.environ.get("SAFEHER_KMS_TIMEOUT_SECONDS", timeout_seconds))
        self.max_retries = max_retries
        self._client = kms_client

    @staticmethod
    def _infer_region_from_arn(arn: str) -> Optional[str]:
        parts = arn.split(":")
        if len(parts) >= 4 and parts[0] == "arn" and parts[1].startswith("aws") and parts[2] == "kms":
            return parts[3] or None
        return None

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client
        try:
            import boto3
            from botocore.config import Config
        except ImportError as exc:
            raise CryptoError("boto3 is required for AwsKmsKeyProvider.") from exc

        cfg = Config(
            region_name=self.region_name,
            connect_timeout=self.timeout_seconds,
            read_timeout=self.timeout_seconds,
            retries={"max_attempts": self.max_retries, "mode": "standard"},
        )
        kwargs: Dict[str, Any] = {"config": cfg}
        if self.endpoint_url:
            kwargs["endpoint_url"] = self.endpoint_url
        self._client = boto3.client("kms", **kwargs)
        return self._client

    @staticmethod
    def _build_encryption_context(aad: Optional[bytes]) -> Dict[str, str]:
        if not aad:
            return {"safeher_scope": "evidence_dek"}
        return {
            "safeher_scope": "evidence_dek",
            "safeher_aad_hex": aad.hex(),
        }

    def _handle_kms_exception(self, exc: Exception, operation: str) -> None:
        """Maps botocore/KMS exceptions to safe, non-leaking CryptoError subclasses."""
        try:
            from botocore.exceptions import ClientError, BotoCoreError, EndpointConnectionError, ConnectTimeoutError, ReadTimeoutError
        except ImportError:
            raise CryptoError(f"AWS KMS {operation} failed: {exc}") from exc

        if isinstance(exc, ClientError):
            code = exc.response.get("Error", {}).get("Code", "Unknown")
            logger.error("kms_event=%s status=client_error error_code=%s key_id=%s", operation, code, self.kms_key_id)
            if code in {
                "AccessDeniedException",
                "DisabledException",
                "KMSInvalidStateException",
                "NotFoundException",
                "InvalidKeyUsageException",
            }:
                raise KMSAccessError(f"AWS KMS {operation} denied or key unavailable ({code}).") from exc
            if code in {"InvalidCiphertextException"}:
                raise AuthenticationError(f"AWS KMS {operation} failed: ciphertext or encryption context mismatch.") from exc
            if code in {"ThrottlingException", "LimitExceededException", "DependencyTimeoutException"}:
                raise KMSUnavailableError(f"AWS KMS {operation} throttled or timed out ({code}).") from exc
            raise CryptoError(f"AWS KMS {operation} failed ({code}).") from exc

        if isinstance(exc, (EndpointConnectionError, ConnectTimeoutError, ReadTimeoutError, BotoCoreError)):
            logger.error("kms_event=%s status=unavailable error_type=%s", operation, type(exc).__name__)
            raise KMSUnavailableError(f"AWS KMS {operation} service unavailable or timed out.") from exc

        logger.error("kms_event=%s status=error error_type=%s", operation, type(exc).__name__)
        raise CryptoError(f"AWS KMS {operation} failed.") from exc

    def _call_with_backoff(self, operation: str, fn: Any) -> Any:
        from botocore.exceptions import ClientError

        delay = 0.2
        for attempt in range(1, self.max_retries + 1):
            try:
                return fn()
            except ClientError as exc:
                code = exc.response.get("Error", {}).get("Code", "")
                if code in {"ThrottlingException", "LimitExceededException"} and attempt < self.max_retries:
                    time.sleep(delay)
                    delay = min(delay * 2, 2.0)
                    continue
                self._handle_kms_exception(exc, operation)
            except Exception as exc:
                self._handle_kms_exception(exc, operation)

    def generate_data_key(self, aad: Optional[bytes] = None) -> Tuple[bytes, bytes, bytes, str, str]:
        """Generates a fresh 256-bit DEK directly in AWS KMS HSM."""
        client = self._get_client()
        ctx = self._build_encryption_context(aad)
        resp = self._call_with_backoff(
            "generate_data_key",
            lambda: client.generate_data_key(
                KeyId=self.kms_key_id,
                KeySpec="AES_256",
                EncryptionContext=ctx,
            ),
        )
        resolved_key_id = resp.get("KeyId", self.kms_key_id)
        logger.info("kms_event=generate_data_key status=ok key_id=%s key_version=%s", resolved_key_id, self.key_version)
        return resp["Plaintext"], resp["CiphertextBlob"], KMS_WRAPPING_NONCE_SENTINEL, resolved_key_id, self.key_version

    def wrap_key(self, dek: bytes, aad: Optional[bytes] = None) -> Tuple[bytes, bytes, str, str]:
        if len(dek) != AES_KEY_BYTES:
            raise CryptoError(f"DEK must be {AES_KEY_BYTES} bytes, got {len(dek)}.")
        client = self._get_client()
        ctx = self._build_encryption_context(aad)
        resp = self._call_with_backoff(
            "wrap_key",
            lambda: client.encrypt(
                KeyId=self.kms_key_id,
                Plaintext=dek,
                EncryptionContext=ctx,
            ),
        )
        resolved_key_id = resp.get("KeyId", self.kms_key_id)
        logger.info("kms_event=wrap_key status=ok key_id=%s key_version=%s", resolved_key_id, self.key_version)
        return resp["CiphertextBlob"], KMS_WRAPPING_NONCE_SENTINEL, resolved_key_id, self.key_version

    def unwrap_key(
        self,
        wrapped_dek: bytes,
        wrapping_nonce: bytes,
        key_id: str,
        key_version: str,
        aad: Optional[bytes] = None,
    ) -> bytes:
        client = self._get_client()
        ctx = self._build_encryption_context(aad)
        target_key_id = key_id or self.kms_key_id
        resp = self._call_with_backoff(
            "unwrap_key",
            lambda: client.decrypt(
                CiphertextBlob=wrapped_dek,
                KeyId=target_key_id,
                EncryptionContext=ctx,
            ),
        )
        logger.info("kms_event=unwrap_key status=ok key_id=%s key_version=%s", resp.get("KeyId", target_key_id), key_version)
        return resp["Plaintext"]

    def rewrap_dek(
        self,
        wrapped_dek: bytes,
        destination_key_id: Optional[str] = None,
        aad: Optional[bytes] = None,
    ) -> Tuple[bytes, bytes, str, str]:
        """Re-encrypts a wrapped DEK under the active or destination KMS key without exposing plaintext."""
        client = self._get_client()
        ctx = self._build_encryption_context(aad)
        dest_id = destination_key_id or self.kms_key_id
        resp = self._call_with_backoff(
            "re_encrypt",
            lambda: client.re_encrypt(
                CiphertextBlob=wrapped_dek,
                DestinationKeyId=dest_id,
                SourceEncryptionContext=ctx,
                DestinationEncryptionContext=ctx,
            ),
        )
        new_version = str(int(self.key_version) + 1) if self.key_version.isdigit() else f"{self.key_version}-rot"
        resolved_dest = resp.get("KeyId", dest_id)
        logger.info("kms_event=re_encrypt status=ok key_id=%s new_version=%s", resolved_dest, new_version)
        return resp["CiphertextBlob"], KMS_WRAPPING_NONCE_SENTINEL, resolved_dest, new_version

    def enable_automatic_rotation(self) -> bool:
        """Enables AWS KMS automatic annual key rotation on the configured CMK."""
        client = self._get_client()
        self._call_with_backoff(
            "enable_key_rotation",
            lambda: client.enable_key_rotation(KeyId=self.kms_key_id),
        )
        logger.info("kms_event=enable_key_rotation status=ok key_id=%s", self.kms_key_id)
        return True

    def get_key_id(self) -> str:
        return self.kms_key_id

    def get_key_version(self) -> str:
        return self.key_version

    def health_check(self) -> Dict[str, Any]:
        try:
            client = self._get_client()
            desc = client.describe_key(KeyId=self.kms_key_id)["KeyMetadata"]
            key_state = desc.get("KeyState", "Unknown")
            rotation_enabled = False
            try:
                rot = client.get_key_rotation_status(KeyId=self.kms_key_id)
                rotation_enabled = bool(rot.get("KeyRotationEnabled", False))
            except Exception:
                rotation_enabled = False
            healthy = key_state == "Enabled"
            return {
                "provider": self.provider_name,
                "status": "operational" if healthy else "degraded",
                "key_id": desc.get("Arn", self.kms_key_id),
                "key_version": self.key_version,
                "key_state": key_state,
                "key_manager": desc.get("KeyManager", "CUSTOMER"),
                "rotation_enabled": rotation_enabled,
                "region": self.region_name,
                "hardware_backed": True,
            }
        except Exception as exc:
            return {
                "provider": self.provider_name,
                "status": "unavailable",
                "key_id": self.kms_key_id,
                "key_version": self.key_version,
                "region": self.region_name,
                "hardware_backed": True,
                "error": str(exc),
            }


class AzureKeyVaultProvider(BaseKeyProvider):
    """Extensible adapter interface for Azure Key Vault (requires azure-keyvault-keys & azure-identity)."""

    provider_name = "azure_keyvault"

    def __init__(self, vault_url: str, key_name: str, key_version: str = "1"):
        self.vault_url = vault_url
        self.key_name = key_name
        self.key_version = key_version

    def wrap_key(self, dek: bytes, aad: Optional[bytes] = None) -> Tuple[bytes, bytes, str, str]:
        raise NotImplementedError("AzureKeyVaultProvider requires azure-keyvault-keys SDK and Managed Identity configuration.")

    def unwrap_key(self, wrapped_dek: bytes, wrapping_nonce: bytes, key_id: str, key_version: str, aad: Optional[bytes] = None) -> bytes:
        raise NotImplementedError("AzureKeyVaultProvider requires azure-keyvault-keys SDK and Managed Identity configuration.")

    def get_key_id(self) -> str:
        return f"{self.vault_url}/keys/{self.key_name}"

    def get_key_version(self) -> str:
        return self.key_version


class GcpKmsKeyProvider(BaseKeyProvider):
    """Extensible adapter interface for Google Cloud KMS (requires google-cloud-kms)."""

    provider_name = "gcp_kms"

    def __init__(self, key_resource_name: str, key_version: str = "1"):
        self.key_resource_name = key_resource_name
        self.key_version = key_version

    def wrap_key(self, dek: bytes, aad: Optional[bytes] = None) -> Tuple[bytes, bytes, str, str]:
        raise NotImplementedError("GcpKmsKeyProvider requires google-cloud-kms SDK and Workload Identity / ADC configuration.")

    def unwrap_key(self, wrapped_dek: bytes, wrapping_nonce: bytes, key_id: str, key_version: str, aad: Optional[bytes] = None) -> bytes:
        raise NotImplementedError("GcpKmsKeyProvider requires google-cloud-kms SDK and Workload Identity / ADC configuration.")

    def get_key_id(self) -> str:
        return self.key_resource_name

    def get_key_version(self) -> str:
        return self.key_version


# Backward-compatible alias
KMSKeyProvider = AwsKmsKeyProvider


def is_local_key_id(key_id: Optional[str]) -> bool:
    """Returns True if the key_id belongs to the local symmetric KEK provider."""
    return bool(key_id and (key_id.startswith("kek-local") or key_id == DEFAULT_KEK_ID))


# Singleton provider instance
_GLOBAL_PROVIDER: Optional[BaseKeyProvider] = None
_PROVIDER_LOCK = threading.Lock()


def build_key_provider_from_env() -> BaseKeyProvider:
    """Constructs the configured key provider from environment variables."""
    provider_type = os.environ.get("SAFEHER_KMS_PROVIDER", "").strip().lower()
    kms_arn = os.environ.get("SAFEHER_KMS_KEY_ARN", "").strip()

    if not provider_type and kms_arn:
        provider_type = "aws"

    if provider_type in ("aws", "aws_kms"):
        if not kms_arn:
            raise CryptoError("SAFEHER_KMS_PROVIDER=aws requires SAFEHER_KMS_KEY_ARN to be configured.")
        return AwsKmsKeyProvider(kms_key_id=kms_arn)

    if provider_type in ("azure", "azure_keyvault"):
        vault_url = os.environ.get("SAFEHER_AZURE_VAULT_URL", "").strip()
        key_name = os.environ.get("SAFEHER_AZURE_KEY_NAME", "").strip()
        return AzureKeyVaultProvider(vault_url=vault_url, key_name=key_name)

    if provider_type in ("gcp", "gcp_kms"):
        gcp_key = os.environ.get("SAFEHER_GCP_KMS_KEY_NAME", "").strip()
        return GcpKmsKeyProvider(key_resource_name=gcp_key)

    return LocalEnvKEKProvider()


def get_key_provider() -> BaseKeyProvider:
    """Returns the globally configured Key Provider instance."""
    global _GLOBAL_PROVIDER
    if _GLOBAL_PROVIDER is None:
        with _PROVIDER_LOCK:
            if _GLOBAL_PROVIDER is None:
                _GLOBAL_PROVIDER = build_key_provider_from_env()
    return _GLOBAL_PROVIDER


def set_key_provider(provider: Optional[BaseKeyProvider]) -> None:
    """Explicitly configure or reset the global key provider (e.g. for testing)."""
    global _GLOBAL_PROVIDER
    with _PROVIDER_LOCK:
        _GLOBAL_PROVIDER = provider
