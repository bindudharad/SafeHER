# 17 — Knowledge Hub & Reality Trust Center

## Knowledge Hub (`frontend/src/pages/knowledge/`)
- `KnowledgeHubPage.tsx` (`/knowledge-hub`) — Filterable educational hub powered by `frontend/src/data/knowledgeArticles.ts` and `KnowledgeCard3D.tsx`.
- `ArticleDetailPage.tsx` (`/knowledge-hub/:slug`) — Renders full guidance articles, legal literacy, and evidence preservation tips.

## Reality & Trust Center (`frontend/src/pages/trust/RealityTrustCenterPage.tsx`)
- Route: `/reality-trust-center`
- Powered by `frontend/src/data/threatResearch.ts` and `AnimatedDataPanel.tsx`.
- Explains AI detection capabilities, C2PA provenance boundaries, uncalibrated deepfake limitations, and user privacy commitments.

## Testing
Covered by `frontend/src/tests/multi_page_platform.test.tsx`.
