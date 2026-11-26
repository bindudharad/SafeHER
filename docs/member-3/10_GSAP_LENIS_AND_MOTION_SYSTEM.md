# 10 — GSAP, Lenis & Motion System

## Key Files
- `frontend/src/animations/gsap.ts` — GSAP + ScrollTrigger registration and reusable scroll/reveal helpers
- `frontend/src/hooks/useLenis.ts` — Smooth scroll lifecycle hook powered by `lenis`
- `frontend/src/hooks/useReducedMotion.ts` — Reactive `window.matchMedia('(prefers-reduced-motion: reduce)')` hook

---

## Rules for Motion & Scroll

1. **Always gate motion with `useReducedMotion()`** for continuous animations, parallax, and smooth scrolling.
2. **Clean up GSAP contexts and ScrollTriggers** (`gsap.context(() => { ... }, containerRef)` -> `ctx.revert()`) on component unmount to prevent memory leaks or stale triggers across route transitions.
3. **Keep core workflows instant**: Dashboard, Incident logging, Evidence upload, and Quick Exit must remain immediately usable without waiting on decorative animations.

---

## Testing
Verified by `frontend/src/tests/animations.test.tsx`.
