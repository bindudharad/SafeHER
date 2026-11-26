# 08 — WebGPU 3D Official Logo with Circular LED Rings & Watermark

**Component:** `frontend/src/components/3d/SafeHERLogoLed3D.tsx`  
**Shader Module:** `frontend/src/components/3d/logo-led/`

---

## Visual Layer Stack

1. **Background Brand Watermark (`SAFEHER`)**: Large uppercase geometric lettering, wide letter spacing, Aurora Violet hue, low opacity, and subtle ambient blur/glow positioned behind the LED rings so the central 3D logo remains dominant.
2. **Circular LED Light Rings (`circular-led-ring.wgsl` + `led-ring-renderer.ts`)**: Animated WebGPU light trails orbiting the emblem in violet (`#8B7CFF`) and cyan (`#22D3EE` / `#5EEAD4`).
3. **Central Official SafeHER Logo**: Depth-styled 3D emblem centered inside the LED rings.

---

## Fallback & Testing

- When WebGPU is unavailable or `prefers-reduced-motion` is enabled, renders a crisp CSS-animated circular glow fallback around the official `SafeHERLogo`.
- Covered by `frontend/src/tests/logo_led_3d.test.tsx`.
