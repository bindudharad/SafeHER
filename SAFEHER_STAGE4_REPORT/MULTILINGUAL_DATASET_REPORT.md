# SafeHER Stage 4 — Multilingual Dataset Report (`v1.0.0`)

## 1. Overview
- **Location:** `SAFEHER_MULTILINGUAL_DATASET/safeher_eval_v1.jsonl` (mirrored in `splits/test.jsonl`)
- **Manifest:** `SAFEHER_MULTILINGUAL_DATASET/dataset_manifest.json`
- **Total Samples:** 120 (locked held-out evaluation benchmark)
- **Provenance:** `synthetic_safeher_v1` (`is_synthetic: true`, `contains_real_survivor_data: false`, `contains_pii: false`)
- **License:** `CC0-1.0 (SafeHER Synthetic Evaluation Benchmark)`

## 2. Language & Script Breakdown
| Language Code | Script | Samples | Description |
|---|---|---|---|
| `kn` | Kannada (`U+0C80–U+0CFF`) | 20 | Native Kannada Unicode (formal & colloquial) |
| `kn-Latn` | Latin | 20 | Transliterated Kannada in Latin script |
| `kn-en` | Mixed / Latin | 20 | Kannada-English code-mixed |
| `hi` | Devanagari (`U+0900–U+097F`) | 20 | Native Hindi |
| `hi-Latn` | Latin | 20 | Hinglish (Hindi-English code-mixed in Latin script) |
| `en` | Latin | 20 | English (formal, informal, social-media) |

## 3. Threat Taxonomy & Severity Distribution
- **12 Categories:** `BENIGN` (24), `INSULT` (12), `HARASSMENT` (6), `CYBERSTALKING` (6), `DIRECT_THREAT` (18), `BLACKMAIL` (6), `FINANCIAL_EXTORTION` (12), `SEXUAL_HARASSMENT` (6), `NON_CONSENSUAL_IMAGE_THREAT` (6), `COERCION` (6), `IMPERSONATION_OR_SOCIAL_ENGINEERING` (12), `OTHER_ABUSE` (6) as primary categories (with multi-label secondary tags).
- **Severity Levels:** `LOW` (30), `MODERATE` (18), `HIGH` (30), `URGENT_REVIEW` (42).
- **Benign Hard Negatives:** 24 benign samples include sensitive keywords (`money`, `UPI`, `photos`, `police station`) in everyday contexts to measure false-positive resistance.

## 4. Public Datasets Investigated & Gaps
- **HASOC 2019/2021** (used in Guardify proxy): Binary `HOF`/`NOT` for Hindi/English; lacks Kannada and SafeHER threat categories (blackmail, NCII, extortion, cyberstalking).
- **DravidianLangTech EACL 2021 Kannada**: Offensive vs. non-offensive; lacks blackmail/extortion/NCII/cyberstalking labels.
- **TextDetox Multilingual Toxicity**: Covers `en`, `hi`, `hin` (`openrail++`), lacks Kannada.
- **Known Gap:** SafeHER does not yet have a large-scale, lawfully licensed multi-label *training* dataset separate from this 120-sample locked evaluation benchmark.
