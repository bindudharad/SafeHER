# 14 — Evidence Vault & Cryptographic Hashing

## Key Files
- `frontend/src/pages/evidence/EvidenceVaultPage.tsx` — Vault UI with filterable evidence list, upload modal/dropzone, and integrity status
- `frontend/src/components/evidence/EvidenceDropzone.tsx` — Drag-and-drop / file-picker upload zone with client-side validation
- `frontend/src/components/evidence/EvidenceCard.tsx` — Renders file metadata, `sha256_hash`, `validation_status`, `malware_status`, `duplicate_status`, download & delete controls
- `frontend/src/utils/crypto.ts` — `calculateSHA256(fileOrBuffer)` (aliased `computeFileHash`), `formatBytes()`, `formatDate()`

---

## Client + Server Integrity Flow

1. User drops or selects a file in `EvidenceDropzone.tsx`.
2. Browser computes `sha256_hash` via `crypto.subtle.digest('SHA-256', buffer)` (`utils/crypto.ts`).
3. `apiClient.uploadEvidence()` sends a `multipart/form-data` `POST` to `/api/v1/incidents/{incident_id}/evidence`.
4. Backend independently re-computes SHA-256, checks for exact duplicates, persists the file in `backend/storage/evidence/`, and returns the `Evidence` record.

---

## Testing
Covered by `frontend/src/tests/foundation.test.tsx` (SHA-256 utility) and `frontend/src/tests/evidence_vault.test.tsx`.
