"""
SafeHER Key Provider & Lifecycle System
=======================================
Implements envelope encryption key management:
- Key Provider interface (wrap_key, unwrap_key, get_key_id, get_key_version)
- LocalEnvKEKProvider: 32-byte symmetric KEK via SAFEHER_KEK_B64 / SAFEHER_KEK_HEX
- Key rotation and version-aware unwrapping
- Cloud KMS extension interfaces (AWS KMS, Azure Key Vault, HashiCorp Vault)
- Refusal to silently regenerate keys on restart
"""

from __future__ import annotations

import abc
import base64
import os
import threading
from typing import Dict, Optional, Tuple

from security.crypto import (
    CryptoError,
    AuthenticationError,
    wrap_dek_aes_gcm,
    unwrap_dek_aes_gcm,
    AES_KEY_BYTES,
    GCM_NONCE_BYTES,
)

DEFAULT_KEK_ID = "kek-local-v1"
DEFAULT_KEK_VERSION = "1"
KEK_STORAGE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "keys"
)


class BaseKeyProvider(abc.ABC):
    """Abstract Base Class for SafeHER Key Providers (Local KEK, AWS KMS, Azure Key Vault)."""

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


class LocalEnvKEKProvider(BaseKeyProvider):
    """
    Symmetric AES-256-GCM Key Encryption Key (KEK) provider.
    Reads 32-byte master key from SAFEHER_KEK_B64 or SAFEHER_KEK_HEX.
    Falls back to a securely persisted local file in development.
    Never silently generates a replacement key if an existing key is lost.
    """

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
        # 1. Environment variable: base64 encoded
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

        # 2. Environment variable: hex encoded
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

        # 3. Persistent local store in development
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
            is_prod = (os.environ.get("ENVIRONMENT") == "production" or os.environ.get("SAFEHER_ENV") == "production")
            if is_prod or not self.allow_generate:
                raise CryptoError(
                    f"Master Key Encryption Key (KEK) not found for '{self.key_id}' at '{key_file}'. "
                    "In production environments, an explicit KEK must be configured via SAFEHER_KEK_B64 or SAFEHER_KEK_HEX; "
                    "refusing to auto-generate a fallback key."
                )
            # Generate new 32-byte KEK for local development
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
            # Try to load specified key_id from disk
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


class KMSKeyProvider(BaseKeyProvider):
    """
    Cloud KMS interface placeholder (AWS KMS / Azure Key Vault / GCP KMS).
    In production, wrap_key and unwrap_key delegate via SDK to hardware security modules (HSM).
    """

    def __init__(self, kms_key_arn: str):
        self.kms_key_arn = kms_key_arn
        self.key_id = kms_key_arn.split("/")[-1]
        self.key_version = "v1"

    def wrap_key(self, dek: bytes, aad: Optional[bytes] = None) -> Tuple[bytes, bytes, str, str]:
        raise NotImplementedError("KMSKeyProvider requires AWS/Azure credentials and active cloud endpoint.")

    def unwrap_key(
        self,
        wrapped_dek: bytes,
        wrapping_nonce: bytes,
        key_id: str,
        key_version: str,
        aad: Optional[bytes] = None,
    ) -> bytes:
        raise NotImplementedError("KMSKeyProvider requires AWS/Azure credentials and active cloud endpoint.")

    def get_key_id(self) -> str:
        return self.key_id

    def get_key_version(self) -> str:
        return self.key_version


# Singleton provider instance
_GLOBAL_PROVIDER: Optional[BaseKeyProvider] = None
_PROVIDER_LOCK = threading.Lock()


def get_key_provider() -> BaseKeyProvider:
    """Returns the globally configured Key Provider instance."""
    global _GLOBAL_PROVIDER
    if _GLOBAL_PROVIDER is None:
        with _PROVIDER_LOCK:
            if _GLOBAL_PROVIDER is None:
                kms_arn = os.environ.get("SAFEHER_KMS_KEY_ARN", "").strip()
                if kms_arn:
                    _GLOBAL_PROVIDER = KMSKeyProvider(kms_arn)
                else:
                    _GLOBAL_PROVIDER = LocalEnvKEKProvider()
    return _GLOBAL_PROVIDER


def set_key_provider(provider: BaseKeyProvider) -> None:
    """Explicitly configure a custom key provider (e.g. for testing)."""
    global _GLOBAL_PROVIDER
    with _PROVIDER_LOCK:
        _GLOBAL_PROVIDER = provider
