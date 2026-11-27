"""
SafeHER Cautious Transliteration Helper
=======================================
Normalizes common Romanized spelling variants for Kannada (kn-Latn) and
Hinglish (hi-Latn) WITHOUT blindly converting Latin text into another script
or translating away threat meaning.
"""

from __future__ import annotations

import re
from typing import Dict, List, Tuple

from ai.nlp.schemas import LanguageDetectionResult, TransliterationMetadata

_KN_LATN_VARIANTS: Dict[str, str] = {
    "kalisu": "kalsu",
    "kalsbitini": "kalsu",
    "madutini": "madtini",
    "maduttini": "madtini",
    "hakutini": "haktini",
    "illandre": "illa andre",
    "illaandre": "illa andre",
    "illadiddare": "illa andre",
    "takshana": "takshana",
    "duddu": "duddu",
}

_HI_LATN_VARIANTS: Dict[str, str] = {
    "varna": "warna",
    "nhi": "nahi",
    "nahin": "nahi",
    "bhejdunga": "bhej dunga",
    "maardunga": "maar dunga",
    "karunga": "karunga",
    "paise": "paise",
    "paisa": "paise",
}


def analyze_transliteration(
    normalized_text: str,
    lang_meta: LanguageDetectionResult,
) -> Tuple[str, TransliterationMetadata]:
    """
    Applies light canonicalization for known Romanized spelling variants while
    preserving the original text and recording uncertainty.
    """
    if lang_meta.transliteration_type not in {"romanized_kannada", "romanized_hindi"}:
        return normalized_text, TransliterationMetadata(
            is_transliterated=False,
            source_script=lang_meta.script,
            likely_language=lang_meta.language,
        )

    variants_map = (
        _KN_LATN_VARIANTS
        if lang_meta.transliteration_type == "romanized_kannada"
        else _HI_LATN_VARIANTS
    )
    applied: List[str] = []
    out = normalized_text
    for src, dst in variants_map.items():
        pat = re.compile(rf"\b{re.escape(src)}\b", re.IGNORECASE)
        if pat.search(out):
            out = pat.sub(dst, out)
            applied.append(f"{src}->{dst}")

    return out, TransliterationMetadata(
        is_transliterated=True,
        source_script="Latin",
        likely_language=lang_meta.language,
        canonical_variants_applied=applied,
        uncertainty_note=(
            "Romanized Indic spelling varies by speaker; phonetic variants are normalized cautiously without machine translation."
        ),
    )
