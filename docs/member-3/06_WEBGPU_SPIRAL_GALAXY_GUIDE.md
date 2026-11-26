# 06 — WebGPU Spiral Galaxy Guide

**Component:** `frontend/src/components/3d/SpiralGalaxyHeroBackground.tsx`  
**Shader & Pipeline Module:** `frontend/src/components/3d/spiral-galaxy/`

---

## Architecture

Adapted from the `vgpu` Spiral Galaxy example and integrated strictly as an animated background behind the `LandingPage.tsx` hero section.

### Files in `spiral-galaxy/`
| File | Role |
|---|---|
| `renderer.ts` | WebGPU adapter/device initialization, swapchain/canvas sizing, animation loop & cleanup |
| `pipeline.ts` | Compute & render pipeline setup, bind groups, and post-processing bloom passes |
| `field.ts` | Star particle buffer generation & spiral arm distribution |
| `animation.ts` | Time/delta progression and camera/swirl animation parameters |
| `input.ts` | Pointer parallax / interactive mouse tracking |
| `simulate.wgsl` | Compute shader updating star positions & orbital velocities |
| `stars.wgsl` | Vertex/fragment shader rendering star points with Midnight Aurora violet/cyan hues |
| `bright.wgsl`, `blur.wgsl`, `composite.wgsl`, `dirt.wgsl` | Multi-pass bloom & optical lens glow compositing |

---

## Vite `.wgsl` Integration

`frontend/vite.config.ts` loads `wgslVitePlugin()` from `vgpu`, and `frontend/src/types/wgsl.d.ts` declares module types for `*.wgsl` imports.

---

## Fallback & Reduced Motion

- If `navigator.gpu` is unavailable or `requestAdapter()` returns `null`, `SpiralGalaxyHeroBackground` renders a lightweight CSS radial Midnight Aurora gradient fallback without throwing.
- Respects `useReducedMotion()` and cleans up `requestAnimationFrame` + GPU resources on unmount.
- Covered by `frontend/src/tests/spiral_galaxy.test.tsx`.
