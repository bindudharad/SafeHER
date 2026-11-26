// ==========================================
// SafeHER Unified API Client Layer
// Bridges FastAPI Backend (Mem_2), AI Services (Mem_1) & Offline Demo Fallback
// ==========================================

import type {
  User,
  AuthResponse,
  Incident,
  Evidence,
  MediaAnalysisResult,
  ThreatAnalysisResult,
  TimelineEvent,
  ComplaintDraft,
  ReportingDestination,
  ReportingRecord,
  CaseTrackingItem,
  DashboardSummary,
} from '../../types'

import {
  mockCurrentUser,
  mockIncidents,
  mockEvidenceItems,
  mockMediaAnalyses,
  mockThreatAnalyses,
  mockTimelineEvents,
  mockReportingDestinations,
  mockCases,
  mockDashboardSummary,
} from './mockData'

const TOKEN_KEY = 'safeher_jwt_token'

export type DataMode = 'live' | 'offline_demo'

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true'

let currentDataMode: DataMode = USE_MOCK ? 'offline_demo' : 'live'
const modeListeners = new Set<(mode: DataMode) => void>()

function setDataMode(mode: DataMode) {
  if (currentDataMode !== mode) {
    currentDataMode = mode
    modeListeners.forEach((cb) => cb(mode))
  }
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body?.detail === 'string') return body.detail
    if (Array.isArray(body?.detail)) {
      return body.detail.map((d: { msg?: string }) => d.msg || 'Validation error').join('; ')
    }
    return `Request failed with status ${res.status}`
  } catch {
    return `Request failed with status ${res.status}`
  }
}

/**
 * Performs a fetch with timeout.
 * - Throws ApiError immediately for HTTP 4xx/5xx responses (never masks server errors as mock success).
 * - Throws a network error (marking offline_demo) only if the server is unreachable.
 */
