"""
SafeHER Stage 4 NLP Model Registry
==================================
Tracks approved, licensed pretrained models and documents excluded artifacts.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class ModelSpec:
    registry_key: str
    model_id: str
    version: str
    architecture: str
    license: str
    supported_languages: List[str]
    role: str
    notes: str


MODEL_REGISTRY: Dict[str, ModelSpec] = {
    "indic_abusive_muril": ModelSpec(
        registry_key="indic_abusive_muril",
        model_id="Hate-speech-CNERG/indic-abusive-allInOne-MuRIL",
        version="v1.0-muril-indic",
        architecture="MuRIL (BertForSequenceClassification, 236M params)",
        license="AFL-3.0 (Academic Free License v3.0)",
        supported_languages=["kn", "kn-Latn", "kn-en", "hi", "hi-Latn", "en", "bn", "mr", "ta", "ml", "ur"],
        role="Primary multilingual Indic abusive-speech neural classifier",
        notes="Fine-tuned on google/muril-base-cased; outputs Normal (LABEL_0) vs Abusive (LABEL_1).",
    ),
    "english_toxic_bert": ModelSpec(
        registry_key="english_toxic_bert",
        model_id="unitary/toxic-bert",
        version="v1.0-toxic-bert",
        architecture="BERT-base (BertForSequenceClassification, 110M params)",
        license="Apache-2.0",
        supported_languages=["en"],
        role="Preserved English multi-label toxicity/threat/insult classifier",
        notes="Trained on Civil Comments / Wikipedia Toxic Comments; English only.",
    ),
    "kannada_deoff_xlmr": ModelSpec(
        registry_key="kannada_deoff_xlmr",
        model_id="Hate-speech-CNERG/deoffxlmr-mono-kannada",
        version="v1.0-deoffxlmr-kn",
        architecture="XLM-RoBERTa-base (XLMRobertaForSequenceClassification, 278M params)",
        license="Apache-2.0",
        supported_languages=["kn", "kn-Latn", "kn-en"],
        role="Kannada-routed offensive-language specialist classifier",
        notes="Trained on DravidianLangTech-EACL2021 Kannada offensive dataset; uses xlm-roberta-base tokenizer fallback.",
    ),
}

EXCLUDED_ARTIFACTS: Dict[str, str] = {
    "google/muril-base-cased": (
        "Base masked language model (BertForMaskedLM, Apache-2.0). Not a threat classifier without task-specific fine-tuning."
    ),
    "guardify/estimator.joblib": (
        "Excluded from SafeHER production: Guardify repository has no license file (NOASSERTION), "
        "its preprocessing strips Kannada Unicode, and its LinearSVC achieved 0.1667 macro-F1 on Kannada/Hindi."
    ),
}


def get_registry_summary() -> Dict[str, object]:
    return {
        "active_models": {
            k: {
                "model_id": v.model_id,
                "version": v.version,
                "license": v.license,
                "supported_languages": v.supported_languages,
                "role": v.role,
            }
            for k, v in MODEL_REGISTRY.items()
        },
        "excluded_artifacts": EXCLUDED_ARTIFACTS,
    }
