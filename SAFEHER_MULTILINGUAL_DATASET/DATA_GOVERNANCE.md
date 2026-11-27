# SafeHER Dataset Governance & Privacy Plan (`v1.0.0`)

## Core Prohibitions
1. **No Real Survivor Evidence:** Private survivor messages, incident logs, and intimate media must NEVER be copied into evaluation or training datasets.
2. **No PII:** No real names, phone numbers, email addresses, Aadhaar/PAN numbers, or real residential addresses.
3. **No Unauthorized Scraping:** No scraping of private WhatsApp, Telegram, Instagram, or social-media conversations.

## Provenance & Licensing
- All records in `safeher_eval_v1.jsonl` are synthetic (`is_synthetic: true`, `source: "synthetic_safeher_v1"`, `license: "CC0-1.0"`).
- Any future external dataset (e.g., HASOC, DravidianLangTech) must be logged with its exact URL, license, and commercial/non-commercial restrictions before use.

## Splitting & Leakage Prevention
- `splits/test.jsonl` is a **locked** evaluation benchmark. It must NEVER be used for training, hyperparameter tuning, or threshold fitting.
- Exact and near-duplicate checks are enforced in `build_dataset.py`.

## Storage, Access & Retention
- Any future human-reviewed feedback from production must be stored separately from original encrypted evidence (`evidence_vault`), stripped of PII, and NEVER used for automatic model retraining without explicit governance approval.
