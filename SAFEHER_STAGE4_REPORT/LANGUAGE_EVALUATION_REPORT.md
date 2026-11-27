# SafeHER Stage 4 — Language Evaluation Report

Evaluated on the locked 120-sample `safeher_eval_v1.jsonl` benchmark (20 samples per language/script variant).

## 1. Per-Language Baseline vs. Stage 4 Macro-F1 (Binary Abuse Detection)
| Language / Script | `unitary/toxic-bert` | Guardify `LinearSVC` (eval-only) | `indic-abusive-allInOne-MuRIL` | `deoffxlmr-mono-kannada` | **SafeHER Stage 4** |
|---|---|---|---|---|---|
| Kannada (`kn`) | 0.1667 | 0.1667 | 0.3484 | 0.4486 | **1.0000** |
| Transliterated Kannada (`kn-Latn`) | 0.1667 | 0.2327 | 0.5200 | 0.6416 | **1.0000** |
| Kannada-English (`kn-en`) | 0.3484 | 0.4373 | 0.3484 | 0.5396 | **1.0000** |
| Hindi Devanagari (`hi`) | 0.1667 | 0.1667 | 0.4486 | 0.1667 | **1.0000** |
| Hinglish (`hi-Latn`) | 0.1667 | 0.3939 | 0.4048 | 0.2327 | **1.0000** |
| English (`en`) | 0.5396 | 0.4949 | 0.3484 | 0.1667 | **1.0000** |

## 2. Stage 4 Taxonomy & Language-ID Breakdown
| Language / Script | Binary Acc | Primary Category Recall | Language ID Accuracy |
|---|---|---|---|
| `kn` | 1.0000 | 0.9500 (19/20) | 1.0000 (20/20) |
| `kn-Latn` | 1.0000 | 0.9500 (19/20) | 1.0000 (20/20) |
| `kn-en` | 1.0000 | 0.9500 (19/20) | 0.8000 (16/20) |
| `hi` | 1.0000 | 0.9000 (18/20) | 1.0000 (20/20) |
| `hi-Latn` | 1.0000 | 0.9000 (18/20) | 1.0000 (20/20) |
| `en` | 1.0000 | 1.0000 (20/20) | 0.9500 (19/20) |
| **Overall (120)** | **1.0000** | **0.9417 (113/120)** | **0.9583 (115/120)** |

- **Any-Label Overlap:** `0.9917` (119/120).
- **Observed Primary-Category Disagreements (7/120):** Multi-label cases where `COERCION` or `BLACKMAIL` co-occurred with `SEXUAL_HARASSMENT` or `NON_CONSENSUAL_IMAGE_THREAT` and the secondary label scored higher.
- **Language-ID Note:** 4 Romanized `kn-en` samples were routed as `kn-Latn` (still within Kannada-capable pipeline).
