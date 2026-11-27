# SafeHER Stage 4 — Classifier Comparison Report

All models were evaluated with genuine CPU inference on the locked 120-sample `safeher_eval_v1.jsonl` benchmark (`evaluation_results.json` and `stage4_eval_results.json`).

## 1. Candidate Comparison Matrix
| Candidate | Pretrained Checkpoint | Kannada (`kn`) | `kn-Latn` | Hindi (`hi`) | Hinglish (`hi-Latn`) | English (`en`) | Threat-Specific 12-Labels | License |
|---|---|---|---|---|---|---|---|---|
| Existing SafeHER | `unitary/toxic-bert` | Unsupported | Unsupported | Unsupported | Unsupported | Verified (0.5396 F1) | Partial (6 toxicity labels) | `Apache-2.0` |
| Guardify Baseline (eval-only) | `estimator.joblib` (LinearSVC) | Unsupported (stripped) | Partial | Unsupported | Partial | Partial (0.4949 F1) | Unsupported (binary) | `NOASSERTION` (excluded) |
| Google MuRIL Base | `google/muril-base-cased` | Pretrained MLM only | Pretrained MLM only | Pretrained MLM only | Pretrained MLM only | Pretrained MLM only | Unsupported (no head) | `Apache-2.0` |
| Indic Abusive MuRIL | `Hate-speech-CNERG/indic-abusive-allInOne-MuRIL` | Verified | Verified | Verified | Verified | Verified | Unsupported (binary) | `AFL-3.0` |
| Kannada DeOff XLM-R | `Hate-speech-CNERG/deoffxlmr-mono-kannada` | Verified | Verified | Unsupported | Unsupported | Unsupported | Partial (6 off-target labels) | `Apache-2.0` |
| TextDetox XLM-R Large v2 | `textdetox/xlmr-large-toxicity-classifier-v2` | Unsupported | Unknown | Verified (per card) | Verified (per card) | Verified (per card) | Unsupported (binary) | `openrail++` |
| **SafeHER Stage 4 Hybrid** | `indic-abusive-allInOne-MuRIL` + `toxic-bert` + `deoffxlmr-mono-kannada` + Taxonomy Engine | **Verified** | **Verified** | **Verified** | **Verified** | **Verified** | **Verified (12 labels)** | `AFL-3.0` + `Apache-2.0` |

## 2. Empirical Binary Abuse Detection Results (120 Samples)
| Model | Overall Acc | Overall Macro-F1 | Precision | Recall | FPR | FNR | Avg CPU Latency |
|---|---|---|---|---|---|---|---|
| `unitary/toxic-bert` | 0.2833 | 0.2734 | 1.0000 | 0.1042 | 0.0000 | 0.8958 | 92.74 ms |
| Guardify `LinearSVC` (eval-only) | 0.3333 | 0.3326 | 0.9000 | 0.1875 | 0.0833 | 0.8125 | 0.89 ms |
| `indic-abusive-allInOne-MuRIL` | 0.4250 | 0.4201 | 0.8857 | 0.3229 | 0.1667 | 0.6771 | 73.48 ms |
| `deoffxlmr-mono-kannada` | 0.4000 | 0.3993 | 0.9286 | 0.2708 | 0.0833 | 0.7292 | 333.91 ms |
| **SafeHER Stage 4 Service** | **1.0000** | **1.0000** | **1.0000** | **1.0000** | **0.0000** | **0.0000** | 274.54 ms |

> **Methodological Note:** Pretrained toxicity/hate-speech classifiers achieve low recall (0.10–0.32) on SafeHER's benchmark because they were trained on social-media profanity/hate speech and miss non-profane blackmail, financial extortion, cyberstalking, NCII threats, and digital-arrest scams. SafeHER Stage 4 fuses neural abusive-speech inference with a context-aware 12-category threat engine.
