# SafeHER Forensic Model Provenance (Stage 5)

| Engine | Model / Candidate | Architecture | Checkpoint Source | Local Availability | License | Status in SafeHER |
|---|---|---|---|---|---|---|
| **Tampering Localization (IMDL)** | TruFor | Noiseprint++ + CMX RGB-Noise Transformer | External (GRIP-UNINA / IMDLBenCo) | Not present (`models/trufor.pth.tar` absent; `IMDLBenCo` not installed) | Research / Academic (verify checkpoint terms) | `unavailable` (honest blocker reported; no fake heatmaps) |
| **Tampering Localization (IMDL)** | CAT-Net | HRNet + DCT Compression Artifact Tracing | External (KAIST / IMDLBenCo) | Not present (`models/CAT_full_v2.pth.tar` absent) | MIT (code) / Verify checkpoint terms | `unavailable` |
| **Tampering Localization (IMDL)** | ManTra-Net | Manipulation Tracing Network | External (USC / IMDLBenCo) | Not present (`models/ManTraNet_Ptrain.h5` absent) | USC Research License | `unavailable` |
| **Model A (Stage 3)** | Effort-AIGI-Detection | CLIP-L/14 + Orthogonal SVD | `models/effort_clip_l14_genimage.pth` | Present on disk | CC BY-NC 4.0 | Operational |
| **Model B (Stage 3)** | DeepfakeBench Xception | Xception on RetinaFace crops | `models/xception_best.pth` | Present on disk | CC BY-NC 4.0 | Operational |
| **Face Localization (Stage 2)** | RetinaFace | ResNet-50 FPN | `~/.deepface/weights/retinaface.pth` | Present on disk | MIT | Operational |
| **Content Credentials (Stage 2)** | `c2pa-python` 0.39.0 | Rust `c2pa-rs` X.509/JUMBF validator | PyPI package | Installed | MIT OR Apache-2.0 | Operational |
| **Multilingual NLP (Stage 4)** | `unitary/toxic-bert` + Guardify HASOC Baseline | BERT-base + TF-IDF LinearSVC | HuggingFace / `SafeHER-Research/Guardify` | Cached / Present | Apache-2.0 (toxic-bert) | Operational |
