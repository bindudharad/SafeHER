import React, { Suspense, lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'

// Eagerly loaded entry routes
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'

// Route-level code-split workspace & forensic pages
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const IncidentListPage = lazy(() => import('../pages/incidents/IncidentListPage').then((m) => ({ default: m.IncidentListPage })))
const NewIncidentPage = lazy(() => import('../pages/incidents/NewIncidentPage').then((m) => ({ default: m.NewIncidentPage })))
const IncidentDetailPage = lazy(() => import('../pages/incidents/IncidentDetailPage').then((m) => ({ default: m.IncidentDetailPage })))
const EvidenceVaultPage = lazy(() => import('../pages/evidence/EvidenceVaultPage').then((m) => ({ default: m.EvidenceVaultPage })))
const MediaAnalysisPage = lazy(() => import('../pages/analysis/MediaAnalysisPage').then((m) => ({ default: m.MediaAnalysisPage })))
const ThreatAnalysisPage = lazy(() => import('../pages/analysis/ThreatAnalysisPage').then((m) => ({ default: m.ThreatAnalysisPage })))
const ComplaintWizardPage = lazy(() => import('../pages/complaints/ComplaintWizardPage').then((m) => ({ default: m.ComplaintWizardPage })))
const ReportingAssistantPage = lazy(() => import('../pages/reporting/ReportingAssistantPage').then((m) => ({ default: m.ReportingAssistantPage })))
const CaseTrackingPage = lazy(() => import('../pages/cases/CaseTrackingPage').then((m) => ({ default: m.CaseTrackingPage })))
const CaseWorkspacePage = lazy(() => import('../pages/cases/CaseWorkspacePage').then((m) => ({ default: m.CaseWorkspacePage })))
const EvidenceGraphPage = lazy(() => import('../pages/forensics/EvidenceGraphPage').then((m) => ({ default: m.EvidenceGraphPage })))
const TamperingAnalysisPage = lazy(() => import('../pages/forensics/TamperingAnalysisPage').then((m) => ({ default: m.TamperingAnalysisPage })))
const NormalizedTimelinePage = lazy(() => import('../pages/forensics/NormalizedTimelinePage').then((m) => ({ default: m.NormalizedTimelinePage })))
const PrivacySettingsPage = lazy(() => import('../pages/settings/PrivacySettingsPage').then((m) => ({ default: m.PrivacySettingsPage })))
const RealityTrustCenterPage = lazy(() => import('../pages/trust/RealityTrustCenterPage').then((m) => ({ default: m.RealityTrustCenterPage })))
const KnowledgeHubPage = lazy(() => import('../pages/knowledge/KnowledgeHubPage').then((m) => ({ default: m.KnowledgeHubPage })))
const ArticleDetailPage = lazy(() => import('../pages/knowledge/ArticleDetailPage').then((m) => ({ default: m.ArticleDetailPage })))
const DetectPage = lazy(() => import('../pages/detect/DetectPage').then((m) => ({ default: m.DetectPage })))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

const RouteFallback: React.FC = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-xs font-mono text-[#929b93]" role="status">
    Loading SafeHER module...
  </div>
)

const withSuspense = (el: React.ReactNode) => <Suspense fallback={<RouteFallback />}>{el}</Suspense>

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    element: <Layout />,
    children: [
      {
        path: '/reality-trust-center',
        element: withSuspense(<RealityTrustCenterPage />),
      },
      {
        path: '/knowledge-hub',
        element: withSuspense(<KnowledgeHubPage />),
      },
      {
        path: '/knowledge-hub/:slug',
        element: withSuspense(<ArticleDetailPage />),
      },
      {
        path: '/detect',
        element: withSuspense(<DetectPage />),
      },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: withSuspense(<DashboardPage />),
      },
      {
        path: '/incidents',
        element: withSuspense(<IncidentListPage />),
      },
      {
        path: '/incidents/new',
        element: withSuspense(<NewIncidentPage />),
      },
      {
        path: '/incidents/:id',
        element: withSuspense(<IncidentDetailPage />),
      },
      {
        path: '/evidence',
        element: withSuspense(<EvidenceVaultPage />),
      },
      {
        path: '/analysis/media',
        element: withSuspense(<MediaAnalysisPage />),
      },
      {
        path: '/analysis/threat',
        element: withSuspense(<ThreatAnalysisPage />),
      },
      {
        path: '/complaints',
        element: withSuspense(<ComplaintWizardPage />),
      },
      {
        path: '/reporting',
        element: withSuspense(<ReportingAssistantPage />),
      },
      {
        path: '/cases',
        element: withSuspense(<CaseTrackingPage />),
      },
      {
        path: '/cases/:caseId',
        element: withSuspense(<CaseWorkspacePage />),
      },
      {
        path: '/forensics/graph',
        element: withSuspense(<EvidenceGraphPage />),
      },
      {
        path: '/forensics/timeline',
        element: withSuspense(<NormalizedTimelinePage />),
      },
      {
        path: '/analysis/tampering',
        element: withSuspense(<TamperingAnalysisPage />),
      },
      {
        path: '/settings',
        element: withSuspense(<PrivacySettingsPage />),
      },
      {
        path: '*',
        element: withSuspense(<NotFoundPage />),
      },
    ],
  },
])
