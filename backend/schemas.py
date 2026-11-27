from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=1, max_length=128)


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=6, max_length=128)
    consent_acknowledged: bool


class IncidentCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    category: Literal[
        "harassment",
        "blackmail_extortion",
        "impersonation",
        "deepfake_media",
        "non_consensual_imagery",
        "doxxing",
        "cyberstalking",
        "other",
    ]
    description: str = Field(..., min_length=5, max_length=10000)
    platform: str = Field(..., min_length=1, max_length=120)
    incident_date: str = Field(..., min_length=4, max_length=40)
    incident_time: Optional[str] = Field(default=None, max_length=40)
    relevant_urls: List[str] = Field(default_factory=list)


class ThreatAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    incident_id: Optional[str] = None


class ThreatAnalysisFeedbackRequest(BaseModel):
    corrected_categories: List[str] = Field(default_factory=list)
    corrected_severity: Optional[Literal["LOW", "MODERATE", "HIGH", "URGENT_REVIEW"]] = None
    is_false_positive: bool = False
    notes: Optional[str] = Field(default=None, max_length=2000)


class TimelineEventCreateRequest(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=80)
    source: Literal["system", "user"] = "user"
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=4000)
    related_evidence_id: Optional[str] = None


class ComplaintGenerateRequest(BaseModel):
    incident_id: str
    evidence_ids: List[str] = Field(default_factory=list)
    confirmed_facts: str = Field(..., min_length=1, max_length=15000)


class ComplaintUpdateRequest(BaseModel):
    full_draft_text: str = Field(..., min_length=1, max_length=30000)
    is_user_confirmed: bool = False


class CaseUpdateRequest(BaseModel):
    status: Literal[
        "draft",
        "open",
        "evidence_collection",
        "under_review",
        "ready_for_submission",
        "submitted",
        "submitted_by_user",
        "awaiting_response",
        "follow_up_required",
        "resolved",
        "closed",
        "archived",
        "prepared",
    ]
    notes: Optional[str] = Field(default=None, max_length=4000)
    reason: Optional[str] = Field(default=None, max_length=500)


class ReportingRecordCreateRequest(BaseModel):
    incident_id: str
    destination_id: str
    destination_name: str
    reference_number: str = Field(..., min_length=1, max_length=200)
    submission_date: str
    follow_up_date: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=4000)


class AnalysisJobSubmitRequest(BaseModel):
    model_type: Literal["model_a", "model_b", "tampering_localization", "full_forensics", "all"] = "full_forensics"


# ==========================================================
# STAGE 5 SCHEMAS
# ==========================================================
class GraphNodeCreateRequest(BaseModel):
    incident_id: str
    case_id: Optional[str] = None
    node_type: str = Field(..., min_length=2, max_length=60)
    label: str = Field(..., min_length=1, max_length=240)
    entity_ref_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class GraphEdgeCreateRequest(BaseModel):
    incident_id: str
    case_id: Optional[str] = None
    source_node_id: str
    target_node_id: str
    relationship_type: str = Field(..., min_length=2, max_length=60)
    source_evidence_id: Optional[str] = None
    supporting_ref: Optional[str] = Field(default=None, max_length=300)
    confidence_note: Optional[str] = Field(default=None, max_length=500)


class GraphEdgeReviewRequest(BaseModel):
    status: Literal["human_verified", "disputed", "rejected"]
    review_note: Optional[str] = Field(default=None, max_length=1000)


class TimelineEventNormalizedCreateRequest(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=80)
    source: Literal["system", "user"] = "user"
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=4000)
    related_evidence_id: Optional[str] = None
    event_time_original: Optional[str] = Field(default=None, max_length=80)
    timezone_original: Optional[str] = Field(default=None, max_length=80)
    time_precision: Literal["exact", "approximate", "date_only", "unknown_timezone", "conflicting", "range"] = "exact"
    time_end_original: Optional[str] = Field(default=None, max_length=80)
    time_source: Literal["alleged_occurrence", "evidence_created", "safeher_upload", "analysis_performed", "manual_entry"] = "manual_entry"
    raw_excerpt: Optional[str] = Field(default=None, max_length=1000)


class TimelineEventUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, min_length=1, max_length=4000)
    event_time_original: Optional[str] = Field(default=None, max_length=80)
    timezone_original: Optional[str] = Field(default=None, max_length=80)
    time_precision: Optional[Literal["exact", "approximate", "date_only", "unknown_timezone", "conflicting", "range"]] = None
    verification_status: Optional[Literal["unverified", "suggested", "user_asserted", "human_verified", "disputed"]] = None
    reason: Optional[str] = Field(default=None, max_length=500)


class TamperingAnalysisRequest(BaseModel):
    preferred_model: Literal["trufor", "catnet", "mantranet"] = "trufor"
    async_job: bool = False


class TamperingReviewRequest(BaseModel):
    review_status: Literal["unreviewed", "confirmed", "disputed"]
    review_notes: Optional[str] = Field(default=None, max_length=1000)


class CaseCreateRequest(BaseModel):
    incident_id: str
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, max_length=4000)
    status: Literal["draft", "open", "evidence_collection"] = "open"


class CaseEvidenceLinkRequest(BaseModel):
    evidence_id: str
    link_reason: Optional[str] = Field(default=None, max_length=500)


class CaseAssignCollaboratorRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    role: Literal["collaborator", "investigator", "legal_adviser"] = "collaborator"


class CaseNoteCreateRequest(BaseModel):
    note_type: Literal["investigation", "evidence", "review", "finding"] = "investigation"
    content: str = Field(..., min_length=1, max_length=4000)
    evidence_id: Optional[str] = None


class CustodyTransferRequest(BaseModel):
    action: Literal[
        "evidence_verified",
        "evidence_accessed",
        "evidence_downloaded",
        "evidence_shared",
        "evidence_transferred",
        "evidence_revoked",
        "evidence_exported",
        "evidence_disputed",
    ]
    case_id: Optional[str] = None
    new_custody_holder: Optional[str] = Field(default=None, max_length=120)
    purpose: str = Field(..., min_length=2, max_length=300)
    transfer_reason: Optional[str] = Field(default=None, max_length=500)


# =============================================================================
# STAGE 6: SURVIVOR SAFETY, TRUSTED CONTACTS & JOURNEY CHECK-IN SCHEMAS
# =============================================================================

class SafetySettingsUpdateRequest(BaseModel):
    quick_exit_url: Optional[str] = Field(default=None, max_length=500)
    siren_duration_seconds: Optional[int] = Field(default=None, ge=5, le=300)
    siren_volume: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    fake_call_caller_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    fake_call_delay_seconds: Optional[int] = Field(default=None, ge=1, le=120)
    emergency_number: Optional[str] = Field(default=None, min_length=2, max_length=20)
    show_siren_in_drawer: Optional[bool] = None
    show_fake_call_in_drawer: Optional[bool] = None
    show_journey_in_drawer: Optional[bool] = None
    show_emergency_call_in_drawer: Optional[bool] = None


class TrustedContactCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone_number: str = Field(..., min_length=3, max_length=30)
    relationship: str = Field(default="other", max_length=60)
    notify_on_escalation: bool = True


class JourneyCheckinStartRequest(BaseModel):
    destination_label: str = Field(..., min_length=1, max_length=150)
    duration_minutes: int = Field(..., ge=1, le=1440)
    contact_id: Optional[str] = None
