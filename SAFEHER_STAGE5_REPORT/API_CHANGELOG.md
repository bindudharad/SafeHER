# Stage 5 API Changelog

All new endpoints are mounted under `/api/v1` and require `Authorization: Bearer <token>`. Existing Stage 1–4 endpoints remain backward-compatible.

## Evidence Intelligence Graph
- `POST /api/v1/graph/incidents/{incident_id}/sync`
- `GET /api/v1/graph/incidents/{incident_id}`
- `GET /api/v1/graph/nodes/{node_id}/neighborhood`
- `POST /api/v1/graph/nodes`
- `POST /api/v1/graph/edges`
- `POST /api/v1/graph/edges/{edge_id}/review`
- `DELETE /api/v1/graph/edges/{edge_id}`

## Normalized Incident Timeline
- `POST /api/v1/incidents/{incident_id}/timeline/reconstruct`
- `GET /api/v1/incidents/{incident_id}/timeline/normalized`
- `POST /api/v1/incidents/{incident_id}/timeline/normalized`
- `GET /api/v1/timeline/{event_id}`
- `PATCH /api/v1/timeline/{event_id}`
- `GET /api/v1/incidents/{incident_id}/timeline/export`

## Image Tampering Localization
- `POST /api/v1/tampering/{evidence_id}/analyze`
- `GET /api/v1/tampering/{evidence_id}`
- `GET /api/v1/tampering/artifacts/{artifact_id}`
- `POST /api/v1/tampering/analyses/{analysis_id}/review`

## Advanced Case Management & Custody
- `POST /api/v1/cases`
- `GET /api/v1/cases/{case_id}/workspace`
- `PATCH /api/v1/cases/{case_id}/transition`
- `POST /api/v1/cases/{case_id}/evidence`
- `POST /api/v1/cases/{case_id}/collaborators`
- `DELETE /api/v1/cases/{case_id}/collaborators/{target_user_id}`
- `POST /api/v1/cases/{case_id}/notes`
- `GET /api/v1/cases/{case_id}/activity`
- `POST /api/v1/evidence/{evidence_id}/custody`
- `GET /api/v1/evidence/{evidence_id}/custody/verify`
- `GET /api/v1/cases/{case_id}/investigation-summary`
