# SafeHER Stage 4 — Multilingual Model Implementation

## 1. Architecture (`backend/ai/nlp/`)
- `language_detection.py`: Separates language/script identification (`kn`, `kn-Latn`, `kn-en`, `hi`, `hi-Latn`, `en`, `unknown`) from threat classification.
- `text_normalization.py`: Evidence-preserving NFC normalization, zero-width stripping, alphabetic elongation collapse (preserving numbers), and de-obfuscation (`n.u.d.e.s` -> `nude`, `l.e.a.k` -> `leak`).
- `transliteration.py`: Cautious Romanized variant canonicalization without blind script conversion or translation.
- `model_registry.py` & `model_loader.py`: Thread-safe lazy singletons with `USE_TF=0` for:
  1. `Hate-speech-CNERG/indic-abusive-allInOne-MuRIL` (`AFL-3.0`, 236M params, MuRIL)
  2. `unitary/toxic-bert` (`Apache-2.0`, 110M params, BERT-base, English/mixed)
  3. `Hate-speech-CNERG/deoffxlmr-mono-kannada` (`Apache-2.0`, 278M params, XLM-R, Kannada-routed with `xlm-roberta-base` tokenizer fallback)
- `threat_classifier.py`: Fuses neural scores with 12-category multilingual patterns and benign-context false-positive guards.
- `severity_assessment.py`: Maps categories, confidence, and ambiguity to `LOW`, `MODERATE`, `HIGH`, `URGENT_REVIEW` and truthful `analysis_status` (`completed`, `unsupported_language`, `low_confidence`, `ambiguous`, `model_unavailable`, `inference_failed`).
- `inference_service.py`: Orchestrates end-to-end inference and logs only non-PII metadata.
