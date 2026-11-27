"""
SafeHER Stage 4 Multilingual Evaluation Dataset Builder (v1.0.0)
================================================================
Generates a versioned, strictly synthetic, zero-PII multilingual evaluation
dataset covering Kannada, Transliterated Kannada (kn-Latn), Kannada-English
code-mixed (kn-en), Hindi (Devanagari), Hinglish (hi-Latn), and English (en).

No real survivor messages, intimate media, or scraped private chats are used.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List

TAXONOMY = [
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


def _make_record(
    idx: int,
    text: str,
    language: str,
    script: str,
    transliteration_type: str,
    code_mixing: str,
    primary_category: str,
    secondary_categories: List[str],
    severity: str,
    context_availability: str = "single_message",
    annotation_confidence: float = 0.95,
    ambiguity_status: str = "clear",
) -> Dict[str, Any]:
    labels = [primary_category] + [c for c in secondary_categories if c != primary_category]
    for lbl in labels:
        if lbl not in TAXONOMY:
            raise ValueError(f"Unknown taxonomy label: {lbl}")
    return {
        "message_id": f"SH-EVAL-{idx:04d}",
        "text": text,
        "language": language,
        "script": script,
        "transliteration_type": transliteration_type,
        "code_mixing": code_mixing,
        "primary_category": primary_category,
        "secondary_categories": secondary_categories,
        "labels": labels,
        "is_abusive": primary_category != "BENIGN",
        "severity": severity,
        "context_availability": context_availability,
        "annotation_confidence": annotation_confidence,
        "ambiguity_status": ambiguity_status,
        "source": "synthetic_safeher_v1",
        "license": "CC0-1.0 (SafeHER Synthetic Evaluation Benchmark)",
        "is_synthetic": True,
    }


def build_records() -> List[Dict[str, Any]]:
    raw: List[tuple] = [
        # ==========================================================
        # 1. KANNADA UNICODE (kn) — 20 samples
        # ==========================================================
        ("ನಾಳೆ ಬೆಳಗ್ಗೆ 10 ಗಂಟೆಗೆ ಕಚೇರಿಯಲ್ಲಿ ಸಭೆ ಇದೆ, ದಯವಿಟ್ಟು ಸಮಯಕ್ಕೆ ಬನ್ನಿ.", "kn", "Kannada", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.99, "clear"),
        ("ನಿನ್ನೆ ಕಳುಹಿಸಿದ ಪ್ರಾಜೆಕ್ಟ್ ಫೋಟೋಗಳನ್ನು ತಂಡದ ಗುಂಪಿನಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ.", "kn", "Kannada", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.95, "clear"),
        ("ದಯವಿಟ್ಟು ಊಟದ ಹಣವನ್ನು ಯುಪಿಐ ಮೂಲಕ ಕಳುಹಿಸಿ, ಧನ್ಯವಾದಗಳು.", "kn", "Kannada", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.96, "clear"),
        ("ಪೊಲೀಸ್ ಠಾಣೆಯ ಹತ್ತಿರದ ಬಸ್ ನಿಲ್ದಾಣದಲ್ಲಿ ನಾನು ಕಾಯುತ್ತಿದ್ದೇನೆ.", "kn", "Kannada", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.96, "clear"),
        ("ನೀನು ತುಂಬಾ ಮೂರ್ಖನಂತೆ ಮಾತನಾಡುತ್ತಿದ್ದೀಯ, ಸ್ವಲ್ಪ ಬುದ್ಧಿ ಕಲಿ.", "kn", "Kannada", "none", "monolingual", "INSULT", [], "LOW", "single_message", 0.92, "clear"),
        ("ನಿನಗೆ ಏನೂ ಕೆಲಸ ಬರುವುದಿಲ್ಲ, ಸೋಮಾರಿ ಮತ್ತು ಅಯೋಗ್ಯ.", "kn", "Kannada", "none", "monolingual", "INSULT", ["HARASSMENT"], "MODERATE", "single_message", 0.90, "clear"),
        ("ಪ್ರತಿದಿನ ನಿನಗೆ ಮೆಸೇಜ್ ಮಾಡಿ ನೆಮ್ಮದಿ ಹಾಳು ಮಾಡುತ್ತೇನೆ, ಎಲ್ಲಿಗೆ ಹೋದರೂ ಬಿಡಲ್ಲ.", "kn", "Kannada", "none", "monolingual", "HARASSMENT", ["CYBERSTALKING"], "HIGH", "single_message", 0.94, "clear"),
        ("ನೀನು ಇಂದು ಬೆಳಗ್ಗೆ ಎಂಟು ಗಂಟೆಗೆ ಮನೆಯಿಂದ ಹೊರಗೆ ಬಂದದ್ದನ್ನು ನಾನು ನೋಡಿದ್ದೇನೆ.", "kn", "Kannada", "none", "monolingual", "CYBERSTALKING", [], "HIGH", "single_message", 0.93, "clear"),
        ("ನಿನ್ನ ಮನೆ ಎದುರು ಬಂದು ನಿಂತಿದ್ದೇನೆ, ಹೊರಗೆ ಬರದಿದ್ದರೆ ತಕ್ಕ ಪಾಠ ಕಲಿಸುತ್ತೇನೆ.", "kn", "Kannada", "none", "monolingual", "DIRECT_THREAT", ["CYBERSTALKING"], "URGENT_REVIEW", "single_message", 0.97, "clear"),
        ("ನೀನು ಎಲ್ಲಿ ಸಿಕ್ಕರೂ ನಿನ್ನನ್ನು ಬಿಡುವುದಿಲ್ಲ, ಕೈಕಾಲು ಮುರಿಯುತ್ತೇನೆ.", "kn", "Kannada", "none", "monolingual", "DIRECT_THREAT", [], "URGENT_REVIEW", "single_message", 0.98, "clear"),
        ("ನಿನ್ನ ಖಾಸಗಿ ಫೋಟೋಗಳು ನನ್ನ ಹತ್ತಿರ ಇವೆ, ಹೇಳಿದಂತೆ ಕೇಳದಿದ್ದರೆ ಎಲ್ಲರಿಗೂ ಕಳುಹಿಸುತ್ತೇನೆ.", "kn", "Kannada", "none", "monolingual", "BLACKMAIL", ["NON_CONSENSUAL_IMAGE_THREAT", "COERCION"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("ನಿನ್ನ ವಿಡಿಯೋವನ್ನು ಕುಟುಂಬದ ವಾಟ್ಸಾಪ್ ಗುಂಪಿನಲ್ಲಿ ಹಾಕುತ್ತೇನೆ, ತಕ್ಷಣ ನನಗೆ ಕರೆ ಮಾಡು.", "kn", "Kannada", "none", "monolingual", "NON_CONSENSUAL_IMAGE_THREAT", ["BLACKMAIL", "COERCION"], "URGENT_REVIEW", "single_message", 0.98, "clear"),
        ("ಇಪ್ಪತ್ತು ಸಾವಿರ ರೂಪಾಯಿ ತಕ್ಷಣ ವರ್ಗಾವಣೆ ಮಾಡು, ಇಲ್ಲದಿದ್ದರೆ ನಿನ್ನ ಫೋಟೋ ವೈರಲ್ ಮಾಡುತ್ತೇನೆ.", "kn", "Kannada", "none", "monolingual", "FINANCIAL_EXTORTION", ["BLACKMAIL", "NON_CONSENSUAL_IMAGE_THREAT"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("ನಾಳೆ ಸಂಜೆಯೊಳಗೆ ಹಣ ಕೊಡದಿದ್ದರೆ ನಿನ್ನ ಕಚೇರಿಯ ಎಲ್ಲರಿಗೂ ನಿನ್ನ ರಹಸ್ಯ ತಿಳಿಸುತ್ತೇನೆ.", "kn", "Kannada", "none", "monolingual", "FINANCIAL_EXTORTION", ["BLACKMAIL"], "URGENT_REVIEW", "single_message", 0.97, "clear"),
        ("ರಾತ್ರಿ ಒಬ್ಬಳೇ ಇರುವಾಗ ವಿಡಿಯೋ ಕಾಲ್ ಮಾಡು, ನಿನ್ನ ದೇಹ ನೋಡಬೇಕು.", "kn", "Kannada", "none", "monolingual", "SEXUAL_HARASSMENT", [], "HIGH", "single_message", 0.98, "clear"),
        ("ನನ್ನ ಜೊತೆ ಹೋಟೆಲ್ ಗೆ ಬರದಿದ್ದರೆ ನಿನ್ನ ಮಾರ್ಫ್ ಮಾಡಿದ ಚಿತ್ರಗಳನ್ನು ಹಂಚುತ್ತೇನೆ.", "kn", "Kannada", "none", "monolingual", "COERCION", ["SEXUAL_HARASSMENT", "NON_CONSENSUAL_IMAGE_THREAT"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("ನಾನು ಸೈಬರ್ ಕ್ರೈಂ ಇನ್ಸ್‌ಪೆಕ್ಟರ್ ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ, ನಿಮ್ಮ ಮೇಲೆ ವಾರೆಂಟ್ ಇದೆ, ಹಣ ಕಟ್ಟಿ.", "kn", "Kannada", "none", "monolingual", "IMPERSONATION_OR_SOCIAL_ENGINEERING", ["FINANCIAL_EXTORTION"], "HIGH", "single_message", 0.96, "clear"),
        ("ನಿನ್ನ ಮನೆಯ ವಿಳಾಸ ಮತ್ತು ಫೋನ್ ನಂಬರ್ ಆನ್‌ಲೈನ್ ನಲ್ಲಿ ಹಾಕಿ ನಿನ್ನ ಮಾನ ಹರಾಜು ಹಾಕುತ್ತೇನೆ.", "kn", "Kannada", "none", "monolingual", "OTHER_ABUSE", ["BLACKMAIL", "HARASSMENT"], "HIGH", "single_message", 0.95, "clear"),
        ("ನಿನ್ನನ್ನು ನಾನು ಸುಮ್ಮನೆ ಬಿಡುವುದಿಲ್ಲ, ನೋಡಿಕೊಳ್ಳುತ್ತೇನೆ.", "kn", "Kannada", "none", "monolingual", "DIRECT_THREAT", ["HARASSMENT"], "MODERATE", "single_message", 0.80, "ambiguous"),
        ("ನಿನ್ನ ಬ್ಯಾಂಕ್ ಖಾತೆ ಬಂದ್ ಆಗಲಿದೆ, ತಕ್ಷಣ ಒಟಿಪಿ ಕಳುಹಿಸು.", "kn", "Kannada", "none", "monolingual", "IMPERSONATION_OR_SOCIAL_ENGINEERING", [], "MODERATE", "single_message", 0.94, "clear"),

        # ==========================================================
        # 2. TRANSLITERATED KANNADA (kn-Latn) — 20 samples
        # ==========================================================
        ("Nale belagge 10 gantege office meeting ide, dayavittu time ge banni.", "kn-Latn", "Latin", "romanized_kannada", "monolingual", "BENIGN", [], "LOW", "single_message", 0.98, "clear"),
        ("Ninna project photos group alli share madu, presentation ge beku.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "BENIGN", [], "LOW", "single_message", 0.94, "clear"),
        ("Oota madidya? Naanu bus stand hatra wait madta idini.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "BENIGN", [], "LOW", "single_message", 0.97, "clear"),
        ("Lunch duddu UPI alli kalisidini, check madu.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "BENIGN", [], "LOW", "single_message", 0.96, "clear"),
        ("Neenu tumba moorkha, ninage buddi ne illa.", "kn-Latn", "Latin", "romanized_kannada", "monolingual", "INSULT", [], "LOW", "single_message", 0.93, "clear"),
        ("Yeno ayogya neenu, yavaglu sullu heltiya, thu nin mukhakke.", "kn-Latn", "Latin", "romanized_kannada", "monolingual", "INSULT", ["HARASSMENT"], "MODERATE", "single_message", 0.91, "clear"),
        ("Dinavu ninage message madtini, ellige hodru ninnanna bidalla.", "kn-Latn", "Latin", "romanized_kannada", "monolingual", "HARASSMENT", ["CYBERSTALKING"], "HIGH", "single_message", 0.94, "clear"),
        ("Neenu belagge 8 gantege hostel inda horage bandiddu naanu nodidini.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "CYBERSTALKING", [], "HIGH", "single_message", 0.95, "clear"),
        ("Ninna mane hatra bandu nintidini, horage barlilla andre hodedu haktini.", "kn-Latn", "Latin", "romanized_kannada", "monolingual", "DIRECT_THREAT", ["CYBERSTALKING"], "URGENT_REVIEW", "single_message", 0.98, "clear"),
        ("Elladru sikku neenu, ninna kaalu kai muridu haktini.", "kn-Latn", "Latin", "romanized_kannada", "monolingual", "DIRECT_THREAT", [], "URGENT_REVIEW", "single_message", 0.98, "clear"),
        ("Ninna private photos nanna hatra ide, helidante kelidre sari illa andre viral madtini.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "BLACKMAIL", ["NON_CONSENSUAL_IMAGE_THREAT", "COERCION"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("Ninna video na family whatsapp group alli haktini, takshana call madu.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "NON_CONSENSUAL_IMAGE_THREAT", ["BLACKMAIL", "COERCION"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("20000 rupees duddu kalisu, illa andre ninna nude photo leak madtini.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "FINANCIAL_EXTORTION", ["BLACKMAIL", "NON_CONSENSUAL_IMAGE_THREAT"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("Nale sanje olage cash kodlilla andre ninna office alli ellargu helibidtini.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "FINANCIAL_EXTORTION", ["BLACKMAIL"], "URGENT_REVIEW", "single_message", 0.97, "clear"),
        ("Ratri obbale iruvaga video call madu, ninna body nodbeku.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "SEXUAL_HARASSMENT", [], "HIGH", "single_message", 0.97, "clear"),
        ("Nanna jote lodge ge barlilla andre ninna morph madida photo share madtini.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "COERCION", ["SEXUAL_HARASSMENT", "NON_CONSENSUAL_IMAGE_THREAT"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("Naanu cyber crime police matadtidini, ninna mele case ide, fine kattu.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "IMPERSONATION_OR_SOCIAL_ENGINEERING", ["FINANCIAL_EXTORTION"], "HIGH", "single_message", 0.95, "clear"),
        ("Ninna phone number mattu address social media alli haki maana tegeetini.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "OTHER_ABUSE", ["BLACKMAIL", "HARASSMENT"], "HIGH", "single_message", 0.95, "clear"),
        ("Ninnanna summane bidalla nodko.", "kn-Latn", "Latin", "romanized_kannada", "monolingual", "DIRECT_THREAT", ["HARASSMENT"], "MODERATE", "single_message", 0.78, "ambiguous"),
        ("Ninna account block aagatte, takshana OTP kalisu.", "kn-Latn", "Latin", "romanized_kannada", "code_mixed", "IMPERSONATION_OR_SOCIAL_ENGINEERING", [], "MODERATE", "single_message", 0.93, "clear"),

        # ==========================================================
        # 3. KANNADA-ENGLISH CODE-MIXED (kn-en) — 20 samples
        # ==========================================================
        ("Please send the meeting notes, ನಾಳೆ ಬೆಳಗ್ಗೆ review ಮಾಡೋಣ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "BENIGN", [], "LOW", "single_message", 0.98, "clear"),
        ("I transferred lunch money via UPI, ದಯವಿಟ್ಟು check ಮಾಡಿ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "BENIGN", [], "LOW", "single_message", 0.97, "clear"),
        ("Don't forget to upload the college event photos, ಎಲ್ಲರೂ ಕಾಯುತ್ತಿದ್ದಾರೆ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "BENIGN", [], "LOW", "single_message", 0.95, "clear"),
        ("You are such an idiot, ನಿನಗೆ ಸ್ವಲ್ಪ ಕೂಡ sense ಇಲ್ಲ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "INSULT", [], "LOW", "single_message", 0.92, "clear"),
        ("Stop acting like a loser, ನಿನ್ನ ಮುಖ ನೋಡೋಕೆ ಅಸಹ್ಯ ಆಗುತ್ತೆ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "INSULT", ["HARASSMENT"], "MODERATE", "single_message", 0.90, "clear"),
        ("I will keep messaging you every night, ನೀನು block ಮಾಡಿದರೂ ಹೊಸ account ಇಂದ ಬರ್ತೀನಿ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "HARASSMENT", ["CYBERSTALKING"], "HIGH", "single_message", 0.96, "clear"),
        ("I saw you at Indiranagar metro at 7 PM, ನಾನು ನಿನ್ನನ್ನು follow ಮಾಡ್ತಾ ಇದ್ದೀನಿ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "CYBERSTALKING", [], "HIGH", "single_message", 0.97, "clear"),
        ("If you don't reply right now, ನಾನು ನಿನ್ನ ಮನೆಗೆ ಬಂದು ಹೊಡೆಯುತ್ತೇನೆ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "DIRECT_THREAT", [], "URGENT_REVIEW", "single_message", 0.98, "clear"),
        ("Pay 25000 rupees within 24 hours, ಇಲ್ಲದಿದ್ದರೆ ನಿನ್ನ private photos leak ಮಾಡುತ್ತೇನೆ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "FINANCIAL_EXTORTION", ["BLACKMAIL", "NON_CONSENSUAL_IMAGE_THREAT"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("I have your intimate video, ನನ್ನ ಜೊತೆ ಮಾತಾಡದಿದ್ದರೆ Instagram ನಲ್ಲಿ viral ಮಾಡುತ್ತೇನೆ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "NON_CONSENSUAL_IMAGE_THREAT", ["BLACKMAIL", "COERCION"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("Send me nude pics now, ಇಲ್ಲಾಂದ್ರೆ ನಿನ್ನ ಅಪ್ಪ ಅಮ್ಮನಿಗೆ ಎಲ್ಲಾ ಹೇಳಿಬಿಡ್ತೀನಿ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "COERCION", ["SEXUAL_HARASSMENT", "BLACKMAIL"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("You look so hot in that dress, ರಾತ್ರಿ ನನ್ನ ರೂಮ್ ಗೆ ಬಾ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "SEXUAL_HARASSMENT", [], "HIGH", "single_message", 0.95, "clear"),
        ("This is Cyber Crime Branch Bangalore, ನಿಮ್ಮ ಆಧಾರ್ ಮೇಲೆ arrest warrant ಇದೆ, stay on webcam.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "IMPERSONATION_OR_SOCIAL_ENGINEERING", ["COERCION"], "HIGH", "single_message", 0.97, "clear"),
        ("Delete your Instagram account immediately, ಇಲ್ಲದಿದ್ದರೆ ನಿನ್ನ address online ಹಾಕ್ತೀನಿ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "COERCION", ["OTHER_ABUSE", "BLACKMAIL"], "HIGH", "single_message", 0.96, "clear"),
        ("I will ruin your career and reputation, ನಿನಗೆ ತಕ್ಕ ಪಾಠ ಕಲಿಸ್ತೀನಿ.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "BLACKMAIL", ["DIRECT_THREAT"], "HIGH", "single_message", 0.92, "clear"),
        ("Ninna every Instagram story naanu track madta idini, you cannot hide from me.", "kn-en", "Latin", "romanized_kannada", "code_mixed", "CYBERSTALKING", ["HARASSMENT"], "HIGH", "single_message", 0.95, "clear"),
        ("Pay 10000 via GPay right now illa andre ninna morphed photos ella friends ge kalsbitini.", "kn-en", "Latin", "romanized_kannada", "code_mixed", "FINANCIAL_EXTORTION", ["NON_CONSENSUAL_IMAGE_THREAT", "BLACKMAIL"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("Neenu police ge complaint madidre ninna family ge trouble agatte, be careful.", "kn-en", "Latin", "romanized_kannada", "code_mixed", "COERCION", ["DIRECT_THREAT"], "HIGH", "single_message", 0.94, "clear"),
        ("Hey, coffee kudiyona? Free idre call madu.", "kn-en", "Latin", "romanized_kannada", "code_mixed", "BENIGN", [], "LOW", "single_message", 0.97, "clear"),
        ("Why are you ignoring my calls, ಸುಮ್ಮನೆ reply ಮಾಡು.", "kn-en", "Mixed", "unicode_plus_latin", "code_mixed", "HARASSMENT", [], "MODERATE", "single_message", 0.79, "ambiguous"),

        # ==========================================================
        # 4. HINDI DEVANAGARI (hi) — 20 samples
        # ==========================================================
        ("कल सुबह 10 बजे मीटिंग है, कृपया समय पर जुड़ें।", "hi", "Devanagari", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.99, "clear"),
        ("कृपया प्रोजेक्ट की तस्वीरें टीम ग्रुप में साझा करें।", "hi", "Devanagari", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.95, "clear"),
        ("मैंने दोपहर के खाने के पैसे यूपीआई से भेज दिए हैं।", "hi", "Devanagari", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.97, "clear"),
        ("मैं पुलिस स्टेशन के पास वाले मेट्रो गेट पर इंतज़ार कर रहा हूँ।", "hi", "Devanagari", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.96, "clear"),
        ("तुम बिल्कुल बेवकूफ और नालायक इंसान हो।", "hi", "Devanagari", "none", "monolingual", "INSULT", [], "LOW", "single_message", 0.93, "clear"),
        ("तुम्हारी कोई औकात नहीं है, घटिया सोच के आदमी हो तुम।", "hi", "Devanagari", "none", "monolingual", "INSULT", ["HARASSMENT"], "MODERATE", "single_message", 0.91, "clear"),
        ("मैं रोज़ तुम्हें मैसेज करके जीना हराम कर दूँगा, ब्लॉक करने से कुछ नहीं होगा।", "hi", "Devanagari", "none", "monolingual", "HARASSMENT", ["CYBERSTALKING"], "HIGH", "single_message", 0.96, "clear"),
        ("आज सुबह तुम साढ़े आठ बजे ऑफिस के लिए निकली थीं, मैंने तुम्हें देखा है।", "hi", "Devanagari", "none", "monolingual", "CYBERSTALKING", [], "HIGH", "single_message", 0.95, "clear"),
        ("तुम्हारे घर के बाहर खड़ा हूँ, अगर बाहर नहीं आई तो जान से मार दूँगा।", "hi", "Devanagari", "none", "monolingual", "DIRECT_THREAT", ["CYBERSTALKING"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("जहाँ भी मिलोगी, तेज़ाब फेंक दूँगा या हाथ-पैर तोड़ दूँगा।", "hi", "Devanagari", "none", "monolingual", "DIRECT_THREAT", [], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("तुम्हारी निजी तस्वीरें मेरे पास हैं, मेरी बात नहीं मानी तो सबको भेज दूँगा।", "hi", "Devanagari", "none", "monolingual", "BLACKMAIL", ["NON_CONSENSUAL_IMAGE_THREAT", "COERCION"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("तुम्हारा वीडियो परिवार के व्हाट्सएप ग्रुप में वायरल कर दूँगा, तुरंत कॉल करो।", "hi", "Devanagari", "none", "monolingual", "NON_CONSENSUAL_IMAGE_THREAT", ["BLACKMAIL", "COERCION"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("पचास हज़ार रुपये तुरंत भेजो वरना तुम्हारी गंदी फोटो इंटरनेट पर डाल दूँगा।", "hi", "Devanagari", "none", "monolingual", "FINANCIAL_EXTORTION", ["BLACKMAIL", "NON_CONSENSUAL_IMAGE_THREAT"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("कल शाम तक पैसे नहीं दिए तो तुम्हारे दफ्तर में सबको सच बता दूँगा।", "hi", "Devanagari", "none", "monolingual", "FINANCIAL_EXTORTION", ["BLACKMAIL"], "URGENT_REVIEW", "single_message", 0.97, "clear"),
        ("रात को अकेले में वीडियो कॉल करो, मुझे तुम्हारा शरीर देखना है।", "hi", "Devanagari", "none", "monolingual", "SEXUAL_HARASSMENT", [], "HIGH", "single_message", 0.98, "clear"),
        ("अगर होटल में मिलने नहीं आई तो तुम्हारी मॉर्फ की हुई तस्वीरें लीक कर दूँगा।", "hi", "Devanagari", "none", "monolingual", "COERCION", ["SEXUAL_HARASSMENT", "NON_CONSENSUAL_IMAGE_THREAT"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("मैं साइबर क्राइम ब्रांच से इंस्पेक्टर बोल रहा हूँ, आपके खिलाफ डिजिटल अरेस्ट वारंट है।", "hi", "Devanagari", "none", "monolingual", "IMPERSONATION_OR_SOCIAL_ENGINEERING", ["COERCION"], "HIGH", "single_message", 0.97, "clear"),
        ("तुम्हारा फोन नंबर और घर का पता ऑनलाइन डालकर तुम्हें बदनाम कर दूँगा।", "hi", "Devanagari", "none", "monolingual", "OTHER_ABUSE", ["BLACKMAIL", "HARASSMENT"], "HIGH", "single_message", 0.96, "clear"),
        ("तुम्हें तो मैं देख लूँगा, याद रखना।", "hi", "Devanagari", "none", "monolingual", "DIRECT_THREAT", ["HARASSMENT"], "MODERATE", "single_message", 0.80, "ambiguous"),
        ("आपका बैंक खाता बंद होने वाला है, तुरंत ओटीपी साझा करें।", "hi", "Devanagari", "none", "monolingual", "IMPERSONATION_OR_SOCIAL_ENGINEERING", [], "MODERATE", "single_message", 0.94, "clear"),

        # ==========================================================
        # 5. HINGLISH (hi-Latn) — 20 samples
        # ==========================================================
        ("Kal subah 10 baje office meeting hai, please time pe join karna.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "BENIGN", [], "LOW", "single_message", 0.98, "clear"),
        ("Maine lunch ke paise UPI kar diye hain, check kar lena.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "BENIGN", [], "LOW", "single_message", 0.96, "clear"),
        ("College fest ki photos drive pe upload kar do, sab maang rahe hain.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "BENIGN", [], "LOW", "single_message", 0.95, "clear"),
        ("Main police station ke paas metro gate pe wait kar raha hoon.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "BENIGN", [], "LOW", "single_message", 0.95, "clear"),
        ("Tu bilkul bewakoof aur ghatiya insaan hai, dimaag nahi hai tere paas.", "hi-Latn", "Latin", "romanized_hindi", "monolingual", "INSULT", [], "LOW", "single_message", 0.94, "clear"),
        ("Teri koi aukaat nahi hai chutiya, bakwas band kar apni.", "hi-Latn", "Latin", "romanized_hindi", "monolingual", "INSULT", ["HARASSMENT"], "MODERATE", "single_message", 0.93, "clear"),
        ("Roz message karunga tujhe, jitna block karna hai kar le, naye number se aaunga.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "HARASSMENT", ["CYBERSTALKING"], "HIGH", "single_message", 0.96, "clear"),
        ("Aaj subah 8:30 pe tu metro se nikli thi na, maine sab dekha hai.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "CYBERSTALKING", [], "HIGH", "single_message", 0.95, "clear"),
        ("Tere ghar ke bahar khada hoon, bahar nahi aayi toh jaan se maar dunga.", "hi-Latn", "Latin", "romanized_hindi", "monolingual", "DIRECT_THREAT", ["CYBERSTALKING"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("Jahan milegi wahin haath pair tod dunga, bach ke dikhana.", "hi-Latn", "Latin", "romanized_hindi", "monolingual", "DIRECT_THREAT", [], "URGENT_REVIEW", "single_message", 0.98, "clear"),
        ("Teri private photos mere paas hain, meri baat nahi maani toh sabko bhej dunga.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "BLACKMAIL", ["NON_CONSENSUAL_IMAGE_THREAT", "COERCION"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("Tera video family whatsapp group pe viral kar dunga, abhi call utha.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "NON_CONSENSUAL_IMAGE_THREAT", ["BLACKMAIL", "COERCION"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("50000 rupees abhi transfer kar warna teri nude photo leak kar dunga.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "FINANCIAL_EXTORTION", ["BLACKMAIL", "NON_CONSENSUAL_IMAGE_THREAT"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("Kal shaam tak cash nahi diya toh tere office mein sabko dikha dunga.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "FINANCIAL_EXTORTION", ["BLACKMAIL"], "URGENT_REVIEW", "single_message", 0.97, "clear"),
        ("Raat ko akele video call kar, tera figure dekhna hai.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "SEXUAL_HARASSMENT", [], "HIGH", "single_message", 0.97, "clear"),
        ("Agar hotel nahi aayi toh teri morphed photos Instagram pe daal dunga.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "COERCION", ["SEXUAL_HARASSMENT", "NON_CONSENSUAL_IMAGE_THREAT"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("Main Cyber Crime Inspector Sharma bol raha hoon, aapke naam pe arrest warrant hai.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "IMPERSONATION_OR_SOCIAL_ENGINEERING", ["COERCION"], "HIGH", "single_message", 0.97, "clear"),
        ("Tera phone number aur address online daal ke barbaad kar dunga tujhe.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "OTHER_ABUSE", ["BLACKMAIL", "HARASSMENT"], "HIGH", "single_message", 0.96, "clear"),
        ("Tujhe toh main dekh lunga, yaad rakhna.", "hi-Latn", "Latin", "romanized_hindi", "monolingual", "DIRECT_THREAT", ["HARASSMENT"], "MODERATE", "single_message", 0.79, "ambiguous"),
        ("Aapka KYC expire ho gaya hai, account bachane ke liye OTP bhejo.", "hi-Latn", "Latin", "romanized_hindi", "code_mixed", "IMPERSONATION_OR_SOCIAL_ENGINEERING", [], "MODERATE", "single_message", 0.93, "clear"),

        # ==========================================================
        # 6. ENGLISH (en) — 20 samples
        # ==========================================================
        ("The team meeting is scheduled for 10 AM tomorrow, please join on time.", "en", "Latin", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.99, "clear"),
        ("Please share the conference photos in the shared drive folder.", "en", "Latin", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.96, "clear"),
        ("I have transferred my share of the lunch money via UPI.", "en", "Latin", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.97, "clear"),
        ("I am waiting near the police station bus stop.", "en", "Latin", "none", "monolingual", "BENIGN", [], "LOW", "single_message", 0.96, "clear"),
        ("You are completely clueless and pathetic at your job.", "en", "Latin", "none", "monolingual", "INSULT", [], "LOW", "single_message", 0.93, "clear"),
        ("Stop acting like a total idiot, nobody respects you here.", "en", "Latin", "none", "monolingual", "INSULT", ["HARASSMENT"], "MODERATE", "single_message", 0.91, "clear"),
        ("No matter how many accounts you block, I will keep messaging you every single day.", "en", "Latin", "none", "monolingual", "HARASSMENT", ["CYBERSTALKING"], "HIGH", "single_message", 0.97, "clear"),
        ("I know you live at Flat 402 and I saw you leave for work at 8:30 AM today.", "en", "Latin", "none", "monolingual", "CYBERSTALKING", [], "HIGH", "single_message", 0.98, "clear"),
        ("I am standing outside your apartment, come out or I will hurt you badly.", "en", "Latin", "none", "monolingual", "DIRECT_THREAT", ["CYBERSTALKING"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("I will find you and break your bones if you ever speak up again.", "en", "Latin", "none", "monolingual", "DIRECT_THREAT", [], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("I have your private photos and will send them to your parents unless you obey me.", "en", "Latin", "none", "monolingual", "BLACKMAIL", ["NON_CONSENSUAL_IMAGE_THREAT", "COERCION"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("I am going to leak your intimate videos to all your Instagram followers tonight.", "en", "Latin", "none", "monolingual", "NON_CONSENSUAL_IMAGE_THREAT", ["BLACKMAIL"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("Pay 0.5 BTC within 24 hours or your private photos will be circulated online.", "en", "Latin", "none", "monolingual", "FINANCIAL_EXTORTION", ["BLACKMAIL", "NON_CONSENSUAL_IMAGE_THREAT"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("Send 50000 rupees to this account by tonight or I will ruin your family reputation.", "en", "Latin", "none", "monolingual", "FINANCIAL_EXTORTION", ["BLACKMAIL"], "URGENT_REVIEW", "single_message", 0.98, "clear"),
        ("Send me explicit pictures right now, I want to see your body on video call.", "en", "Latin", "none", "monolingual", "SEXUAL_HARASSMENT", ["COERCION"], "HIGH", "single_message", 0.98, "clear"),
        ("Delete your social media accounts immediately and meet me alone or I will post your morphed images.", "en", "Latin", "none", "monolingual", "COERCION", ["NON_CONSENSUAL_IMAGE_THREAT", "BLACKMAIL"], "URGENT_REVIEW", "single_message", 0.99, "clear"),
        ("This is Cyber Crime Branch Inspector Sharma, a digital arrest warrant is issued, keep your webcam on.", "en", "Latin", "none", "monolingual", "IMPERSONATION_OR_SOCIAL_ENGINEERING", ["COERCION"], "HIGH", "single_message", 0.98, "clear"),
        ("I am posting your home address and phone number on public forums so everyone harasses you.", "en", "Latin", "none", "monolingual", "OTHER_ABUSE", ["HARASSMENT", "CYBERSTALKING"], "HIGH", "single_message", 0.97, "clear"),
        ("You will regret this, just wait and watch.", "en", "Latin", "none", "monolingual", "DIRECT_THREAT", ["HARASSMENT"], "MODERATE", "single_message", 0.80, "ambiguous"),
        ("Your bank account will be suspended today, reply with your OTP to verify.", "en", "Latin", "none", "monolingual", "IMPERSONATION_OR_SOCIAL_ENGINEERING", [], "MODERATE", "single_message", 0.94, "clear"),
    ]

    records = [_make_record(i + 1, *row) for i, row in enumerate(raw)]

    # Verify zero duplicate texts
    texts = [r["text"].strip().lower() for r in records]
    assert len(texts) == len(set(texts)), "Duplicate texts found in dataset!"

    return records


def main() -> None:
    out_dir = Path(__file__).resolve().parent
    splits_dir = out_dir / "splits"
    splits_dir.mkdir(parents=True, exist_ok=True)

    records = build_records()

    # Write locked evaluation test set (all 120 samples are held-out evaluation benchmark)
    eval_path = out_dir / "safeher_eval_v1.jsonl"
    test_path = splits_dir / "test.jsonl"
    with eval_path.open("w", encoding="utf-8") as f_eval, test_path.open("w", encoding="utf-8") as f_test:
        for rec in records:
            line = json.dumps(rec, ensure_ascii=False) + "\n"
            f_eval.write(line)
            f_test.write(line)

    def _sha256(path: Path) -> str:
        return hashlib.sha256(path.read_bytes()).hexdigest()

    lang_counts = Counter(r["language"] for r in records)
    script_counts = Counter(r["script"] for r in records)
    cat_counts = Counter(r["primary_category"] for r in records)
    all_label_counts = Counter(lbl for r in records for lbl in r["labels"])
    sev_counts = Counter(r["severity"] for r in records)

    manifest = {
        "dataset_name": "SafeHER Multilingual Digital Abuse & Threat Evaluation Benchmark",
        "version": "1.0.0",
        "total_samples": len(records),
        "is_synthetic": True,
        "contains_real_survivor_data": False,
        "contains_pii": False,
        "license": "CC0-1.0 (SafeHER Synthetic Evaluation Benchmark)",
        "taxonomy": TAXONOMY,
        "counts_by_language": dict(lang_counts),
        "counts_by_script": dict(script_counts),
        "counts_by_primary_category": dict(cat_counts),
        "counts_by_all_labels": dict(all_label_counts),
        "counts_by_severity": dict(sev_counts),
        "splits": {
            "test": {
                "path": "splits/test.jsonl",
                "count": len(records),
                "sha256": _sha256(test_path),
                "purpose": "Locked held-out multilingual evaluation benchmark (never used for training)",
            }
        },
        "eval_file": {
            "path": "safeher_eval_v1.jsonl",
            "count": len(records),
            "sha256": _sha256(eval_path),
        },
    }

    manifest_path = out_dir / "dataset_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Built {len(records)} evaluation records. Languages: {dict(lang_counts)}")


if __name__ == "__main__":
    main()
