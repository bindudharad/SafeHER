# SafeHER Multilingual Threat & Abuse Intelligence Report

**Report ID:** SH-AI-LANG-004  
**Component:** Multilingual Text Threat Analysis & Indic Abuse Engine  
**Implementation Source:** `backend/ai/text_threat_analysis.py` and `backend/ai/multilingual_nlp.py`  
**Core Technologies:** `unitary/toxic-bert` + Indic Script Classifier + Guardify HASOC Baseline  
**Evaluation Target:** Google MuRIL (`google/muril-base-cased`) Feasibility Assessment  
**License:** Apache 2.0 (`toxic-bert`) / Academic Evaluation (Guardify Baseline)  
**Status:** Multi-Signal Multilingual Engine Operational & Fully Tested  

---

## 1. Architectural Strategy & Design

Digital violence against women in the Indian subcontinent routinely crosses linguistic and script boundaries. Abusers alternate between English, regional Indic scripts (Kannada, Devanagari Hindi), and transliterated Hinglish slang in Latin characters.

SafeHER addresses this complex linguistic threat through a four-tier architecture:
1. **Tier 1 (Deep Contextual Toxicity):** `unitary/toxic-bert` fine-tuned on multi-label toxicity (toxic, severe toxic, insult, identity attack, threat).
2. **Tier 2 (Indic Script & Language Classification):** Unicode range detection for Kannada (`kn`) and Devanagari Hindi (`hi`), coupled with phonetic slang tokenization for Hinglish (`hi-Latn`).
3. **Tier 3 (Coercion, Blackmail & Extortion Heuristics):** High-risk pattern matching targeting non-consensual image distribution threats, cryptocurrency ransom demands, and familial shaming.
4. **Tier 4 (Comparative Baseline Integration):** Dynamic loading and evaluation of Guardify's HASOC baseline classifier (`estimator.joblib`).

---

## 2. Indic Script & Language Identification

The engine performs real-time script parsing across Indian linguistic blocks:
- **Kannada Script (`kn`):** Unicode block `U+0C80` - `U+0CFF`. Matches abusive phrases (e.g. *kolluthene*, *hodi*, *baduku*).
- **Hindi Devanagari Script (`hi`):** Unicode block `U+0900` - `U+097F`. Matches blackmail and viral threats (e.g. *पैसे दो वरना वीडियो वायरल कर दूंगा*).
- **Hinglish Transliterated (`hi-Latn`):** Analyzes Latin-script tokens against Indian cyber-harassment terms (*chutiya*, *kamine*, *madarchod*, *aukaat*, *barbaad*, *paisa do*, *dhamki*).
- **English (`en`):** Evaluated against standard threat and harassment lexicons.

---

## 3. Evaluation of Guardify Sample Baseline

The Guardify research repository includes a sample baseline in `Guardify/artifacts/baseline/sample-baseline/`:
- **Files:** `estimator.joblib` (134,965 bytes) and `metadata.json`.
- **Pipeline Architecture:** `scikit-learn` dictionary containing:
  - `vectorizer`: `TfidfVectorizer` (word n-grams, English + Hinglish tokens).
  - `model`: `LinearSVC` binary classifier (`Bullying` vs `Non-Bullying`).
  - `training_dataset`: HASOC 2019/2021 Hate Speech Proxy Dataset (3,000 samples).
  - Reported Metrics: Accuracy 0.929, Macro F1 0.880 on HASOC validation splits.

### Scientific Findings & Operational Limitations:
1. **High Out-of-Vocabulary (OOV) Rate:** As a surface-level bag-of-words model, the TF-IDF vectorizer fails on spelling variations common in chat messages (e.g., *chutiya* vs *ch00tiya* vs *cutiya*).
2. **Binary Limitations:** The model outputs only `Bullying` vs `Non-Bullying`, with no granularity for sexual violence threats, financial extortion, or stalking.
3. **SafeHER Role:** SafeHER loads this baseline dynamically in `backend/ai/multilingual_nlp.py` as an auxiliary signal, but does **not** rely on it as the primary safety gate.

---

## 4. Google MuRIL Feasibility Deep-Dive

Google MuRIL (*Multilingual Representations for Indian Languages*, `google/muril-base-cased`):
- **Model Architecture:** BERT-base (12 layers, 768 hidden dimensions, 12 attention heads, 236 million parameters).
- **Pretraining Data:** 17 Indian languages and English, including monolingual corpora, translated pairs, and transliterated pairs.
- **Pretraining Objective:** Masked Language Modeling (MLM) and Translation Language Modeling (TLM).

### Why Raw MuRIL Cannot Be Used for Abuse Classification:
> **Finding:** Claiming that raw `google/muril-base-cased` detects abuse without fine-tuning is scientifically dishonest and technically impossible.

1. **Missing Classification Head:** Raw MuRIL outputs 768-dimensional token embeddings. It possesses no sigmoid/softmax output layer, no output classes, and no decision threshold for toxicity or extortion.
2. **Uncalibrated Representation Space:** While MuRIL maps Hindi, Kannada, and Hinglish sentences into aligned geometric spaces, cosine similarity between an input sentence and an arbitrary "abuse" prototype produces high false-positive rates due to representation collapse on sentence length and syntactic structure.
3. **Conclusion for SafeHER:** In zero-training mode, SafeHER relies on `unitary/toxic-bert` for deep contextual semantics combined with Indic script lexicons. MuRIL is documented in SafeHER's roadmap as an ideal candidate for future supervised fine-tuning once an institutionally approved, annotated Indic abuse dataset is secured.

---

## 5. Verification & Test Evidence

Verified by automated tests in `backend/test_ai_pretrained_models.py`:
- `test_indic_script_detection`: Validated script identification on Kannada, Hindi, Hinglish, and English text.
- `test_guardify_baseline_evaluation`: Confirmed loading and prediction of `estimator.joblib`.
- `test_muril_feasibility_evaluation`: Confirmed honest system reporting on MuRIL suitability.
- `test_threat_text_analysis_comprehensive`: Validated extortion signal detection and survivor safety guidance generation.
- Result: **PASSED (100%)**.
