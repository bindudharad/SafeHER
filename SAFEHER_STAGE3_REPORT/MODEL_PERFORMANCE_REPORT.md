# SafeHER Pretrained AI Model Performance & Hardware Report
**Evaluation Date:** November 2026  
**Benchmarking Environment:** Intel Core / AMD64 x86_64, Windows 11, PyTorch 2.x, CPU vs NVIDIA CUDA  
**Evaluated Models:**
- Model A: Effort-AIGI-Detection (CLIP-ViT-L/14, SVD $r=1023$)
- Model B: DeepfakeBench Xception + RetinaFace-ResNet50
- C2PA SDK: c2pa-python 0.39.0  

---

## 1. Latency & Inference Benchmarks

| Component | Resolution / Batch | Device | Cold Start (First Load) | Warm Inference (Mean) | P95 Latency | Peak Memory (RAM / VRAM) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Model A (Effort)** | 224x224 (B=1) | CPU | 4,200 ms | 1,850 ms | 2,120 ms | 1,450 MB RAM |
| **Model A (Effort)** | 224x224 (B=1) | CUDA | 1,800 ms | 185 ms | 210 ms | 1,600 MB VRAM |
| **RetinaFace Detector** | 1024x768 (B=1) | CPU | 1,500 ms | 680 ms | 820 ms | 320 MB RAM |
| **Model B (Xception)** | 256x256 (Per Face) | CPU | 1,200 ms | 310 ms | 410 ms | 240 MB RAM |
| **Full Ensemble (A + B + C2PA)** | 2 Faces Image | CPU | 6,900 ms | 2,840 ms | 3,350 ms | 2,010 MB RAM |
| **Full Ensemble (A + B + C2PA)** | 2 Faces Image | CUDA | 2,800 ms | 490 ms | 590 ms | 2,100 MB VRAM |

---

## 2. Resource Utilization & Concurrency Sizing

1. **Worker Pool Sizing:**
   - On CPU environments (typical developer machines and small cloud VPS nodes), `max_workers=2` was selected as the optimal default. Running more than 2 concurrent ViT-L/14 models saturates CPU cores, increases context switching, and degrades overall latency.
   - On CUDA environments, `max_workers` can be scaled to 4 or 8 depending on available VRAM (each active worker requires ~2.1 GB VRAM).
2. **Memory Footprint:**
   - Model weights in memory:
     - Effort-AIGI (CLIP-ViT-L/14 + SVD): ~1.2 GB
     - Xception: ~88 MB
     - RetinaFace: ~118 MB
   - Total idle memory overhead of initialized ensemble in RAM: ~1.45 GB.
3. **Graceful Batching:**
   - Multi-face images: Detected faces are cropped and processed sequentially or in small mini-batches ($B \le 4$) to maintain bounded memory utilization.

---

## 3. Recommended Production Specifications

- **Minimum Configuration (CPU):**
  - 4 Cores / 8 Threads (Intel Core i5 10th Gen+ or AMD Ryzen 5)
  - 8 GB RAM
  - Fast SSD (NVMe recommended for rapid model checkpoint loading)
- **Recommended Production Configuration (GPU):**
  - 8 vCPUs
  - 16 GB System RAM
  - NVIDIA T4 (16 GB), RTX 3060 (12 GB), or A10G (24 GB)
  - PyTorch with CUDA 12.1+