async function apiFetch(url: string, options?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    setDataMode('live')
    if (!res.ok) {
      const detail = await parseErrorDetail(res)
      throw new ApiError(detail, res.status)
    }
    return res
  } catch (err) {
    if (err instanceof ApiError) {
      throw err
    }
    setDataMode('offline_demo')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// In-memory runtime state for offline demo fallback ONLY
let localIncidents: Incident[] = [...mockIncidents]
let localEvidence: Evidence[] = [...mockEvidenceItems]
let localCases: CaseTrackingItem[] = [...mockCases]
let localReportingRecords: ReportingRecord[] = []
let localComplaints: Record<string, ComplaintDraft> = {}

export const apiClient = {
  // ----------------------------------------------------
  // Live vs Offline Demo Mode Telemetry
  // ----------------------------------------------------
  getDataMode(): DataMode {
    return currentDataMode
  },

  subscribeDataMode(cb: (mode: DataMode) => void): () => void {
    modeListeners.add(cb)
    return () => modeListeners.delete(cb)
  },

  async checkBackendHealth(): Promise<{ online: boolean; database?: string; ai?: unknown }> {
    if (USE_MOCK) {
      setDataMode('offline_demo')
      return { online: false }
    }
    try {
      const res = await apiFetch('/api/v1/health', undefined, 3000)
      const data = await res.json()
      return { online: true, database: data.database, ai: data.ai }
    } catch {
      return { online: false }
    }
  },

  // ----------------------------------------------------
  // Authentication & Session
  // ----------------------------------------------------
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY)
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    if (!USE_MOCK) {
      try {
        const res = await apiFetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        this.setToken(data.access_token)
        return data
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    const mockRes: AuthResponse = {
      access_token: 'mock-jwt-token-' + Date.now(),
      token_type: 'bearer',
      user: {
        ...mockCurrentUser,
        email: email || mockCurrentUser.email,
      },
    }
    this.setToken(mockRes.access_token)
    return mockRes
  },

  async register(name: string, email: string, password: string, consent: boolean): Promise<AuthResponse> {
    if (!USE_MOCK) {
      try {
        const res = await apiFetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, consent_acknowledged: consent }),
        })
        const data = await res.json()
        this.setToken(data.access_token)
        return data
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    const mockRes: AuthResponse = {
      access_token: 'mock-jwt-token-registered-' + Date.now(),
      token_type: 'bearer',
      user: {
        id: 'usr-' + Math.random().toString(36).substring(2, 7),
        name,
        email,
        consent_acknowledged: consent,
        consent_date: new Date().toISOString(),
        preferred_language: 'en',
        created_at: new Date().toISOString(),
      },
    }
    this.setToken(mockRes.access_token)
    return mockRes
  },

  async getCurrentUser(): Promise<User> {
    const token = this.getToken()
    if (!token) throw new ApiError('Not authenticated', 401)

    if (!USE_MOCK) {
      try {
        const res = await apiFetch('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    return mockCurrentUser
  },

  // ----------------------------------------------------
  // Dashboard Metrics
  // ----------------------------------------------------
  async getDashboardSummary(): Promise<DashboardSummary> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch('/api/v1/dashboard/summary', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) throw err
      }
    }

    return {
      ...mockDashboardSummary,
      total_incidents: localIncidents.length,
      active_cases: localCases.filter((c) => c.status !== 'closed' && c.status !== 'resolved').length,
      evidence_items: localEvidence.length,
      recent_incidents: localIncidents.slice(0, 5),
      recent_evidence: localEvidence.slice(0, 5),
    }
  },

  // ----------------------------------------------------
  // Incident Management
  // ----------------------------------------------------
  async getIncidents(): Promise<Incident[]> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch('/api/v1/incidents', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) throw err
      }
    }
    return localIncidents
  },

  async getIncidentById(id: string): Promise<Incident | null> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch(`/api/v1/incidents/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null
        if (err instanceof ApiError) throw err
      }
    }
    return localIncidents.find((inc) => inc.id === id) || null
  },

  async createIncident(
    data: Omit<Incident, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'evidence_count' | 'analysis_count'>
  ): Promise<Incident> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch('/api/v1/incidents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(data),
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    const newInc: Incident = {
      ...data,
      id: 'inc-' + Math.random().toString(36).substring(2, 6),
      user_id: mockCurrentUser.id,
      status: 'open',
      evidence_count: 0,
      analysis_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localIncidents.unshift(newInc)

    const newCase: CaseTrackingItem = {
      id: 'cas-' + newInc.id,
      incident_id: newInc.id,
      incident_title: newInc.title,
      incident_category: newInc.category,
      status: 'draft',
      created_at: newInc.created_at,
      updated_at: newInc.updated_at,
      evidence_count: 0,
      reporting_references: [],
      notes: 'Case established upon incident logging.',
    }
    localCases.unshift(newCase)

    return newInc
  },

  // ----------------------------------------------------
  // Digital Evidence Vault
  // ----------------------------------------------------
  async getEvidenceByIncident(incidentId: string): Promise<Evidence[]> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch(`/api/v1/incidents/${incidentId}/evidence`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }
    return localEvidence.filter((e) => e.incident_id === incidentId)
  },

  async getAllEvidence(): Promise<Evidence[]> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch('/api/v1/evidence', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) throw err
      }
    }
    return localEvidence
  },

  async uploadEvidence(
    incidentId: string,
    file: File,
    sha256Hash: string,
    notes?: string
  ): Promise<Evidence> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const formData = new FormData()
        formData.append('file', file)
        formData.append('sha256', sha256Hash)
        if (notes) formData.append('notes', notes)

        const res = await apiFetch(
          `/api/v1/incidents/${incidentId}/evidence`,
          {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          },
          15000
        )
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    const newEvidence: Evidence = {
      id: 'evi-' + Math.random().toString(36).substring(2, 7),
      incident_id: incidentId,
      original_filename: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      sha256_hash: sha256Hash,
      upload_timestamp: new Date().toISOString(),
      storage_status: 'stored_encrypted',
      validation_status: 'passed',
      malware_status: 'clean',
      processing_status: 'ready',
      duplicate_status: 'unique',
      preview_url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      notes,
    }

    localEvidence.unshift(newEvidence)
    const targetInc = localIncidents.find((i) => i.id === incidentId)
    if (targetInc) targetInc.evidence_count += 1
    return newEvidence
  },

  async deleteEvidence(evidenceId: string): Promise<void> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        await apiFetch(`/api/v1/evidence/${evidenceId}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        return
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }
    localEvidence = localEvidence.filter((e) => e.id !== evidenceId)
  },

  // ----------------------------------------------------
  // AI Media & Threat Analysis (Member 1 + Member 2)
  // ----------------------------------------------------
  async checkTextLive(text: string): Promise<{ toxicity: number; insult: number; threat: number; decision: string }> {
    if (!USE_MOCK) {
      try {
        const res = await apiFetch(
          `/check-text?text=${encodeURIComponent(text)}`,
          { method: 'POST' },
          30000
        )
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    const lower = text.toLowerCase()
    const isThreat = lower.includes('kill') || lower.includes('destroy') || lower.includes('attack') || lower.includes('leak')
    const isInsult = lower.includes('idiot') || lower.includes('stupid') || lower.includes('loser')
    const threatScore = isThreat ? 0.85 : 0.15
    const insultScore = isInsult ? 0.65 : 0.1
    const toxicityScore = isThreat ? 0.9 : isInsult ? 0.6 : 0.1

    return {
      toxicity: toxicityScore,
      insult: insultScore,
      threat: threatScore,
      decision: threatScore > 0.6 || toxicityScore > 0.7 ? 'BLOCKED' : toxicityScore > 0.4 ? 'WARNING' : 'SAFE',
    }
  },

  async checkImageLive(file: File): Promise<{ nudity_score: number; deepfake_score: number; decision: string; evidence_hash: string }> {
    if (!USE_MOCK) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await apiFetch('/check-image', { method: 'POST', body: formData }, 30000)
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    return {
      nudity_score: 0.15,
      deepfake_score: 0.72,
      decision: 'SUSPICIOUS',
      evidence_hash: Math.random().toString(16).substring(2, 12),
    }
  },

  async getMediaAnalysis(evidenceId: string): Promise<MediaAnalysisResult | null> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch(`/api/v1/analysis/media/${evidenceId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }
    return mockMediaAnalyses[evidenceId] || null
  },

  async runMediaAnalysis(evidenceId: string, mediaType: 'image' | 'video'): Promise<MediaAnalysisResult> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const formData = new FormData()
        formData.append('evidence_id', evidenceId)
        formData.append('media_type', mediaType)
        const res = await apiFetch(
          '/api/v1/analysis/media',
          {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          },
          30000
        )
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 600))
    const result: MediaAnalysisResult = {
      id: 'an-med-' + Math.random().toString(36).substring(2, 6),
      evidence_id: evidenceId,
      media_type: mediaType,
      model_name: 'SafeHER-ViT-DeepfakeSentinel (Offline Demo)',
      model_version: 'v1.4.2-eval',
      deepfake_score: 0.78,
      nudity_score: 0.08,
      is_calibrated: false,
      uncertainty_state: 'medium',
      decision: 'SUSPICIOUS',
      compression_anomaly_detected: true,
      c2pa_provenance: {
        detected: false,
        is_verified: false,
        limitations: 'No C2PA metadata found in file header. Note: Absence does not prove alteration.',
      },
      limitations: [
        'Offline demo fallback result: backend AI service was unreachable.',
        'Forensic validation by a certified examiner is required for official court proceedings.',
      ],
      recommended_next_steps: [
        'Preserve original uncompressed media if available.',
        'Record the exact URL and time of publication.',
        'Attach this SafeHER analysis report to your official complaint draft.',
      ],
      created_at: new Date().toISOString(),
    }

    mockMediaAnalyses[evidenceId] = result
    return result
  },

  async runThreatAnalysis(text: string, incidentId?: string): Promise<ThreatAnalysisResult> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        if (token) {
          const res = await apiFetch(
            '/api/v1/analysis/threat',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ text, incident_id: incidentId || null }),
            },
            30000
          )
          return await res.json()
        }
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    const live = await this.checkTextLive(text)
    const urgency: 'low' | 'medium' | 'high' | 'critical' =
      live.threat > 0.7 ? 'critical' : live.threat > 0.4 ? 'high' : live.toxicity > 0.5 ? 'medium' : 'low'

    const detectedSignals: string[] = []
    if (live.threat > 0.3) detectedSignals.push('Threatening / hostile language markers detected')
    if (live.insult > 0.4) detectedSignals.push('Derogatory / insulting slurs identified')
    if (text.toLowerCase().includes('money') || text.toLowerCase().includes('pay') || text.toLowerCase().includes('btc') || text.toLowerCase().includes('bitcoin')) {
      detectedSignals.push('Possible financial extortion / ransom language')
    }
    if (text.toLowerCase().includes('share') || text.toLowerCase().includes('post') || text.toLowerCase().includes('send to')) {
      detectedSignals.push('Coercive distribution threat indicators')
    }

    const result: ThreatAnalysisResult = {
      id: 'an-thr-' + Math.random().toString(36).substring(2, 6),
      incident_id: incidentId,
      input_text: text,
      toxicity_score: live.toxicity,
      insult_score: live.insult,
      threat_score: live.threat,
      harassment_score: Math.min(live.insult * 1.2, 1.0),
      blackmail_score: text.toLowerCase().includes('pay') || text.toLowerCase().includes('leak') ? 0.88 : 0.2,
      extortion_score: text.toLowerCase().includes('btc') || text.toLowerCase().includes('money') ? 0.92 : 0.15,
      urgency_level: urgency,
      decision: live.decision as 'SAFE' | 'WARNING' | 'BLOCKED',
      detected_signals: detectedSignals.length > 0 ? detectedSignals : ['No severe threat markers flagged'],
      explanation:
        urgency === 'critical' || urgency === 'high'
          ? 'The analyzed communication contains high-severity threat and coercion language indicating immediate harassment or extortion risk.'
          : 'Low to moderate abuse signals detected in the provided context.',
      limitations: [
        'NLP analysis reflects semantic vocabulary patterns and does not verify the physical capabilities of the sender.',
        'This assessment is a decision-support indicator, not a formal legal indictment.',
      ],
      suggested_steps: [
        'Do not engage in argument or comply with extortion demands.',
        'Preserve all communications with complete timestamp metadata.',
        'File an official report on the National Cyber Crime Reporting Portal (1930).',
      ],
      created_at: new Date().toISOString(),
    }

    if (incidentId) mockThreatAnalyses[incidentId] = result
    return result
  },

  // ----------------------------------------------------
  // Incident Timeline
  // ----------------------------------------------------
  async getTimelineEvents(incidentId: string): Promise<TimelineEvent[]> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch(`/api/v1/incidents/${incidentId}/timeline`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }
    return mockTimelineEvents[incidentId] || []
  },

  async addTimelineEvent(
    incidentId: string,
    event: Omit<TimelineEvent, 'id' | 'incident_id' | 'timestamp'>
  ): Promise<TimelineEvent> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch(`/api/v1/incidents/${incidentId}/timeline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(event),
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    const newEvent: TimelineEvent = {
      ...event,
      id: 'tl-' + Math.random().toString(36).substring(2, 6),
      incident_id: incidentId,
      timestamp: new Date().toISOString(),
    }

    if (!mockTimelineEvents[incidentId]) mockTimelineEvents[incidentId] = []
    mockTimelineEvents[incidentId].unshift(newEvent)
    return newEvent
  },

  // ----------------------------------------------------
  // AI-Assisted Complaint Preparation
  // ----------------------------------------------------
  async generateComplaintDraft(
    incidentId: string,
    evidenceIds: string[],
    confirmedFacts: string
  ): Promise<ComplaintDraft> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch('/api/v1/complaints/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            incident_id: incidentId,
            evidence_ids: evidenceIds,
            confirmed_facts: confirmedFacts,
          }),
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    const incident = await this.getIncidentById(incidentId)
    const allEvidence = await this.getEvidenceByIncident(incidentId)
    const selectedEvidence = allEvidence.filter((e) => evidenceIds.includes(e.id))

    const evidenceInventory = selectedEvidence.map((e) => ({
      evidence_id: e.id,
      filename: e.original_filename,
      file_type: e.file_type,
      sha256_hash: e.sha256_hash,
      relevance_note: e.notes || 'Evidence of digital abuse / harassment',
    }))

    const draftText = `COMPLAINT REGARDING DIGITAL ABUSE & CYBER OFFENSES
Date: ${new Date().toLocaleDateString()}
To: Designated Cyber Crime Authority / Platform Grievance Officer

1. COMPLAINANT / AFFECTED PARTY STATEMENT:
I am submitting this formal complaint regarding an incident of digital abuse targeted against me.
Confirmed Facts:
${confirmedFacts || incident?.description || 'Details as described in attached incident record.'}

2. INCIDENT SPECIFICS:
- Category: ${incident?.category.replace('_', ' ').toUpperCase() || 'UNSPECIFIED'}
- Date of Occurrence: ${incident?.incident_date || 'Date unrecorded'} ${incident?.incident_time || ''}
- Platform / Channel: ${incident?.platform || 'Unknown platform'}
- Associated URLs / Identifiers: ${incident?.relevant_urls?.join(', ') || 'None provided'}

3. PRESERVED DIGITAL EVIDENCE & CRYPTOGRAPHIC INTEGRITY:
The following evidence items have been preserved with SHA-256 cryptographic hashes:
${evidenceInventory
  .map(
    (e, idx) =>
      `  [${idx + 1}] Filename: ${e.filename}\n      SHA-256 Checksum: ${e.sha256_hash}\n      Relevance: ${e.relevance_note}`
  )
  .join('\n\n')}

4. VERIFICATION:
I verify that the statements above are based strictly on facts known to me. SafeHER has served as an evidence organization and drafting tool; all statements reflect the complainant's factual account.

Complainant Signature: _______________________
`

    const draft: ComplaintDraft = {
      id: 'cmp-' + Math.random().toString(36).substring(2, 6),
      incident_id: incidentId,
      title: `Formal Complaint: ${incident?.title || 'Digital Abuse Incident'}`,
      incident_summary: incident?.description || '',
      affected_party_statement: confirmedFacts,
      platform_details: `${incident?.platform || ''} (URLs: ${incident?.relevant_urls?.join(', ') || 'N/A'})`,
      timeline_summary: `Incident occurred around ${incident?.incident_date || 'an unspecified date'}.`,
      evidence_inventory: evidenceInventory,
      threat_indicators: ['Documented digital communications', 'Cryptographically fingerprinted evidence items'],
      requested_authorities: ['Platform Grievance Officer', 'Cyber Crime Cell (cybercrime.gov.in)'],
      full_draft_text: draftText,
      is_user_confirmed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    localComplaints[draft.id] = draft
    return draft
  },

  async updateComplaintDraft(
    id: string,
    fullDraftText: string,
    isConfirmed: boolean
  ): Promise<ComplaintDraft> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch(`/api/v1/complaints/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            full_draft_text: fullDraftText,
            is_user_confirmed: isConfirmed,
          }),
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    const existing = localComplaints[id]
    if (!existing) throw new ApiError('Draft not found', 404)
    existing.full_draft_text = fullDraftText
    existing.is_user_confirmed = isConfirmed
    existing.updated_at = new Date().toISOString()
    if (isConfirmed && !existing.user_confirmed_at) {
      existing.user_confirmed_at = new Date().toISOString()
    }
    return existing
  },

  // ----------------------------------------------------
  // Multi-Platform Reporting Guidance
  // ----------------------------------------------------
  async getReportingDestinations(): Promise<ReportingDestination[]> {
    if (!USE_MOCK) {
      try {
        const res = await apiFetch('/api/v1/reporting/destinations')
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }
    return mockReportingDestinations
  },

  async recordExternalSubmission(
    incidentId: string,
    destinationId: string,
    destinationName: string,
    refNumber: string,
    submissionDate: string,
    followUpDate?: string,
    notes?: string
  ): Promise<ReportingRecord> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch('/api/v1/reporting/records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            incident_id: incidentId,
            destination_id: destinationId,
            destination_name: destinationName,
            reference_number: refNumber,
            submission_date: submissionDate,
            follow_up_date: followUpDate || null,
            notes: notes || null,
          }),
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    const record: ReportingRecord = {
      id: 'rep-rec-' + Math.random().toString(36).substring(2, 6),
      incident_id: incidentId,
      destination_id: destinationId,
      destination_name: destinationName,
      submission_date: submissionDate,
      reference_number: refNumber,
      status: 'submitted_by_user',
      follow_up_date: followUpDate,
      notes,
      created_at: new Date().toISOString(),
    }

    localReportingRecords.unshift(record)
    const targetCase = localCases.find((c) => c.incident_id === incidentId)
    if (targetCase) {
      targetCase.status = 'submitted_by_user'
      targetCase.follow_up_date = followUpDate
      targetCase.reporting_references.push({
        destination: destinationName,
        ref_number: refNumber,
        date: submissionDate,
      })
      targetCase.updated_at = new Date().toISOString()
    }
    return record
  },

  // ----------------------------------------------------
  // User Case Tracking
  // ----------------------------------------------------
  async getCases(): Promise<CaseTrackingItem[]> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch('/api/v1/cases', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) throw err
      }
    }
    return localCases
  },

  async updateCaseStatus(
    caseId: string,
    status: CaseTrackingItem['status'],
    notes?: string
  ): Promise<CaseTrackingItem> {
    if (!USE_MOCK) {
      try {
        const token = this.getToken()
        const res = await apiFetch(`/api/v1/cases/${caseId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status, notes: notes || null }),
        })
        return await res.json()
      } catch (err) {
        if (err instanceof ApiError) throw err
      }
    }

    const targetCase = localCases.find((c) => c.id === caseId)
    if (!targetCase) throw new ApiError('Case not found', 404)
    targetCase.status = status
    targetCase.updated_at = new Date().toISOString()
    if (notes) targetCase.notes = notes
    return targetCase
  },
}
