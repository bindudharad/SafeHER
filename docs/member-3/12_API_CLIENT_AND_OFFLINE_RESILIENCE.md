# 12 — API Client & Offline Resilience (`frontend/src/services/api/client.ts`)

`apiClient` is the single gateway between Member 3's React UI and Member 2's FastAPI backend.

---

## Key Design Rules in `client.ts`

1. **`ApiError` Separation**:
   - `apiFetch(url, options, timeoutMs = 8000)` throws `ApiError(detail, status)` immediately on HTTP `4xx/5xx` responses.
   - Server validation/auth errors are **never masked** as mock successes.
2. **Live vs. Offline Demo Mode (`DataMode = 'live' | 'offline_demo'`)**:
   - Only network/timeout failures (or `VITE_USE_MOCK_API === 'true'`) switch `currentDataMode` to `'offline_demo'`.
   - Components subscribe via `apiClient.subscribeDataMode(cb)` so `Navbar.tsx` can display the current connectivity badge accurately.
3. **Token Management**:
   - Stored in `localStorage` under `safeher_jwt_token` (`getToken`, `setToken`, `clearToken`).

---

## Method Inventory (`apiClient`)

- **Telemetry:** `getDataMode`, `subscribeDataMode`, `checkBackendHealth`
- **Auth:** `login`, `register`, `getCurrentUser`
- **Dashboard:** `getDashboardSummary`
- **Incidents & Timeline:** `getIncidents`, `getIncidentById`, `createIncident`, `getTimelineEvents`, `addTimelineEvent`
- **Evidence:** `getEvidenceByIncident`, `getAllEvidence`, `uploadEvidence`, `deleteEvidence`
- **AI Screening & Analysis:** `checkTextLive`, `checkImageLive`, `getMediaAnalysis`, `runMediaAnalysis`, `runThreatAnalysis`
- **Complaints, Cases & Reporting:** `generateComplaintDraft`, `updateComplaintDraft`, `getReportingDestinations`, `recordExternalSubmission`, `getCases`, `updateCaseStatus`

Fallback fixtures live in `frontend/src/services/api/mockData.ts`.
