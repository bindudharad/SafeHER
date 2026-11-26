# 14 — Known Limitations & Technical Debt

This document records verified gaps and intentionally deferred scope so new developers do not mistake them for regressions or hidden bugs.

## 1. Deferred AI Capabilities (Member 1)
- **Audio Deepfake / Voice Cloning Detection:** Not implemented yet.
- **Video Temporal Deepfake Detection:** Not implemented yet (`MediaAnalysisResult` supports `'image' | 'video' | 'audio'` in TypeScript contracts, but live HuggingFace inference covers text toxicity and image NSFW screening).
- **Deepfake Score Calibration:** `MediaAnalysisResult.is_calibrated` is `false` for deepfake scores; the UI explicitly surfaces an uncalibrated/advisory warning rather than claiming forensic certainty.

## 2. Persistence & Scale Limits (Member 2)
- **Single-Node SQLite & Local Disk Storage:** `backend/safeher.db` and `backend/storage/evidence/` work reliably for local and single-instance deployments, but horizontal scaling across multiple containers requires migrating to PostgreSQL and S3-compatible object storage.
- **Malware Scanning:** `malware_status` defaults to `'clean'` / `'pending'` without an external ClamAV daemon wired in.

## 3. Frontend Offline Demo Mode (Member 3)
- `apiClient` maintains in-memory fallback arrays (`localIncidents`, `localEvidence`, etc.) when the backend is unreachable; changes made in `offline_demo` mode do not persist across full page reloads.

---

## Related Documents

- [Current Project Status](releases/CURRENT_PROJECT_STATUS.md)
- [Remaining Work](releases/REMAINING_WORK.md)
- [Final Project Audit](../reports/final-project-audit/FINAL_PROJECT_AUDIT.md)
