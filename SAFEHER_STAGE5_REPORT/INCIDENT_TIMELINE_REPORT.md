# Incident Timeline Reconstruction Report

## 1. Normalized Event Schema
Inspired by Timesketch (`Apache-2.0`), `timeline_events` was extended non-destructively with:
- `event_time_original` (preserved verbatim)
- `event_time_utc` (populated ONLY when timezone is explicit or user-supplied; `NULL` when timezone is unknown)
- `timezone_original`, `timezone_confidence` (`explicit`, `user_supplied`, `unknown`)
- `time_precision` (`exact`, `approximate`, `date_only`, `unknown_timezone`, `conflicting`, `range`)
- `time_end_original`
- `time_source` (`alleged_occurrence`, `evidence_created`, `safeher_upload`, `analysis_performed`, `manual_entry`)
- `extraction_method`, `confidence_status`, `verification_status` (`unverified`, `suggested`, `user_asserted`, `human_verified`, `disputed`)

## 2. Timestamp Integrity Rules
- Alleged incident occurrence, EXIF creation time, SafeHER upload time, analysis execution time, and manual entries are strictly separated via `time_source`.
- Unknown timezones are never silently converted to UTC.
- Conflicting events are never merged automatically.
- Every edit via `PATCH /api/v1/timeline/{event_id}` appends an immutable diff to `timeline_event_revisions`.

## 3. Event Sources & Correlation
`reconstruct_incident_timeline` extracts events from incident metadata, preserved evidence uploads, media/C2PA analyses, and threat analyses, and records explainable `SHARED_EVIDENCE_SOURCE` suggestions in `timeline_event_relations`.
