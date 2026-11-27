"""
SafeHER Multilingual Context-Aware Threat Classifier
====================================================
Combines genuine neural inference from licensed pretrained checkpoints
(Hate-speech-CNERG/indic-abusive-allInOne-MuRIL + unitary/toxic-bert +
optional Hate-speech-CNERG/deoffxlmr-mono-kannada) with a clean-room,
context-aware 12-category multilingual threat taxonomy.
"""

from __future__ import annotations

import re
import time
from typing import Any, Dict, List, Optional, Tuple

from ai.nlp.model_loader import get_nlp_pipeline
from ai.nlp.model_registry import MODEL_REGISTRY
from ai.nlp.schemas import (
    THREAT_CATEGORIES,
    LanguageDetectionResult,
    ModelPredictionBundle,
)

# Benign everyday contexts that prevent false positives on words like "money", "photos", "police"
_BENIGN_CONTEXT_RE = re.compile(
    r"(meeting|presentation|project|conference|college|fest|lunch|dinner|coffee|bus\s*stand|bus\s*stop|metro\s*gate|"
    r"ಸಭೆ|ಪ್ರಾಜೆಕ್ಟ್|ಊಟದ|ಬಸ್ ನಿಲ್ದಾಣ|मीटिंग|प्रोजेक्ट|दोपहर के खाने|मेट्रो गेट|कॉफ़ी)",
    re.IGNORECASE,
)

# Conditional / coercive / threat-consequence markers
_COERCIVE_CONSEQUENCE_RE = re.compile(
    r"(or\s+else|unless|otherwise|if\s+you\s+don['’]?t|lest|"
    r"ಇಲ್ಲದಿದ್ದರೆ|ಇಲ್ಲಾಂದ್ರೆ|ಬರದಿದ್ದರೆ|ಕೊಡದಿದ್ದರೆ|ಕೇಳದಿದ್ದರೆ|ಮಾಡದಿದ್ದರೆ|ಹಾಕುತ್ತೇನೆ|ಕಳುಹಿಸುತ್ತೇನೆ|ವೈರಲ್|"
    r"illa\s*andre|illandre|barlilla\s*andre|kodlilla\s*andre|kelidre|"
    r"वरना|नहीं\s+तो|नहीं\s+आई\s+तो|नहीं\s+दिए\s+तो|नहीं\s+मानी\s+तो|"
    r"warna|varna|nahi\s+toh|nahi\s+aayi\s+toh|nahi\s+maani\s+toh|nahi\s+diya\s+toh)",
    re.IGNORECASE,
)

