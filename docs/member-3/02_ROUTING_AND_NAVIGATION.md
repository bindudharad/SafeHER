# 02 — Routing & Navigation (`frontend/src/app/router.tsx`)

SafeHER uses `createBrowserRouter` from `react-router-dom`.

## Complete Route Map

### Public Routes
| Path | Component | Notes |
|---|---|---|
| `/` | `LandingPage` | Midnight Aurora hero, WebGPU galaxy/3D logo, White Paper holographic card, feature showcase |
| `/login` | `LoginPage` | Email/password sign-in |
| `/register` | `RegisterPage` | Account creation with consent acknowledgement |

### Protected Routes (Wrapped in `<ProtectedRoute><Layout /></ProtectedRoute>`)
| Path | Component | Purpose |
|---|---|---|
| `/dashboard` | `DashboardPage` | Overview metrics, Recharts visualizations, quick actions |
| `/detect` | `DetectPage` | Instant live text & image screening |
| `/incidents` | `IncidentListPage` | Searchable list of logged incidents |
| `/incidents/new` | `NewIncidentPage` | Create a new incident record |
| `/incidents/:id` | `IncidentDetailPage` | Incident metadata, evidence list, and `TimelineView` |
| `/evidence` | `EvidenceVaultPage` | Cross-incident evidence vault, upload dropzone, SHA-256 badges |
| `/analysis/media` | `MediaAnalysisPage` | Image/media forensic analysis with `MediaScanner3D` |
| `/analysis/threat` | `ThreatAnalysisPage` | Deep text threat analysis with `ThreatNetwork3D` |
| `/complaints` | `ComplaintWizardPage` | Legal complaint draft generator, editor, and `jspdf` export |
| `/reporting` | `ReportingAssistantPage` | External portal directory & submission reference tracker |
| `/cases` | `CaseTrackingPage` | Case status progression & authority notes |
| `/knowledge-hub` | `KnowledgeHubPage` | Digital safety & legal literacy library (`KnowledgeCard3D`) |
| `/knowledge-hub/:slug` | `ArticleDetailPage` | Full safety guide article |
| `/reality-trust-center` | `RealityTrustCenterPage` | Deepfake/AI transparency, model limits, and verification tools |
| `/settings` | `PrivacySettingsPage` | Language selector (`en`/`kn`/`hi`), privacy & session controls |
| `*` | `NotFoundPage` | 404 fallback |

---

## Navigation Shell (`components/layout/`)

- **`Layout.tsx`**: Wraps all protected pages with `Navbar`, `Sidebar`, main scrollable outlet, and `QuickExitButton`.
- **`Navbar.tsx`**: Top bar displaying the SafeHER logo (registers as the `SplashContext` travel target via `registerLogoTarget`), live/offline mode indicator, language switcher, and user menu.
- **`Sidebar.tsx`**: Persistent left navigation rail on desktop (collapsible drawer on mobile) organized by workflow stage.
- **`QuickExitButton.tsx`**: Always-accessible emergency exit control (`window.location.replace('https://www.google.com')`).
