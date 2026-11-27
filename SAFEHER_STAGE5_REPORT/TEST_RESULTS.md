# Stage 5 Test Results

## 1. Backend Pytest Suite
**Command:**
```powershell
cd "C:\Users\Bindudhara D\Downloads\VSB\SafeHER\backend"
pytest test_stage5_forensics.py test_backend_integration.py test_security_hardening.py test_crypto_vault.py test_stage1_encryption.py test_stage2_evidence_analysis.py test_c2pa_and_forensics.py -q
```
**Result:** `63 passed, 5 warnings in 95.67s (0:01:35)` (Exit code `0`, 0 failed, 0 skipped).

Covered areas:
- Stage 5 Evidence Intelligence Graph (node/edge creation, self-edge rejection, provenance, review states, neighborhood, cross-user isolation)
- Stage 5 Normalized Timeline (UTC, `Asia/Kolkata` local TZ, unknown TZ without fabricated UTC, date-only, revisions, filtering, isolation)
- Stage 5 Image Tampering Localization (honest `unavailable` when checkpoint absent, low-res warning, corrupt image handling, API persistence, isolation)
- Stage 5 Advanced Case Management & Custody (lifecycle transitions, invalid transition rejection, collaborator RBAC, legal adviser restriction, revocation, chained custody verification, investigation summary)
- Stage 1–4 Regression (encryption, crypto vault, security hardening, C2PA, RetinaFace, Model A/B, multilingual threat analysis)

## 2. Frontend Vitest Suite
**Command:**
```powershell
cd "C:\Users\Bindudhara D\Downloads\VSB\SafeHER\frontend"
npm test -- --run
```
**Result:** `Test Files  16 passed (16)`, `Tests  53 passed (53)` in `22.43s` (Exit code `0`).

## 3. Frontend Production Build
**Command:**
```powershell
cd "C:\Users\Bindudhara D\Downloads\VSB\SafeHER\frontend"
npm run build
```
**Result:** `tsc -b && vite build` succeeded cleanly (`2905 modules transformed`, `✓ built in 8.54s`, Exit code `0`).
