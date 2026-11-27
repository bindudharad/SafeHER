# SafeHER — Third-Party Notices and Open Source Licenses

SafeHER incorporates open source software components. This document provides notice of third-party software and associated licenses used in SafeHER.

---

## 1. C2PA Python SDK (`c2pa-python` / `c2pa-rs`)
- **Project**: Coalition for Content Provenance and Authenticity (C2PA) Python SDK
- **Copyright**: (c) 2021-2024 Content Authenticity Initiative
- **License**: MIT License OR Apache License 2.0 (Dual-licensed)
- **URL**: https://github.com/contentauth/c2pa-python
- **Used In**: `backend/ai/c2pa_service.py`, `backend/ai/c2pa_verification.py`

Licensed under the Apache License, Version 2.0 or the MIT License. You may obtain a copy of the Apache License at:
http://www.apache.org/licenses/LICENSE-2.0

---

## 2. RetinaFace Pretrained Facial Detector
- **Project**: RetinaFace Deep Face Detector
- **Copyright**: (c) 2020-2024 Sefik Ilkin Serengil, InsightFace authors
- **License**: MIT License
- **URL**: https://github.com/serengil/retinaface
- **Checkpoint Source**: https://github.com/serengil/deepface_models/releases/download/v1.0/retinaface.pth
- **Used In**: `backend/ai/face_detection.py`

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

---

## 3. PyTorch
- **Project**: PyTorch
- **Copyright**: (c) 2016-present, Facebook, Inc. and PyTorch contributors
- **License**: BSD 3-Clause License
- **URL**: https://pytorch.org/

---

## 4. OpenCV (Open Source Computer Vision Library)
- **Project**: OpenCV Python
- **Copyright**: (c) 2000-2024, OpenCV team
- **License**: Apache License 2.0
- **URL**: https://opencv.org/

---

## 5. Python Cryptography Library
- **Project**: Cryptography (PyCA)
- **Copyright**: (c) The cryptography developers
- **License**: Apache License 2.0 / BSD 3-Clause
- **URL**: https://cryptography.io/
- **Used In**: `backend/crypto_vault.py` (AES-256-GCM envelope encryption)


---

## 6. ForensicHub (Architectural Reference — Stage 5 Tampering Localization)
- **Project**: ForensicHub (Unified Fake Image Detection and Localization)
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0)
- **URL**: https://github.com/scu-zjz/ForensicHub
- **Usage in SafeHER**: Architectural reference for IMDL interface (`backend/ai/tampering_localization.py`). No third-party IMDL checkpoints are bundled; external checkpoints (TruFor, CAT-Net, ManTra-Net) carry their own independent licenses.

---

## 7. Timesketch (Concept & Schema Reference — Stage 5 Normalized Timeline)
- **Project**: Timesketch
- **Copyright**: (c) 2015 Google Inc. All rights reserved.
- **License**: Apache License 2.0
- **URL**: https://github.com/google/timesketch
- **Usage in SafeHER**: Clean-room adoption of normalized multi-source event timeline concepts (`backend/forensics/timeline_service.py`). Full Timesketch stack (OpenSearch/Celery/Flask) is not embedded.

---

## 8. DEMS — Digital Evidence Management System (Concept Reference — Stage 5 Case & Custody)
- **Project**: DEMS-DIGITAL_EVIDENCE_MANAGEMENT_SYSTEM
- **License**: MIT License
- **Usage in SafeHER**: Clean-room adoption of case assignment and custody record concepts (`backend/forensics/case_service.py`), hardened with SafeHER deny-by-default authorization and hash-chained custody records.

---

## 9. IRIS Web (Excluded)
- **Project**: DFIR-IRIS (`iris-web`)
- **License**: GNU LGPL-3.0
- **Status**: **NOT INTEGRATED**. Submodules are uninitialized and LGPL-3.0 source was not copied into SafeHER.

---

## 10. `filetype` (`h2non/filetype.py`)
- **Project**: `filetype` — Small, dependency-free Python package to infer file type and MIME type by magic numbers
- **License**: MIT License
- **URL**: https://github.com/h2non/filetype.py
- **Used In**: `backend/forensics/metadata_service.py` (magic-byte file verification & extension spoofing detection)

---

## 11. `ExifRead` (`ianare/exif-py`)
- **Project**: `exif-py` / `ExifRead` — Pure Python EXIF metadata extraction library
- **License**: BSD 3-Clause License
- **URL**: https://github.com/ianare/exif-py
- **Used In**: `backend/forensics/metadata_service.py` (EXIF/TIFF/GPS presence inspection)

---

## 12. `ImageHash` (`JohannesBuchner/imagehash`)
- **Project**: `ImageHash` — Python perceptual image hashing library (pHash, dHash, aHash)
- **License**: BSD 2-Clause License
- **URL**: https://github.com/JohannesBuchner/imagehash
- **Used In**: `backend/forensics/metadata_service.py` (perceptual hashing for near-duplicate evidence correlation)

---

## 13. C2PA Public Test Files (`c2pa-org/public-testfiles`) — Optional External Fixtures
- **Project**: Coalition for Content Provenance and Authenticity Public Test Files
- **License**: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- **URL**: https://github.com/c2pa-org/public-testfiles
- **Usage**: Optional external test fixtures (configured via `SAFEHER_C2PA_PUBLIC_TESTFILE`) for verifying `c2pa_service.py` against real-world valid and tampered C2PA manifests; not bundled into the SafeHER repository.

---

## 14. Effort-AIGI-Detection & DeepfakeBench Xception (Stage 3 Research Checkpoints)
- **Effort-AIGI-Detection** (`CLIP ViT-L/14 + Orthogonal SVD`): CC BY-NC 4.0 — https://github.com/Daisy-ycguo/Effort-AIGI-Detection
- **DeepfakeBench Xception** (`FaceForensics++` benchmark): CC BY-NC 4.0 — https://github.com/SCLBD/DeepfakeBench
- **Note**: Both checkpoints are non-commercial (`CC BY-NC 4.0`) and are excluded from Git tracking. Commercial deployments must set `SAFEHER_ENABLE_NONCOMMERCIAL_RESEARCH_MODELS=false`.

---

## 15. Frontend Open Source Libraries
- **React / React DOM** (MIT), **React Router** (MIT), **Vite** (MIT), **Tailwind CSS** (MIT), **Three.js** (MIT), **Recharts** (MIT), **jsPDF** (MIT), **Lenis** (MIT), **Lucide React** (ISC), **clsx** (MIT), **tailwind-merge** (MIT), **vgpu** (MIT), **GSAP** (Standard "No Charge" GSAP License — https://gsap.com/licensing/).
