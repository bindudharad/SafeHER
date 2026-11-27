# SafeHER Stage 4 — Model Selection Decision

## 1. Decision Outcome
**Selected Approach:** **Option B — Multi-Model Pretrained Ensemble + Clean-Room Multilingual Context-Aware Threat Layer**

**MuRIL Fine-Tuning Status:** **Recommended for future work, NOT performed in Stage 4 (Blocked by insufficient separate labeled training data and CPU-only hardware).**

## 2. Evidence-Based Justification
1. **`google/muril-base-cased` (`Apache-2.0`)** is a masked language model (`BertForMaskedLM`), not a threat classifier.
2. **Guardify (`estimator.joblib`)** is excluded from SafeHER production because:
   - The Guardify repository has no license file (`NOASSERTION`).
   - `Guardify/src/guardify/preprocessing/pipeline.py` line 91 strips Kannada Unicode (`\u0C80-\u0CFF`).
   - Empirical evaluation showed `0.1667` macro-F1 on Kannada and Hindi.
3. **Why Option B Was Selected Over Option A (Single Classifier):**
   - `unitary/toxic-bert` is English-only (0% recall on `kn`, `kn-Latn`, `hi`, `hi-Latn`).
   - `Hate-speech-CNERG/indic-abusive-allInOne-MuRIL` (`AFL-3.0`, fine-tuned from MuRIL) provides genuine Indic multilingual neural coverage (`0.4201` macro-F1), and `Hate-speech-CNERG/deoffxlmr-mono-kannada` (`Apache-2.0`) provides Kannada-specialist signals (`0.6416` macro-F1 on `kn-Latn`), but neither outputs SafeHER's 12 threat categories.
4. **Why Option C (Custom MuRIL Fine-Tuning) Was Not Executed:**
   - SafeHER's 120-sample `safeher_eval_v1.jsonl` is a locked *evaluation* set and must never be used for training.
   - No large, lawfully licensed 12-label multilingual *training* corpus exists yet, and the host environment is CPU-only (`torch 2.5.1+cpu`, `cuda: False`).
