"""
SafeHER Clean-Room Text Normalization
=====================================
Normalizes Unicode, whitespace, repeated characters, and obfuscated terms
for inference while NEVER modifying or overwriting original evidence text.
Preserves negation, names, and numbers.
"""

from __future__ import annotations

import re
import unicodedata
from typing import List, Tuple

from ai.nlp.schemas import NormalizedTextResult

_DEOBFUSCATION_PATTERNS: List[Tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bn[\W_]*u[\W_]*d[\W_]*e[\W_]*s?\b", re.IGNORECASE), "nude"),
    (re.compile(r"\bp[\W_]*h[\W_]*o[\W_]*t[\W_]*o[\W_]*s?\b", re.IGNORECASE), "photos"),
    (re.compile(r"\bv[\W_]*i[\W_]*d[\W_]*e[\W_]*o[\W_]*s?\b", re.IGNORECASE), "videos"),
    (re.compile(r"\bl[\W_]*e[\W_]*a[\W_]*k\b", re.IGNORECASE), "leak"),
    (re.compile(r"\bk[\W_]*i[\W_]*l[\W_]*l\b", re.IGNORECASE), "kill"),
    (re.compile(r"\bb[\W_]*i[\W_]*t[\W_]*c[\W_]*h\b", re.IGNORECASE), "bitch"),
    (re.compile(r"\bf[\W_*]*u[\W_*]*c[\W_*]*k\b", re.IGNORECASE), "fuck"),
    (re.compile(r"\br[\W_*]*a[\W_*]*p[\W_*]*e\b", re.IGNORECASE), "rape"),
]

_ZERO_WIDTH_RE = re.compile(r"[\u200B-\u200D\uFEFF]")


def normalize_for_inference(text: str) -> NormalizedTextResult:
    """
    Produces a clean normalized string for NLP inference without stripping
    Kannada/Devanagari characters, negation, or numeric demands.
    """
    original = text
    norm = unicodedata.normalize("NFC", text)
    norm = _ZERO_WIDTH_RE.sub("", norm)
    norm = re.sub(r"\s+", " ", norm).strip()

    # Collapse excessive alphabetic elongation (3+ repeats -> 2, e.g. 'leaaak' -> 'leaak'), preserving numbers
    norm = re.sub(r"([A-Za-z])\1{2,}", r"\1\1", norm)

    deobfuscated: List[str] = []
    for pat, replacement in _DEOBFUSCATION_PATTERNS:
        if pat.search(norm):
            new_norm = pat.sub(replacement, norm)
            if new_norm != norm:
                deobfuscated.append(replacement)
                norm = new_norm

    tokens = norm.split()
    return NormalizedTextResult(
        original_text=original,
        normalized_text=norm,
        char_length=len(norm),
        token_count=len(tokens),
        deobfuscated_terms=sorted(set(deobfuscated)),
    )
