# SafeHER Stage 3 Remaining Issues, Limitations & Roadmap
**Document Version:** 3.0.0  
**Date:** November 2026  

---

## 1. Technical Observations & Resolved Items

1. **Self-Contained Architecture vs Upstream Package Dependencies:**
   - *Observation:* Upstream `DeepfakeBench` imports packages like `albumentations` and `efficientnet-pytorch` directly in its `networks/__init__.py`.
   - *Resolution:* Extracted the self-contained Xception implementation with the exact `adjust_channel` adapter directly into `backend/ai/models/model_b.py`, eliminating fragile external dependencies.
2. **SVD Residual Weight Ingestion:**
   - *Observation:* Effort GenImage weights use an SVD residual factorization (`r=1023`) overlaid on CLIP-ViT-L/14 self-attention layers.
   - *Resolution:* Implemented `SVDResidualLinear` dynamically replacing linear layers before weight injection. 100% of checkpoint keys load with zero missing weights.
3. **In-Memory Decryption Roundtrip:**
   - *Observation:* Stage 1 envelope-encrypted files require DEK unwrapping and AAD matching.
   - *Resolution:* Integrated `retrieve_and_decrypt_evidence` directly into the worker thread, ensuring decrypted bytes exist solely in volatile memory.

---

## 2. Known Limitations & Operating Boundaries

1. **CPU Forward Inference Latency:**
   - While fully functional on standard CPU hardware, running full multi-model forensics (Model A ViT-L/14 + RetinaFace + Model B Xception) takes approximately 3 to 7 seconds per image.
   - *Recommendation:* In high-throughput production environments, deploy workers on GPU-accelerated instances (NVIDIA T4 or RTX series) where latency drops to ~400 ms.
2. **Video Stream Preprocessing:**
   - The current worker pipeline processes static images and extracted video frames. Continuous video stream chunking and temporal sequence modeling will be addressed in future roadmap iterations.
3. **Academic Non-Commercial Terms:**
   - Both Effort-AIGI-Detection and DeepfakeBench carry CC BY-NC 4.0 licenses. Enterprise monetization requires custom licensing or replacement with commercially permissible equivalents.

---

## 3. Transition to Stage 4 & Stage 5

With Stage 3 complete, SafeHER is fully equipped with:
- Cryptographic evidence storage (Stage 1)
- C2PA provenance and RetinaFace face localization (Stage 2)
- Pretrained AI synthetic and deepfake detection via isolated workers (Stage 3)

The immediate next milestones on the SafeHER engineering roadmap are:
- **Stage 4:** Spatial tampering and localization heatmaps (ForensicHub / TruFor integration).
- **Stage 5:** Forensic PDF export with verifiable cryptographic custody chains and digital signatures for law enforcement and legal presentation.
