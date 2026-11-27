# Evidence Intelligence Graph Report

## 1. Node Types
Supported in `backend/forensics/graph_service.py`:
`incident`, `case`, `evidence`, `screenshot`, `image`, `video`, `audio`, `message`, `url`, `account_identifier`, `phone_number`, `email_address`, `timeline_event`, `threat_analysis`, `deepfake_analysis`, `tampering_analysis`, `c2pa_provenance`, `annotation`.

SafeHER never merges distinct account identifiers or infers real-world identities from usernames or phone numbers.

## 2. Relationship Types & Provenance
Supported relationship types:
`BELONGS_TO_INCIDENT`, `ASSOCIATED_WITH_CASE`, `UPLOADED_BY`, `CONTAINS_EVENT`, `REFERENCES_URL`, `MENTIONS_ACCOUNT`, `HAS_TIMESTAMP`, `DERIVED_FROM`, `CORROBORATES`, `CONTRADICTS`, `DUPLICATE_OF`, `ANALYZED_BY`, `ANNOTATED_BY`.

Every edge records: `id`, `source_node_id`, `target_node_id`, `relationship_type`, `extraction_method` (`user_asserted`, `metadata_extracted`, `analysis_tool`, `correlation_rule`, `human_verified`), `source_evidence_id`, `supporting_ref`, `confidence_score`, `confidence_note`, `verification_status`, `reviewed_by`, `reviewed_at`, `created_by`, `created_at`.

## 3. Confidence & Review States
- `suggested` (machine-generated or correlation rule; requires human review)
- `user_asserted` (directly entered by user)
- `human_verified` (confirmed by human reviewer)
- `disputed` (marked contested)
- `rejected` (dismissed suggestion)

All review transitions are recorded in `relationship_reviews`.

## 4. Database & API
Tables: `evidence_graph_nodes`, `evidence_graph_edges`, `relationship_reviews` (SQLite WAL + PostgreSQL-compatible SQL).  
Endpoints: `POST /api/v1/graph/incidents/{id}/sync`, `GET /api/v1/graph/incidents/{id}`, `GET /api/v1/graph/nodes/{id}/neighborhood`, `POST /api/v1/graph/nodes`, `POST /api/v1/graph/edges`, `POST /api/v1/graph/edges/{id}/review`, `DELETE /api/v1/graph/edges/{id}`.
