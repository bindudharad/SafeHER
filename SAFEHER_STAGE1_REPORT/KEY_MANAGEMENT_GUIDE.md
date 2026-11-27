# SafeHER Stage 1 — Key Management Guide
**Key Management Protocols, Rotation Procedures & KMS Migration Path**
**Security Compliance:** NIST SP 800-57, ISO/IEC 11770-3

---

## 1. Key Hierarchy

SafeHER implements a strict hierarchical key architecture:

```
[ Root / Cloud KMS / Hardware Security Module ]
                   |
                   v
       [ Master KEK (Key Encryption Key) ]
         - 256-bit symmetric key
         - Stored in KMS / Env / Protected Vault
         - Identified by key_id and key_version
                   |
                   v
       [ Ephemeral DEKs (Data Encryption Keys) ]
         - 256-bit AES keys generated per evidence item
         - Stored only in wrapped form in the database
         - Never persisted to disk unencrypted
```

---

## 2. Configuration & Environment Variables

| Variable Name | Encoding | Required In | Description |
| :--- | :--- | :--- | :--- |
| `SAFEHER_KEK_B64` | Base64 (44 chars) | Production / Staging | 32-byte master KEK encoded in Standard Base64. |
| `SAFEHER_KEK_HEX` | Hexadecimal (64 chars) | Alternative | 32-byte master KEK encoded in Hex. |
| `SAFEHER_KEY_DIR` | Filesystem Path | Development | Directory where local developmental key `kek-local-v1.key` is persisted. |
| `SAFEHER_KEYS_DIR` | Filesystem Path | Development / Asymmetric | Directory storing RSA private (`safeher_rsa_priv.pem`) and public keys. |

### Generating a Production KEK
To generate a compliant 256-bit master KEK for production deployment:
```bash
# Generate Base64-encoded 256-bit KEK
python -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"

# Or generate 64-character Hex KEK
python -c "import secrets; print(secrets.token_bytes(32).hex())"
```

> [!CAUTION]
> If the master KEK is lost and no backup exists, all wrapped DEKs become cryptographically unrecoverable. Never store the KEK on the same storage volume as the encrypted evidence.

---

## 3. DEK Lifecycle

1. **Generation:** When a user uploads evidence, `os.urandom(32)` generates an ephemeral DEK in RAM.
2. **Usage:** The DEK encrypts the evidence payload once using AES-256-GCM.
3. **Wrapping:** The DEK is encrypted by the active KEK provider using AES-256-GCM with a distinct 96-bit nonce.
4. **Destruction from Volatile Memory:** The DEK variable is purged as soon as the in-flight self-verification check finishes.
5. **Recovery:** Upon download, the wrapped DEK is fetched from the database, unwrapped in memory, used to decrypt the payload, and discarded.

---

## 4. Key Rotation Procedures

Because envelope encryption decouples data payloads from master keys, **rotating the master KEK does not require re-encrypting multi-gigabyte evidence files**. Only the wrapped DEKs need re-wrapping.

### Rotation Steps:
1. Provision a new KEK in the key provider with incremented `key_version` (e.g., `key_version="2"`).
2. For each evidence record in the database:
   - Unwrap the DEK using `old_kek` and stored `wrapping_nonce`.
   - Wrap the DEK using `new_kek` and a fresh 96-bit wrapping nonce.
   - Update `wrapped_dek`, `wrapping_nonce`, and `key_version` in the database.
3. Decommission `old_kek` to archive status after verification.

---

## 5. Hardware Security Module (HSM) & Cloud KMS Migration

SafeHER's `BaseKeyProvider` interface in `backend/security/key_provider.py` provides pluggable integration for:
- **AWS KMS:** Using `kms:Encrypt` and `kms:Decrypt` or KMS Envelope primitives.
- **Google Cloud KMS:** Using `cloudkms.projects.locations.keyRings.cryptoKeys`.
- **Azure Key Vault:** Using Azure Key Vault Secrets / Keys API.
- **PKCS#11 HSMs:** For on-premise government and high-compliance installations.

To migrate to Cloud KMS:
1. Subclass `BaseKeyProvider` (see `KMSKeyProvider` template in `key_provider.py`).
2. Call `set_key_provider(MyCloudKMSProvider())` during application startup in `lifespan()`.
3. All calls to `wrap_key()` and `unwrap_key()` automatically delegate to the KMS without changing application storage code.
