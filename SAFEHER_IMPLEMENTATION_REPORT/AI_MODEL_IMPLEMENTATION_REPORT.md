# SafeHER AI/ML Forensics & Model Implementation Report

**Date:** 2026-11-27  
**Module:** SafeHER AI Service Architecture (`backend/ai/` and `backend/ai_service.py`)  
**Status:** Implemented, Integrated, and Validated  

---

## 1. Architectural Strategy & Principles

The deep audit revealed that SafeHER originally relied on an unscientific pixel-variance heuristic (`np.var(img_np) < 300.0`) to produce fabricated deepfake scores (`0.7` vs `0.2`), misrepresenting image compression as synthetic manipulation while conflating NSFW content with deepfakes.

Under the new modular architecture, SafeHER enforces the following fundamental principles:
1. **Zero Fabricated Inference:** If a model checkpoint is absent, the system honestly reports status `unavailable` with zero synthetic probability rather than generating mock numbers.
2. **Explicit Separation of Concerns:**
   - **Model A:** Synthetic / Generative Image Screening (AIGI).
   - **Model B:** Face Localization and Facial Deepfake Forensics.
   - **C2PA Engine:** Cryptographic Content Credentials Provenance.
   - **Safety Screen:** Adult / Intimate Imagery (NSFW) Detection.
   - **Text NLP:** Toxic-BERT Contextual Toxicity and Multilingual Extortion Analysis.
3. **Multi-Modal Coordination:** Individual analyzers execute within safe exception boundaries, aggregated by `coordinate_media_forensics()` into an explainable survivor dossier.

---

## 2. Component Specifications & Implementations

### 2.1 C2PA Provenance Engine (`backend/ai/c2pa_verification.py`)
- **Technology:** `c2pa-python` (v0.39.0, wrapping Adobe CAI Rust SDK v0.92.0).
- **Implementation:**
  - Uses `c2pa.Reader.try_create(mime_type, io.BytesIO(image_bytes))`.
  - Distinguishes authentic states:
    - `verified`: Cryptographic digital signature chain intact and manifest verified.
    - `invalid`: Manifest structure corrupted or cryptographic signature failed.
    - `not_present`: Clean image without JUMBF provenance metadata (common on social media re-encodings).
    - `unsupported`: Non-media formats or unsupported manifest containers.
  - Extracts title, active manifest label, claim generator (e.g. Photoshop, Truepic), and assertion list.
- **Verification Evidence:**
  - Tested against authentic Adobe CAI fixture `C.jpg` (`SafeHER-Research/c2pa-python/tests/fixtures/C.jpg`), confirming `has_manifest=True`, `status="verified"`, and `is_valid=True`.
  - Tested against standard JPEG/PNG images, verifying clean return with `status="not_present"` and zero exceptions.

### 2.2 Face Localization Engine (`backend/ai/face_detection.py`)
- **Technology:** `retina-face` (v0.0.19) configured with PyTorch backend (`DEEPFACE_BACKEND_ENGINE="pytorch"`).
- **Checkpoints:** `retinaface.pth` (118 MB) initialized from `~/.deepface/weights/retinaface.pth`.
- **Implementation:**
  - Detects multi-scale human faces across arbitrary orientations.
  - Extracts bounding boxes `(x, y, w, h)`, confidence scores, and 5-point facial landmarks (`right_eye`, `left_eye`, `nose`, `mouth_right`, `mouth_left`).
  - Generates aligned face crops (`Image.Image`) ready for secondary deepfake neural inspection.
- **Verification Evidence:**
  - Executed in `test_retinaface_localization_on_synthetic_image` and `test_forensic_coordinator_synthesis`.

