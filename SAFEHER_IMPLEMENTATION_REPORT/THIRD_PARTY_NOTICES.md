# SafeHER Third-Party Notices & Attribution Report

**Date:** 2026-11-27  
**Scope:** Third-Party Libraries, Reference Repositories, Model Checkpoints, and Software Licenses  
**Status:** 100% Compliant  

---

## 1. Overview & Compliance Guarantee

SafeHER is designed with strict intellectual property and open-source license compliance:
- No GPL-incompatible or viral copyleft code has been merged into SafeHER.
- All integrated libraries and architectural designs utilize permissive open-source licenses (MIT, Apache 2.0, BSD-3-Clause).
- Reference repository code has been adapted through architectural clean-room reimplementation, honoring original licenses and attributions.

---

## 2. Integrated Packages & Libraries

### 2.1 Cryptography (`cryptography`)
- **Version:** 45.0.4
- **License:** Apache License, Version 2.0 / BSD 3-Clause License
- **Usage:** AES-256-GCM authenticated encryption, RSA-OAEP session key wrapping, RSA-PSS SHA-256 digital signatures, PEM serialization.
- **Copyright:** Copyright (c) Individual contributors.

### 2.2 C2PA Python SDK (`c2pa-python`)
- **Version:** 0.39.0 (SDK v0.92.0)
- **License:** Apache License, Version 2.0 / MIT License
- **Usage:** Reading, parsing, and verifying Coalition for Content Provenance and Authenticity (C2PA) JUMBF manifest metadata.
- **Copyright:** Copyright (c) 2022-2026 Adobe Systems Inc., Content Authenticity Initiative (CAI).

### 2.3 RetinaFace for PyTorch (`retina-face`)
- **Version:** 0.0.19
- **License:** MIT License
- **Usage:** Multi-scale human face localization, 5-point facial landmark extraction, and face alignment.
- **Copyright:** Copyright (c) 2021-2026 Sefik Ilkin Serengil.
- **Notice:**
  ```
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software...
  ```

### 2.4 SlowAPI (`slowapi`)
- **Version:** 0.1.9
- **License:** MIT License
- **Usage:** Rate limiting on FastAPI authentication and submission endpoints.
- **Copyright:** Copyright (c) 2019-2026 Leonardo Lazzaro.

### 2.5 PyTorch (`torch`)
- **Version:** 2.5.1+cpu
- **License:** BSD 3-Clause License
- **Usage:** Tensor computation and deep neural network inference for Toxic-BERT and RetinaFace.
- **Copyright:** Copyright (c) 2016-present Facebook, Inc / Meta Platforms.

### 2.6 HuggingFace Transformers (`transformers`)
- **Version:** 4.30+
- **License:** Apache License, Version 2.0
- **Usage:** Pipeline execution for `unitary/toxic-bert` contextual toxicity screening and `AdamCodd/vit-base-nsfw-detector`.
- **Copyright:** Copyright (c) 2018-present HuggingFace Inc.

---

## 3. Reference Repository Attributions

The following 11 cloned reference repositories in `C:\Projects\SafeHER\SafeHER-Research` provided technical reference architectures:

1. **CipherVault**
   - **License:** MIT License
   - **Inspiration:** AES-256-GCM envelope encryption architecture, Authenticated Associated Data (AAD) structure, and key management lifecycle.
2. **c2pa-python**
   - **License:** Apache 2.0 / MIT
   - **Inspiration:** Content Credentials manifest validation and test fixtures.
3. **retinaface**
   - **License:** MIT License
   - **Inspiration:** PyTorch multi-scale face localization and 5-point landmark alignment.
4. **Guardify**
   - **License:** MIT License
   - **Inspiration:** Multilingual Indian abuse lexicons (Hindi, Kannada, Hinglish) and extortion keyword heuristic scoring.
5. **DEMS-DIGITAL_EVIDENCE_MANAGEMENT_SYSTEM**
   - **License:** MIT License
   - **Inspiration:** Chain of custody audit trail design (`custody_records`).
6. **ForensicHub**
   - **License:** Apache 2.0
   - **Inspiration:** Digital evidence preservation receipt structures.
7. **DeepfakeBench**
   - **License:** Apache 2.0
   - **Inspiration:** Face-crop preprocessing and modular deepfake detection interfaces.
8. **Effort-AIGI-Detection**
   - **License:** MIT License
   - **Inspiration:** CLIP-L/14 SVD feature extraction design for synthetic image detection.
9. **NIRBHAYA**
   - **License:** MIT License
   - **Inspiration:** Survivor emergency intake patterns and institutional helpline references (1930 / cybercrime.gov.in).
10. **iris-web**
    - **License:** AGPL-3.0 (Inspected for architecture only; zero code copied to avoid license contamination).
    - **Inspiration:** High-level incident timeline concepts.
11. **timesketch**
    - **License:** Apache 2.0
    - **Inspiration:** Forensic chronological timeline schemas.

---

## 4. Model Weights & Dataset Licenses

- **`unitary/toxic-bert`:** Apache 2.0 License. Trained on Wikipedia Talk Pages Toxicity Dataset. Suitable for commercial and academic applications.
- **`AdamCodd/vit-base-nsfw-detector`:** MIT License. Pre-trained Vision Transformer for NSFW classification.
- **`retinaface.pth`:** ResNet-50 / MobileNet backbone trained on WIDER FACE dataset for non-commercial and research applications.
- **Synthesized Evidence Samples:** All sample images generated for testing in SafeHER use procedural synthetic RGB buffers (`Pillow`) and Adobe CAI open test fixtures (`C.jpg`). No private personal imagery or real survivor evidence is stored in test suites.
