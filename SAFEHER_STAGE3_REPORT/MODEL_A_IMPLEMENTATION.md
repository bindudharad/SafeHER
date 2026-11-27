# SafeHER Model A Implementation Report: Effort-AIGI-Detection
**Module:** `backend/ai/models/model_a.py`  
**Task:** Genuine AI-Generated Image (AIGI) Detection  
**Paper / Benchmark:** ICML 2025 Oral — *Effort: Parameter-Efficient Fine-Tuning for AI-Generated Image Detection*  
**Base Foundation Model:** OpenAI CLIP-ViT-L/14 (`openai/clip-vit-large-patch14`)  
**Checkpoint:** `effort_clip_l14_genimage.pth` (1,213,769,519 bytes, SHA-256: `7c32ceb4e66d303050e8fc5dc7543fa347693fb4ee6b5df4d6eaf9f6a92fb813`)  

---

## 1. Architectural Design & Parameter-Efficient SVD Tuning

Traditional fine-tuning of large vision transformers like CLIP-ViT-L/14 suffers from catastrophic forgetting, high computational overhead, and susceptibility to frequency-domain over-fitting. The **Effort** framework addresses this via **Singular Value Decomposition (SVD) Parameter-Efficient Residual Tuning**.

### 1.1 Mathematical Formulation

For each linear projection weight matrix $W \in \mathbb{R}^{d_{out} \times d_{in}}$ in the Multi-Head Self-Attention layers:
1. The base pretrained CLIP weights are factorized via standard SVD:
   $$W_0 = U \Sigma V^T$$
   where $U \in \mathbb{R}^{d_{out} \times d}$, $\Sigma \in \mathbb{R}^{d \times d}$, and $V \in \mathbb{R}^{d_{in} \times d}$.
2. In the Effort GenImage checkpoint, a low-rank residual tuning mechanism with rank $r = 1023$ modifies the representation:
   $$W_{eff} = W_{main} + U_{res} \cdot \text{diag}(S_{res}) \cdot V_{res}^T$$
3. During forward inference, the layer computes:
   $$Y = X \cdot W_{eff}^T + b$$

In our SafeHER implementation (`SVDResidualLinear` in `backend/ai/models/model_a.py`), the linear transformations in all 24 vision transformer blocks of `CLIPVisionModel` (`q_proj`, `k_proj`, `v_proj`, `out_proj`) are dynamically adapted to load the official state dictionary directly.

---

## 2. Model Structure & Layer Mapping

```
EffortAIGIDetector
├── backbone: CLIPVisionModel (openai/clip-vit-large-patch14)
│   ├── embeddings: Patch & Position Embeddings (224x224 input, patch_size=14x14 -> 256 patches)
│   ├── pre_layrnorm: LayerNorm(1024)
│   ├── encoder.layers[0..23]: 24 Transformer Blocks
│   │   ├── self_attn: SVDResidualLinear (q_proj, k_proj, v_proj, out_proj)
│   │   ├── layer_norm1: LayerNorm(1024)
│   │   ├── mlp: Linear(1024 -> 4096) -> QuickGELU -> Linear(4096 -> 1024)
│   │   └── layer_norm2: LayerNorm(1024)
│   └── post_layernorm: LayerNorm(1024)
└── head: Classification Head
    ├── Linear(1024 -> 512)
    ├── QuickGELU()
    ├── Dropout(p=0.1)
    └── Linear(512 -> 2) [Index 0: Authentic / Real, Index 1: AI-Generated / Synthetic]
```

---

## 3. Preprocessing & Normalization Pipeline

The input buffer (bytes, PIL Image, or NumPy array) undergoes standard OpenAI CLIP vision preprocessing:
1. Format validation and decompression.
2. Bilinear resize to $224 \times 224$ pixels.
3. Tensor conversion to floating point range $[0.0, 1.0]$.
4. Normalized using CLIP statistical parameters:
   - Mean: $\mu = [0.48145466, 0.4578275, 0.40821073]$
   - Standard Deviation: $\sigma = [0.26862954, 0.26130258, 0.27577711]$
5. Dimension expansion: $[1, 3, 224, 224]$.

---

## 4. Inference Output Contract

```json
{
  "model_id": "effort_clip_l14_genimage",
  "model_name": "Effort-AIGI-Detection",
  "model_version": "1.0.0",
  "checkpoint_id": "effort_clip_l14_genimage.pth",
  "checkpoint_hash": "7c32ceb4e66d303050e8fc5dc7543fa347693fb4ee6b5df4d6eaf9f6a92fb813",
  "prediction": "authentic",
  "synthetic_score": 0.1284,
  "real_score": 0.8716,
  "raw_logits": [1.9168, 0.0001],
  "processing_time_ms": 3450.2,
  "device": "cpu",
  "input_dimensions": [224, 224],
  "analysis_status": "completed",
  "warnings": [
    "Automated forensic predictions are decision-support signals, not definitive proof.",
    "Model evaluated under CC BY-NC 4.0 non-commercial academic research license."
  ]
}
```

---

## 5. Defensive Exception & Error Handling

- **Corrupted Input:** If the image stream is truncated or malformed, the detector catches the decoder failure, logs a structured warning, and returns `analysis_status: "failed"` with `synthetic_score: 0.0` and `prediction: "error"`.
- **License Gate:** Evaluates `SAFEHER_ENABLE_NONCOMMERCIAL_RESEARCH_MODELS`. If unacknowledged in production, fails safe with a licensing advisory rather than executing unpermitted enterprise workloads.
