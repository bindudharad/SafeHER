"""
SafeHER Security & Cryptography Package
=======================================
Modular cryptographic security services:
- AES-256-GCM authenticated envelope encryption
- KEK Key Providers & DEK wrapping lifecycle
- RSA-OAEP & RSA-PSS asymmetric master cryptography
- Secure at-rest evidence vault storage
- Integrity hashing and verification
"""

from security.crypto import (
    CryptoError,
    AuthenticationError,
    IntegrityError,
    EncryptedBlob,
    generate_aes_key,
    generate_nonce,
    aes_encrypt,
    aes_decrypt,
    wrap_dek_aes_gcm,
    unwrap_dek_aes_gcm,
    rsa_generate_keypair,
    rsa_wrap_key,
    rsa_unwrap_key,
    rsa_sign,
    rsa_verify,
)
from security.key_provider import (
    BaseKeyProvider,
    LocalEnvKEKProvider,
    KMSKeyProvider,
    get_key_provider,
    set_key_provider,
)
from security.key_manager import (
    KeyManager,
    get_key_manager,
    set_key_manager,
)
from security.integrity import (
    calculate_sha256_bytes,
    calculate_sha256_file,
    verify_sha256,
    sign_evidence_hash,
    verify_evidence_signature,
)
from security.evidence_storage import (
    EvidenceStorageResult,
    encrypt_and_store_evidence,
    retrieve_and_decrypt_evidence,
    verify_evidence_integrity,
    build_evidence_aad,
)
from security.malware_scanner import (
    MalwareScanResult,
    scan_file_content,
    quarantine_file,
    get_malware_scanner_health,
)

__all__ = [
    "CryptoError",
    "AuthenticationError",
    "IntegrityError",
    "EncryptedBlob",
    "generate_aes_key",
    "generate_nonce",
    "aes_encrypt",
    "aes_decrypt",
    "wrap_dek_aes_gcm",
    "unwrap_dek_aes_gcm",
    "rsa_generate_keypair",
    "rsa_wrap_key",
    "rsa_unwrap_key",
    "rsa_sign",
    "rsa_verify",
    "BaseKeyProvider",
    "LocalEnvKEKProvider",
    "KMSKeyProvider",
    "get_key_provider",
    "set_key_provider",
    "KeyManager",
    "get_key_manager",
    "set_key_manager",
    "calculate_sha256_bytes",
    "calculate_sha256_file",
    "verify_sha256",
    "sign_evidence_hash",
    "verify_evidence_signature",
    "EvidenceStorageResult",
    "encrypt_and_store_evidence",
    "retrieve_and_decrypt_evidence",
    "verify_evidence_integrity",
    "build_evidence_aad",
]
