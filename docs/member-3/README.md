# Member 3 — Frontend & UX Handover Hub

Welcome to the **Member 3 (Frontend & UX)** engineering handbook for **SafeHER**.  
This 21-document series covers every part of `frontend/` so a new frontend developer can take over, run tests, modify UI/3D/WebGPU components safely, and ship new features without breaking existing functionality.

> **Start here if you just cloned the repo:** [20_MEMBER3_DEVELOPER_HANDOVER.md](20_MEMBER3_DEVELOPER_HANDOVER.md)

---

## Member 3 Documentation Index

| # | Document | Focus |
|---|---|---|
| 01 | [Frontend Architecture](01_FRONTEND_ARCHITECTURE.md) | Directory structure, provider tree (`App.tsx`), dependencies, and TypeScript contracts |
| 02 | [Routing & Navigation](02_ROUTING_AND_NAVIGATION.md) | All 17 routes in `router.tsx`, `Layout`, `Navbar`, `Sidebar`, `QuickExitButton` |
| 03 | [Design System & Theme](03_DESIGN_SYSTEM_AND_THEME.md) | Midnight Aurora palette, typography, Tailwind tokens, `zsure.css` |
| 04 | [Landing Page Guide](04_LANDING_PAGE_GUIDE.md) | Section-by-section breakdown of `LandingPage.tsx` and landing components |
| 05 | [Splash & Logo Animation](05_SPLASH_AND_LOGO_ANIMATION.md) | `SafeHERSplash.tsx` + `SplashContext.tsx` 4-stage splash-to-header travel |
| 06 | [WebGPU Spiral Galaxy Guide](06_WEBGPU_SPIRAL_GALAXY_GUIDE.md) | `SpiralGalaxyHeroBackground.tsx` & `spiral-galaxy/` WGSL compute/render pipeline |
| 07 | [WebGPU Holographic Card Guide](07_WEBGPU_HOLOGRAPHIC_CARD_GUIDE.md) | `HolographicWhitePaperCard.tsx` & `holographic-card/` interactive shader |
| 08 | [WebGPU 3D Logo LED Guide](08_WEBGPU_3D_LOGO_LED_GUIDE.md) | `SafeHERLogoLed3D.tsx`, `logo-led/` WGSL rings, and `SAFEHER` watermark layer |
| 09 | [Three.js Internal 3D Components](09_THREEJS_INTERNAL_3D_COMPONENTS.md) | `MediaScanner3D`, `ThreatNetwork3D`, `KnowledgeCard3D`, `AnimatedDataPanel`, `EvidenceCard`, `TrustShield3D` |
| 10 | [GSAP, Lenis & Motion System](10_GSAP_LENIS_AND_MOTION_SYSTEM.md) | Scroll choreography (`gsap.ts`), `useLenis.ts`, and `useReducedMotion.ts` |
| 11 | [State Management & Contexts](11_STATE_MANAGEMENT_AND_CONTEXTS.md) | `AuthContext`, `I18nContext`, `ToastContext`, `SplashContext` |
| 12 | [API Client & Offline Resilience](12_API_CLIENT_AND_OFFLINE_RESILIENCE.md) | `apiClient` (`client.ts`), `ApiError`, `live`/`offline_demo` mode, `mockData.ts` |
| 13 | [Authentication & Route Guards](13_AUTHENTICATION_AND_ROUTE_GUARDS.md) | `LoginPage`, `RegisterPage`, `ProtectedRoute`, JWT storage |
| 14 | [Evidence Vault & Crypto Hashing](14_EVIDENCE_VAULT_AND_CRYPTO_HASHING.md) | `EvidenceVaultPage`, `EvidenceDropzone`, Web Crypto SHA-256 (`utils/crypto.ts`) |
| 15 | [AI Detection & Analysis Pages](15_AI_DETECTION_AND_ANALYSIS_PAGES.md) | `DetectPage`, `MediaAnalysisPage`, `ThreatAnalysisPage`, calibration UI |
| 16 | [Incidents, Complaints, Cases & Reporting](16_INCIDENTS_COMPLAINTS_CASES_REPORTING.md) | Incidents CRUD, `TimelineView`, `ComplaintWizardPage`, `CaseTrackingPage`, `ReportingAssistantPage` |
| 17 | [Knowledge Hub & Trust Center](17_KNOWLEDGE_HUB_AND_TRUST_CENTER.md) | `KnowledgeHubPage`, `ArticleDetailPage`, `RealityTrustCenterPage` |
| 18 | [I18n & Accessibility](18_I18N_AND_ACCESSIBILITY.md) | English/Kannada/Hindi translations, `prefers-reduced-motion`, Quick Exit |
| 19 | [Frontend Testing & Build](19_FRONTEND_TESTING_AND_BUILD.md) | Vitest (14 suites, 44 tests), `oxlint`, `tsc -b`, `vite build` |
| 20 | [Member 3 Developer Handover](20_MEMBER3_DEVELOPER_HANDOVER.md) | Day-1 onboarding checklist, strict change-control rules, and common tasks |
