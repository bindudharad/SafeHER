"""
SafeHER Stage 4 Multilingual Threat Inference Service
====================================================
Orchestrates:
1. Language & script identification (kept separate from threat classification)
2. Evidence-safe normalization (original text never overwritten)
3. Cautious Romanized transliteration variant handling
4. Multi-model neural + context-aware 12-category threat classification
5. Transparent severity assessment & uncertainty/abstention reporting

Never logs raw survivor message text.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import asdict
from typing import Any, Dict

from ai.nlp.language_detection import detect_language_and_script
from ai.nlp.model_registry import MODEL_REGISTRY
from ai.nlp.schemas import ModelPredictionBundle
from ai.nlp.severity_assessment import assess_severity
from ai.nlp.text_normalization import normalize_for_inference
from ai.nlp.threat_classifier import classify_threat_categories, run_neural_models
from ai.nlp.transliteration import analyze_transliteration

logger = logging.getLogger("safeher.ai.nlp.service")

_SUGGESTED_STEPS = [
    "Capture full screenshots of the chat showing date, time, and sender phone/handle.",
    "Do not delete the messages or block the sender until evidence is securely preserved.",
    "Do not send money or negotiate with extortionists. Payment guarantees no deletion.",
    "Export the conversation log and store it in your SafeHER Evidence Vault.",
    "Report the incident to the National Cyber Crime Portal (1930 or cybercrime.gov.in).",
]


def analyze_multilingual_threat(text: str) -> Dict[str, Any]:
    """
    Runs end-to-end multilingual digital abuse & threat analysis.
    Returns both Stage 4 structured fields and backward-compatible SafeHER fields.
    """
    if not text or not text.strip():
        raise ValueError("Input text cannot be empty.")

    analysis_id = f"nlp-{uuid.uuid4().hex[:10]}"

    # 1. Language & script detection
    lang_meta = detect_language_and_script(text)

    # 2. Evidence-preserving normalization
    norm_res = normalize_for_inference(text)

    # 3. Cautious transliteration metadata
    proc_text, translit_meta = analyze_transliteration(norm_res.normalized_text, lang_meta)

    # 4. Neural inference (skipped if unsupported language to avoid fabricated scores)
    if lang_meta.supported_language:
        model_bundle = run_neural_models(proc_text, lang_meta)
    else:
        spec = MODEL_REGISTRY["indic_abusive_muril"]
        model_bundle = ModelPredictionBundle(
            primary_model_id=spec.model_id,
            primary_model_version=spec.version,
            models_used=[],
            model_available=True,
            warnings=[lang_meta.uncertainty_note or "Unsupported language/script."],
        )

    # 5. 12-category classification & severity
    predicted_categories, category_scores, observable_features, is_ambiguous = classify_threat_categories(
        proc_text, lang_meta, model_bundle
    )
    sev = assess_severity(
        lang_meta=lang_meta,
        predicted_categories=predicted_categories,
        category_scores=category_scores,
        model_bundle=model_bundle,
        observable_features=observable_features,
        is_ambiguous=is_ambiguous,
    )

    # Log ONLY non-sensitive metadata (never log raw survivor text!)
    logger.info(
        "NLP analysis_id=%s lang=%s script=%s status=%s severity=%s categories=%s latency_ms=%.1f",
        analysis_id,
        lang_meta.language,
        lang_meta.script,
        sev.analysis_status,
        sev.severity,
        predicted_categories,
        model_bundle.inference_time_ms,
    )

    # Backward-compatible aggregate scores for existing SafeHER API & DB
    tb = model_bundle.toxic_bert_scores
    toxicity_score = round(max(tb.get("toxic", 0.0), model_bundle.neural_abuse_score if "BENIGN" not in predicted_categories else 0.0), 4)
    insult_score = round(max(tb.get("insult", 0.0), category_scores.get("INSULT", 0.0)), 4)
    threat_score = round(max(tb.get("threat", 0.0), category_scores.get("DIRECT_THREAT", 0.0)), 4)
    harassment_score = round(
        max(tb.get("severe_toxic", 0.0), category_scores.get("HARASSMENT", 0.0), category_scores.get("CYBERSTALKING", 0.0)),
        4,
    )
    blackmail_score = round(
        max(category_scores.get("BLACKMAIL", 0.0), category_scores.get("NON_CONSENSUAL_IMAGE_THREAT", 0.0)),
        4,
    )
    extortion_score = round(category_scores.get("FINANCIAL_EXTORTION", 0.0), 4)

    warnings = list(model_bundle.warnings)
    if lang_meta.uncertainty_note:
        warnings.append(lang_meta.uncertainty_note)
    if translit_meta.uncertainty_note:
        warnings.append(translit_meta.uncertainty_note)

    # Preserve backward-compatible keyword signals alongside Stage 4 observable features
    lower_norm = norm_res.normalized_text.lower()
    legacy_keywords = [
        kw for kw in ("leak", "photos", "video", "nude", "private", "expose", "viral", "rupees", "btc", "transfer")
        if kw in lower_norm
    ]
    combined_signals = list(dict.fromkeys([*sev.observable_features, *legacy_keywords]))

    return {
        # Stage 4 structured contract
        "analysis_id": analysis_id,
        "model_id": model_bundle.primary_model_id,
        "model_version": model_bundle.primary_model_version,
        "models_used": model_bundle.models_used,
        "language": lang_meta.language,
        "language_name": lang_meta.language_name,
        "script": lang_meta.script,
        "is_mixed_language": lang_meta.is_mixed_language,
        "supported_language": lang_meta.supported_language,
        "language_confidence": lang_meta.confidence,
        "predicted_categories": predicted_categories,
        "category_scores": category_scores,
        "severity": sev.severity,
        "confidence_status": sev.confidence_status,
        "analysis_status": sev.analysis_status,
        "requires_human_review": sev.requires_human_review,
        "warnings": warnings,
        "inference_time_ms": model_bundle.inference_time_ms,
        # Backward-compatible SafeHER fields
        "input_text": text,
        "language_detected": f"{lang_meta.language} ({lang_meta.language_name})",
        "toxicity_score": toxicity_score,
        "insult_score": insult_score,
        "threat_score": threat_score,
        "harassment_score": harassment_score,
        "blackmail_score": blackmail_score,
        "extortion_score": extortion_score,
        "urgency_level": sev.urgency_level,
        "decision": sev.decision,
        "detected_signals": combined_signals,
        "observable_features": sev.observable_features,
        "explanation": sev.explanation,
        "indic_detection": asdict(lang_meta),
        "transliteration_metadata": asdict(translit_meta),
        "limitations": [
            "Automated NLP scores reflect linguistic patterns and do not verify sender identity or physical capability.",
            "This assessment is a preliminary decision-support indicator, not a formal legal determination.",
            "Single-message analysis cannot capture full multi-turn conversation history unless context is provided.",
        ],
        "suggested_steps": _SUGGESTED_STEPS,
    }
