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

export interface C2PAAnalysisData {
  c2pa_status: 'valid_credentials' | 'invalid_credentials' | 'credentials_not_present' | 'unsupported_format' | 'verification_error' | string
  manifest_present: boolean
  signature_valid: boolean
  active_manifest?: string
  claim_generator?: string
  title?: string
  format?: string
  ingredients?: Array<{
    title?: string
    format?: string
    relationship?: string
    document_id?: string
  }>
  actions?: Array<{
    action?: string
    softwareAgent?: string
    when?: string
  }>
  signing_info?: {
    issuer?: string
    common_name?: string
    time?: string
    alg?: string
  }
  validation_errors?: string[]
  validation_warnings?: string[]
  sdk_version?: string
}

export interface DetectedFaceData {
  face_id: string
  bounding_box: [number, number, number, number]
  facial_area?: [number, number, number, number]
  detection_confidence: number
  landmarks?: Record<string, [number, number]>
}

export interface FaceLocalizationData {
  detector_name?: string
  detector_version?: string
  checkpoint_id?: string
  face_count: number
  faces: DetectedFaceData[]
  image_width?: number
  image_height?: number
  processing_time_ms?: number
  device?: string
  analysis_status?: string
  warnings?: string[]
}

export interface ModelAResult {
  model_id: string
  model_name: string
  model_version: string
  checkpoint_id: string
  checkpoint_hash: string
  prediction: string // 'synthetic' | 'authentic' | 'error'
  synthetic_score: number
  real_score: number
  raw_logits?: number[]
  processing_time_ms: number
  device: string
  input_dimensions: number[]
  analysis_status: string
  warnings: string[]
}

export interface ModelBFaceResult {
  face_id: string | number
  face_bounding_box: {
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
  }
  landmarks?: Record<string, number[]>
  prediction: string // 'manipulated' | 'authentic'
  manipulation_score: number
  authentic_face_score: number
  raw_logits?: number[]
}

export interface ModelBResult {
  model_id: string
  model_name: string
  model_version: string
  checkpoint_id: string
  checkpoint_hash: string
  face_count: number
  faces: ModelBFaceResult[]
  max_manipulation_score: number
  overall_prediction: string
  processing_time_ms: number
  device: string
  analysis_status: string
  warnings: string[]
}

export interface AnalysisJob {
  id: string
  evidence_id: string
  owner_id?: string
  model_type: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  result?: any
  error_message?: string
  created_at: string
  started_at?: string
  completed_at?: string
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
  c2pa_analysis?: C2PAAnalysisData
  face_localization?: FaceLocalizationData
  faces?: DetectedFaceData[]
  model_a_result?: ModelAResult
  model_b_result?: ModelBResult
  limitations: string[]
  recommended_next_steps: string[]
  created_at: string
}

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'
export type MultilingualSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'URGENT_REVIEW'

export interface ThreatAnalysisResult {
  id: string
  analysis_id?: string
  incident_id?: string
  input_text: string
  model_id?: string
  model_version?: string
  models_used?: string[]
  language?: string
  language_name?: string
  script?: string
  is_mixed_language?: boolean
  supported_language?: boolean
  language_confidence?: number
  predicted_categories?: string[]
  category_scores?: Record<string, number>
  severity?: MultilingualSeverity
  confidence_status?: string
  analysis_status?: string
  requires_human_review?: boolean
  warnings?: string[]
  inference_time_ms?: number
  toxicity_score: number
  insult_score: number
  threat_score: number
  harassment_score: number
  blackmail_score: number
  extortion_score: number
  urgency_level: UrgencyLevel
  decision: AnalysisDecision
  detected_signals: string[]
  language_detected?: string
  explanation: string
  limitations: string[]
  suggested_steps: string[]
  created_at: string
}

