# SafeHER AI & Open-Source License Compliance Report

**Report ID:** SH-LEG-LIC-008  
**Component:** Intellectual Property, Open-Source & Commercial License Audit  
**Audited Repositories:** All 8 Research Repositories + Integrated SafeHER Dependencies  
**Auditor:** Principal Software & Cybersecurity Architect  
**Date of Audit:** November 2026  
**Status:** 100% Permissive for Non-Commercial Safety Deployments; Commercial Pathway Defined  

---

## 1. Executive Summary

This compliance report evaluates the legal and intellectual property constraints governing the pretrained models, third-party codebases, and cryptographic libraries integrated into SafeHER.

SafeHER is designed primarily as a **humanitarian, non-commercial survivor safety platform**. In this capacity, all integrated academic research models (including those governed by Creative Commons Non-Commercial licenses) are fully compliant and legally permitted.

For potential commercial SaaS operations or institutional monetization, this report establishes a strict **dual-pathway architecture** that completely isolates Non-Commercial (NC) research components from commercially unrestricted core infrastructure.

---

## 2. Comprehensive License Matrix

| Component / Artifact | Originating Repository | Author / Institution | Code License | Weight / Model License | Commercial Use Permitted? | SafeHER Isolation Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RetinaFace (ResNet-50)** | `retinaface` / InsightFace | Jiankang Deng et al. | MIT License | MIT License | **YES** | Core Production Engine |
| **c2pa-python (c2pa-rs)** | `c2pa-python` | Adobe / CAI | Apache 2.0 / MIT | Apache 2.0 / MIT | **YES** | Core Production Engine |
| **unitary/toxic-bert** | HuggingFace Hub | Unitary AI | Apache 2.0 | Apache 2.0 | **YES** | Core Production Engine |
| **ViT NSFW Classifier** | HuggingFace Hub | Adam Codd | Apache 2.0 | Apache 2.0 | **YES** | Core Production Engine |
| **CipherVault Vault** | `CipherVault` | CipherVault Authors | MIT License | N/A (Code) | **YES** | Core Production Engine |
| **DEMS Management** | `DEMS` | DEMS Authors | MIT License | N/A (Code) | **YES** | Core Production Engine |
| **Effort-AIGI-Detection** | `Effort-AIGI-Detection` | ICML 2025 Authors | CC BY-NC 4.0 | CC BY-NC 4.0 | **NO (Non-Commercial Only)** | Configurable Research Plugin |
| **DeepfakeBench** | `DeepfakeBench` | SCLBD Lab | CC BY-NC 4.0 | CC BY-NC 4.0 | **NO (Non-Commercial Only)** | Configurable Research Plugin |
| **Guardify Baseline** | `Guardify` | Guardify Authors | Academic / Unspecified | Academic / Unspecified | **NO (Evaluation Only)** | Isolated Evaluation Module |
| **google/muril-base-cased** | Google Research | Google | Apache 2.0 | Apache 2.0 | **YES (If Fine-Tuned)** | Evaluated (Unused at runtime) |

---

## 3. Analysis of Creative Commons Non-Commercial (CC BY-NC 4.0)

Both **Effort-AIGI-Detection** and **DeepfakeBench** distribute code and pretrained checkpoints under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license.

### Clause Summary:
- **Permitted:** Copying, redistributing, remixing, transforming, and building upon the material in any medium or format for non-commercial purposes.
- **Prohibited:** Utilizing the material primarily intended for or directed towards commercial advantage or monetary compensation.

### Application to SafeHER:
1. **Academic, NGO & Non-Profit Deployments:** Universities, women's crisis centers, law enforcement cyber forensics units, and non-profit safety collectives may freely utilize SafeHER with Effort-AIGI and DeepfakeBench checkpoints enabled.
2. **Commercial Enterprise Deployments:** If SafeHER is operated as a paid B2B service or monetized platform, the administrator must either:
   - Obtain a commercial license directly from the respective authors/institutions, OR
   - Run SafeHER in **Commercial Mode**, which disables CC BY-NC checkpoints and routes through Apache 2.0 / MIT certified classifiers.

---

## 4. Protection Against Copyleft (GPL) Contamination

SafeHER strictly avoids GNU General Public License (GPL / AGPL) components within its core backend and inference services:
- All cryptographic operations use `cryptography` (Apache 2.0 / BSD) and Python's native standard library.
- OpenCV dependencies use `opencv-python-headless` (Apache 2.0).
- Neural inference relies exclusively on PyTorch (BSD-3-Clause) and HuggingFace Transformers (Apache 2.0).
- There is **zero risk of copyleft infection** requiring proprietary SafeHER source code to be disclosed under GPL.

---

## 5. Attribution & Compliance Notices

SafeHER maintains complete attribution notices within `models/README.md` and API response metadata, citing:
- *Effort-AIGI-Detection: Generalizable AI-Generated Image Detection via Orthogonal Subspace Tuning* (ICML 2025).
- *DeepfakeBench: A Comprehensive Benchmark of Deepfake Detection* (SCLBD Lab).
- *RetinaFace: Single-stage Dense Face Localisation in the Wild* (InsightFace, CVPR 2020).
- *Content Authenticity Initiative & C2PA Specification 1.3* (Adobe / CAI).