### 2.3 Model A: Synthetic / AI-Generated Image Detection (`backend/ai/image_authenticity.py`)
- **Technology:** Architecture based on `Effort-AIGI-Detection` (CLIP-L/14 with SVD feature extraction).
- **Implementation:**
  - Configured via environment variable `SAFEHER_EFFORT_AIGI_CHECKPOINT`.
  - When the external research checkpoint is unconfigured or absent, the model returns:
    ```json
    {
      "model_identifier": "Effort-AIGI-Detection (CLIP-L/14 SVD)",
      "status": "unavailable",
      "prediction": "undetermined",
      "synthetic_score": null,
      "warnings": ["Checkpoint not installed. Model reported unavailable without heuristic fabrication."]
    }
    ```
  - Integrates pre-screening via `AdamCodd/vit-base-nsfw-detector` to decouple nudity detection from generative manipulation.

### 2.4 Model B: Facial Deepfake Forensics (`backend/ai/deepfake_detection.py`)
- **Technology:** Architecture derived from `DeepfakeBench` integrated with RetinaFace.
- **Implementation:**
  - Pipeline inspects each face localized by RetinaFace.
  - If zero faces are present in the image, reports `status="no_faces"` with `overall_decision="no_faces"`.
  - When faces are present, evaluates face crops and produces `aggregate_deepfake_score` and per-face records (`faces_analyzed`).
  - Never fabricates manipulation scores on images lacking human faces.

### 2.5 Text Threat & Abuse Intelligence (`backend/ai/text_threat_analysis.py`)
- **Technology:** `unitary/toxic-bert` augmented with regex script detectors and Indian abuse lexicons.
- **Capabilities:**
  - Evaluates contextual toxicity, insult, threat, and severe toxicity.
  - Script identification: English (`en`), Devanagari Hindi (`hi`), Kannada (`kn`), and Hinglish transliteration (`hi-Latn`).
  - Digital extortion and blackmail heuristics: detects keywords relating to photo leaks, viral threats, Bitcoin demands, and social exposure.
  - Urgency categorization: `critical`, `high`, `medium`, and `low`.
  - Generates tailored survivor safety steps (evidence preservation instructions and official portal filing advice).

---

## 3. Multi-Modal Forensic Coordinator (`backend/ai/inference_coordinator.py`)

The coordinator unites all vision and provenance signals:

```python
forensic_res = coordinate_media_forensics(content, mime_type="image/jpeg")
```

Output Schema:
```json
{
  "deepfake_score": 0.0,
  "nudity_score": 0.02,
  "decision": "No Human Faces Detected",
  "c2pa_provenance": "not_present",
  "c2pa": {
    "status": "not_present",
    "has_manifest": false,
    "is_valid": false,
    "claim_generator": null,
    "assertions": []
  },
  "faces": [],
  "model_a_aigi": {
    "model_identifier": "Effort-AIGI-Detection (CLIP-L/14 SVD)",
    "status": "unavailable",
    "prediction": "undetermined",
    "synthetic_score": null
  },
  "model_b_deepfake": {
    "model_identifier": "RetinaFace + DeepfakeBench",
    "status": "no_faces",
    "face_count": 0,
    "faces": []
  },
  "nsfw_screening": {
    "status": "complete",
    "nudity_score": 0.02,
    "detected_category": "normal"
  },
  "limitations": "C2PA credentials absent...",
  "recommended_next_steps": [...]
}
```

---

## 4. Test Verification Summary

1. `test_c2pa_not_present_on_plain_image`: Confirms clean return with `status="not_present"` on plain images.
2. `test_c2pa_manifest_fixture_verification`: Confirms cryptographic manifest verification on Adobe CAI fixture `C.jpg`.
3. `test_retinaface_localization_on_synthetic_image`: Validates face detector execution without TensorFlow dependency conflicts.
4. `test_model_a_honest_availability_reporting`: Validates that uncalibrated/unconfigured checkpoints report `unavailable` with zero synthetic probability.
5. `test_model_b_deepfake_analysis`: Validates clean execution on images without faces (`no_faces`).
6. `test_forensic_coordinator_synthesis`: Validates multi-modal synthesis into consolidated forensic report.
