# 19 — Frontend Testing & Build (`frontend/`)

## Scripts (`frontend/package.json`)

| Script | Underlying Command | Purpose |
|---|---|---|
| `dev` | `vite` | Start Vite dev server on `http://localhost:5173` with `/api` proxy |
| `build` | `tsc -b && vite build` | TypeScript project check + production bundle in `frontend/dist/` |
| `lint` | `oxlint` | Fast static lint across `frontend/` |
| `test` | `vitest run` | Run all 14 Vitest test suites (44 tests) in `jsdom` |
| `preview` | `vite preview` | Serve `frontend/dist/` locally |

---

## Test Setup (`frontend/src/tests/setup.ts`)

Configures `@testing-library/jest-dom`, DOM polyfills (`ResizeObserver`, `matchMedia`, `IntersectionObserver`, Web Crypto stubs where needed), and test isolation for `jsdom`.

When adding a new page or 3D component:
1. Add unit/render tests in `frontend/src/tests/`.
2. Verify both WebGPU-present and fallback paths (in `jsdom`, `navigator.gpu` is absent by default).
3. Run `npm --prefix frontend run lint && npm --prefix frontend test -- --run && npm --prefix frontend run build`.
