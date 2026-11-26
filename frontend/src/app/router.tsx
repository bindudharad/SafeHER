import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'

// Pages
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { IncidentListPage } from '../pages/incidents/IncidentListPage'
import { NewIncidentPage } from '../pages/incidents/NewIncidentPage'
import { IncidentDetailPage } from '../pages/incidents/IncidentDetailPage'
import { EvidenceVaultPage } from '../pages/evidence/EvidenceVaultPage'
import { MediaAnalysisPage } from '../pages/analysis/MediaAnalysisPage'
import { ThreatAnalysisPage } from '../pages/analysis/ThreatAnalysisPage'
import { ComplaintWizardPage } from '../pages/complaints/ComplaintWizardPage'
import { ReportingAssistantPage } from '../pages/reporting/ReportingAssistantPage'
import { CaseTrackingPage } from '../pages/cases/CaseTrackingPage'
import { PrivacySettingsPage } from '../pages/settings/PrivacySettingsPage'
import { RealityTrustCenterPage } from '../pages/trust/RealityTrustCenterPage'
import { KnowledgeHubPage } from '../pages/knowledge/KnowledgeHubPage'
import { ArticleDetailPage } from '../pages/knowledge/ArticleDetailPage'
import { DetectPage } from '../pages/detect/DetectPage'
import { NotFoundPage } from '../pages/NotFoundPage'

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
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/reality-trust-center',
        element: <RealityTrustCenterPage />,
      },
      {
        path: '/knowledge-hub',
        element: <KnowledgeHubPage />,
      },
      {
        path: '/knowledge-hub/:slug',
        element: <ArticleDetailPage />,
      },
      {
        path: '/detect',
        element: <DetectPage />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/incidents',
        element: <IncidentListPage />,
      },
      {
        path: '/incidents/new',
        element: <NewIncidentPage />,
      },
      {
        path: '/incidents/:id',
        element: <IncidentDetailPage />,
      },
      {
        path: '/evidence',
        element: <EvidenceVaultPage />,
      },
      {
        path: '/analysis/media',
        element: <MediaAnalysisPage />,
      },
      {
        path: '/analysis/threat',
        element: <ThreatAnalysisPage />,
      },
      {
        path: '/complaints',
        element: <ComplaintWizardPage />,
      },
      {
        path: '/reporting',
        element: <ReportingAssistantPage />,
      },
      {
        path: '/cases',
        element: <CaseTrackingPage />,
      },
      {
        path: '/settings',
        element: <PrivacySettingsPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
