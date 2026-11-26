# 15 — AI Detection & Analysis Pages

## Pages
1. **`DetectPage.tsx` (`/detect`)** — Quick-access live text (`checkTextLive`) and image (`checkImageLive`) screening tool for immediate triage without needing to create an incident first.
2. **`MediaAnalysisPage.tsx` (`/analysis/media`)** — Runs & displays persisted `MediaAnalysisResult` on vaulted evidence (`runMediaAnalysis`, `getMediaAnalysis`), paired with `MediaScanner3D`.
3. **`ThreatAnalysisPage.tsx` (`/analysis/threat`)** — Runs & displays persisted `ThreatAnalysisResult` (`runThreatAnalysis`) with category breakdowns and `ThreatNetwork3D`.

---

## Calibration & Uncertainty UX Rules

- Always inspect `MediaAnalysisResult.is_calibrated` and `uncertainty_state` (`'low' | 'medium' | 'high'`).
- When `is_calibrated === false`, display a clear advisory notice explaining that synthetic/deepfake manipulation scores are uncalibrated and must not be treated as standalone legal proof.
- Display `C2PAProvenance` (`detected`, `is_verified`, `limitations`) transparently when present.

---

## Testing
Covered by `frontend/src/tests/ai_analysis.test.tsx`.
