# SafeHER — Third-Party Licenses & Legal Notices
## Open-Source Attribution & Pretrained Model Checkpoint Declarations

---

### 1. Statement of Intellectual Property & Origin

SafeHER is an independent open-source digital safety platform engineered for survivors of abuse. It integrates select third-party pretrained models, forensic libraries, and open-source packages in accordance with their respective permissive licenses (MIT, Apache-2.0, BSD-3-Clause).

**NIRBHAYA Repository Note**:
In accordance with ethical engineering and technical audit findings, no proprietary or unlicensed code from the reference NIRBHAYA repository was copied or integrated. All emergency safety features (siren, call simulator, quick exit) were developed independently as clean-room implementations using standard W3C Web Audio API and standard browser capabilities.

---

### 2. Core Python Backend Dependencies

| Package | Version | License | Copyright / Origin |
| :--- | :--- | :--- | :--- |
| `fastapi` | 0.135.3 | MIT | © Sebastián Ramírez |
| `pycryptodome` | 3.20.0 | BSD-2-Clause / Public Domain | © Helder Eijs |
| `cryptography` | 42.0.5 | Apache-2.0 / BSD | © The Python Cryptographic Authority |
| `c2pa-python` | 0.7.0 | Apache-2.0 / MIT | © Content Authenticity Initiative (CAI) |
| `torch` | 2.2.0 | BSD-3-Clause | © Meta Platforms, Inc. & PyTorch Contributors |
| `torchvision` | 0.17.0 | BSD-3-Clause | © Meta Platforms, Inc. & PyTorch Contributors |
| `facenet-pytorch` | 2.5.3 | MIT | © Tim Esler |
| `pillow` | 10.2.0 | HPND | © Alex Clark & Contributors |
| `slowapi` | 0.1.9 | MIT | © Alex Wilson |
| `pydantic` | 2.6.4 | MIT | © Samuel Colvin |
| `pytest` | 8.4.2 | MIT | © Holger Krekel & pytest-dev team |

---

### 3. Pretrained Model Weights & Forensics

| Model / Architecture | Pretrained Checkpoint Origin | License | SafeHER Application |
| :--- | :--- | :--- | :--- |
| **RetinaFace ResNet-50** | `retinaface/weights/Resnet50_Final.pth` | MIT | Facial detection, bounding boxes & 5-point facial landmarks |
| **Effort-AIGI Detection** | `Effort-AIGI-Detection/weights` (CLIP-ViT-L/14) | Apache-2.0 / MIT | Forensic classification of synthetic / AI-generated media |
| **DeepfakeBench MesoInception** | `DeepfakeBench/training/weights` | Apache-2.0 / MIT | Facial manipulation & deepfake swap detection |
| **Official C2PA Rust Core** | Content Authenticity Initiative (CAI) | Apache-2.0 / MIT | Cryptographic Content Credentials verification |

---

### 4. Core Frontend Node.js Dependencies

| Package | Version | License | Copyright / Origin |
| :--- | :--- | :--- | :--- |
| `react` | 18.2.0 | MIT | © Meta Platforms, Inc. |
| `react-dom` | 18.2.0 | MIT | © Meta Platforms, Inc. |
| `react-router-dom` | 6.22.3 | MIT | © Remix Software Inc. |
| `tailwindcss` | 3.4.1 | MIT | © Tailwind Labs, Inc. |
| `lucide-react` | 0.359.0 | ISC | © Lucide Contributors |
| `three` | 0.162.0 | MIT | © Ricardo Cabello (Mr.doob) |
| `clsx` | 2.1.0 | MIT | © Luke Edwards |
| `tailwind-merge` | 2.2.2 | MIT | © Dany Castillo |
| `vite` | 5.1.6 | MIT | © Yuxi (Evan) You & Vite Contributors |
| `vitest` | 1.4.0 | MIT | © Vitest Team |
