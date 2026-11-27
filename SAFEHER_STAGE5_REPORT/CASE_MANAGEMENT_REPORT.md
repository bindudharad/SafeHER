# Advanced Case Management & Custody Report

## 1. Case Lifecycle
Implemented validated state transitions in `backend/forensics/case_service.py`:
`draft`, `open`, `evidence_collection`, `under_review`, `ready_for_submission`, `submitted`, `submitted_by_user`, `awaiting_response`, `follow_up_required`, `resolved`, `closed`, `archived`, `prepared`.
Every transition records actor, `from_status`, `to_status`, and `reason` in `case_activity`.

## 2. Deny-by-Default RBAC & Collaboration
- Only the case owner (`cases.user_id`) or an active assigned collaborator (`case_assignments.status = 'active'`) can access a case workspace.
- Roles: `owner`, `collaborator`, `investigator`, `legal_adviser` (read/review only; cannot transition case status).
- Revoking a collaborator (`DELETE /api/v1/cases/{id}/collaborators/{user_id}`) immediately blocks workspace access and logs an audit entry.

## 3. Chain of Custody & Investigation Summary
- `record_custody_event_chained` computes `SHA256(prev_record_hash | evidence_id | actor_id | action | timestamp | details | integrity_hash)` and `GET /api/v1/evidence/{id}/custody/verify` validates the hash chain.
- `GET /api/v1/cases/{id}/investigation-summary` produces a source-linked report separating machine-generated findings from human-confirmed facts, with an explicit disclaimer that it is not automatically court-admissible.
