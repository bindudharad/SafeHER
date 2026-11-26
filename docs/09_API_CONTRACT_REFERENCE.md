# 09 — API Contract Reference

All routes are defined in `backend/app.py`. Protected endpoints require `Authorization: Bearer <jwt_token>`.

---

## Health & Root

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Public | Service banner & basic status |
| `GET` | `/api/v1/health` | Public | Database connectivity and AI model readiness (`ai_service.get_ai_status()`) |

## Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Create user account (`201 Created`), returns JWT + user profile |
| `POST` | `/api/v1/auth/login` | Public | Authenticate email/password, returns JWT + user profile |
| `GET` | `/api/v1/auth/me` | Bearer | Return current authenticated user profile |

## Incidents & Timelines

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/incidents` | Bearer | List all incidents owned by current user |
| `POST` | `/api/v1/incidents` | Bearer | Create a new incident (`201 Created`) |
| `GET` | `/api/v1/incidents/{incident_id}` | Bearer | Fetch single incident details (owner-only) |
| `GET` | `/api/v1/incidents/{incident_id}/timeline` | Bearer | List chronological timeline events for an incident |
| `POST` | `/api/v1/incidents/{incident_id}/timeline` | Bearer | Append a timeline event (`201 Created`) |

## Evidence Vault

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/evidence` | Bearer | List all evidence items across user's incidents |
| `GET` | `/api/v1/incidents/{incident_id}/evidence` | Bearer | List evidence items for a specific incident |
| `POST` | `/api/v1/incidents/{incident_id}/evidence` | Bearer | Multipart file upload (`201 Created`), computes SHA-256 & detects duplicates |
| `GET` | `/api/v1/evidence/{evidence_id}/download` | Bearer | Stream stored evidence file (owner-only) |
| `DELETE` | `/api/v1/evidence/{evidence_id}` | Bearer | Delete evidence record and stored file (owner-only) |

## AI Analysis

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/check-text` | Public/Direct | Live text toxicity & threat screening (`unitary/toxic-bert`) |
| `POST` | `/check-image` | Public/Direct | Live image NSFW screening (`AdamCodd/vit-base-nsfw-detector`) |
| `POST` | `/api/v1/analysis/threat` | Bearer | Run & persist threat analysis (`201 Created`), optionally linked to `incident_id` |
| `POST` | `/api/v1/analysis/media` | Bearer | Run & persist media analysis on stored `evidence_id` (`201 Created`) |
| `GET` | `/api/v1/analysis/media/{evidence_id}` | Bearer | Retrieve latest persisted media analysis for an evidence item |
| `GET` | `/api/v1/analysis/history` | Bearer | Retrieve user's saved threat & media analysis history |

## Complaints, Cases, Reporting & Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/complaints/generate` | Bearer | Generate structured legal complaint draft (`201 Created`) |
| `PUT` | `/api/v1/complaints/{complaint_id}` | Bearer | Save edits / status updates to a complaint draft |
| `GET` | `/api/v1/cases` | Bearer | List user's tracked cases |
| `PATCH` | `/api/v1/cases/{case_id}` | Bearer | Update case status or notes |
| `GET` | `/api/v1/reporting/destinations` | Bearer | List supported external reporting portals/authorities |
| `POST` | `/api/v1/reporting/records` | Bearer | Log an external submission reference (`201 Created`) |
| `GET` | `/api/v1/dashboard/summary` | Bearer | Aggregated counts (incidents, evidence, analyses, cases) for Dashboard |
