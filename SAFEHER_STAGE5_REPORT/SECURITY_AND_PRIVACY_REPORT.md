# Security and Privacy Report (Stage 5)

## 1. Access Control & Isolation
- **Evidence Graph**: Every node, edge, review, and neighborhood query is scoped by `owner_id` and `incident_id`. Cross-user queries return HTTP 404/403.
- **Normalized Timeline**: Event queries, reconstructions, and revisions enforce `user_id` ownership.
- **Tampering Localization & Artifacts**: Original evidence is decrypted in-memory only via Stage 1 `retrieve_and_decrypt_evidence`. Derived heatmaps/masks (when available) are encrypted at rest with AES-256-GCM (`tampering_artifacts`) and served only to the owning user.
- **Case Management (Deny-by-Default)**: `check_case_access` denies all users except the case owner (`cases.user_id`) and active assigned collaborators (`case_assignments.status = 'active'`). Administrators do not receive automatic access to private survivor evidence. Revoked collaborators are immediately blocked.

## 2. Tamper-Evident Custody History
- Custody events compute `SHA256(prev_record_hash | ...)` and are verified via `GET /api/v1/evidence/{id}/custody/verify`.

## 3. Privacy Safeguards
- Account identifiers (`@handle`) and URLs extracted as `suggested` graph edges are never automatically merged or attributed to real-world individuals.
- No sensitive image bytes or decrypted evidence are written to logs.
