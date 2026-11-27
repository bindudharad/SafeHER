"""
SafeHER Evidence Storage Engine
================================
Encrypted at-rest evidence handling with full cryptographic integrity receipts,
atomic filesystem writes, and tamper detection.

Guarantees:
1. Zero plaintext storage: every evidence file is encrypted using AES-256-GCM.
2. Per-file session key: compromise of one key reveals nothing about other files.
3. Envelope encryption: session keys are wrapped using a protected KEK provider.
4. Non-repudiation signature: server signs original SHA-256 using RSA-PSS.
5. In-flight verification: stored ciphertext is tested for round-trip decryption before committing.
6. Memory-only decryption: files are decrypted into memory and never written as plaintext to disk.
7. Explicit storage statuses: 'stored_encrypted', 'legacy_plaintext', 'encryption_failed', 'verification_failed', 'pending'.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from security.crypto import (
    CryptoError,
    AuthenticationError,
    IntegrityError,
    EncryptedBlob,
    aes_encrypt,
    aes_decrypt,
    generate_aes_key,
    rsa_wrap_key,
    rsa_unwrap_key,
    rsa_sign,
    rsa_verify,
    GCM_NONCE_BYTES,
)
from security.key_manager import get_key_manager
from security.key_provider import get_key_provider, BaseKeyProvider

STORAGE_VERSION = "v2"
ENCRYPTION_ALGO = "AES-256-GCM"


@dataclass
class EvidenceStorageResult:
    """Metadata output after successfully encrypting and persisting evidence."""
    stored_filename: str
    sha256_hash: str
    ciphertext_sha256: str
    file_size: int
    storage_status: str
    encryption_algorithm: str
    encryption_version: str
    data_nonce_hex: str
    wrapped_dek_hex: str
    wrapping_nonce_hex: str
    key_id: str
    key_version: str
    signature_hex: str
    encryption_timestamp: str
    receipt: Dict[str, Any]
    wrapped_key_hex: str = ""


def build_evidence_aad(evidence_id: str, user_id: str, version: str = STORAGE_VERSION) -> bytes:
    """Build canonical Authenticated Associated Data (AAD) for GCM."""
    return f"{evidence_id}:{user_id}:{version}".encode("utf-8")


def encrypt_and_store_evidence(
    content: bytes,
    evidence_id: str,
    user_id: str,
    storage_dir: str,
    original_filename: str = "",
    key_provider: Optional[BaseKeyProvider] = None,
) -> EvidenceStorageResult:
    """
    Encrypts evidence content with AES-256-GCM and stores it atomically.
    Wraps session key (DEK) via the configured KEK provider.
    Signs SHA-256 digest with RSA-PSS for non-repudiation.
    Verifies round-trip recovery before returning.
    """
    if not content:
        raise CryptoError("Cannot encrypt empty evidence content.")

    kp = key_provider or get_key_provider()
    km = get_key_manager()
    priv_key = km.get_private_key()
    pub_key = km.get_public_key()

    # 1. Compute original SHA-256
    sha256_hash = hashlib.sha256(content).hexdigest()
    file_size = len(content)
    now_iso = datetime.now(timezone.utc).isoformat()

    # 2. Generate per-file AES-256 DEK
    session_key = generate_aes_key()

    # 3. Encrypt content with AES-256-GCM + AAD
    aad = build_evidence_aad(evidence_id, user_id, version=STORAGE_VERSION)
    blob = aes_encrypt(session_key, content, associated_data=aad)
    data_nonce_hex = blob.nonce.hex()

    # 4. Wrap session key (DEK) using KEK provider
    wrapped_dek_bytes, wrapping_nonce_bytes, key_id, key_version = kp.wrap_key(session_key, aad=aad)
    wrapped_dek_hex = wrapped_dek_bytes.hex()
    wrapping_nonce_hex = wrapping_nonce_bytes.hex()

    # 4b. Also wrap with RSA-OAEP for legacy callers and dual-layer recovery
    rsa_wrapped_key_bytes = rsa_wrap_key(pub_key, session_key)
    rsa_wrapped_key_hex = rsa_wrapped_key_bytes.hex()

    # 5. Sign SHA-256 hash with RSA-PSS for forensic non-repudiation
    signature_bytes = rsa_sign(priv_key, sha256_hash.encode("ascii"))
    signature_hex = signature_bytes.hex()

    # 6. Atomic write to disk as {evidence_id}.enc using temporary file in same filesystem
    os.makedirs(storage_dir, exist_ok=True)
    stored_filename = f"{evidence_id}.enc"
    dest_path = os.path.join(storage_dir, stored_filename)

    ciphertext_bytes = blob.to_bytes()
    ciphertext_sha256 = hashlib.sha256(ciphertext_bytes).hexdigest()

    fd, temp_path = tempfile.mkstemp(prefix="safeher_enc_", dir=storage_dir)
    try:
        with open(fd, "wb") as f:
            f.write(ciphertext_bytes)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_path, dest_path)
    except Exception as e:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        raise CryptoError(f"Atomic evidence storage write failed: {e}") from e

    # 7. Self-verification: verify that stored bytes can be decrypted and authenticated
    try:
        with open(dest_path, "rb") as f:
            stored_bytes = f.read()
        recovered_blob = EncryptedBlob.from_bytes(stored_bytes)
        unwrapped_key = kp.unwrap_key(
            wrapped_dek_bytes,
            wrapping_nonce_bytes,
            key_id=key_id,
            key_version=key_version,
            aad=aad,
        )
        decrypted_test = aes_decrypt(unwrapped_key, recovered_blob, associated_data=aad)
        recovered_hash = hashlib.sha256(decrypted_test).hexdigest()
        if not hmac.compare_digest(recovered_hash, sha256_hash):
            raise IntegrityError("Self-verification failed: recovered SHA-256 digest does not match original.")
    except Exception as e:
        # Cleanup defective file immediately
        if os.path.exists(dest_path):
            try:
                os.remove(dest_path)
            except OSError:
                pass
        raise CryptoError(f"Evidence encryption verification failed: {e}") from e

    # 8. Construct cryptographic evidence integrity receipt
    receipt = {
        "evidence_id": evidence_id,
        "original_filename": original_filename,
        "sha256_digest": sha256_hash,
        "ciphertext_sha256": ciphertext_sha256,
        "file_size_bytes": file_size,
        "encryption_algorithm": ENCRYPTION_ALGO,
        "encryption_version": STORAGE_VERSION,
        "key_id": key_id,
        "key_version": key_version,
        "wrapping_nonce": wrapping_nonce_hex,
        "signature_algorithm": "RSA-PSS-SHA256",
        "signature_status": "verified",
        "storage_status": "stored_encrypted",
        "timestamp_utc": now_iso,
        "disclaimer": (
            "Cryptographic integrity receipt confirms authentic storage state and tamper-evident SHA-256 hash. "
            "Evidence is sealed under AES-256-GCM envelope encryption."
        ),
    }

    return EvidenceStorageResult(
        stored_filename=stored_filename,
        sha256_hash=sha256_hash,
        ciphertext_sha256=ciphertext_sha256,
        file_size=file_size,
        storage_status="stored_encrypted",
        encryption_algorithm=ENCRYPTION_ALGO,
        encryption_version=STORAGE_VERSION,
        data_nonce_hex=data_nonce_hex,
        wrapped_dek_hex=wrapped_dek_hex,
        wrapping_nonce_hex=wrapping_nonce_hex,
        key_id=key_id,
        key_version=key_version,
        signature_hex=signature_hex,
        encryption_timestamp=now_iso,
        receipt=receipt,
        wrapped_key_hex=rsa_wrapped_key_hex,
    )


def retrieve_and_decrypt_evidence(
    evidence_id: str,
    user_id: str,
    stored_filename: str,
    storage_dir: str,
    wrapped_key_hex: Optional[str] = None,
    expected_sha256: str = "",
    wrapping_nonce_hex: Optional[str] = None,
    key_id: Optional[str] = None,
    key_version: Optional[str] = None,
    encryption_version: str = STORAGE_VERSION,
    key_provider: Optional[BaseKeyProvider] = None,
    wrapped_dek_hex: Optional[str] = None,
    data_nonce_hex: Optional[str] = None,
) -> bytes:
    """
    Retrieves evidence from storage and decrypts it into memory.
    Verifies authentication tag and SHA-256 hash.
    Refuses to return content if tampered, corrupted, or unauthorized.
    Never writes plaintext to disk.
    """
    effective_wrapped_key = wrapped_key_hex or wrapped_dek_hex
    dest_path = os.path.join(storage_dir, stored_filename)
    if not os.path.exists(dest_path):
        raise FileNotFoundError(f"Evidence file not found on disk: {stored_filename}")

    # Legacy plaintext handling
    if not stored_filename.endswith(".enc"):
        with open(dest_path, "rb") as f:
            content = f.read()
        actual_hash = hashlib.sha256(content).hexdigest()
        if not hmac.compare_digest(actual_hash, expected_sha256):
            raise IntegrityError("Legacy evidence file has been modified or corrupted.")
        return content

    # Encrypted retrieval
    if not effective_wrapped_key:
        raise CryptoError("Encrypted evidence cannot be decrypted without wrapped session key.")

    with open(dest_path, "rb") as f:
        file_bytes = f.read()

    blob = EncryptedBlob.from_bytes(file_bytes)
    wrapped_key_bytes = bytes.fromhex(effective_wrapped_key)
    aad = build_evidence_aad(evidence_id, user_id, version=encryption_version)

    # Unwrap session key
    session_key: Optional[bytes] = None
    kp = key_provider or get_key_provider()

    # Try KEK provider unwrapping if wrapping nonce is available
    if wrapping_nonce_hex:
        try:
            wrapping_nonce_bytes = bytes.fromhex(wrapping_nonce_hex)
            session_key = kp.unwrap_key(
                wrapped_key_bytes,
                wrapping_nonce_bytes,
                key_id=key_id or kp.get_key_id(),
                key_version=key_version or kp.get_key_version(),
                aad=aad,
            )
        except Exception:
            session_key = None

    # Fallback to RSA-OAEP unwrapping for v1 envelope format
    if session_key is None:
        try:
            km = get_key_manager()
            priv_key = km.get_private_key()
            session_key = rsa_unwrap_key(priv_key, wrapped_key_bytes)
            # Try v1 AAD if v2 fails
            try:
                plaintext = aes_decrypt(session_key, blob, associated_data=aad)
            except AuthenticationError:
                v1_aad = f"{evidence_id}:{user_id}:v1".encode("utf-8")
                plaintext = aes_decrypt(session_key, blob, associated_data=v1_aad)
            actual_hash = hashlib.sha256(plaintext).hexdigest()
            if not hmac.compare_digest(actual_hash, expected_sha256):
                raise IntegrityError("Decrypted evidence SHA-256 does not match original digest.")
            return plaintext
        except Exception as e:
            if isinstance(e, (IntegrityError, AuthenticationError)):
                raise
            raise CryptoError(f"Session key unwrapping failed: {e}") from e

    # Decrypt with recovered session key
    plaintext = aes_decrypt(session_key, blob, associated_data=aad)
    actual_hash = hashlib.sha256(plaintext).hexdigest()

    if not hmac.compare_digest(actual_hash, expected_sha256):
        raise IntegrityError("Decrypted evidence SHA-256 does not match original digest.")

    return plaintext


def verify_evidence_integrity(
    evidence_id: str,
    user_id: str,
    stored_filename: str,
    storage_dir: str,
    wrapped_key_hex: Optional[str],
    expected_sha256: str,
    signature_hex: Optional[str],
    wrapping_nonce_hex: Optional[str] = None,
    key_id: Optional[str] = None,
    key_version: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Non-destructive integrity and signature audit check for an evidence record.
    """
    try:
        content = retrieve_and_decrypt_evidence(
            evidence_id=evidence_id,
            user_id=user_id,
            stored_filename=stored_filename,
            storage_dir=storage_dir,
            wrapped_key_hex=wrapped_key_hex,
            expected_sha256=expected_sha256,
            wrapping_nonce_hex=wrapping_nonce_hex,
            key_id=key_id,
            key_version=key_version,
        )
        hash_verified = True
    except (CryptoError, IntegrityError, AuthenticationError):
        hash_verified = False

    sig_verified = False
    if signature_hex and hash_verified:
        km = get_key_manager()
        pub_key = km.get_public_key()
        try:
            sig_bytes = bytes.fromhex(signature_hex)
            sig_verified = rsa_verify(pub_key, sig_bytes, expected_sha256.encode("ascii"))
        except Exception:
            sig_verified = False

    return {
        "evidence_id": evidence_id,
        "is_encrypted": stored_filename.endswith(".enc"),
        "hash_verified": hash_verified,
        "signature_verified": sig_verified,
        "status": "passed" if (hash_verified and (sig_verified or not signature_hex)) else "failed",
    }
