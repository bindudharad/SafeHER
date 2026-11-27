# SafeHER Pretrained AI Model License Compliance & Legal Analysis
**Audited Date:** November 2026  
**Compliance Standard:** SafeHER Legal & Ethical AI Policy (Zero-Training, Open-Source Audit)  

---

## 1. Third-Party Model License Inventory

| Model / Library | Primary License | Upstream Author / Institution | Permitted Use Cases | Commercial Restriction |
| :--- | :--- | :--- | :--- | :--- |
| **Effort-AIGI-Detection** | Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) | Effort Authors (ICML 2025 Oral) | Academic, Research, Non-Commercial NGO/Survivor Support | **YES** — Direct commercial monetization prohibited without explicit owner license. |
| **DeepfakeBench** | CC BY-NC 4.0 | DeepfakeBench Research Consortium | Academic Benchmarking, Non-Commercial Forensic Audits | **YES** — Commercial deployment requires custom commercial license agreement. |
| **RetinaFace** | MIT License | InsightFace / DeepFace | Commercial, Research, Open Source | **NO** — Free for commercial and non-commercial use with copyright notice. |
| **c2pa-python** | Apache-2.0 / MIT Dual License | Coalition for Content Provenance and Authenticity (C2PA) / Content Authenticity Initiative (CAI) | Full Commercial, Enterprise, and Open Source | **NO** — Permissive open-source standard. |

---

## 2. SafeHER Commercial Protection Architecture

Because SafeHER may operate in diverse settings (ranging from academic research and non-profit survivor advocacy to commercial SaaS enterprise deployments), SafeHER enforces a **Dynamic Commercial Licensing Gate**:

### 2.1 The `SAFEHER_ENABLE_NONCOMMERCIAL_RESEARCH_MODELS` Gate

- SafeHER inspects the environment variable `SAFEHER_ENABLE_NONCOMMERCIAL_RESEARCH_MODELS`:
  - When set to `"true"` (default in research, staging, and demo environments), both Model A (Effort) and Model B (DeepfakeBench) are enabled with full telemetry.
  - When unset or set to `"false"` in a strict commercial deployment, the model engines gracefully report a clear licensing restriction notice:
    ```json
    {
      "model_id": "effort_clip_l14_genimage",
      "error": "Non-commercial research models disabled by configuration (SAFEHER_ENABLE_NONCOMMERCIAL_RESEARCH_MODELS != true). Set flag to enable under CC BY-NC 4.0 terms."
    }
    ```
- This guarantees that an enterprise client cannot inadvertently violate upstream CC BY-NC 4.0 terms without explicit administrative affirmation.

---

## 3. Mandatory Legal & Forensic Disclaimers

All forensic responses emitted by Model A, Model B, and the composite coordinator include mandatory evidentiary disclaimers:
1. **Decision Support Signal:** Automated AI predictions are statistical confidence signals for human decision support, not standalone legal or judicial proof of abuse or fabrication.
2. **C2PA Provenance Disclaimer:** The absence of C2PA Content Credentials is standard across the internet (as social media platforms strip EXIF and manifest metadata) and does not imply malice or tampering.
3. **Calibrated Thresholds:** Probability values are calibrated against standard academic benchmark distributions (GenImage, FF++ c23) and should be interpreted alongside corroborating digital evidence (timelines, messages, headers).
