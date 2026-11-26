import type {
  User,
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

export const mockCurrentUser: User = {
  id: 'usr-9281-sh',
  name: 'Ananya Sharma',
  email: 'ananya.sharma@safeher.protect',
  consent_acknowledged: true,
  consent_date: '2026-11-20T10:15:00Z',
  preferred_language: 'en',
  created_at: '2026-11-20T10:15:00Z',
}

export const mockIncidents: Incident[] = [
  {
    id: 'inc-001',
    user_id: 'usr-9281-sh',
    title: 'Instagram Impersonation & Manipulated Video Circulation',
    category: 'deepfake_media',
    description:
      'An anonymous profile created on Instagram under username @ananya_backup99 is sharing AI-manipulated synthetic video clips pretending to depict me, paired with defamatory audio commentary.',
    incident_date: '2026-11-21',
    incident_time: '14:30',
    platform: 'Instagram',
    relevant_urls: ['https://instagram.com/p/DB_synthetic991', 'https://instagram.com/ananya_backup99'],
    suspected_abuse_type: 'Identity Impersonation and Synthetic Media Defamation',
    additional_notes: 'Account blocked me after sending threatening direct messages via ephemeral mode.',
    status: 'under_review',
    evidence_count: 3,
    analysis_count: 2,
    created_at: '2026-11-21T15:00:00Z',
    updated_at: '2026-11-22T09:30:00Z',
  },
  {
    id: 'inc-002',
    user_id: 'usr-9281-sh',
    title: 'Extortion Messages via WhatsApp from Unknown Overseas Number',
    category: 'blackmail_extortion',
    description:
      'Received repeated WhatsApp messages from +1 (206) 555-0199 demanding cryptocurrency payment, threatening to distribute private personal photos unless payment is received within 24 hours.',
    incident_date: '2026-11-22',
    incident_time: '08:45',
    platform: 'WhatsApp',
    relevant_urls: ['wa.me/+12065550199'],
    suspected_abuse_type: 'Digital Blackmail and Financial Extortion',
    additional_notes: 'User sent a screenshot of my contact list to demonstrate access.',
    status: 'open',
    evidence_count: 2,
    analysis_count: 1,
    created_at: '2026-11-22T10:00:00Z',
    updated_at: '2026-11-22T11:15:00Z',
  },
  {
    id: 'inc-003',
    user_id: 'usr-9281-sh',
    title: 'Doxxing and Targeted Harassment in Telegram Public Channel',
    category: 'doxxing',
    description:
      'Personal home address and contact details published in a public Telegram broadcast channel with 4,500 subscribers, accompanied by targeted slurs and incitement.',
    incident_date: '2026-11-19',
    incident_time: '19:10',
    platform: 'Telegram',
    relevant_urls: ['https://t.me/bangalore_leaks_channel/182'],
    suspected_abuse_type: 'Doxxing and Coordinated Cyberbullying',
    additional_notes: 'Channel administrator refused takedown request.',
    status: 'resolved',
    evidence_count: 1,
    analysis_count: 1,
    created_at: '2026-11-19T20:00:00Z',
    updated_at: '2026-11-21T18:00:00Z',
  },
]

export const mockEvidenceItems: Evidence[] = [
  {
    id: 'evi-101',
    incident_id: 'inc-001',
    original_filename: 'instagram_profile_impersonation.png',
    file_type: 'image/png',
    file_size: 1428500, // 1.4 MB
    sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    upload_timestamp: '2026-11-21T15:10:00Z',
    storage_status: 'stored_encrypted',
    validation_status: 'passed',
    malware_status: 'clean',
    processing_status: 'ready',
    duplicate_status: 'unique',
    preview_url: '',
    notes: 'Screenshot of the fake account profile showing bio and follower count.',
  },
  {
    id: 'evi-102',
    incident_id: 'inc-001',
    original_filename: 'manipulated_clip_sample.mp4',
    file_type: 'video/mp4',
    file_size: 8942100, // 8.9 MB
    sha256_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    upload_timestamp: '2026-11-21T15:15:00Z',
    storage_status: 'stored_encrypted',
    validation_status: 'passed',
    malware_status: 'clean',
    processing_status: 'ready',
    duplicate_status: 'unique',
    notes: 'Short screen recording of the synthetic video as streamed in IG story.',
  },
  {
    id: 'evi-103',
    incident_id: 'inc-002',
    original_filename: 'whatsapp_extortion_thread.pdf',
    file_type: 'application/pdf',
    file_size: 612400,
    sha256_hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    upload_timestamp: '2026-11-22T10:05:00Z',
    storage_status: 'stored_encrypted',
    validation_status: 'passed',
    malware_status: 'clean',
    processing_status: 'ready',
    duplicate_status: 'unique',
    notes: 'Exported chat transcript with timestamps and crypto wallet address.',
  },
]

export const mockMediaAnalyses: Record<string, MediaAnalysisResult> = {
  'evi-102': {
    id: 'an-med-001',
    evidence_id: 'evi-102',
    incident_id: 'inc-001',
    media_type: 'video',
    model_name: 'SafeHER-ViT-DeepfakeSentinel',
    model_version: 'v1.4.2-eval',
    deepfake_score: 0.84,
    nudity_score: 0.12,
    is_calibrated: false, // Explicitly false per prompt instructions!
    uncertainty_state: 'medium',
    decision: 'SUSPICIOUS',
    compression_anomaly_detected: true,
    c2pa_provenance: {
      detected: false,
      is_verified: false,
      limitations:
        'No C2PA Content Credentials found in file container. Note: Absence of C2PA metadata does not prove manipulation, as most social platforms strip metadata upon upload.',
    },
    limitations: [
      'Uncalibrated model score: 0.84 represents neural boundary distance, not a calibrated statistical probability.',
      'Face re-encoding artifacts may result from legitimate video compression or low bitrate encoding.',
      'Analysis conducted on client-preserved sample; forensic extraction of source device is required for official court proceedings.',
    ],
    recommended_next_steps: [
      'Preserve original uncompressed source file if available.',
      'Document the exact Instagram reel link and URL timestamps.',
      'Include this SHA-256 hash in reporting documentation.',
    ],
    created_at: '2026-11-21T15:20:00Z',
  },
}

export const mockThreatAnalyses: Record<string, ThreatAnalysisResult> = {
  'inc-002': {
    id: 'an-thr-001',
    incident_id: 'inc-002',
    input_text:
      'You have 24 hours to transfer 0.25 BTC to this address. If you do not pay, every photo on your phone will be forwarded to your employers, family, and social contacts.',
    toxicity_score: 0.89,
    insult_score: 0.35,
    threat_score: 0.94,
    harassment_score: 0.88,
    blackmail_score: 0.96,
    extortion_score: 0.98,
    urgency_level: 'critical',
    decision: 'BLOCKED',
    detected_signals: [
      'Explicit 24-hour ultimatum deadline detected',
      'Financial ransom demand (cryptocurrency transfer)',
      'Threat of unauthorized distribution of private material (blackmail)',
      'Third-party reputation damage intimidation',
    ],
    explanation:
      'The message exhibits severe extortion and coercive blackmail characteristics with an explicit time-bound ultimatum. The language matches actionable cyber-extortion under relevant legal frameworks.',
    limitations: [
      'NLP threat classification analyzes semantic urgency; it cannot verify the sender’s actual physical capability or technical possession of the files.',
      'This analysis does not constitute legal counsel or a formal police FIR.',
    ],
    suggested_steps: [
      'Do not transfer money or negotiate with the extortionist.',
      'Preserve the message thread without deleting or clearing the chat.',
      'File an immediate report on the National Cyber Crime Reporting Portal (cybercrime.gov.in).',
      'Notify trusted support contacts or professional legal advisors.',
    ],
    created_at: '2026-11-22T10:12:00Z',
  },
}

export const mockTimelineEvents: Record<string, TimelineEvent[]> = {
  'inc-001': [
    {
      id: 'tl-101',
      incident_id: 'inc-001',
      event_type: 'incident_occurred',
      source: 'user',
      title: 'Incident First Discovered',
      description: 'Discovered fake Instagram account sharing manipulated reels.',
      timestamp: '2026-11-21T14:30:00Z',
    },
    {
      id: 'tl-102',
      incident_id: 'inc-001',
      event_type: 'incident_created',
      source: 'system',
      title: 'SafeHER Incident Record Created',
      description: 'Incident #INC-001 established with category "deepfake_media".',
      timestamp: '2026-11-21T15:00:00Z',
    },
    {
      id: 'tl-103',
      incident_id: 'inc-001',
      event_type: 'evidence_uploaded',
      source: 'system',
      title: 'Evidence Stored in Vault',
      description: 'Uploaded "instagram_profile_impersonation.png" with SHA-256 checksum calculated.',
      timestamp: '2026-11-21T15:10:00Z',
      related_evidence_id: 'evi-101',
    },
    {
      id: 'tl-104',
      incident_id: 'inc-001',
      event_type: 'analysis_completed',
      source: 'system',
      title: 'Deepfake Scanner Completed',
      description: 'ViT Sentinel flagged manipulation signals (Score: 0.84, Decision: SUSPICIOUS).',
      timestamp: '2026-11-21T15:20:00Z',
      related_evidence_id: 'evi-102',
    },
  ],
}

export const mockReportingDestinations: ReportingDestination[] = [
  {
    id: 'rep-cybercrime-in',
    name: 'National Cyber Crime Reporting Portal (India)',
    platform: 'Government of India — Ministry of Home Affairs',
    category: 'Official Law Enforcement',
    official_url: 'https://cybercrime.gov.in',
    description:
      'Official citizen portal to report cybercrimes against women and children, cyber blackmail, online stalking, and digital extortion.',
    instructions: [
      'Navigate to the official portal (cybercrime.gov.in) and select "Report Crime Against Women/Children".',
      'You may choose to "Report Anonymously" or "Report & Track".',
      'Provide incident details, including suspect social media handles and phone numbers.',
      'Upload preserved evidence screenshots with SafeHER SHA-256 checksums in the complaint attachment section.',
      'Save the generated 14-digit Complaint Acknowledgement Number.',
    ],
    required_materials: [
      'Official complaint draft (SafeHER PDF export)',
      'Screenshots of defamatory posts / profiles with full URLs',
      'Sender handle / phone number / email address',
      'Proof of identity (if reporting with tracking)',
    ],
    helpline_number: '1930 (National Cyber Crime Helpline)',
    emergency_notice: 'For immediate physical danger or severe threats, dial 112 (National Emergency Helpline).',
    is_verified: true,
  },
  {
    id: 'rep-instagram',
    name: 'Instagram Abuse & Impersonation Reporting',
    platform: 'Meta / Instagram',
    category: 'Platform Takedown',
    official_url: 'https://help.instagram.com/contact/636276399721841',
    description:
      'Official Meta reporting form to request the immediate suspension and removal of an account impersonating you or sharing non-consensual imagery.',
    instructions: [
      'Open the official Instagram Impersonation form.',
      'Select: "Someone created an account pretending to be me or a friend".',
      'Provide your full legal name, email, and the exact username of the infringing account.',
      'Upload a government photo ID proving your legal identity matches the persona being impersonated.',
      'Submit the report and record the case reference email received from Meta Support.',
    ],
    required_materials: [
      'URL of infringing Instagram profile',
      'Links to specific defamatory reels/stories',
      'Government ID photo for identity verification',
    ],
    is_verified: true,
  },
  {
    id: 'rep-whatsapp',
    name: 'WhatsApp Grievance & Threat Reporting',
    platform: 'WhatsApp / Meta',
    category: 'Platform Takedown',
    official_url: 'https://www.whatsapp.com/contact',
    description:
      'Official reporting mechanism for WhatsApp abusive accounts, harassment, and cyber extortion originating from phone numbers.',
    instructions: [
      'In the WhatsApp chat, tap the contact name > scroll down and tap "Report Contact".',
      'Keep "Block contact and delete chat" unchecked initially if you still need to export recent evidence.',
      'Export chat history without media to preserve timestamp records.',
      'For severe extortion, escalate to WhatsApp Grievance Officer India: grievance_officer_wa@support.whatsapp.com.',
    ],
    required_materials: [
      'Sender telephone number in international format (+E.164)',
      'Exported chat transcript or screenshots with visible phone number header',
    ],
    is_verified: true,
  },
  {
    id: 'rep-stopncii',
    name: 'StopNCII.org (Non-Consensual Intimate Image Prevention)',
    platform: 'South West Grid for Learning (SWGfL) & Global Tech Coalition',
    category: 'Digital Hashing Prevention',
    official_url: 'https://stopncii.org',
    description:
      'Free global platform that generates cryptographic perceptual hashes on your device to prevent non-consensual intimate images from being uploaded across participating tech platforms.',
    instructions: [
      'Visit StopNCII.org and start the case creation process.',
      'Select the intimate images/videos on your device. The original images never leave your device.',
      'The browser creates a cryptographic hash (digital fingerprint) and submits only the hash.',
      'Participating platforms (Meta, TikTok, Reddit, etc.) use the hash to block future uploads.',
      'Save your case PIN to manage or withdraw your case anytime.',
    ],
    required_materials: ['Access to the original image/video files on your device to compute local hashes'],
    is_verified: true,
  },
]

export const mockCases: CaseTrackingItem[] = [
  {
    id: 'cas-2026-001',
    incident_id: 'inc-001',
    incident_title: 'Instagram Impersonation & Manipulated Video Circulation',
    incident_category: 'deepfake_media',
    status: 'submitted_by_user',
    created_at: '2026-11-21T15:30:00Z',
    updated_at: '2026-11-22T10:00:00Z',
    follow_up_date: '2026-11-25',
    evidence_count: 3,
    reporting_references: [
      {
        destination: 'Instagram Impersonation Report',
        ref_number: 'META-REF-892104-IN',
        date: '2026-11-21',
      },
    ],
    notes: 'Submitted impersonation report with ID proof; awaiting automated confirmation email from Meta.',
  },
  {
    id: 'cas-2026-002',
    incident_id: 'inc-002',
    incident_title: 'Extortion Messages via WhatsApp from Unknown Overseas Number',
    incident_category: 'blackmail_extortion',
    status: 'ready_for_submission',
    created_at: '2026-11-22T10:30:00Z',
    updated_at: '2026-11-22T11:00:00Z',
    follow_up_date: '2026-11-23',
    evidence_count: 2,
    reporting_references: [],
    notes: 'Draft complaint generated. Need to submit on National Cyber Crime Portal today.',
  },
]

export const mockDashboardSummary: DashboardSummary = {
  total_incidents: 3,
  active_cases: 2,
  evidence_items: 6,
  completed_analyses: 4,
  pending_follow_ups: 2,
  recent_incidents: mockIncidents,
  recent_evidence: mockEvidenceItems,
  category_distribution: [
    { name: 'Deepfake / Synthetic', value: 1 },
    { name: 'Extortion / Blackmail', value: 1 },
    { name: 'Doxxing & Harassment', value: 1 },
  ],
  evidence_type_distribution: [
    { name: 'Images (PNG/JPG)', value: 3 },
    { name: 'Videos (MP4)', value: 1 },
    { name: 'Documents (PDF)', value: 2 },
  ],
}
