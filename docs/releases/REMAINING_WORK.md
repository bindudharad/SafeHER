# Remaining Work & Future Roadmap

All agreed core scope items are implemented and verified. The following items are **explicitly deferred future enhancements** rather than blocking defects:

1. **Dedicated Audio Deepfake / Voice-Cloning Model (Member 1)** — Add a trained speech-spoofing detector and wire `media_type: 'audio'` end-to-end.
2. **Dedicated Video Temporal Deepfake Model (Member 1)** — Add frame/temporal deepfake inference for uploaded videos beyond image/metadata checks.
3. **Deepfake Score Calibration (Member 1)** — Calibrate deepfake probability outputs on benchmark datasets so `MediaAnalysisResult.is_calibrated` can be promoted to `true`.
4. **PostgreSQL + S3 Migration (Member 2)** — For multi-instance horizontal scaling beyond single-node SQLite + local disk (`backend/storage/evidence/`).
5. **External Malware Scanner Daemon (Member 2)** — Integrate ClamAV or equivalent async virus scanning for uploaded files.

See also: [14_KNOWN_LIMITATIONS_AND_TECH_DEBT.md](../14_KNOWN_LIMITATIONS_AND_TECH_DEBT.md) and [reports/final-project-audit/REMAINING_WORK.md](../../reports/final-project-audit/REMAINING_WORK.md).
