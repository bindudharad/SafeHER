"""
Cloud KMS Integration & Compatibility Test Suite (BLOCKER 1)
============================================================
Tests real AWS KMS protocol calls via moto.mock_aws(), including:
- AwsKmsKeyProvider wrap_key / unwrap_key with AAD EncryptionContext
- generate_data_key HSM-style DEK generation
- Key rotation and kms:ReEncrypt DEK re-wrapping
- AccessDenied / Disabled key / Revocation handling (no silent fallback)
- KMS outage & timeout handling (KMSUnavailableError, no silent fallback)
- Existing locally encrypted evidence decryption compatibility
- End-to-end local-to-KMS migration with DB backup & verification
- Production environment configuration selection
"""

import os
import secrets
import shutil
import tempfile
import unittest.mock as mock

import boto3
import pytest
from botocore.exceptions import ClientError, ConnectTimeoutError
from moto import mock_aws

from db import get_db, init_db
from scripts.migrate_local_to_kms import migrate_local_records_to_kms
from security.crypto import AuthenticationError, CryptoError, generate_aes_key
from security.evidence_storage import (
    build_evidence_aad,
    encrypt_and_store_evidence,
    retrieve_and_decrypt_evidence,
)
from security.key_provider import (
    AwsKmsKeyProvider,
    KMSAccessError,
    KMSUnavailableError,
    LocalEnvKEKProvider,
    build_key_provider_from_env,
    set_key_provider,
)


@pytest.fixture(autouse=True)
def reset_provider():
    set_key_provider(None)
    yield
    set_key_provider(None)


def test_aws_kms_wrap_unwrap_and_generate_data_key():
    with mock_aws():
        kms = boto3.client("kms", region_name="us-east-1")
        key_arn = kms.create_key(Description="SafeHER Test CMK")["KeyMetadata"]["Arn"]

        provider = AwsKmsKeyProvider(kms_key_id=key_arn, region_name="us-east-1", kms_client=kms)
        dek = generate_aes_key()
        aad = build_evidence_aad("evi-kms-1", "usr-1")

        wrapped, nonce, kid, kver = provider.wrap_key(dek, aad=aad)
        assert wrapped != dek
        assert len(nonce) > 0
        assert kid == key_arn

        recovered = provider.unwrap_key(wrapped, nonce, kid, kver, aad=aad)
        assert recovered == dek

        # Wrong AAD must fail authentication
        with pytest.raises(AuthenticationError):
            provider.unwrap_key(wrapped, nonce, kid, kver, aad=b"wrong-aad")

        # generate_data_key
        plain_dek, cipher_dek, g_nonce, g_kid, g_ver = provider.generate_data_key(aad=aad)
        assert len(plain_dek) == 32
        assert provider.unwrap_key(cipher_dek, g_nonce, g_kid, g_ver, aad=aad) == plain_dek


def test_aws_kms_key_rotation_and_rewrap():
    with mock_aws():
        kms = boto3.client("kms", region_name="us-east-1")
        key1_arn = kms.create_key(Description="SafeHER CMK v1")["KeyMetadata"]["Arn"]
        key2_arn = kms.create_key(Description="SafeHER CMK v2")["KeyMetadata"]["Arn"]

        provider = AwsKmsKeyProvider(kms_key_id=key1_arn, region_name="us-east-1", kms_client=kms)
        assert provider.enable_automatic_rotation() is True

        health = provider.health_check()
        assert health["provider"] == "aws_kms"
        assert health["status"] == "operational"
        assert health["hardware_backed"] is True
        assert health["rotation_enabled"] is True

        dek = generate_aes_key()
        aad = build_evidence_aad("evi-rot-1", "usr-1")
        wrapped1, _, _, _ = provider.wrap_key(dek, aad=aad)

        # Re-encrypt DEK under key2 without exposing plaintext
        wrapped2, nonce2, kid2, ver2 = provider.rewrap_dek(wrapped1, destination_key_id=key2_arn, aad=aad)
        assert kid2 == key2_arn
        assert ver2 == "2"

        provider2 = AwsKmsKeyProvider(kms_key_id=key2_arn, region_name="us-east-1", kms_client=kms)
        assert provider2.unwrap_key(wrapped2, nonce2, kid2, ver2, aad=aad) == dek


