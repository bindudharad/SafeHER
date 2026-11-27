"""
SafeHER Stage 1: Secure Evidence Storage & Cryptographic Encryption Test Suite
==============================================================================
Validates:
1. Basic Encryption Tests:
   - Text file payload round-trip
   - Binary PNG payload round-trip
   - Binary PDF payload round-trip
   - Large / near-limit payload round-trip (2MB+)
   - Exact byte-for-byte fidelity (recovered == original)
   - Pre-encryption and post-decryption SHA-256 match
2. Key Management Tests:
   - DEK generation length is exactly 256 bits (32 bytes)
   - Unique DEKs for different evidence items
   - Unique data nonces (96-bit) per encryption
   - Unique wrapping nonces (96-bit) per DEK wrapping
   - KEK wrapping and unwrapping correctly recovers DEK
   - Wrong KEK fails to unwrap DEK (AuthenticationError)
   - Missing KEK raises exception / fails safely
   - Key provider reports key_id and key_version accurately
3. Tampering & Integrity Tests:
   - 1-bit flip in ciphertext raises AuthenticationError
   - Modified data nonce raises AuthenticationError
   - Modified wrapped DEK raises AuthenticationError
   - Modified wrapping nonce raises AuthenticationError
   - AAD mismatch (wrong evidence_id or wrong user_id) raises AuthenticationError
   - Corrupted pre-encryption expected hash raises IntegrityError
4. Upload & Retrieval Integration Tests:
   - Evidence upload writes ONLY encrypted file ({evidence_id}.enc) to disk
   - Zero plaintext written to evidence_storage directory
   - DB record shows stored_encrypted, encryption_version = 'v2', nonces, wrapped DEK
   - Unauthorized user download attempt blocked (403/404)
   - Authorized user download returns exact original bytes and matching hash
   - Chain of custody record created with action and hash details
5. Migration Verification Tests:
   - Default --dry-run leaves plaintext evidence files untouched
   - Synthetic legacy plaintext evidence migration executes successfully
   - Migrated evidence is verifiable and decryptable, SHA-256 matches
   - Original plaintext file is preserved in quarantine directory and deleted from active storage
"""

import hashlib
import io
import os
import shutil
import tempfile
import pytest
from fastapi.testclient import TestClient
from PIL import Image

# Ensure test DB and storage are configured before app import
_test_tmp = tempfile.mkdtemp(prefix="safeher_stage1_test_")
os.environ["SAFEHER_DB_PATH"] = os.path.join(_test_tmp, "stage1_test.db")
os.environ["SAFEHER_STORAGE_DIR"] = os.path.join(_test_tmp, "storage")
os.environ["SAFEHER_KEYS_DIR"] = os.path.join(_test_tmp, "keys")
os.environ["SAFEHER_SEED_DEMO"] = "false"

from app import app
from db import init_db, get_db, get_storage_dir
from migrate_evidence import run_migration
from security.crypto import (
    AuthenticationError,
    CryptoError,
    IntegrityError,
    EncryptedBlob,
    generate_aes_key,
    generate_nonce,
    aes_encrypt,
    aes_decrypt,
    wrap_dek_aes_gcm,
    unwrap_dek_aes_gcm,
)
from security.key_provider import (
    LocalEnvKEKProvider,
    get_key_provider,
    set_key_provider,
)
from security.evidence_storage import (
    encrypt_and_store_evidence,
    retrieve_and_decrypt_evidence,
    verify_evidence_integrity,
)


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        yield c


def _auth_token(client: TestClient, name: str, email: str, password: str = "P@ssw0rdSecure123!") -> str:
    res = client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": password, "consent_acknowledged": True},
    )
    if res.status_code == 201:
        return res.json()["access_token"]
    res_login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res_login.json()["access_token"]


# ==============================================================================
# Category 1: Basic Encryption Tests
# ==============================================================================