_PATTERNS: Dict[str, List[Tuple[str, re.Pattern[str]]]] = {
    "NON_CONSENSUAL_IMAGE_THREAT": [
        ("intimate/private media + leak/share/viral", re.compile(
            r"(private|intimate|nude|explicit|morphed?|gandi|ಖಾಸಗಿ|ಮಾರ್ಫ್|निजी|गंदी|मॉर्फ).{0,60}"
            r"(photo|pic|image|video|clip|ಫೋಟೋ|ಚಿತ್ರ|ವಿಡಿಯೋ|तस्वीर|फोटो|वीडियो).{0,80}"
            r"(leak|viral|circulate|post|share|send|upload|daal|bhej|ಲೀಕ್|ವೈರಲ್|ಹಂಚು|ಹಾಕು|ಕಳುಹಿಸು|लीक|वायरल|डाल|भेज)",
            re.IGNORECASE,
        )),
        ("media + family/social group + threat", re.compile(
            r"(photo|pic|video|ಫೋಟೋ|ವಿಡಿಯೋ|तस्वीर|फोटो|वीडियो).{0,80}"
            r"(family|parents|followers|instagram|whatsapp|group|ಕುಟುಂಬ|ಗುಂಪು|ಅಪ್ಪ\s*ಅಮ್ಮ|परिवार|व्हाट्सएप|ग्रुप|इंस्टाग्राम).{0,60}"
            r"(viral|leak|send|post|share|ಹಾಕುತ್ತೇನೆ|ಕಳುಹಿಸುತ್ತೇನೆ|haktini|kalsu|daal|bhej|वायरल|डाल)",
            re.IGNORECASE,
        )),
        ("direct leak/morph demand", re.compile(
            r"(leak\s+(your|thy|ninna|teri)|nude\s+photo\s+leak|morphed?\s+(photos?|images?)|"
            r"ಮಾರ್ಫ್\s*ಮಾಡಿದ\s*ಚಿತ್ರ|ನಿನ್ನ\s*ಖಾಸಗಿ\s*ಫೋಟೋ|निजी\s*तस्वीरें|मॉर्फ\s*की\s*हुई\s*तस्वीरें)",
            re.IGNORECASE,
        )),
    ],
    "FINANCIAL_EXTORTION": [
        ("monetary demand + coercive consequence", re.compile(
            r"(pay|send|transfer|give|cash|money|rupees|btc|crypto|usdt|gpay|fine|duddu|paise|paisa|ಹಣ|ರೂಪಾಯಿ|ಕೊಡು|ವರ್ಗಾವಣೆ|पैसे|रुपये|दे|भेजो|कट्टी|kattu).{0,90}"
            r"(or\s+else|within\s+\d+\s+hours|by\s+tonight|illa\s*andre|ಇಲ್ಲದಿದ್ದರೆ|वरना|warna|nahi\s+toh|leak|viral|expose|ruin|tell|ಹೇಳಿಬಿಡ್ತೀನಿ|ತಿಳಿಸುತ್ತೇನೆ|बता\s+दूँगा|डाल\s+दूँगा|ದೂರು|case|warrant|ವಾರೆಂಟ್)",
            re.IGNORECASE,
        )),
        ("currency/amount + deadline/threat", re.compile(
            r"(\b\d{3,}\s*(rupees|rs|inr|btc|usdt)?|\b0\.\d+\s*btc|ಸಾವಿರ\s*ರೂಪಾಯಿ|हज़ार\s*रुपये).{0,80}"
            r"(transfer|pay|send|cash|duddu|paise|ವರ್ಗಾವಣೆ|ಕೊಡು|ಕಲಿಸು|kalsu|भेजो|दीजिए|वरना|warna|illa\s*andre|ಇಲ್ಲದಿದ್ದರೆ|leak|viral|within)",
            re.IGNORECASE,
        )),
    ],
    "BLACKMAIL": [
        ("coercive exposure / ruin threat", re.compile(
            r"(obey\s+me|meri\s+baat|helidante|ಹೇಳಿದಂತೆ|expose|ruin\s+your|reputation|maana|ಮಾನ|ರಹಸ್ಯ|रूह|बदनाम|barbaad|secret|tell\s+your\s+parents|ಅಪ್ಪ\s*ಅಮ್ಮನಿಗೆ|office\s+alli\s+ellargu|कಚೇರಿಯ\s+ಎಲ್ಲರಿಗೂ|दफ्तर\s+में\s+सबको|sabko\s+bhej)",
            re.IGNORECASE,
        )),
    ],
    "DIRECT_THREAT": [
        ("physical violence / death threat", re.compile(
            r"(kill\s+you|hurt\s+you|break\s+your\s+bones|acid|jaan\s+se\s+maar|haath\s+pair\s+tod|kaalu\s+kai\s+muridu|"
            r"hodedu\s+haktini|kolluthene|ಕೈಕಾಲು\s*ಮುರಿಯುತ್ತೇನೆ|ಹೊಡೆಯುತ್ತೇನೆ|ಬಿಡುವುದಿಲ್ಲ|ತಕ್ಕ\s*ಪಾಠ|"
            r"जान\s*से\s*मार|तेज़ाब|हाथ-पैर\s*तोड़|तुम्हें\s*देख\s*लूँगा)",
            re.IGNORECASE,
        )),
    ],
    "CYBERSTALKING": [
        ("surveillance / physical location tracking", re.compile(
            r"(saw\s+you\s+(leave|leaving|at)|standing\s+outside\s+your|know\s+you\s+live\s+at|track\s*madta|follow\s*ಮಾಡ್ತಾ|"
            r"ನೋಡಿದ್ದೇನೆ|ಮನೆ\s*ಎದುರು\s*ಬಂದು|mane\s*hatra\s*bandu|horage\s*bandiddu\s*naanu\s*nodidini|"
            r"घर\s*के\s*बाहर\s*खड़ा|मैंने\s*तुम्हें\s*देखा|nikli\s*thi|ghar\s*ke\s*bahar\s*khada|hide\s+from\s+me)",
            re.IGNORECASE,
        )),
    ],
    "SEXUAL_HARASSMENT": [
        ("sexual proposition / body demand", re.compile(
            r"(see\s+your\s+body|explicit\s+pictures|nude\s+pics|look\s+so\s+hot|video\s*call.{0,30}(body|figure|ದೇಹ|ಶರೀರ)|"
            r"ದೇಹ\s*ನೋಡಬೇಕು|ರೂಮ್\s*ಗೆ\s*ಬಾ|ಹೋಟೆಲ್\s*ಗೆ\s*ಬರದಿದ್ದರೆ|lodge\s+ge\s+barlilla|body\s+nodbeku|"
            r"शरीर\s*देखना|figure\s*dekhna|होटल\s*में\s*मिलने|hotel\s*nahi\s*aayi)",
            re.IGNORECASE,
        )),
    ],
    "COERCION": [
        ("forced compliance / account deletion / webcam", re.compile(
            r"(delete\s+your\s+(social\s+media|instagram|account)|meet\s+me\s+alone|keep\s+your\s+webcam\s+on|stay\s+on\s+webcam|"
            r"police\s+ge\s+complaint\s+madidre|ತಕ್ಷಣ\s*ನನಗೆ\s*ಕರೆ\s*ಮಾಡು|takshana\s*call\s*madu|abhi\s+call\s+utha|तुरंत\s*कॉल\s*करो)",
            re.IGNORECASE,
        )),
    ],
    "IMPERSONATION_OR_SOCIAL_ENGINEERING": [
        ("fake police / digital arrest / OTP phishing", re.compile(
            r"(digital\s+arrest|arrest\s+warrant|cyber\s+crime\s+(branch\s+)?inspector|cyber\s+crime\s+police|"
            r"ಸೈಬರ್\s*ಕ್ರೈಂ|ವಾರೆಂಟ್\s*ಇದೆ|ಒಟಿಪಿ\s*ಕಳುಹಿಸು|ಬ್ಯಾಂಕ್\s*ಖಾತೆ\s*ಬಂದ್|"
            r"साइबर\s*क्राइम|डिजिटल\s*अरेस्ट|वारंट|ओटीपी\s*साझा|बैंक\s*खाता\s*बंद|"
            r"otp\s*(to\s+verify|kalisu|bhejo)|kyc\s*expire|account\s*(will\s+be\s+suspended|block\s+aagatte))",
            re.IGNORECASE,
        )),
    ],
    "HARASSMENT": [
        ("persistent unwanted contact / block evasion", re.compile(
            r"(keep\s+messaging\s+you|every\s+single\s+day|every\s+night|block\s+ಮಾಡಿದರೂ|ಪ್ರತಿದಿನ\s*ನಿನಗೆ\s*ಮೆಸೇಜ್|"
            r"dinavu\s+ninage\s+message|ellige\s+hodru\s+ninnanna\s+bidalla|रोज़\s+तुम्हें\s+मैसेज|ब्लॉक\s+करने\s+से\s+कुछ\s+नहीं|"
            r"roz\s+message\s+karunga|naye\s+number\s+se\s+aaunga|ignoring\s+my\s+calls)",
            re.IGNORECASE,
        )),
    ],
    "OTHER_ABUSE": [
        ("doxxing / publishing address or phone", re.compile(
            r"(home\s+address\s+and\s+phone|address\s+online|phone\s+number\s+mattu\s+address|"
            r"ವಿಳಾಸ\s*ಮತ್ತು\s*ಫೋನ್\s*ನಂಬರ್|फोन\s*नंबर\s*और\s*घर\s*का\s*पता|phone\s+number\s+aur\s+address\s+online)",
            re.IGNORECASE,
        )),
    ],
    "INSULT": [
        ("profanity / personal insult", re.compile(
            r"\b(idiot|stupid|clueless|pathetic|loser|chutiya|madarchod|behenchod|bewakoof|ghatiya|aukaat|bakwas|nalayak|"
            r"moorkha|ayogya|buddi\s*ne\s+illa|sullu)\b|"
            r"(ಮೂರ್ಖ|ಸೋಮಾರಿ|ಅಯೋಗ್ಯ|ಅಸಹ್ಯ|बेवकूफ|नालायक|औकात|घटिया)",
            re.IGNORECASE,
        )),
    ],
}

