# SafeHER Stage 1 — Remaining Security Issues & Future Roadmap
**Honest Technical Assessment of Residual Risks and Out-of-Scope Items**

---

## 1. Stage 1 Scope Boundaries & What Was Solved

Stage 1 strictly focused on **Cryptographic Evidence Storage, Envelope Encryption & Key Management**. 
The following vulnerabilities were definitively closed:
- Plaintext evidence file persistence on storage disks (`CWE-312`).
- Missing authenticated encryption and lack of tampering detection (`CWE-353`).
- Missing context binding in ciphertext (`CWE-326`).
- Unverified digital chain of custody (`CWE-347`).

---

## 2. Residual Security Issues To Address in Subsequent Stages

The following security enhancements are intentionally scoped for future implementation stages according to the project roadmap:

### 1. In-Depth Antivirus / Malware Scanning (Stage 2)
- **Current State:** Basic magic-byte validation and extension filtering are active; evidence rows receive `malware_status = 'clean'`.
- **Residual Risk:** An attacker could potentially upload a polyglot exploit disguised as a valid PNG or PDF.
- **Future Action:** Integrate asynchronous scanning daemon (ClamAV or Yara signature rules) prior to marking processing readiness.

### 2. Multi-Factor Authentication (MFA / TOTP) (Stage 2)
- **Current State:** JWT authentication with Argon2id / bcrypt password hashing, IP-based rate limiting, and token revocation blocklisting are active.
- **Residual Risk:** Phished or stolen credentials can authenticate without a second factor.
- **Future Action:** Implement RFC 6238 TOTP (Google Authenticator / Aegis) and WebAuthn / FIDO2 security key support.

### 3. Pretrained AI Inference Models (Stage 3)
- **Current State:** The mock baseline in `backend/ai/` was replaced with real scikit-learn NLP models, and zero-mock Honest Availability reporting is implemented.
- **Out of Scope in Stage 1:** Actual neural network inference for deepfake detection (Model A / Model B), RetinaFace face extraction, and MuRIL multilingual embeddings.
- **Future Action:** Integrate zero-training pretrained weights in Stage 3 per the AI roadmap.

### 4. Transport & Network Infrastructure (Stage 4)
- **Current State:** HTTP security headers (`nosniff`, `DENY`, `max-age=31536000`, `CSP`) are injected by backend middleware.
- **Residual Risk:** Development mode runs on HTTP without TLS termination.
- **Future Action:** Configure production NGINX / Caddy reverse proxy with Let's Encrypt automated TLS 1.3 certificates and strict HSTS preloading.

### 5. KMS Hardware Backing in Cloud Environments (Stage 5)
- **Current State:** `LocalEnvKEKProvider` provides secure development and staging envelope wrapping.
- **Future Action:** Connect AWS KMS, Google Cloud KMS, or Azure Key Vault via the `KMSKeyProvider` interface for production deployments.

---

## 3. Prioritized Implementation Sequence

```
[ Stage 1: Crypto & Storage ]  <-- COMPLETED
             |
             v
[ Stage 2: Auth Hardening & Upload Malware Scanning ]
             |
             v
[ Stage 3: Zero-Training Pretrained AI Model Integration ]
             |
             v
[ Stage 4: Production Network, TLS & C2PA Full Manifest Signing ]
```
