"""
SafeHER Multilingual NLP Compatibility & Model Governance Module
================================================================
Provides backward-compatible symbols for existing tests while routing
language detection to `ai.nlp.language_detection` and excluding unlicensed
Guardify artifacts from production inference.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from ai.nlp.language_detection import detect_language_and_script


@dataclass
class GuardifyBaselineResult:
    status: str  # 'excluded_unlicensed', 'unavailable', 'error'
    prediction: Optional[str]
    decision_score: Optional[float]
    model_name: str
    training_dataset: str
    license_notice: str
    limitations: str


@dataclass
class IndicLanguageDetection:
    detected_code: str
    language_name: str
    script: str
    confidence: float
    detected_slang_or_terms: List[str]


def detect_indic_language_and_script(text: str) -> IndicLanguageDetection:
    """Routes to Stage 4 clean-room Indic language & script detector."""
    res = detect_language_and_script(text)
    return IndicLanguageDetection(
        detected_code=res.language,
        language_name=res.language_name,
        script=res.script,
        confidence=res.confidence,
        detected_slang_or_terms=res.matched_markers,
    )


def evaluate_with_guardify_baseline(text: str) -> GuardifyBaselineResult:
    """
    Guardify's repository has no declared license (NOASSERTION), its preprocessing
    strips Kannada Unicode, and its LinearSVC scored 0.1667 macro-F1 on Kannada/Hindi.
    Excluded from SafeHER production inference.
    """
    return GuardifyBaselineResult(
        status="excluded_unlicensed",
        prediction=None,
        decision_score=None,
        model_name="Guardify HASOC Baseline (LinearSVC)",
        training_dataset="HASOC 2019/2021 Proxy Dataset (Excluded)",
        license_notice="Excluded from production: Guardify repository lacks a license file (NOASSERTION).",
        limitations="Strips Kannada Unicode in preprocessing; 0.1667 macro-F1 on Kannada and Hindi.",
    )


def evaluate_muril_feasibility() -> Dict[str, Any]:
    """
    Documents Google MuRIL (google/muril-base-cased) vs. task-specific
    Hate-speech-CNERG/indic-abusive-allInOne-MuRIL (AFL-3.0).
    """
    return {
        "model_name": "google/muril-base-cased",
        "model_architecture": "BERT Base (12-layer, 768-hidden, 12-heads, 236M parameters)",
        "pretraining_objective": "Masked Language Modeling (MLM) and Translation Language Modeling (TLM)",
        "supported_languages": "17 Indian languages + English transliterated text",
        "suitability_for_abuse_detection": "UNSUITABLE WITHOUT TASK-SPECIFIC FINE-TUNING",
        "technical_justification": (
            "google/muril-base-cased is a pre-trained language representation model, NOT an extortion or harassment classifier. "
            "SafeHER Stage 4 instead adopts Hate-speech-CNERG/indic-abusive-allInOne-MuRIL (AFL-3.0, fine-tuned on MuRIL) "
            "paired with unitary/toxic-bert (Apache-2.0) and Hate-speech-CNERG/deoffxlmr-mono-kannada (Apache-2.0)."
        ),
        "safeher_recommendation": (
            "Use Hate-speech-CNERG/indic-abusive-allInOne-MuRIL + unitary/toxic-bert + "
            "Hate-speech-CNERG/deoffxlmr-mono-kannada with SafeHER's 12-category threat & severity engine."
        ),
    }
