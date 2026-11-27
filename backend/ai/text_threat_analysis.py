"""
SafeHER Multilingual Text Threat & Abuse Analysis Engine (Stage 4)
=================================================================
Delegates to the modular `ai.nlp` package combining:
- Hate-speech-CNERG/indic-abusive-allInOne-MuRIL (AFL-3.0)
- unitary/toxic-bert (Apache-2.0, preserved for English)
- Hate-speech-CNERG/deoffxlmr-mono-kannada (Apache-2.0, Kannada-routed)
- Clean-room 12-category context-aware threat & severity engine
"""

from __future__ import annotations

from typing import Any, Dict

from ai.nlp.inference_service import analyze_multilingual_threat


def analyze_threat_text(text: str) -> Dict[str, Any]:
    """
    Analyzes input text across Kannada, Transliterated Kannada (kn-Latn),
    Kannada-English, Hindi, Hinglish, and English.
    """
    return analyze_multilingual_threat(text)