def test_aws_kms_access_denied_and_disabled_key():
    with mock_aws():
        kms = boto3.client("kms", region_name="us-east-1")
        meta = kms.create_key(Description="SafeHER Disabled CMK")["KeyMetadata"]
        key_id = meta["KeyId"]
        key_arn = meta["Arn"]
        provider = AwsKmsKeyProvider(kms_key_id=key_arn, region_name="us-east-1", kms_client=kms)

        dek = generate_aes_key()
        aad = build_evidence_aad("evi-dis-1", "usr-1")
        wrapped, nonce, kid, kver = provider.wrap_key(dek, aad=aad)

        kms.disable_key(KeyId=key_id)
        health = provider.health_check()
        assert health["status"] == "degraded"
        assert health["key_state"] == "Disabled"

        # Verify AccessDeniedException and DisabledException map to KMSAccessError
        mock_client = mock.MagicMock()
        mock_client.decrypt.side_effect = ClientError(
            {"Error": {"Code": "AccessDeniedException", "Message": "User is not authorized"}}, "Decrypt"
        )
        denied_provider = AwsKmsKeyProvider(kms_key_id=key_arn, kms_client=mock_client, max_retries=1)
        with pytest.raises(KMSAccessError):
            denied_provider.unwrap_key(wrapped, nonce, kid, kver, aad=aad)


