import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { EvidenceGraphPage } from '../pages/forensics/EvidenceGraphPage'
import { TamperingAnalysisPage } from '../pages/forensics/TamperingAnalysisPage'
import { NormalizedTimelinePage } from '../pages/forensics/NormalizedTimelinePage'
import { CaseWorkspacePage } from '../pages/cases/CaseWorkspacePage'

vi.mock('../services/api/client', () => ({
  apiClient: {
    getIncidents: vi.fn().mockResolvedValue([
      {
        id: 'inc-1',
        user_id: 'u-1',
        title: 'Test Cyber Harassment',
        category: 'online_harassment',
        description: 'Test description',
        platform: 'Instagram',
        status: 'open',
        evidence_count: 1,
        analysis_count: 1,
        created_at: '2026-11-26T00:00:00Z',
        updated_at: '2026-11-26T00:00:00Z',
      },
    ]),
    getIncidentGraph: vi.fn().mockResolvedValue({
      incident_id: 'inc-1',
      nodes: [
        {
          id: 'gn-1',
          owner_id: 'u-1',
          incident_id: 'inc-1',
          node_type: 'incident',
          label: 'Test Cyber Harassment',
          metadata: {},
          privacy_redacted: false,
          created_by: 'system',
          created_at: '2026-11-26T00:00:00Z',
          updated_at: '2026-11-26T00:00:00Z',
        },
      ],
      edges: [],
      node_count: 1,
      edge_count: 0,
    }),
    getAllEvidence: vi.fn().mockResolvedValue([
      {
        id: 'evi-1',
        incident_id: 'inc-1',
        original_filename: 'evidence.png',
        file_type: 'image/png',
        file_size: 1024,
        sha256_hash: 'abc123',
        upload_timestamp: '2026-11-26T00:00:00Z',
        storage_status: 'stored_encrypted',
        validation_status: 'passed',
        malware_status: 'clean',
        processing_status: 'ready',
        duplicate_status: 'unique',
      },
    ]),
    listTamperingAnalyses: vi.fn().mockResolvedValue([
      {
        id: 'tamp-1',
        evidence_id: 'evi-1',
        model_id: 'trufor',
        model_version: '1.0.0',
        analysis_status: 'unavailable',
        tampering_score: null,
        localization_available: false,
        original_dimensions: [256, 256],
        input_dimensions: [null, null],
        coordinate_transform: {},
        processing_time_ms: 12,
        device: 'cpu',
        warnings: ['Checkpoint not installed'],
        limitations: ['Analytical signal only'],
        review_status: 'unreviewed',
        created_at: '2026-11-26T00:00:00Z',
      },
    ]),
    getNormalizedTimeline: vi.fn().mockResolvedValue([
      {
        id: 'tl-1',
        incident_id: 'inc-1',
        event_type: 'evidence_uploaded',
        source: 'system',
        title: 'Evidence Uploaded: evidence.png',
        description: 'SHA-256 verified',
        timestamp: '2026-11-26T00:00:00Z',
        event_time_original: '2026-11-26T05:30:00+05:30',
        event_time_utc: '2026-11-26T00:00:00+00:00',
        timezone_original: 'Asia/Kolkata',
        timezone_confidence: 'explicit',
        time_precision: 'exact',
        time_source: 'safeher_upload',
        extraction_method: 'upload_audit',
        confidence_status: 'verified_system',
        verification_status: 'human_verified',
        created_at: '2026-11-26T00:00:00Z',
        updated_at: '2026-11-26T00:00:00Z',
        created_by: 'system',
      },
    ]),
    getCaseWorkspace: vi.fn().mockResolvedValue({
      case: {
        id: 'case-1',
        incident_id: 'inc-1',
        title: 'Forensic Case #1',
        status: 'under_review',
        created_at: '2026-11-26T00:00:00Z',
        updated_at: '2026-11-26T00:00:00Z',
      },
      viewer_role: 'owner',
      incident: { id: 'inc-1', title: 'Test Cyber Harassment' },
      evidence: [],
      collaborators: [],
      case_notes: [],
      activity: [],
    }),
  },
}))

describe('Stage 5 Forensic Pages', () => {
  it('renders EvidenceGraphPage with sync and filter controls', async () => {
    render(
      <MemoryRouter>
        <EvidenceGraphPage />
      </MemoryRouter>
    )
    expect(await screen.findByText('Evidence Intelligence Graph')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sync & Suggest Links/i })).toBeInTheDocument()
  })

  it('renders TamperingAnalysisPage with honest unavailable state', async () => {
    render(
      <MemoryRouter>
        <TamperingAnalysisPage />
      </MemoryRouter>
    )
    expect(await screen.findByText('Image Tampering Localization')).toBeInTheDocument()
    expect(await screen.findByText(/Localization Unavailable/i)).toBeInTheDocument()
  })

  it('renders NormalizedTimelinePage with original and UTC timestamps', async () => {
    render(
      <MemoryRouter>
        <NormalizedTimelinePage />
      </MemoryRouter>
    )
    expect(await screen.findByText('Forensic Incident Timeline')).toBeInTheDocument()
    expect(await screen.findByText(/Evidence Uploaded: evidence.png/i)).toBeInTheDocument()
  })

  it('renders CaseWorkspacePage with lifecycle and summary controls', async () => {
    render(
      <MemoryRouter initialEntries={['/cases/case-1']}>
        <Routes>
          <Route path="/cases/:caseId" element={<CaseWorkspacePage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(await screen.findByText('Forensic Case #1')).toBeInTheDocument()
    expect(screen.getByText(/Generate Investigation Summary/i)).toBeInTheDocument()
  })
})
