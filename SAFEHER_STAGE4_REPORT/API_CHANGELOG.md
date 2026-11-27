# SafeHER Stage 4 — API & Schema Changelog

## 1. `POST /api/v1/analysis/threat` (Extended, Backward-Compatible)
- **Preserved fields:** `id`, `incident_id`, `input_text`, `toxicity_score`, `insult_score`, `threat_score`, `harassment_score`, `blackmail_score`, `extortion_score`, `urgency_level`, `decision`, `detected_signals`, `explanation`, `limitations`, `suggested_steps`, `created_at`.
- **Added Stage 4 fields:**
  - `analysis_id`, `model_id`, `model_version`, `models_used`
  - `language`, `language_name`, `script`, `is_mixed_language`, `supported_language`, `language_confidence`, `language_detected`
  - `predicted_categories` (12-label taxonomy), `category_scores`
  - `severity` (`LOW` | `MODERATE` | `HIGH` | `URGENT_REVIEW`)
  - `confidence_status`, `analysis_status` (`completed` | `unsupported_language` | `low_confidence` | `ambiguous` | `model_unavailable` | `inference_failed`), `requires_human_review`, `warnings`, `inference_time_ms`

## 2. `POST /api/v1/analysis/threat/{analysis_id}/feedback` (New)
- Authenticated, user-scoped endpoint to record human review (`corrected_categories`, `corrected_severity`, `is_false_positive`, `notes`) into `threat_analysis_feedback` with `used_for_training = 0`.

## 3. Database (`backend/db.py`)
- Added `multilingual_metadata TEXT` column (with `ALTER TABLE` migration) to `threat_analyses`.
- Added `threat_analysis_feedback` table.
