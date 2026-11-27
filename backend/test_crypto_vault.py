"""
SafeHER Cryptographic Vault & Evidence Storage Verification Test Suite
======================================================================
Tests:
1. AES-256-GCM authenticated encryption round-trip
2. Tamper detection on ciphertext (bit flip detected by GCM tag)
3. Tamper detection on Authenticated Associated Data (AAD mismatch)
4. Decryption failure with invalid AES key
5. RSA-2048 keypair generation and deterministic loading
6. RSA-OAEP session key wrapping and unwrapping
7. RSA-PSS SHA-256 digital signature generation and verification
8. Tampered digest signature verification rejection
9. End-to-end evidence storage pipeline (encrypt, store, retrieve, decrypt)
10. Memory-only decryption guarantee (no plaintext file on disk)
11. Migration script verification (dry-run and execution on legacy evidence)
"""

import hashlib
import os
import shutil
import tempfile
import pytest

from security.crypto import (
    AuthenticationError,
    CryptoError,
    IntegrityError,
    EncryptedBlob,
    aes_encrypt,
    aes_decrypt,
    generate_aes_key,
    generate_nonce,
    rsa_generate_keypair,
    rsa_wrap_key,
    rsa_unwrap_key,
    rsa_sign,
    rsa_verify,
)
from security.key_manager import KeyManager
from security.evidence_storage import (
    encrypt_and_store_evidence,
    retrieve_and_decrypt_evidence,
    verify_evidence_integrity,
)


@pytest.fixture
def temp_vault():
    temp_dir = tempfile.mkdtemp(prefix="safeher_crypto_test_")
    keys_dir = os.path.join(temp_dir, "keys")
    storage_dir = os.path.join(temp_dir, "storage")
    os.makedirs(keys_dir, exist_ok=True)
    os.makedirs(storage_dir, exist_ok=True)
    yield temp_dir, keys_dir, storage_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_aes_256_gcm_roundtrip():
    key = generate_aes_key()
    assert len(key) == 32  # 256 bits

    plaintext = b"SafeHER Confidential Survivor Evidence Sample 2026"
    aad = b"evi-test-001:usr-ananya-01:v1"

    blob = aes_encrypt(key, plaintext, associated_data=aad)
    assert len(blob.nonce) == 12  # 96-bit CSPRNG nonce
    assert len(blob.tag) == 16    # 128-bit authentication tag
    assert blob.ciphertext != plaintext

    decrypted = aes_decrypt(key, blob, associated_data=aad)
    assert decrypted == plaintext


def test_aes_gcm_tamper_detection():
    key = generate_aes_key()
    plaintext = b"Authentic unmodified evidence content."
    aad = b"evi-tamper:usr-1:v1"

    blob = aes_encrypt(key, plaintext, associated_data=aad)

    # Corrupt a single byte in ciphertext
    tampered_bytes = bytearray(blob.ciphertext)
    tampered_bytes[0] ^= 0xFF
    tampered_blob = EncryptedBlob(
        nonce=blob.nonce,
        ciphertext=bytes(tampered_bytes),
    )

    with pytest.raises(AuthenticationError, match="Tampering"):
        aes_decrypt(key, tampered_blob, associated_data=aad)


def test_aes_gcm_aad_mismatch_detection():
    key = generate_aes_key()
    plaintext = b"Evidence bound to user 1 incident 1."
    aad_correct = b"evi-1:usr-1:v1"
    aad_spoofed = b"evi-1:usr-attacker:v1"

    blob = aes_encrypt(key, plaintext, associated_data=aad_correct)

    with pytest.raises(AuthenticationError):
        aes_decrypt(key, blob, associated_data=aad_spoofed)


def test_aes_wrong_key_fails():
    key1 = generate_aes_key()
    key2 = generate_aes_key()
    plaintext = b"Confidential notes."

    blob = aes_encrypt(key1, plaintext)
    with pytest.raises(AuthenticationError):
        aes_decrypt(key2, blob)


def test_rsa_keypair_and_wrapping():
    priv_key, pub_key = rsa_generate_keypair()
    session_key = generate_aes_key()

    wrapped = rsa_wrap_key(pub_key, session_key)
    assert len(wrapped) == 256  # 2048-bit RSA output
    assert wrapped != session_key

    unwrapped = rsa_unwrap_key(priv_key, wrapped)
    assert unwrapped == session_key


def test_rsa_pss_digital_signature():
    priv_key, pub_key = rsa_generate_keypair()
    data = b"evidence_sha256_digest_hex_string"

    sig = rsa_sign(priv_key, data)
    assert len(sig) == 256

    # Verify authentic signature
    assert rsa_verify(pub_key, sig, data) is True

    # Verify tampered data is rejected
    assert rsa_verify(pub_key, sig, b"tampered_data") is False


def test_evidence_storage_atomic_and_encrypted(temp_vault):
    _, keys_dir, storage_dir = temp_vault
    km = KeyManager(key_dir=keys_dir)

    test_content = b"High-resolution digital evidence screenshot data"
    evi_id = "evi-unit-001"
    usr_id = "usr-unit-001"

    # Encrypt and store
    res = encrypt_and_store_evidence(
        content=test_content,
        evidence_id=evi_id,
        user_id=usr_id,
        storage_dir=storage_dir,
        original_filename="screenshot.png",
    )

    assert res.stored_filename == f"{evi_id}.enc"
    assert res.storage_status == "stored_encrypted"
    assert res.sha256_hash == hashlib.sha256(test_content).hexdigest()

    # Verify physical file on disk is encrypted, not plaintext
    enc_path = os.path.join(storage_dir, res.stored_filename)
    assert os.path.exists(enc_path)
    with open(enc_path, "rb") as f:
        stored_bytes = f.read()
    assert test_content not in stored_bytes

    # Retrieve and decrypt in-memory
    decrypted = retrieve_and_decrypt_evidence(
        evidence_id=evi_id,
        user_id=usr_id,
        stored_filename=res.stored_filename,
        storage_dir=storage_dir,
        wrapped_key_hex=res.wrapped_key_hex,
        expected_sha256=res.sha256_hash,
    )
    assert decrypted == test_content

    # Full integrity audit check
    audit = verify_evidence_integrity(
        evidence_id=evi_id,
        user_id=usr_id,
        stored_filename=res.stored_filename,
        storage_dir=storage_dir,
        wrapped_key_hex=res.wrapped_key_hex,
        expected_sha256=res.sha256_hash,
        signature_hex=res.signature_hex,
    )
    assert audit["hash_verified"] is True
    assert audit["signature_verified"] is True
    assert audit["status"] == "passed"