_AMBIGUOUS_VEILED_RE = re.compile(
    r"^(you\s+will\s+regret\s+this|just\s+wait\s+and\s+watch|ನಿನ್ನನ್ನು\s+ನಾನು\s+ಸುಮ್ಮನೆ\s+ಬಿಡುವುದಿಲ್ಲ|"
    r"ninnanna\s+summane\s+bidalla|तुम्हें\s+तो\s+मैं\s+देख\s+लूँगा|tujhe\s+toh\s+main\s+dekh\s+lunga)",
    re.IGNORECASE,
)


def run_neural_models(text: str, lang_meta: LanguageDetectionResult) -> ModelPredictionBundle:
    """
    Executes genuine neural inference on approved pretrained checkpoints.
    """
    t0 = time.perf_counter()
    models_used: List[str] = []
    warnings: List[str] = []
    neural_abuse_score = 0.0
    toxic_bert_scores: Dict[str, float] = {}
    kannada_score: Optional[float] = None
    any_loaded = False

    # 1. Primary Multilingual Indic MuRIL model
    muril_pipe = get_nlp_pipeline("indic_abusive_muril")
    if muril_pipe is not None:
        any_loaded = True
        models_used.append(MODEL_REGISTRY["indic_abusive_muril"].model_id)
        try:
            raw = muril_pipe(text[:512])[0]
            scores = {item["label"]: float(item["score"]) for item in raw}
            neural_abuse_score = round(scores.get("LABEL_1", 0.0), 4)
        except Exception as exc:
            warnings.append(f"MuRIL inference warning: {exc}")
    else:
        warnings.append("Primary multilingual MuRIL checkpoint unavailable.")

    # 2. Preserved English Toxic-BERT (for English or code-mixed with English)
    if lang_meta.language in {"en", "kn-en", "hi-Latn", "kn-Latn"}:
        tb_pipe = get_nlp_pipeline("english_toxic_bert")
        if tb_pipe is not None:
            any_loaded = True
            models_used.append(MODEL_REGISTRY["english_toxic_bert"].model_id)
            try:
                raw_tb = tb_pipe(text[:512])[0]
                toxic_bert_scores = {item["label"].lower(): round(float(item["score"]), 4) for item in raw_tb}
            except Exception as exc:
                warnings.append(f"Toxic-BERT inference warning: {exc}")

    # 3. Kannada specialist model when Kannada is detected (optional, non-blocking)
    if lang_meta.language in {"kn", "kn-Latn", "kn-en"}:
        kn_pipe = get_nlp_pipeline("kannada_deoff_xlmr")
        if kn_pipe is not None:
            any_loaded = True
            models_used.append(MODEL_REGISTRY["kannada_deoff_xlmr"].model_id)
            try:
                raw_kn = kn_pipe(text[:512])[0]
                kn_map = {item["label"]: float(item["score"]) for item in raw_kn}
                kannada_score = round(
                    sum(v for k, v in kn_map.items() if k not in {"Not_offensive", "Not_in_intended_language"}),
                    4,
                )
            except Exception as exc:
                warnings.append(f"Kannada XLM-R inference warning: {exc}")

    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    return ModelPredictionBundle(
        primary_model_id=MODEL_REGISTRY["indic_abusive_muril"].model_id,
        primary_model_version=MODEL_REGISTRY["indic_abusive_muril"].version,
        models_used=models_used,
        neural_abuse_score=neural_abuse_score,
        toxic_bert_scores=toxic_bert_scores,
        kannada_model_score=kannada_score,
        model_available=any_loaded,
        warnings=warnings,
        inference_time_ms=elapsed_ms,
    )