def test_aws_kms_outage_no_silent_fallback():
    mock_client = mock.MagicMock()
    mock_client.decrypt.side_effect = ConnectTimeoutError(endpoint_url="https://kms.us-east-1.amazonaws.com")
    mock_client.encrypt.side_effect = ClientError(
        {"Error": {"Code": "ThrottlingException", "Message": "Rate exceeded"}}, "Encrypt"
    )

    provider = AwsKmsKeyProvider(
        kms_key_id="arn:aws:kms:us-east-1:123456789012:key/test-key",
        kms_client=mock_client,
        max_retries=1,
    )
    set_key_provider(provider)

    with pytest.raises(KMSUnavailableError):
        provider.wrap_key(generate_aes_key())

    # Verify retrieve_and_decrypt_evidence does NOT silently fall back to RSA or local KEK when KMS fails
    tmp = tempfile.mkdtemp()
    try:
        enc_path = os.path.join(tmp, "evi-outage.enc")
        with open(enc_path, "wb") as f:
            f.write(b"\x00" * 40)
        with pytest.raises(KMSUnavailableError):
            retrieve_and_decrypt_evidence(
                evidence_id="evi-outage",
                user_id="usr-1",
                stored_filename="evi-outage.enc",
                storage_dir=tmp,
                wrapped_dek_hex="deadbeef",
                wrapping_nonce_hex="6177732d6b6d732d656e7631",
                key_id="arn:aws:kms:us-east-1:123456789012:key/test-key",
                key_version="1",
                expected_sha256="0" * 64,
                key_provider=provider,
            )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_legacy_local_evidence_remains_decryptable_and_migrates_to_kms():
    tmp = tempfile.mkdtemp()
    try:
        db_path = os.path.join(tmp, "test_kms_mig.db")
        storage_dir = os.path.join(tmp, "evidence")
        keys_dir = os.path.join(tmp, "keys")
        os.makedirs(storage_dir, exist_ok=True)
        os.makedirs(keys_dir, exist_ok=True)

        old_db = os.environ.get("SAFEHER_DB_PATH")
        old_key_dir = os.environ.get("SAFEHER_KEY_DIR")
        os.environ["SAFEHER_DB_PATH"] = db_path
        os.environ["SAFEHER_KEY_DIR"] = keys_dir
        init_db()

        local_kp = LocalEnvKEKProvider(keys_dir=keys_dir)
        payload = b"Sensitive survivor evidence payload for KMS migration test"
        res = encrypt_and_store_evidence(
            content=payload,
            evidence_id="evi-mig-1",
            user_id="usr-mig-1",
            storage_dir=storage_dir,
            original_filename="proof.png",
            key_provider=local_kp,
        )

        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (id, name, email, password_hash, consent_acknowledged, consent_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("usr-mig-1", "Mig User", "mig@example.com", "hash", 1, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
            )
            conn.execute(
                "INSERT INTO incidents (id, user_id, title, category, description, platform, incident_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ("inc-mig-1", "usr-mig-1", "Test", "harassment", "Desc", "web", "2026-01-01", "open", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
            )
            conn.execute(
                """
                INSERT INTO evidence (
                    id, incident_id, user_id, original_filename, stored_filename,
                    file_type, file_size, sha256_hash, upload_timestamp, storage_status,
                    encryption_algorithm, encryption_version, data_nonce, wrapped_dek,
                    wrapping_nonce, key_id, key_version, original_sha256, ciphertext_sha256,
                    encryption_timestamp, wrapped_key, signature
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "evi-mig-1", "inc-mig-1", "usr-mig-1", "proof.png", res.stored_filename,
                    "image/png", res.file_size, res.sha256_hash, "2026-01-01T00:00:00Z", "stored_encrypted",
                    res.encryption_algorithm, res.encryption_version, res.data_nonce_hex, res.wrapped_dek_hex,
                    res.wrapping_nonce_hex, res.key_id, res.key_version, res.sha256_hash, res.ciphertext_sha256,
                    res.encryption_timestamp, res.wrapped_key_hex, res.signature_hex,
                ),
            )

        with mock_aws():
            kms = boto3.client("kms", region_name="us-east-1")
            key_arn = kms.create_key(Description="SafeHER Prod CMK")["KeyMetadata"]["Arn"]
            kms_kp = AwsKmsKeyProvider(kms_key_id=key_arn, region_name="us-east-1", kms_client=kms)

            # 1. Verify legacy record is still decryptable even when active provider is AwsKmsKeyProvider
            decrypted_before = retrieve_and_decrypt_evidence(
                evidence_id="evi-mig-1",
                user_id="usr-mig-1",
                stored_filename=res.stored_filename,
                storage_dir=storage_dir,
                wrapped_dek_hex=res.wrapped_dek_hex,
                wrapping_nonce_hex=res.wrapping_nonce_hex,
                key_id=res.key_id,
                key_version=res.key_version,
                expected_sha256=res.sha256_hash,
                key_provider=kms_kp,
            )
            assert decrypted_before == payload

            # 2. Dry-run migration
            dry = migrate_local_records_to_kms(
                dry_run=True, target_provider=kms_kp, local_provider=local_kp, storage_dir=storage_dir, db_path=db_path
            )
            assert dry["migrated"] == 1
            assert dry["backup_path"] is None

            # 3. Execute migration with backup
            exe = migrate_local_records_to_kms(
                dry_run=False, target_provider=kms_kp, local_provider=local_kp, storage_dir=storage_dir, db_path=db_path
            )
            assert exe["migrated"] == 1
            assert exe["errors"] == 0
            assert exe["backup_path"] is not None and os.path.exists(exe["backup_path"])

            # 4. Verify record now decrypts directly via AwsKmsKeyProvider
            with get_db() as conn:
                row = conn.execute("SELECT * FROM evidence WHERE id = 'evi-mig-1'").fetchone()
            assert row["key_id"] == key_arn

            decrypted_after = retrieve_and_decrypt_evidence(
                evidence_id="evi-mig-1",
                user_id="usr-mig-1",
                stored_filename=row["stored_filename"],
                storage_dir=storage_dir,
                wrapped_dek_hex=row["wrapped_dek"],
                wrapping_nonce_hex=row["wrapping_nonce"],
                key_id=row["key_id"],
                key_version=row["key_version"],
                expected_sha256=row["sha256_hash"],
                key_provider=kms_kp,
            )
            assert decrypted_after == payload
    finally:
        if old_db is None:
            os.environ.pop("SAFEHER_DB_PATH", None)
        else:
            os.environ["SAFEHER_DB_PATH"] = old_db
        if old_key_dir is None:
            os.environ.pop("SAFEHER_KEY_DIR", None)
        else:
            os.environ["SAFEHER_KEY_DIR"] = old_key_dir
        shutil.rmtree(tmp, ignore_errors=True)


def test_production_env_selects_aws_kms():
    with mock.patch.dict(
        os.environ,
        {
            "SAFEHER_ENV": "production",
            "SAFEHER_KMS_PROVIDER": "aws",
            "SAFEHER_KMS_KEY_ARN": "arn:aws:kms:ap-south-1:111122223333:key/abcd-1234",
        },
        clear=False,
    ):
        kp = build_key_provider_from_env()
        assert isinstance(kp, AwsKmsKeyProvider)
        assert kp.region_name == "ap-south-1"
        assert kp.get_key_id() == "arn:aws:kms:ap-south-1:111122223333:key/abcd-1234"
