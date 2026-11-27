"""
SafeHER Cryptographic Engine
============================
NIST SP 800-38D compliant cryptographic primitives for evidence preservation:
- AES-256-GCM for authenticated symmetric encryption with 96-bit CSPRNG nonces
- Authenticated Associated Data (AAD) binding to evidence metadata (id, owner, version)
- Dual Key-Wrapping Support:
    1. Symmetric AES-256-GCM DEK wrapping via external KEK with independent 96-bit wrapping nonce
    2. Asymmetric RSA-OAEP (SHA-256, MGF1-SHA256) master key wrapping
- RSA-PSS (SHA-256, MGF1-SHA256) for non-repudiation digital signatures over evidence digests
- Strict error handling distinguishing tampering (InvalidTag) from generic corruption

Adapted with MIT compliance from CipherVault cryptographic architecture.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional, Tuple

from cryptography.exceptions import InvalidSignature, InvalidTag
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

AES_KEY_BYTES = 32      # 256-bit key
GCM_NONCE_BYTES = 12    # 96-bit nonce (NIST recommendation for GCM)
GCM_TAG_BYTES = 16      # 128-bit authentication tag
CHUNK_SIZE = 1024 * 1024 # 1 MB per chunk for streaming


class CryptoError(Exception):
    """Base exception for cryptographic failures."""
    pass


class AuthenticationError(CryptoError):
    """Raised when ciphertext or AAD authentication fails (tampering detected)."""
    pass


class IntegrityError(CryptoError):
    """Raised when SHA-256 digest does not match expected evidence digest."""
    pass


@dataclass
class EncryptedBlob:
    """Encapsulates AES-256-GCM nonce and ciphertext with embedded auth tag."""
    nonce: bytes
    ciphertext: bytes  # includes trailing 16-byte GCM authentication tag

    @property
    def tag(self) -> bytes:
        return self.ciphertext[-16:] if len(self.ciphertext) >= 16 else b""

    def to_bytes(self) -> bytes:
        """Serializes as nonce || ciphertext."""
        return self.nonce + self.ciphertext

    @classmethod
    def from_bytes(cls, blob: bytes) -> EncryptedBlob:
        if len(blob) < GCM_NONCE_BYTES + GCM_TAG_BYTES:
            raise CryptoError("Encrypted payload is truncated or invalid.")
        return cls(nonce=blob[:GCM_NONCE_BYTES], ciphertext=blob[GCM_NONCE_BYTES:])


def generate_aes_key() -> bytes:
    """Generate a fresh cryptographically secure 256-bit AES key (CSPRNG)."""
    return AESGCM.generate_key(bit_length=256)


def generate_nonce() -> bytes:
    """Generate a unique 96-bit CSPRNG nonce."""
    return os.urandom(GCM_NONCE_BYTES)


def aes_encrypt(key: bytes, plaintext: bytes, associated_data: Optional[bytes] = None) -> EncryptedBlob:
    """
    Encrypt plaintext using AES-256-GCM with a fresh random 96-bit nonce.
    Binds associated_data as Authenticated Associated Data (AAD).
    """
    if len(key) != AES_KEY_BYTES:
        raise CryptoError(f"AES-256 key must be {AES_KEY_BYTES} bytes, got {len(key)}")
    nonce = generate_nonce()
    aesgcm = AESGCM(key)
    try:
        ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)
        return EncryptedBlob(nonce=nonce, ciphertext=ciphertext)
    except Exception as e:
        raise CryptoError(f"Encryption failed: {e}") from e


def aes_decrypt(key: bytes, blob: EncryptedBlob, associated_data: Optional[bytes] = None) -> bytes:
    """
    Decrypt an EncryptedBlob using AES-256-GCM.
    Authenticates ciphertext and associated_data against the embedded GCM auth tag.
    Raises AuthenticationError if tampering or corrupt data is detected.
    """
    if len(key) != AES_KEY_BYTES:
        raise CryptoError(f"AES-256 key must be {AES_KEY_BYTES} bytes, got {len(key)}")
    aesgcm = AESGCM(key)
    try:
        return aesgcm.decrypt(blob.nonce, blob.ciphertext, associated_data)
    except InvalidTag as e:
        raise AuthenticationError("Tampering detected: ciphertext or AAD authentication failed.") from e
    except Exception as e:
        raise CryptoError(f"Decryption failed: {e}") from e


# -----------------------------------------------------------------------------
# Symmetric Key-Wrapping via AES-256-GCM (KEK wrapping DEK)
# -----------------------------------------------------------------------------

def wrap_dek_aes_gcm(kek: bytes, dek: bytes, aad: Optional[bytes] = None) -> Tuple[bytes, bytes]:
    """
    Wraps a 256-bit DEK using a 256-bit KEK via AES-256-GCM.
    Uses an independent 96-bit wrapping nonce (never reused with file nonce).
    Returns (wrapped_dek_with_tag, wrapping_nonce).
    """
    if len(kek) != AES_KEY_BYTES:
        raise CryptoError(f"KEK must be {AES_KEY_BYTES} bytes (256 bits), got {len(kek)}")
    if len(dek) != AES_KEY_BYTES:
        raise CryptoError(f"DEK must be {AES_KEY_BYTES} bytes (256 bits), got {len(dek)}")
    wrapping_nonce = generate_nonce()
    aesgcm = AESGCM(kek)
    try:
        wrapped_dek = aesgcm.encrypt(wrapping_nonce, dek, aad)
        return wrapped_dek, wrapping_nonce
    except Exception as e:
        raise CryptoError(f"DEK wrapping failed: {e}") from e


def unwrap_dek_aes_gcm(kek: bytes, wrapped_dek: bytes, wrapping_nonce: bytes, aad: Optional[bytes] = None) -> bytes:
    """
    Unwraps an encrypted DEK using the specified KEK and wrapping nonce.
    Authenticates the wrapped key and AAD.
    Raises AuthenticationError if KEK is wrong or wrapped key has been tampered with.
    """
    if len(kek) != AES_KEY_BYTES:
        raise CryptoError(f"KEK must be {AES_KEY_BYTES} bytes (256 bits), got {len(kek)}")
    if len(wrapping_nonce) != GCM_NONCE_BYTES:
        raise CryptoError(f"Wrapping nonce must be {GCM_NONCE_BYTES} bytes, got {len(wrapping_nonce)}")
    aesgcm = AESGCM(kek)
    try:
        return aesgcm.decrypt(wrapping_nonce, wrapped_dek, aad)
    except InvalidTag as e:
        raise AuthenticationError("DEK unwrapping authentication failed: incorrect KEK or tampered wrapped key.") from e
    except Exception as e:
        raise CryptoError(f"DEK unwrapping failed: {e}") from e


# -----------------------------------------------------------------------------
# Asymmetric Master Key Operations: RSA-OAEP & RSA-PSS
# -----------------------------------------------------------------------------

def rsa_generate_keypair(key_size: int = 2048) -> Tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    """Generate an RSA private/public keypair with public exponent 65537."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size,
    )
    return private_key, private_key.public_key()


