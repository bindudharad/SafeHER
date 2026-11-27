"""
SafeHER Clean-Room Multilingual Language & Script Identification
================================================================
Detects:
- Native Kannada (kn, U+0C80-U+0CFF)
- Native Hindi (hi, Devanagari U+0900-U+097F)
- Kannada-English code-mixed (kn-en)
- Transliterated Kannada in Latin script (kn-Latn)
- Hinglish / Transliterated Hindi in Latin script (hi-Latn)
- English (en)
- Unknown / Unsupported scripts (e.g., Tamil, Telugu, Arabic, Cyrillic, gibberish)

Kept strictly separate from threat classification.
"""

from __future__ import annotations

import re
from typing import List, Set

from ai.nlp.schemas import LanguageDetectionResult

# Romanized Kannada markers (function words, pronouns, verbs, common nouns)
_KANNADA_LATN_MARKERS: Set[str] = {
    "naanu", "nanu", "neenu", "ninu", "nanna", "ninna", "nanage", "ninage",
    "namm", "nimma", "avnu", "avlu", "avru", "ellaru", "ellargu", "elladru",
    "ellige", "yavaglu", "yeno", "yaake", "illa", "illandre", "illaandre",
    "illadiddare", "andre", "aadre", "ide", "idini", "idde", "idre", "agatte",
    "agutte", "madu", "madtini", "madidya", "madidre", "madta", "madida",
    "haktini", "hakutte", "kalsu", "kalisidini", "kalsbitini", "kodu",
    "kodlilla", "kelidre", "helidante", "helibidtini", "heltiya", "nodko",
    "nodidini", "nodbeku", "nodoke", "bidalla", "barlilla", "banni", "bandu",
    "bandiddu", "horage", "olage", "hatra", "jote", "munde", "hinde",
    "belagge", "sanje", "ratri", "nale", "dinavu", "takshana", "summane",
    "tumba", "swalpa", "mane", "duddu", "kaalu", "kai", "mukha", "maana",
    "moorkha", "ayogya", "buddi", "sullu", "obbale", "iruvaga", "kudiyona",
    "matadtidini", "mataad", "hodedu", "muridu", "tegeetini", "aagatte",
    "mele", "mattu", "inda", "alli", "ge", "na", "kolluthene",
}

# Romanized Hindi / Hinglish markers (function words, pronouns, verbs, colloquialisms)
_HINDI_LATN_MARKERS: Set[str] = {
    "main", "mein", "hum", "tum", "tu", "aap", "mera", "meri", "mere",
    "tera", "teri", "tere", "mujhe", "tujhe", "tumhe", "tumhara", "tumhari",
    "aapka", "aapke", "hai", "hain", "hoon", "ho", "tha", "thi", "the",
    "nahi", "nahin", "mat", "kya", "kyu", "kyun", "kaise", "kahan", "jahan",
    "wahin", "kabhi", "abhi", "kal", "aaj", "roz", "subah", "shaam", "raat",
    "bhai", "yaar", "dost", "paisa", "paise", "rupaye", "ghar", "bahar",
    "andar", "paas", "saath", "pe", "ko", "se", "ka", "ki", "ke", "ne",
    "kar", "karo", "karna", "karunga", "karenge", "de", "do", "diya",
    "dunga", "dega", "bhej", "bhejo", "bhejdunga", "daal", "daalunga",
    "maar", "maro", "maardunga", "jao", "aao", "aayi", "nikli", "khada",
    "bol", "bata", "dekh", "dekha", "dekhna", "dekhunga", "samajh",
    "varna", "warna", "agar", "toh", "bilkul", "sabko", "kuch", "sab",
    "naam", "kaam", "baat", "maani", "utha", "chutiya", "kamine", "kamina",
    "gadhe", "pagal", "madarchod", "behenchod", "aukaat", "ghatiya",
    "barbaad", "dhamki", "bewakoof", "insaan", "dimaag", "bakwas", "jaan",
    "bach", "dikhana", "rakhna", "yaad", "lene", "lena", "gaya", "gayi",
    "raha", "rahi", "rahe", "gandi", "akela", "akele", "kare", "bachane",
}

_COMMON_ENGLISH_STOPWORDS: Set[str] = {
    "the", "is", "are", "was", "were", "am", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "can", "could", "may", "might", "must", "and", "or", "but",
    "if", "then", "else", "for", "with", "from", "this", "that", "these",
    "those", "you", "your", "yours", "they", "their", "we", "our", "she",
    "her", "his", "him", "it", "its", "me", "my", "not", "cannot", "no",
    "what", "when", "where", "why", "how", "every", "all", "right", "now",
    "please", "send", "share", "pay", "money", "photos", "video", "account",
    "meeting", "tomorrow", "today", "night", "waiting", "near", "station",
    "story", "track", "hide", "via", "morphed", "friends", "police",
    "complaint", "family", "trouble", "careful", "free", "call", "coffee",
    "delete", "block", "report", "help", "safe", "home", "office", "phone",
    "message", "number", "location", "address", "evidence", "legal",
}


