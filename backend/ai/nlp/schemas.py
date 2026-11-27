"""
SafeHER Stage 4 Multilingual NLP Schemas
========================================
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

THREAT_CATEGORIES: List[str] = [
    "BENIGN",
    "INSULT",
    "HARASSMENT",
    "CYBERSTALKING",
    "DIRECT_THREAT",
    "BLACKMAIL",
    "FINANCIAL_EXTORTION",
    "SEXUAL_HARASSMENT",
    "NON_CONSENSUAL_IMAGE_THREAT",
    "COERCION",
    "IMPERSONATION_OR_SOCIAL_ENGINEERING",
    "OTHER_ABUSE",
]

SEVERITY_LEVELS: List[str] = ["LOW", "MODERATE", "HIGH", "URGENT_REVIEW"]

ANALYSIS_STATUSES: List[str] = [
    "completed",
    "unsupported_language",
    "low_confidence",
    "ambiguous",
    "model_unavailable",
    "inference_failed",
]


@dataclass
class LanguageDetectionResult:
    language: str  # kn, kn-Latn, kn-en, hi, hi-Latn, en, unknown
    language_name: str
    script: str  # Kannada, Devanagari, Latin, Mixed, Unknown
    is_mixed_language: bool
    transliteration_type: str  # none, romanized_kannada, romanized_hindi, unicode_plus_latin
    supported_language: bool
    confidence: float
    matched_markers: List[str] = field(default_factory=list)
    uncertainty_note: Optional[str] = None


@dataclass
class NormalizedTextResult:
    original_text: str
    normalized_text: str
    char_length: int
    token_count: int
    deobfuscated_terms: List[str] = field(default_factory=list)


@dataclass
class TransliterationMetadata:
    is_transliterated: bool
    source_script: str
    likely_language: str
    canonical_variants_applied: List[str] = field(default_factory=list)
    uncertainty_note: Optional[str] = None


@dataclass
class ModelPredictionBundle:
    primary_model_id: str
    primary_model_version: str
    models_used: List[str] = field(default_factory=list)
    neural_abuse_score: float = 0.0
    toxic_bert_scores: Dict[str, float] = field(default_factory=dict)
    kannada_model_score: Optional[float] = None
    model_available: bool = True
    warnings: List[str] = field(default_factory=list)
    inference_time_ms: float = 0.0


@dataclass
class SeverityAssessmentResult:
    severity: str  # LOW, MODERATE, HIGH, URGENT_REVIEW
    urgency_level: str  # Backward-compatible: low, medium, high, critical
    decision: str  # Backward-compatible: SAFE, WARNING, BLOCKED
    confidence_status: str  # high, moderate, low, uncertain
    analysis_status: str  # completed, unsupported_language, low_confidence, ambiguous, ...
    explanation: str
    observable_features: List[str] = field(default_factory=list)
    requires_human_review: bool = False
