# 01 — Frontend Architecture (`frontend/`)

## Tech Stack (`frontend/package.json`)

- **Framework:** React `19.3.1` + TypeScript `~7.0.2`
- **Bundler:** Vite `^8.3.6` with `@vitejs/plugin-react` and `wgslVitePlugin()` (`vgpu`)
- **Styling:** Tailwind CSS `^3.4.19` + `src/index.css` + `src/zsure.css`
- **Routing:** `react-router-dom` `^7.13.1` (`createBrowserRouter`)
- **3D & Shaders:** `vgpu` (WebGPU), `three` `^0.187.0`
- **Motion & Data Viz:** `gsap` `^3.15.1`, `lenis` `^1.3.27`, `recharts` `^3.11.0`, `lucide-react` `^1.78.0`, `jspdf` `^4.2.1`
- **Testing & Linting:** `vitest` `^5.1.1`, `@testing-library/react`, `jsdom`, `oxlint` `^1.90.0`

---

## Directory Structure (`frontend/src/`)

```text
frontend/src/
├── animations/      # GSAP scroll/reveal helpers (gsap.ts)
├── app/             # Root App.tsx provider tree + router.tsx
├── components/
│   ├── 3d/          # WebGPU (spiral-galaxy/, holographic-card/, logo-led/) & Three.js components
│   ├── auth/        # ProtectedRoute.tsx
│   ├── common/      # Button, Card, Input, Modal, Badge, Tooltip, SafeHERLogo, SafeHERSplash, AnimatedDataPanel
│   ├── evidence/    # EvidenceCard.tsx, EvidenceDropzone.tsx
│   ├── incidents/   # TimelineView.tsx
│   ├── knowledge/   # KnowledgeCard3D.tsx
│   ├── landing/     # LandingPage sections & interactive carousels/marquees
│   └── layout/      # Layout.tsx, Navbar.tsx, Sidebar.tsx, PageHeader.tsx, QuickExitButton.tsx
├── contexts/        # AuthContext, I18nContext, SplashContext, ToastContext
├── data/            # knowledgeArticles.ts, threatResearch.ts
├── hooks/           # useLenis.ts, useReducedMotion.ts
├── i18n/            # translations.ts (en, kn, hi)
├── pages/           # All route page components
├── services/api/    # client.ts (apiClient) + mockData.ts
├── tests/           # 14 Vitest test files + setup.ts
├── types/           # index.ts (master domain interfaces) + wgsl.d.ts
└── utils/           # cn.ts, crypto.ts (SHA-256, formatBytes, formatDate)
```

---

## Root Provider Tree (`frontend/src/app/App.tsx`)

```text
I18nProvider
 └── ToastProvider
      └── AuthProvider
           └── SplashProvider
                ├── SafeHERSplash
                └── RouterProvider (router)
```

Order matters: `SplashProvider` reads `useAuth().isLoading` so the splash-to-header animation waits for initial auth hydration before travelling to the navbar logo target.