def detect_language_and_script(text: str) -> LanguageDetectionResult:
    """
    Identifies language, script, code-mixing, and support status.
    Never guesses supported=True for unknown non-Indic/non-Latin scripts.
    """
    if not text or not text.strip():
        return LanguageDetectionResult(
            language="unknown",
            language_name="Unknown",
            script="Unknown",
            is_mixed_language=False,
            transliteration_type="none",
            supported_language=False,
            confidence=0.0,
            uncertainty_note="Empty or whitespace-only input.",
        )

    cleaned = text.strip()
    kn_chars = re.findall(r"[\u0C80-\u0CFF]", cleaned)
    hi_chars = re.findall(r"[\u0900-\u097F]", cleaned)
    latin_words = re.findall(r"\b[a-zA-Z]+\b", cleaned.lower())
    other_scripts = re.findall(
        r"[\u0600-\u06FF\u0400-\u04FF\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F\u4E00-\u9FFF\u3040-\u30FF]",
        cleaned,
    )

    non_space_len = max(len(re.sub(r"\s+", "", cleaned)), 1)
    kn_ratio = len(kn_chars) / non_space_len
    hi_ratio = len(hi_chars) / non_space_len
    other_ratio = len(other_scripts) / non_space_len

    # Unsupported non-Kannada / non-Hindi / non-Latin scripts
    if other_ratio > 0.25 and len(kn_chars) < 2 and len(hi_chars) < 2:
        return LanguageDetectionResult(
            language="unknown",
            language_name="Unsupported Script",
            script="Other",
            is_mixed_language=False,
            transliteration_type="none",
            supported_language=False,
            confidence=round(min(0.95, 0.5 + other_ratio * 0.5), 2),
            uncertainty_note="Input uses a script outside SafeHER's validated Kannada/Devanagari/Latin coverage.",
        )

    # Kannada Unicode (pure or code-mixed with English)
    if len(kn_chars) >= 2:
        en_words = [w for w in latin_words if len(w) >= 2]
        if len(en_words) >= 2:
            return LanguageDetectionResult(
                language="kn-en",
                language_name="Kannada-English Code-Mixed",
                script="Mixed",
                is_mixed_language=True,
                transliteration_type="unicode_plus_latin",
                supported_language=True,
                confidence=round(min(0.98, 0.7 + kn_ratio * 0.3), 2),
                matched_markers=en_words[:6],
            )
        return LanguageDetectionResult(
            language="kn",
            language_name="Kannada",
            script="Kannada",
            is_mixed_language=False,
            transliteration_type="none",
            supported_language=True,
            confidence=round(min(0.99, 0.75 + kn_ratio * 0.25), 2),
        )

    # Devanagari Hindi (pure or code-mixed with English)
    if len(hi_chars) >= 2:
        en_words = [w for w in latin_words if len(w) >= 2]
        is_mixed = len(en_words) >= 2
        return LanguageDetectionResult(
            language="hi",
            language_name="Hindi (Devanagari)" if not is_mixed else "Hindi-English Code-Mixed",
            script="Devanagari" if not is_mixed else "Mixed",
            is_mixed_language=is_mixed,
            transliteration_type="unicode_plus_latin" if is_mixed else "none",
            supported_language=True,
            confidence=round(min(0.99, 0.75 + hi_ratio * 0.25), 2),
            matched_markers=en_words[:6] if is_mixed else [],
        )

    # Latin script: distinguish kn-Latn, kn-en, hi-Latn, en, or unknown
    if not latin_words:
        return LanguageDetectionResult(
            language="unknown",
            language_name="Unknown",
            script="Unknown",
            is_mixed_language=False,
            transliteration_type="none",
            supported_language=False,
            confidence=0.2,
            uncertainty_note="No recognizable alphabetic tokens found.",
        )

    kn_hits = [w for w in latin_words if w in _KANNADA_LATN_MARKERS]
    hi_hits = [w for w in latin_words if w in _HINDI_LATN_MARKERS]
    en_hits = [w for w in latin_words if w in _COMMON_ENGLISH_STOPWORDS]

    if len(kn_hits) >= 2 or (len(kn_hits) >= 1 and len(kn_hits) > len(hi_hits) and len(en_hits) <= 2):
        is_mixed = len(en_hits) >= 2
        lang_code = "kn-en" if (is_mixed and len(en_hits) >= 3) else "kn-Latn"
        return LanguageDetectionResult(
            language=lang_code,
            language_name="Kannada-English (Romanized)" if lang_code == "kn-en" else "Transliterated Kannada (kn-Latn)",
            script="Latin",
            is_mixed_language=is_mixed,
            transliteration_type="romanized_kannada",
            supported_language=True,
            confidence=round(min(0.95, 0.62 + len(kn_hits) * 0.08), 2),
            matched_markers=sorted(set(kn_hits))[:8],
            uncertainty_note="Short Romanized text may share tokens with neighboring languages." if len(latin_words) < 4 else None,
        )

    if len(hi_hits) >= 2 or (len(hi_hits) >= 1 and len(hi_hits) > len(kn_hits) and len(en_hits) <= 2):
        return LanguageDetectionResult(
            language="hi-Latn",
            language_name="Hinglish (Transliterated Hindi)",
            script="Latin",
            is_mixed_language=True,
            transliteration_type="romanized_hindi",
            supported_language=True,
            confidence=round(min(0.95, 0.62 + len(hi_hits) * 0.08), 2),
            matched_markers=sorted(set(hi_hits))[:8],
            uncertainty_note="Short Romanized text may share tokens with English/Urdu." if len(latin_words) < 4 else None,
        )

    # Default Latin: English (if English words or standard Latin text)
    if len(en_hits) >= 1 or len(latin_words) >= 2:
        conf = 0.92 if len(en_hits) >= 2 else 0.72
        note = "Short text; language identification has moderate uncertainty." if len(latin_words) < 4 else None
        return LanguageDetectionResult(
            language="en",
            language_name="English",
            script="Latin",
            is_mixed_language=False,
            transliteration_type="none",
            supported_language=True,
            confidence=conf,
            uncertainty_note=note,
        )

    return LanguageDetectionResult(
        language="unknown",
        language_name="Unknown",
        script="Latin",
        is_mixed_language=False,
        transliteration_type="none",
        supported_language=False,
        confidence=0.35,
        uncertainty_note="Text is too short or ambiguous to confirm language.",
    )
