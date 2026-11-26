# 16 — Incidents, Complaints, Cases & Reporting Pages

## Incidents (`frontend/src/pages/incidents/`)
- `IncidentListPage.tsx` (`/incidents`) — Lists user incidents with status/category filters.
- `NewIncidentPage.tsx` (`/incidents/new`) — Multi-field incident intake form (`title`, `category`, `platform`, `incident_date`, `incident_time`, `relevant_urls`, `description`, `additional_notes`).
- `IncidentDetailPage.tsx` (`/incidents/:id`) — Displays incident details, linked evidence (`EvidenceCard`), and chronological `TimelineView.tsx` (`getTimelineEvents`, `addTimelineEvent`).

## Legal Complaint Wizard (`frontend/src/pages/complaints/ComplaintWizardPage.tsx`)
- Calls `apiClient.generateComplaintDraft()` for a selected incident.
- Allows inline editing and saving (`updateComplaintDraft()`).
- Exports formatted complaint PDFs directly in the browser using `jspdf`.

## External Reporting & Case Tracking
- `ReportingAssistantPage.tsx` (`/reporting`) — Fetches official destinations (`getReportingDestinations`), guides users through external filing, and logs reference numbers (`recordExternalSubmission`).
- `CaseTrackingPage.tsx` (`/cases`) — Lists active cases (`getCases`) and updates status/notes (`updateCaseStatus`).

---

## Testing
Covered by `dashboard_incidents.test.tsx`, `complaint_case.test.tsx`, and `reporting_settings.test.tsx`.
