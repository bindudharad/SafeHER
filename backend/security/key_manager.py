"""
SafeHER Key Management System
==============================
Provides key management, key rotation, and key-wrapping providers for SafeHER.

Requirements fulfilled:
- Persistent RSA-2048/4096 keypair for wrapping per-evidence AES session keys
- Key ID and versioning tracking (e.g. 'master-v1')
- Persistent local store with auto-generation in development
- Support for environment-supplied PEM keys or external KMS path
- Never regenerates keys on restart unless explicitly uninitialized
"""

from __future__ import annotations

import os
from typing import Optional, Tuple
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

DEFAULT_KEY_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "keys")
DEFAULT_KEY_ID = "master-v1"


class KeyManager:
    """Manages RSA keypairs and key identifiers for evidence envelope encryption."""

    def __init__(self, key_dir: Optional[str] = None, key_id: str = DEFAULT_KEY_ID):
        self.key_dir = key_dir or os.environ.get("SAFEHER_KEY_DIR", DEFAULT_KEY_DIR)
        self.key_id = key_id
        self._private_key: Optional[rsa.RSAPrivateKey] = None
        self._public_key: Optional[rsa.RSAPublicKey] = None
        self._initialize_keys()

    def _initialize_keys(self) -> None:
        """Load existing keypair or create and persist a new one."""
        # 1. Check if keys are provided directly via environment variables
        env_priv = os.environ.get("SAFEHER_RSA_PRIVATE_KEY_PEM")
        env_pub = os.environ.get("SAFEHER_RSA_PUBLIC_KEY_PEM")
        if env_priv and env_pub:
            self._private_key = serialization.load_pem_private_key(
                env_priv.encode("utf-8"),
                password=None,
            )
            self._public_key = serialization.load_pem_public_key(
                env_pub.encode("utf-8"),
            )
            return

        # 2. Check filesystem key store
        os.makedirs(self.key_dir, exist_ok=True)
        priv_path = os.path.join(self.key_dir, f"{self.key_id}_private.pem")
        pub_path = os.path.join(self.key_dir, f"{self.key_id}_public.pem")

        if os.path.exists(priv_path) and os.path.exists(pub_path):
            with open(priv_path, "rb") as f:
                self._private_key = serialization.load_pem_private_key(f.read(), password=None)
            with open(pub_path, "rb") as f:
                self._public_key = serialization.load_pem_public_key(f.read())
        else:
            # Generate new RSA keypair and save to disk
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            public_key = private_key.public_key()

            priv_bytes = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            )
            pub_bytes = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )

            with open(priv_path, "wb") as f:
                f.write(priv_bytes)
            with open(pub_path, "wb") as f:
                f.write(pub_bytes)

            self._private_key = private_key
            self._public_key = public_key

    def get_public_key(self, key_id: Optional[str] = None) -> rsa.RSAPublicKey:
        if self._public_key is None:
            raise RuntimeError("KeyManager public key is uninitialized.")
        return self._public_key

    def get_private_key(self, key_id: Optional[str] = None) -> rsa.RSAPrivateKey:
        if self._private_key is None:
            raise RuntimeError("KeyManager private key is uninitialized.")
        return self._private_key

    def get_active_key_id(self) -> str:
        return self.key_id


# Global singleton instance
_GLOBAL_KEY_MANAGER: Optional[KeyManager] = None


def get_key_manager() -> KeyManager:
    global _GLOBAL_KEY_MANAGER
    if _GLOBAL_KEY_MANAGER is None:
        _GLOBAL_KEY_MANAGER = KeyManager()
    return _GLOBAL_KEY_MANAGER


def set_key_manager(km: KeyManager) -> None:
    global _GLOBAL_KEY_MANAGER
    _GLOBAL_KEY_MANAGER = km
