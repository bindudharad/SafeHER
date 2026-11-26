# 09 — Three.js & Interactive Internal 3D Components

SafeHER upgrades internal application pages with interactive Three.js and 3D-styled components while keeping data tables, forms, and workflows fast and legible.

---

## Component Catalog

| Component | Path | Used On | Purpose |
|---|---|---|---|
| `MediaScanner3D` | `components/3d/MediaScanner3D.tsx` | `MediaAnalysisPage.tsx` | Interactive 3D volumetric scan visualization reflecting media risk & uncertainty state |
| `ThreatNetwork3D` | `components/3d/ThreatNetwork3D.tsx` | `ThreatAnalysisPage.tsx` | Interactive 3D threat node graph visualizing toxicity/insult/threat vectors |
| `KnowledgeCard3D` | `components/knowledge/KnowledgeCard3D.tsx` | `KnowledgeHubPage.tsx` | Perspective-tilting 3D cards for safety & legal literacy articles |
| `AnimatedDataPanel` | `components/common/AnimatedDataPanel.tsx` | `DashboardPage.tsx`, `RealityTrustCenterPage.tsx`, etc. | Interactive depth-tilt container with subtle aurora border glow |
| `EvidenceCard` | `components/evidence/EvidenceCard.tsx` | `EvidenceVaultPage.tsx`, `IncidentDetailPage.tsx` | Interactive card displaying SHA-256 hash, validation/duplicate badges, and actions |
| `TrustShield3D` | `components/3d/TrustShield3D.tsx` | Preserved (not mounted in Hero) | Original Three.js security shield preserved per change-control policy |

---

## Best Practices for Internal 3D Components

1. **Always dispose Three.js resources** (`geometry.dispose()`, `material.dispose()`, `renderer.dispose()`) inside `useEffect` cleanup.
2. **Respect `useReducedMotion()`** — disable continuous auto-rotation or parallax when the user prefers reduced motion.
3. **Handle WebGL context loss / `jsdom` gracefully** — wrap WebGLRenderer creation in `try/catch` so Vitest (`jsdom`) and low-power devices fall back cleanly.
