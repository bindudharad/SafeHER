# 08 — AI/ML Models & Inference (`backend/ai_service.py`)

## Active Models

| Capability | Model / Engine | Input Constraints | Output Signals |
|---|---|---|---|
| **Text Abuse & Threat Screening** | `unitary/toxic-bert` (HuggingFace `text-classification` pipeline) | Max **10,000 characters** | `toxicity`, `insult`, `threat`, `severe_toxicity`, `obscene`, `identity_hate`, `decision` (`SAFE`, `WARNING`, `SUSPICIOUS`, `BLOCKED`) |
| **Image NSFW / Explicit Content Screening** | `AdamCodd/vit-base-nsfw-detector` (HuggingFace `image-classification` pipeline) | JPEG, PNG, WEBP; max **15 MB** | `nudity_score`, `deepfake_score` (placeholder/uncalibrated signal), `is_calibrated`, `uncertainty_state`, `decision` |

---

## Thread-Safe Lazy Loading

`backend/ai_service.py` uses a module-level `threading.Lock()` (`_model_lock`) to initialize HuggingFace pipelines on first use rather than blocking FastAPI startup:
- If `transformers` / `torch` or cached model weights are unavailable, `ai_service.py` degrades cleanly to deterministic heuristic fallback scoring and marks the status accordingly in `/api/v1/health`.

---

## Calibration & Uncertainty Disclosure

SafeHER's UI and API contracts explicitly distinguish calibrated vs. uncalibrated scores:
- `MediaAnalysisResult.is_calibrated`: When `false`, the frontend (`MediaAnalysisPage.tsx`, `DetectPage.tsx`) warns the user that synthetic/deepfake manipulation scoring is uncalibrated or heuristic and should not be treated as standalone forensic proof.
- `C2PAProvenance`: Reports whether C2PA Content Credentials were detected and states provenance limitations clearly.

---

## Deferred / Not Yet Implemented AI Scope

The following AI capabilities are **explicitly deferred** (documented in `reports/final-project-audit/MEMBER_1_AI_AUDIT.md` and `docs/releases/REMAINING_WORK.md`):
- Dedicated **audio deepfake / voice-cloning** detection model.
- Dedicated **video temporal deepfake** detection model (video uploads currently route through metadata/frame placeholder checks rather than a dedicated video neural network).
