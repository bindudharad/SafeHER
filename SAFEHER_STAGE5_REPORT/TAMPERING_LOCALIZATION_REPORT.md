# Image Tampering Detection & Localization Report

## 1. Selected Architecture & Candidates
Evaluated ForensicHub (`CC BY 4.0`) and `IMDLBenCo` (`TruFor`, `CAT-Net`, `ManTra-Net`) in `backend/ai/tampering_localization.py`.

## 2. Checkpoint Verification & Availability
- `IMDLBenCo` is **not** installed in the current Python 3.10 environment.
- No pretrained IMDL checkpoint (`models/trufor.pth.tar`, `models/CAT_full_v2.pth.tar`, `models/ManTraNet_Ptrain.h5`) is present on disk.
- Per SafeHER's non-negotiable forensic rules, **no fake heatmaps or pixel-threshold heuristics are generated**.

## 3. Operational Behavior
- `analyze_image_tampering` validates image format (`JPEG`, `PNG`, `WEBP`, `TIFF`, `BMP`), extracts original dimensions, checks resolution warnings (`<128px`), handles corrupt/unsupported files (`failed` / `unsupported`), and returns `analysis_status="unavailable"` with `localization_available=False` and explicit blocker details until a compatible, legally permitted checkpoint + `IMDLBenCo` runtime is supplied.
- When a valid checkpoint is configured via `SAFEHER_TAMPERING_CHECKPOINT`, the service performs PyTorch inference, rescales the probability mask to original image dimensions (`coordinate_transform`), and stores derived PNG heatmaps/masks encrypted at rest via Stage 1 AES-256-GCM (`tampering_artifacts`).

## 4. Scientific Limitations
- Localization heatmaps are analytical signals, not definitive proof of manipulation.
- Social-media recompression, resizing, and screenshots can introduce false positives or obscure traces.
- Localized manipulation detection (IMDL) is distinct from AI-generated image detection (Model A) and facial deepfake detection (Model B).
