# User Workflows

## 1. First-Time Visitor -> Instant Abuse Screening
1. Visitor lands on `/` (`LandingPage.tsx`), views Midnight Aurora hero & White Paper card.
2. Clicks **Detect** (`/detect`) or signs in via `/login` / `/register`.
3. Pastes suspicious text or uploads an image in `DetectPage.tsx` for immediate AI triage (`/check-text` or `/check-image`).

## 2. Survivor / Investigator -> Full Case Preservation Flow
1. Authenticates via `AuthContext` (`ProtectedRoute`).
2. Logs an incident in `NewIncidentPage.tsx` (`/incidents/new`).
3. Uploads screenshots/files into `EvidenceVaultPage.tsx` (`/evidence`) with browser SHA-256 + server-side verification.
4. Runs AI Threat & Media Analysis (`/analysis/threat`, `/analysis/media`).
5. Generates & exports a legal complaint PDF in `ComplaintWizardPage.tsx` (`/complaints`).
6. Files externally and logs reference numbers in `ReportingAssistantPage.tsx` (`/reporting`) and tracks status in `CaseTrackingPage.tsx` (`/cases`).

## 3. Emergency Safety Exit
At any point inside the authenticated shell (`Layout.tsx`), clicking **Quick Exit** (`QuickExitButton.tsx`) immediately replaces browser history with `https://www.google.com`.
