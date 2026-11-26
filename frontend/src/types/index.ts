// ==========================================
// SafeHER Master TypeScript Domain Types
// Aligned with FastAPI Backend & AI Contracts
// ==========================================

export type IncidentCategory =
  | 'online_harassment'
  | 'cyberbullying'
  | 'threatening_messages'
  | 'blackmail_extortion'
  | 'impersonation'
  | 'deepfake_media'
  | 'non_consensual_content'
  | 'doxxing'
  | 'other'

export type IncidentStatus = 'open' | 'under_review' | 'resolved' | 'archived'

export interface User {
  id: string
  name: string
  email: string
  consent_acknowledged: boolean
  consent_date?: string
  preferred_language: 'en' | 'kn' | 'hi'
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Incident {
  id: string
  user_id: string
  title: string
  category: IncidentCategory
  description: string
  incident_date?: string
  incident_time?: string
  platform: string
  relevant_urls?: string[]
  suspected_abuse_type?: string
  additional_notes?: string
  status: IncidentStatus
  evidence_count: number
  analysis_count: number
  created_at: string
  updated_at: string
}

export type StorageStatus = 'stored_encrypted' | 'quarantined' | 'rejected'
export type ValidationStatus = 'passed' | 'format_error' | 'size_exceeded' | 'corrupt'
export type MalwareStatus = 'clean' | 'pending' | 'scanning' | 'infected'
export type ProcessingStatus = 'pending' | 'ready' | 'processing' | 'failed'
export type DuplicateStatus = 'unique' | 'exact_duplicate' | 'visual_match' | 'unchecked'

export interface Evidence {
  id: string
  incident_id: string
  original_filename: string
  file_type: string
  file_size: number
  sha256_hash: string
  upload_timestamp: string
  storage_status: StorageStatus
  validation_status: ValidationStatus
  malware_status: MalwareStatus
  processing_status: ProcessingStatus
  duplicate_status: DuplicateStatus
  duplicate_matches?: string[]
  preview_url?: string
  notes?: string
}

export type AnalysisDecision = 'SAFE' | 'WARNING' | 'SUSPICIOUS' | 'BLOCKED'
export type UncertaintyState = 'low' | 'medium' | 'high'

export interface C2PAProvenance {
  detected: boolean
  issuer?: string
  edit_history?: string[]
  is_verified: boolean
  limitations: string
}

export interface MediaAnalysisResult {
  id: string
  evidence_id: string
  incident_id?: string
  media_type: 'image' | 'video' | 'audio'
  model_name: string
  model_version: string
  deepfake_score: number
  nudity_score: number
  is_calibrated: boolean // Important: if false, UI flags uncalibrated model score
  uncertainty_state: UncertaintyState
  decision: AnalysisDecision
  compression_anomaly_detected?: boolean
  c2pa_provenance?: C2PAProvenance
  limitations: string[]
  recommended_next_steps: string[]
  created_at: string
}

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ThreatAnalysisResult {
  id: string
  incident_id?: string
  input_text: string
  toxicity_score: number
  insult_score: number
  threat_score: number
  harassment_score: number
  blackmail_score: number
  extortion_score: number
  urgency_level: UrgencyLevel
  decision: AnalysisDecision
  detected_signals: string[]
  explanation: string
  limitations: string[]
  suggested_steps: string[]
  created_at: string
}

export type TimelineSource = 'system' | 'user'
export type TimelineEventType =
  | 'incident_occurred'
  | 'incident_created'
  | 'evidence_uploaded'
  | 'integrity_verified'
  | 'analysis_requested'
  | 'analysis_completed'
  | 'complaint_generated'
  | 'complaint_updated'
  | 'reported_external'
  | 'case_status_changed'
  | 'user_note_added'

export interface TimelineEvent {
  id: string
  incident_id: string
  event_type: TimelineEventType
  source: TimelineSource
  title: string
  description: string
  timestamp: string
  related_evidence_id?: string
}

export interface EvidenceInventoryItem {
  evidence_id: string
  filename: string
  file_type: string
  sha256_hash: string
  relevance_note: string
}

export interface ComplaintDraft {
  id: string
  incident_id: string
  title: string
  incident_summary: string
  affected_party_statement: string
  suspect_details?: string
  platform_details: string
  timeline_summary: string
  evidence_inventory: EvidenceInventoryItem[]
  threat_indicators: string[]
  requested_authorities: string[]
  full_draft_text: string
  is_user_confirmed: boolean
  user_confirmed_at?: string
  created_at: string
  updated_at: string
}

export interface ReportingDestination {
  id: string
  name: string
  platform: string
  category: string
  official_url: string
  description: string
  instructions: string[]
  required_materials: string[]
  helpline_number?: string
  emergency_notice?: string
  is_verified: boolean
}

export type CaseStatus =
  | 'draft'
  | 'prepared'
  | 'ready_for_submission'
  | 'submitted_by_user'
  | 'awaiting_response'
  | 'follow_up_required'
  | 'resolved'
  | 'closed'

export interface ReportingRecord {
  id: string
  incident_id: string
  case_id?: string
  destination_id: string
  destination_name: string
  submission_date: string
  reference_number: string
  status: CaseStatus
  follow_up_date?: string
  notes?: string
  created_at: string
}

export interface CaseTrackingItem {
  id: string
  incident_id: string
  incident_title: string
  incident_category: IncidentCategory
  status: CaseStatus
  created_at: string
  updated_at: string
  follow_up_date?: string
  evidence_count: number
  reporting_references: Array<{
    destination: string
    ref_number: string
    date: string
  }>
  notes?: string
}

export interface DashboardSummary {
  total_incidents: number
  active_cases: number
  evidence_items: number
  completed_analyses: number
  pending_follow_ups: number
  recent_incidents: Incident[]
  recent_evidence: Evidence[]
  category_distribution: Array<{ name: string; value: number }>
  evidence_type_distribution: Array<{ name: string; value: number }>
}
