"""
SafeHER Transparent Severity Assessment & Uncertainty Framework
===============================================================
Maps predicted threat categories, neural confidence, and observable features
to SafeHER severity levels (LOW, MODERATE, HIGH, URGENT_REVIEW) and backward-
compatible urgency/decision fields without arbitrary score multiplication.
"""

from __future__ import annotations

from typing import Dict, List

from ai.nlp.schemas import (
    LanguageDetectionResult,
    ModelPredictionBundle,
    SeverityAssessmentResult,
)

_URGENT_CATEGORIES = {
    "DIRECT_THREAT",
    "BLACKMAIL",
    "FINANCIAL_EXTORTION",
    "NON_CONSENSUAL_IMAGE_THREAT",
}

_HIGH_CATEGORIES = {
    "HARASSMENT",
    "CYBERSTALKING",
    "SEXUAL_HARASSMENT",
    "COERCION",
    "IMPERSONATION_OR_SOCIAL_ENGINEERING",
    "OTHER_ABUSE",
}


def assess_severity(
    *,
    lang_meta: LanguageDetectionResult,
    predicted_categories: List[str],
    category_scores: Dict[str, float],
    model_bundle: ModelPredictionBundle,
    observable_features: List[str],
    is_ambiguous: bool = False,
) -> SeverityAssessmentResult:
    """
    Determines severity, uncertainty/abstention state, and observable-feature
    explanation. Never fabricates certainty for unsupported or ambiguous inputs.
    """
    if not lang_meta.supported_language:
        return SeverityAssessmentResult(
            severity="LOW",
            urgency_level="low",
            decision="SAFE",
            confidence_status="uncertain",
            analysis_status="unsupported_language",
            explanation=(
                f"Language/script '{lang_meta.language_name}' is outside SafeHER's validated "
                "Kannada, Hindi, Hinglish, and English coverage. No threat score was fabricated."
            ),
            observable_features=[],
            requires_human_review=True,
        )

    if not model_bundle.model_available and not observable_features:
        return SeverityAssessmentResult(
            severity="LOW",
            urgency_level="low",
            decision="SAFE",
            confidence_status="uncertain",
            analysis_status="model_unavailable",
            explanation="NLP model weights are currently unavailable; unable to complete automated screening.",
            observable_features=[],
            requires_human_review=True,
        )

    active_cats = [c for c in predicted_categories if c != "BENIGN"]
    max_cat_score = max((category_scores.get(c, 0.0) for c in active_cats), default=0.0)
    has_urgent = any(c in _URGENT_CATEGORIES for c in active_cats)
    has_high = any(c in _HIGH_CATEGORIES for c in active_cats)

    # Check for isolated ordinary insult (must NOT be over-classified as critical)
    if active_cats == ["INSULT"]:
        sev = "LOW" if max_cat_score < 0.78 else "MODERATE"
        return SeverityAssessmentResult(
            severity=sev,
            urgency_level="low" if sev == "LOW" else "medium",
            decision="SAFE" if sev == "LOW" else "WARNING",
            confidence_status="moderate" if max_cat_score >= 0.6 else "low",
            analysis_status="completed",
            explanation=(
                f"Detected offensive/insulting language in {lang_meta.language_name} without "
                "explicit physical threats, blackmail, stalking, or extortion demands."
            ),
            observable_features=observable_features,
            requires_human_review=False,
        )

    if has_urgent and not is_ambiguous:
        severity = "URGENT_REVIEW"
        urgency = "critical"
        decision = "BLOCKED"
        conf_status = "high" if max_cat_score >= 0.7 else "moderate"
        status = "completed"
        requires_review = True
    elif has_urgent and is_ambiguous:
        severity = "MODERATE"
        urgency = "medium"
        decision = "WARNING"
        conf_status = "low"
        status = "ambiguous"
        requires_review = True
    elif has_high:
        severity = "HIGH"
        urgency = "high"
        decision = "WARNING"
        conf_status = "high" if max_cat_score >= 0.65 else "moderate"
        status = "completed"
        requires_review = True
    elif active_cats:
        severity = "MODERATE"
        urgency = "medium"
        decision = "WARNING"
        conf_status = "low" if max_cat_score < 0.55 else "moderate"
        status = "low_confidence" if max_cat_score < 0.55 else "completed"
        requires_review = max_cat_score < 0.55
    else:
        severity = "LOW"
        urgency = "low"
        decision = "SAFE"
        conf_status = "high" if lang_meta.confidence >= 0.75 else "low"
        status = "low_confidence" if lang_meta.confidence < 0.6 else "completed"
        requires_review = False

    if active_cats:
        cat_str = ", ".join(active_cats)
        feat_str = "; ".join(observable_features[:4]) if observable_features else "neural abusive-speech signal"
        explanation = (
            f"Evaluated in {lang_meta.language_name} ({lang_meta.script} script). "
            f"Predicted categories: {cat_str}. Observable indicators: {feat_str}."
        )
    else:
        explanation = (
            f"Evaluated in {lang_meta.language_name} ({lang_meta.script} script). "
            "No threat, blackmail, extortion, or harassment indicators detected."
        )

    return SeverityAssessmentResult(
        severity=severity,
        urgency_level=urgency,
        decision=decision,
        confidence_status=conf_status,
        analysis_status=status,
        explanation=explanation,
        observable_features=observable_features,
        requires_human_review=requires_review,
    )
