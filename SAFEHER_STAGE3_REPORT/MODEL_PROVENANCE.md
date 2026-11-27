# SafeHER Pretrained AI Model Provenance & Verification
**Cryptographic Audit Date:** November 2026  
**Hashing Standard:** SHA-256 (NIST FIPS 180-4)  

---

## 1. Verified Cryptographic Checkpoint Registry

Every pretrained checkpoint incorporated into SafeHER is cryptographically verified against known upstream digests:

### 1.1 Model A: Effort-AIGI-Detection (GenImage Benchmark Checkpoint)
- **File Name:** `effort_clip_l14_genimage.pth`
- **Location:** `C:\Users\Bindudhara D\Downloads\VSB\SafeHER\models\effort_clip_l14_genimage.pth`
- **File Size:** 1,213,769,519 bytes (~1.13 GiB / 1.21 GB)
- **SHA-256 Digest:**
  ```
  7c32ceb4e66d303050e8fc5dc7543fa347693fb4ee6b5df4d6eaf9f6a92fb813
  ```
- **Upstream Repository:** `SafeHER-Research/Effort-AIGI-Detection` (ICML 2025 Oral)
- **Base Architecture:** OpenAI CLIP-ViT-L/14 with SVD Residual rank $r=1023$
- **Verification Status:** VERIFIED & HARD-PINNED IN SOURCE CODE

### 1.2 Model B: DeepfakeBench Xception (FaceForensics++ c23 Benchmark Checkpoint)
- **File Name:** `xception_best.pth`
- **Location:** `C:\Users\Bindudhara D\Downloads\VSB\SafeHER\models\xception_best.pth`
- **File Size:** 87,763,531 bytes (~83.69 MiB / 87.76 MB)
- **SHA-256 Digest:**
  ```
  dd61186f9ac8e99aae85982cae338b555dfaeef042f6b699e5a55cae3998ba47
  ```
- **Upstream Repository:** `SafeHER-Research/DeepfakeBench`
- **Base Architecture:** Modified Xception (36 separable conv) with `adjust_channel` adapter (2048 -> 512)
- **Verification Status:** VERIFIED & HARD-PINNED IN SOURCE CODE

### 1.3 Face Localization: RetinaFace-ResNet50
- **File Name:** `retinaface.pth`
- **Location:** `~/.deepface/weights/retinaface.pth`
- **File Size:** 118,129,936 bytes (~112.65 MiB / 118.13 MB)
- **SHA-256 Digest:**
  ```
  89a3b1eb5366829ea72e8cd4a935b7131920c65787cef68f19466c2a853ddbf7
  ```
- **Upstream Origin:** InsightFace / DeepFace official model repository
- **Base Architecture:** ResNet-50 + Feature Pyramid Network (FPN) + 5 Landmark Regression Heads
- **Verification Status:** VERIFIED & HARD-PINNED IN SOURCE CODE

---

## 2. Integrity Verification Procedure

The SHA-256 digests can be independently verified on any system via PowerShell or standard Unix tools:

```powershell
Get-FileHash -Algorithm SHA256 "models\effort_clip_l14_genimage.pth"
Get-FileHash -Algorithm SHA256 "models\xception_best.pth"
```

```bash
sha256sum models/effort_clip_l14_genimage.pth
sha256sum models/xception_best.pth
```