def rsa_wrap_key(public_key: rsa.RSAPublicKey, symmetric_key: bytes) -> bytes:
    """Wrap an AES-256 key using RSA-OAEP with SHA-256."""
    try:
        return public_key.encrypt(
            symmetric_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
    except Exception as e:
        raise CryptoError(f"RSA key wrapping failed: {e}") from e


def rsa_unwrap_key(private_key: rsa.RSAPrivateKey, wrapped_key: bytes) -> bytes:
    """Unwrap an AES-256 key using RSA-OAEP with SHA-256."""
    try:
        return private_key.decrypt(
            wrapped_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
    except Exception as e:
        raise CryptoError(f"RSA key unwrapping failed: {e}") from e


def rsa_sign(private_key: rsa.RSAPrivateKey, data: bytes) -> bytes:
    """Generate an RSA-PSS digital signature over data using SHA-256."""
    try:
        return private_key.sign(
            data,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
    except Exception as e:
        raise CryptoError(f"Signing failed: {e}") from e


def rsa_verify(public_key: rsa.RSAPublicKey, signature: bytes, data: bytes) -> bool:
    """Verify an RSA-PSS digital signature over data using SHA-256."""
    try:
        public_key.verify(
            signature,
            data,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
        return True
    except InvalidSignature:
        return False
    except Exception:
        return False