export interface ThreatAnalysisFeedbackPayload {
  corrected_categories: string[]
  corrected_severity?: MultilingualSeverity
  is_false_positive: boolean
  notes?: string
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

// ==========================================
// Stage 5 Forensics & Intelligence Types
// ==========================================
export type GraphVerificationStatus =
  | 'suggested'
  | 'user_asserted'
  | 'human_verified'
  | 'disputed'
  | 'rejected'

export interface GraphNode {
  id: string
  owner_id: string
  incident_id: string
  case_id?: string | null
  node_type: string
  label: string
  entity_ref_id?: string | null
  metadata: Record<string, unknown>
  privacy_redacted: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface GraphEdge {
  id: string
  owner_id: string
  incident_id: string
  case_id?: string | null
  source_node_id: string
  target_node_id: string
  relationship_type: string
  extraction_method: string
  source_evidence_id?: string | null
  supporting_ref?: string | null
  confidence_score?: number | null
  confidence_note?: string | null
  verification_status: GraphVerificationStatus
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface EvidenceGraphData {
  incident_id: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  node_count: number
  edge_count: number
}

export interface NormalizedTimelineEvent {
  id: string
  incident_id: string
  case_id?: string | null
  event_type: string
  source: string
  title: string
  description: string
  related_evidence_id?: string | null
  timestamp: string
  event_time_original: string
  event_time_utc?: string | null
  timezone_original: string
  timezone_confidence: string
  time_precision: 'exact' | 'approximate' | 'date_only' | 'unknown_timezone' | 'conflicting' | 'range'
  time_end_original?: string | null
  time_source: 'alleged_occurrence' | 'evidence_created' | 'safeher_upload' | 'analysis_performed' | 'manual_entry'
  extraction_method: string
  confidence_status: string
  verification_status: 'unverified' | 'suggested' | 'user_asserted' | 'human_verified' | 'disputed'
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
  created_by: string
}

export interface TamperingAnalysisResult {
  id: string
  evidence_id: string
  model_id: string
  model_version: string
  checkpoint_id?: string | null
  analysis_status: 'completed' | 'unavailable' | 'failed' | 'unsupported'
  tampering_score?: number | null
  localization_available: boolean
  heatmap_reference?: string | null
  mask_reference?: string | null
  original_dimensions: [number | null, number | null]
  input_dimensions: [number | null, number | null]
  coordinate_transform: Record<string, unknown>
  processing_time_ms: number
  device: string
  warnings: string[]
  limitations: string[]
  review_status: 'unreviewed' | 'confirmed' | 'disputed'
  reviewed_by?: string | null
  review_notes?: string | null
  created_at: string
}

export interface CaseWorkspaceData {
  case: {
    id: string
    incident_id: string
    title: string
    description?: string | null
    status: string
    notes?: string | null
    created_at: string
    updated_at: string
  }
  viewer_role: string
  incident: Record<string, unknown> | null
  evidence: Array<{
    id: string
    original_filename: string
    file_type: string
    file_size: number
    sha256_hash: string
    storage_status: string
    upload_timestamp: string
  }>
  collaborators: Array<{
    id: string
    case_id: string
    user_id: string
    user_name: string
    user_email: string
    role: string
    status: string
    assigned_at: string
  }>
  case_notes: Array<{
    id: string
    case_id: string
    evidence_id?: string | null
    author_id: string
    note_type: string
    content: string
    is_system_generated: number
    created_at: string
  }>
  activity: Array<{
    id: string
    case_id: string
    actor_id: string
    action: string
    from_status?: string | null
    to_status?: string | null
    reason?: string | null
    created_at: string
  }>
}

export interface InvestigationSummaryReport {
  report_id: string
  generated_at: string
  case_id: string
  case_status: string
  viewer_role: string
  disclaimer: string
  incident_overview: Record<string, unknown>
  evidence_references: Array<Record<string, unknown>>
  timeline: Array<Record<string, unknown>>
  confirmed_relationships: Array<Record<string, unknown>>
  suggested_relationships: Array<Record<string, unknown>>
  unresolved_contradictions: Array<Record<string, unknown>>
  tampering_analysis_results: Array<Record<string, unknown>>
  media_and_deepfake_results: Array<Record<string, unknown>>
  threat_analysis_results: Array<Record<string, unknown>>
  missing_evidence: string[]
  human_review_notes: Array<Record<string, unknown>>
}

// ==========================================
// STAGE 6 & 7: SURVIVOR SAFETY & PRODUCTION TYPES
// ==========================================

export interface UserSafetySettings {
  user_id: string
  quick_exit_url: string
  siren_duration_seconds: number
  siren_volume: number
  fake_call_caller_name: string
  fake_call_delay_seconds: number
  emergency_number: string
  show_siren_in_drawer: number | boolean
  show_fake_call_in_drawer: number | boolean
  show_journey_in_drawer: number | boolean
  show_emergency_call_in_drawer: number | boolean
  updated_at?: string
}

export interface TrustedContact {
  id: string
  user_id: string
  name: string
  phone_number: string
  relationship: string
  notify_on_escalation: number | boolean
  created_at: string
}

export interface JourneyCheckin {
  id: string
  user_id: string
  destination_label: string
  duration_minutes: number
  status: 'active' | 'completed_safely' | 'cancelled' | 'expired'
  contact_id?: string | null
  started_at: string
  expires_at: string
  completed_at?: string | null
}

export interface MalwareScanLog {
  id: string
  evidence_id?: string | null
  user_id: string
  filename: string
  scan_status: 'clean' | 'infected' | 'quarantined' | 'error' | 'unavailable'
  scanner_engine: string
  threats_detected: string[]
  scan_duration_ms: number
  quarantine_path?: string | null
  created_at: string
}

export interface MalwareScannerHealth {
  status: string
  primary_engine: string
  clamav_enabled: boolean
  clamav_ping: boolean
  clamav_endpoint: string
  supported_checks: string[]
}

