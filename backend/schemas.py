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
        "ready_for_submission",
        "submitted_by_user",
        "awaiting_response",
        "follow_up_required",
        "resolved",
        "closed",
        "prepared",
    ]
    notes: Optional[str] = Field(default=None, max_length=4000)


class ReportingRecordCreateRequest(BaseModel):
    incident_id: str
    destination_id: str
    destination_name: str
    reference_number: str = Field(..., min_length=1, max_length=200)
    submission_date: str
    follow_up_date: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=4000)