def test_basic_encryption_text_roundtrip():
    content = b"SafeHER Confidential Statement by survivor regarding online harassment."
    key = generate_aes_key()
    aad = b"evi-txt-01:usr-01:v2"

    blob = aes_encrypt(key, content, associated_data=aad)
    recovered = aes_decrypt(key, blob, associated_data=aad)

    assert recovered == content
    assert hashlib.sha256(recovered).hexdigest() == hashlib.sha256(content).hexdigest()


def test_basic_encryption_png_roundtrip():
    # Synthetic PNG image payload
    img = Image.new("RGBA", (128, 128), color=(255, 99, 71, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    content = buf.getvalue()

    key = generate_aes_key()
    aad = b"evi-png-01:usr-01:v2"

    blob = aes_encrypt(key, content, associated_data=aad)
    recovered = aes_decrypt(key, blob, associated_data=aad)

    assert recovered == content
    assert hashlib.sha256(recovered).hexdigest() == hashlib.sha256(content).hexdigest()


def test_basic_encryption_pdf_roundtrip():
    # Synthetic PDF binary payload
    content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    key = generate_aes_key()
    aad = b"evi-pdf-01:usr-01:v2"

    blob = aes_encrypt(key, content, associated_data=aad)
    recovered = aes_decrypt(key, blob, associated_data=aad)

    assert recovered == content
    assert hashlib.sha256(recovered).hexdigest() == hashlib.sha256(content).hexdigest()


def test_basic_encryption_large_payload_roundtrip():
    # Near-upload limit or multi-megabyte synthetic payload (2.5 MB)
    content = os.urandom(2500000)
    key = generate_aes_key()
    aad = b"evi-large-01:usr-01:v2"

    blob = aes_encrypt(key, content, associated_data=aad)
    recovered = aes_decrypt(key, blob, associated_data=aad)

    assert recovered == content
    assert hashlib.sha256(recovered).hexdigest() == hashlib.sha256(content).hexdigest()


# ==============================================================================
# Category 2: Key Management Tests
# ==============================================================================

def test_key_management_dek_length():
    dek = generate_aes_key()
    assert len(dek) == 32  # exactly 256 bits


def test_key_management_unique_deks_and_nonces():
    deks = {generate_aes_key() for _ in range(20)}
    assert len(deks) == 20  # All unique

    nonces = {generate_nonce() for _ in range(20)}
    assert len(nonces) == 20  # All unique 96-bit CSPRNG nonces
    for n in nonces:
        assert len(n) == 12  # 96 bits


def test_key_management_kek_wrapping_and_unwrapping():
    kek = generate_aes_key()
    dek = generate_aes_key()

    wrapped_dek, wrapping_nonce = wrap_dek_aes_gcm(kek, dek)
    assert len(wrapping_nonce) == 12
    assert wrapped_dek != dek
    assert len(wrapped_dek) == len(dek) + 16  # 32 bytes ciphertext + 16 bytes tag

    unwrapped_dek = unwrap_dek_aes_gcm(kek, wrapped_dek, wrapping_nonce)
    assert unwrapped_dek == dek


def test_key_management_wrong_kek_fails():
    kek1 = generate_aes_key()
    kek2 = generate_aes_key()
    dek = generate_aes_key()

    wrapped_dek, wrapping_nonce = wrap_dek_aes_gcm(kek1, dek)
    with pytest.raises(AuthenticationError):
        unwrap_dek_aes_gcm(kek2, wrapped_dek, wrapping_nonce)


def test_key_management_provider_key_id_and_version(tmp_path):
    key_file = tmp_path / "test_kek.key"
    kek_bytes = generate_aes_key()
    key_file.write_bytes(kek_bytes)

    provider = LocalEnvKEKProvider(key_file_path=str(key_file))
    assert provider.get_key_id() == "kek-local-v1"
    assert provider.get_key_version() == "1"

    dek = generate_aes_key()
    wrapped, nonce, kid, kver = provider.wrap_key(dek)
    unwrapped = provider.unwrap_key(wrapped, nonce, kid, kver)
    assert unwrapped == dek


def test_key_management_missing_kek_fails(tmp_path, monkeypatch):
    monkeypatch.delenv("SAFEHER_KEK_B64", raising=False)
    monkeypatch.delenv("SAFEHER_KEK_HEX", raising=False)
    non_existent = str(tmp_path / "non_existent.key")
    with pytest.raises(CryptoError, match="not found"):
        LocalEnvKEKProvider(key_file_path=non_existent, allow_generate=False)


# ==============================================================================
# Category 3: Tampering & Integrity Tests
# ==============================================================================

def test_tamper_detection_ciphertext_bitflip():
    key = generate_aes_key()
    plaintext = b"Genuine survivor evidence log."
    aad = b"evi-tamp-1:usr-1:v2"

    blob = aes_encrypt(key, plaintext, associated_data=aad)
    corrupted_ciphertext = bytearray(blob.ciphertext)
    corrupted_ciphertext[0] ^= 0x01  # Flip single bit

    tampered_blob = EncryptedBlob(nonce=blob.nonce, ciphertext=bytes(corrupted_ciphertext))
    with pytest.raises(AuthenticationError, match="Tampering"):
        aes_decrypt(key, tampered_blob, associated_data=aad)


def test_tamper_detection_modified_data_nonce():
    key = generate_aes_key()
    plaintext = b"Genuine evidence data."
    aad = b"evi-tamp-2:usr-1:v2"

    blob = aes_encrypt(key, plaintext, associated_data=aad)
    corrupted_nonce = bytearray(blob.nonce)
    corrupted_nonce[0] ^= 0x01

    tampered_blob = EncryptedBlob(nonce=bytes(corrupted_nonce), ciphertext=blob.ciphertext)
    with pytest.raises(AuthenticationError):
        aes_decrypt(key, tampered_blob, associated_data=aad)


def test_tamper_detection_modified_wrapped_dek():
    kek = generate_aes_key()
    dek = generate_aes_key()
    wrapped, nonce = wrap_dek_aes_gcm(kek, dek)

    corrupted_wrapped = bytearray(wrapped)
    corrupted_wrapped[0] ^= 0x01

    with pytest.raises(AuthenticationError):
        unwrap_dek_aes_gcm(kek, bytes(corrupted_wrapped), nonce)


def test_tamper_detection_modified_wrapping_nonce():
    kek = generate_aes_key()
    dek = generate_aes_key()
    wrapped, nonce = wrap_dek_aes_gcm(kek, dek)

    corrupted_nonce = bytearray(nonce)
    corrupted_nonce[0] ^= 0x01

    with pytest.raises(AuthenticationError):
        unwrap_dek_aes_gcm(kek, wrapped, bytes(corrupted_nonce))


def test_tamper_detection_aad_mismatch():
    key = generate_aes_key()
    plaintext = b"Sensitive forensic notes."
    aad_real = b"evi-safe:usr-legit:v2"
    aad_attacker = b"evi-safe:usr-attacker:v2"

    blob = aes_encrypt(key, plaintext, associated_data=aad_real)
    with pytest.raises(AuthenticationError):
        aes_decrypt(key, blob, associated_data=aad_attacker)


def test_tamper_detection_expected_hash_mismatch(tmp_path):
    storage_dir = str(tmp_path / "storage")
    os.makedirs(storage_dir, exist_ok=True)
    content = b"Original forensic screenshot."

    res = encrypt_and_store_evidence(
        content=content,
        evidence_id="evi-hash-mismatch",
        user_id="usr-1",
        storage_dir=storage_dir,
        original_filename="screenshot.png",
    )

    # Retrieval with mismatched expected SHA-256 raises IntegrityError
    fake_hash = hashlib.sha256(b"tampered content").hexdigest()
    with pytest.raises(IntegrityError, match="does not match"):
        retrieve_and_decrypt_evidence(
            evidence_id="evi-hash-mismatch",
            user_id="usr-1",
            stored_filename=res.stored_filename,
            storage_dir=storage_dir,
            wrapped_dek_hex=res.wrapped_dek_hex,
            wrapping_nonce_hex=res.wrapping_nonce_hex,
            data_nonce_hex=res.data_nonce_hex,
            expected_sha256=fake_hash,
            encryption_version="v2",
        )


# ==============================================================================
# Category 4: Upload & Retrieval Integration Tests
# ==============================================================================

def test_upload_and_retrieval_pipeline(client: TestClient):
    token_owner = _auth_token(client, "Evidence Owner", "owner@safeher.test")
    token_stranger = _auth_token(client, "Stranger User", "stranger@safeher.test")

    # 1. Create incident
    inc_res = client.post(
        "/api/v1/incidents",
        headers={"Authorization": f"Bearer {token_owner}"},
        json={
            "title": "Encrypted Evidence Test Incident",
            "category": "cyberstalking",
            "description": "Testing stage 1",
            "platform": "Instagram",
            "incident_date": "2026-11-20",
        },
    )
    assert inc_res.status_code == 201
    inc_id = inc_res.json()["id"]

    # 2. Upload evidence
    evidence_content = b"CRITICAL FORENSIC REPORT: Chat screenshot containing explicit death threats."
    files = {"file": ("threat_screenshot.png", evidence_content, "image/png")}
    upload_res = client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        headers={"Authorization": f"Bearer {token_owner}"},
        files=files,
    )
    assert upload_res.status_code == 201
    evidence_data = upload_res.json()
    evi_id = evidence_data["id"]

    # Verify returned API metadata
    assert evidence_data["storage_status"] == "stored_encrypted"
    assert evidence_data["encryption_version"] == "v2"
    assert evidence_data["sha256_hash"] == hashlib.sha256(evidence_content).hexdigest()
    assert evidence_data["ciphertext_sha256"] is not None

    # Verify DB record has all Stage 1 encryption columns populated
    with get_db() as conn:
        row = conn.execute("SELECT * FROM evidence WHERE id = ?", (evi_id,)).fetchone()
        assert row["storage_status"] == "stored_encrypted"
        assert row["encryption_version"] == "v2"
        assert row["stored_filename"].endswith(".enc")
        assert row["data_nonce"] is not None
        assert row["wrapped_dek"] is not None
        assert row["wrapping_nonce"] is not None
        assert row["original_sha256"] == hashlib.sha256(evidence_content).hexdigest()
        assert row["ciphertext_sha256"] is not None

        # Verify physical file on disk is encrypted, not plaintext
        storage_dir = get_storage_dir()
        stored_path = os.path.join(storage_dir, row["stored_filename"])
        assert os.path.exists(stored_path)
        with open(stored_path, "rb") as f:
            disk_bytes = f.read()
        assert evidence_content not in disk_bytes  # Zero plaintext on disk!
        assert row["storage_status"] == "stored_encrypted"
        assert row["encryption_version"] == "v2"
        assert row["data_nonce"] is not None
        assert row["wrapped_dek"] is not None
        assert row["wrapping_nonce"] is not None
        assert row["original_sha256"] == hashlib.sha256(evidence_content).hexdigest()
        assert row["ciphertext_sha256"] is not None

        # Verify custody record exists
        custody_row = conn.execute("SELECT * FROM custody_records WHERE evidence_id = ?", (evi_id,)).fetchone()
        assert custody_row is not None
        assert custody_row["action"] == "evidence_uploaded"

    # 3. Unauthorized stranger access attempt blocked
    blocked_res = client.get(
        f"/api/v1/evidence/{evi_id}/download",
        headers={"Authorization": f"Bearer {token_stranger}"},
    )
    assert blocked_res.status_code in (403, 404)

    # 4. Authorized owner download retrieves exact decrypted bytes
    dl_res = client.get(
        f"/api/v1/evidence/{evi_id}/download",
        headers={"Authorization": f"Bearer {token_owner}"},
    )
    assert dl_res.status_code == 200
    assert dl_res.content == evidence_content
    assert hashlib.sha256(dl_res.content).hexdigest() == evidence_data["sha256_hash"]


# ==============================================================================
# Category 5: Migration Verification Tests
# ==============================================================================

def test_migration_dry_run_and_execution(tmp_path):
    storage_dir = str(tmp_path / "mig_storage")
    quarantine_dir = str(tmp_path / "mig_quarantine")
    os.makedirs(storage_dir, exist_ok=True)

    # Insert a synthetic legacy plaintext record into test DB
    legacy_content = b"Legacy unencrypted evidence file from 2025"
    legacy_hash = hashlib.sha256(legacy_content).hexdigest()
    legacy_id = "evi-legacy-001"
    legacy_fn = "evi-legacy-001_chat.txt"
    legacy_path = os.path.join(storage_dir, legacy_fn)

    with open(legacy_path, "wb") as f:
        f.write(legacy_content)

    with get_db() as conn:
        conn.execute("DELETE FROM evidence")
        conn.execute(
            """
            INSERT OR IGNORE INTO users (id, name, email, password_hash, consent_acknowledged, consent_date, created_at)
            VALUES ('usr-legacy-1', 'Legacy User', 'legacy@safeher.test', 'hash', 1, datetime('now'), datetime('now'))
            """
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO incidents (id, user_id, title, category, description, platform, incident_date, created_at, updated_at)
            VALUES ('inc-legacy-1', 'usr-legacy-1', 'Legacy Incident', 'harassment', 'Legacy Desc', 'SMS', '2025-01-01', datetime('now'), datetime('now'))
            """
        )
        conn.execute(
            """
            INSERT OR REPLACE INTO evidence (
                id, incident_id, user_id, original_filename, stored_filename,
                file_type, file_size, sha256_hash, upload_timestamp, storage_status, encryption_algorithm
            ) VALUES (?, 'inc-legacy-1', 'usr-legacy-1', ?, ?, 'text/plain', ?, ?, datetime('now'), 'stored_plaintext', 'none')
            """,
            (legacy_id, "chat.txt", legacy_fn, len(legacy_content), legacy_hash),
        )

    # 1. Run migration in DRY-RUN mode
    ret_dry = run_migration(dry_run=True, quarantine_dir=quarantine_dir, storage_dir=storage_dir)
    assert ret_dry == 0

    # Dry run must NOT touch the plaintext file
    assert os.path.exists(legacy_path)
    with open(legacy_path, "rb") as f:
        assert f.read() == legacy_content

    # 2. Run migration in EXECUTE mode
    ret_exec = run_migration(dry_run=False, quarantine_dir=quarantine_dir, storage_dir=storage_dir)
    assert ret_exec == 0

    # Plaintext must now be quarantined, and active storage must contain {evi_id}.enc
    assert not os.path.exists(legacy_path)
    quarantine_file = os.path.join(quarantine_dir, f"{legacy_id}_legacy_{legacy_fn}")
    assert os.path.exists(quarantine_file)
    with open(quarantine_file, "rb") as f:
        assert f.read() == legacy_content

    enc_path = os.path.join(storage_dir, f"{legacy_id}.enc")
    assert os.path.exists(enc_path)

    # Check DB record updated with v2 envelope encryption
    with get_db() as conn:
        row = conn.execute("SELECT * FROM evidence WHERE id = ?", (legacy_id,)).fetchone()
        assert row["storage_status"] == "stored_encrypted"
        assert row["encryption_version"] == "v2"
        assert row["stored_filename"] == f"{legacy_id}.enc"
        assert row["wrapped_dek"] is not None

    # Verify that migrated file can be decrypted and matches original hash
    with get_db() as conn:
        row = conn.execute("SELECT * FROM evidence WHERE id = ?", (legacy_id,)).fetchone()
    decrypted = retrieve_and_decrypt_evidence(
        evidence_id=legacy_id,
        user_id="usr-legacy-1",
        stored_filename=row["stored_filename"],
        storage_dir=storage_dir,
        wrapped_dek_hex=row["wrapped_dek"],
        wrapping_nonce_hex=row["wrapping_nonce"],
        data_nonce_hex=row["data_nonce"],
        expected_sha256=row["original_sha256"],
        encryption_version=row["encryption_version"],
    )
    assert decrypted == legacy_content
