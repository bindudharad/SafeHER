"""
SafeHER Integrity & Cryptographic Hashing Engine
================================================
Tamper-evident verification primitives:
- SHA-256 integrity fingerprinting for in-memory and streaming media
- Constant-time hash comparison (mitigating timing attacks)
- RSA-PSS digital signatures over evidence digests
"""

from __future__ import annotations

import hashlib
import hmac
import os
from typing import Optional, Union

from security.crypto import rsa_sign, rsa_verify, CryptoError
from security.key_manager import get_key_manager

_CHUNK_SIZE = 1024 * 1024  # 1 MB streaming chunks


def calculate_sha256_bytes(data: bytes) -> str:
    """Return lowercase hex-encoded SHA-256 digest of data in memory."""
    return hashlib.sha256(data).hexdigest()


def calculate_sha256_file(file_path: Union[str, os.PathLike]) -> str:
    """Stream a file from disk and return its hex-encoded SHA-256 digest."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(_CHUNK_SIZE):
            h.update(chunk)
    return h.hexdigest()


def verify_sha256(expected_hash: str, actual_hash: str) -> bool:
    """Constant-time comparison of two SHA-256 hex strings."""
    if not expected_hash or not actual_hash:
        return False
    return hmac.compare_digest(expected_hash.strip().lower(), actual_hash.strip().lower())


def sign_evidence_hash(sha256_hex: str) -> str:
    """
    Generate an RSA-PSS digital signature over the evidence SHA-256 hex digest.
    Returns the signature encoded as lowercase hex.
    """
    km = get_key_manager()
    priv_key = km.get_private_key()
    sig_bytes = rsa_sign(priv_key, sha256_hex.encode("ascii"))
    return sig_bytes.hex()


def verify_evidence_signature(sha256_hex: str, signature_hex: str) -> bool:
    """
    Verify an RSA-PSS digital signature over the evidence SHA-256 digest.
    """
    if not signature_hex:
        return False
    km = get_key_manager()
    pub_key = km.get_public_key()
    try:
        sig_bytes = bytes.fromhex(signature_hex.strip())
        return rsa_verify(pub_key, sig_bytes, sha256_hex.encode("ascii"))
    except Exception:
        return False