def classify_threat_categories(
    text: str,
    lang_meta: LanguageDetectionResult,
    model_bundle: ModelPredictionBundle,
) -> Tuple[List[str], Dict[str, float], List[str], bool]:
    """
    Classifies text into SafeHER's 12-label taxonomy with benign-context guards
    and neural fusion. Returns (predicted_categories, category_scores,
    observable_features, is_ambiguous).
    """
    scores: Dict[str, float] = {cat: 0.0 for cat in THREAT_CATEGORIES}
    observable_features: List[str] = []

    if not lang_meta.supported_language:
        return [], scores, [], False

    has_benign_context = bool(_BENIGN_CONTEXT_RE.search(text))
    has_coercion_marker = bool(_COERCIVE_CONSEQUENCE_RE.search(text))

    for category, rules in _PATTERNS.items():
        for feat_label, pat in rules:
            if pat.search(text):
                # Guard against false positives on benign messages
                if has_benign_context and not has_coercion_marker and category in {
                    "FINANCIAL_EXTORTION",
                    "NON_CONSENSUAL_IMAGE_THREAT",
                    "BLACKMAIL",
                }:
                    continue
                scores[category] = max(scores[category], 0.88)
                observable_features.append(f"{category}: {feat_label}")

    # Incorporate neural signals from MuRIL, Toxic-BERT, and Kannada XLM-R
    muril_s = model_bundle.neural_abuse_score
    tb_toxic = model_bundle.toxic_bert_scores.get("toxic", 0.0)
    tb_threat = model_bundle.toxic_bert_scores.get("threat", 0.0)
    tb_insult = model_bundle.toxic_bert_scores.get("insult", 0.0)
    kn_s = model_bundle.kannada_model_score or 0.0

    if tb_threat >= 0.5:
        scores["DIRECT_THREAT"] = max(scores["DIRECT_THREAT"], tb_threat)
        observable_features.append(f"Toxic-BERT threat={tb_threat:.2f}")
    if tb_insult >= 0.5 or tb_toxic >= 0.6:
        scores["INSULT"] = max(scores["INSULT"], max(tb_insult, tb_toxic))
        observable_features.append(f"Toxic-BERT insult/toxic={max(tb_insult, tb_toxic):.2f}")

    max_indic_neural = max(muril_s, kn_s)
    if max_indic_neural >= 0.55 and not (has_benign_context and not has_coercion_marker):
        # Neural abusive signal boosts INSULT/HARASSMENT if no higher-order threat already matched
        if max(scores[c] for c in THREAT_CATEGORIES if c != "BENIGN") < 0.5:
            scores["HARASSMENT"] = max(scores["HARASSMENT"], round(max_indic_neural, 4))
            observable_features.append(f"Indic neural abuse={max_indic_neural:.2f}")

    # Ambiguity check for veiled threats
    is_ambiguous = bool(_AMBIGUOUS_VEILED_RE.search(text.strip()))
    if is_ambiguous:
        scores["DIRECT_THREAT"] = max(scores["DIRECT_THREAT"], 0.62)
        observable_features.append("Veiled/ambiguous threat phrasing")

    predicted = [cat for cat in THREAT_CATEGORIES if cat != "BENIGN" and scores[cat] >= 0.5]
    if not predicted:
        scores["BENIGN"] = round(max(0.55, 1.0 - max(max_indic_neural, tb_toxic, 0.0)), 4)
        predicted = ["BENIGN"]
    else:
        scores["BENIGN"] = round(max(0.0, 1.0 - max(scores[c] for c in predicted)), 4)

    return predicted, {k: round(v, 4) for k, v in scores.items()}, sorted(set(observable_features)), is_ambiguous
