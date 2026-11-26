# 07 — WebGPU Holographic White Paper Card Guide

**Component:** `frontend/src/components/3d/HolographicWhitePaperCard.tsx`  
**Shader & Scene Module:** `frontend/src/components/3d/holographic-card/`

---

## Purpose

Transforms the left-hand cover of the Landing Page White Paper section into an interactive holographic 3D research card while keeping the right-hand heading, description, and "Download the Paper" button intact.

### Files in `holographic-card/`
| File | Role |
|---|---|
| `renderer.ts` | WebGPU device/pipeline lifecycle, pointer tilt tracking, resize observer, cleanup |
| `scene.ts` | Card geometry, perspective projection, and lighting uniforms |
| `lettering.ts` | Offscreen canvas texture rendering SafeHER White Paper typography onto the 3D card surface |
| `shader.wgsl` | Iridescent holographic foil, specular fresnel, and Midnight Aurora violet/cyan shimmer |

---

## Fallback & Testing

- Automatically falls back to a styled 2D/CSS holographic card preview when WebGPU is unavailable (e.g., `jsdom` or older browsers).
- Covered by `frontend/src/tests/holographic_whitepaper.test.tsx`.
