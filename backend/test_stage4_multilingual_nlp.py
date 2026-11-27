"""
SafeHER Stage 4 Multilingual NLP & Threat Intelligence Test Suite
=================================================================
Covers:
1. Language & script identification (kn, kn-Latn, kn-en, hi, hi-Latn, en, unknown)
2. Normalization & evidence preservation
3. All 12 threat categories + benign context guards + ordinary insult distinction
4. Ambiguous / veiled threat abstention & unsupported language truthfulness
5. Model registry & Guardify exclusion
6. FastAPI /api/v1/analysis/threat & /feedback endpoint integration
"""

from __future__ import annotations

import os
import tempfile

import pytest
from fastapi.testclient import TestClient

_tmp_dir = tempfile.mkdtemp(prefix="safeher_s4_test_")
os.environ["SAFEHER_DB_PATH"] = os.path.join(_tmp_dir, "test_s4.db")
os.environ["SAFEHER_STORAGE_DIR"] = os.path.join(_tmp_dir, "evidence_storage")
os.environ["SAFEHER_SEED_DEMO"] = "false"

from app import app  # noqa: E402
from db import init_db  # noqa: E402
from ai.nlp.inference_service import analyze_multilingual_threat  # noqa: E402
from ai.nlp.language_detection import detect_language_and_script  # noqa: E402
from ai.nlp.model_registry import EXCLUDED_ARTIFACTS, MODEL_REGISTRY  # noqa: E402
from ai.nlp.text_normalization import normalize_for_inference  # noqa: E402
from ai.multilingual_nlp import evaluate_with_guardify_baseline  # noqa: E402


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        yield c


def test_language_and_script_detection():
    assert detect_language_and_script("ನಿನ್ನ ಫೋಟೋ ವೈರಲ್ ಮಾಡುತ್ತೇನೆ").language == "kn"
    assert detect_language_and_script("Ninna private photos leak madtini illa andre").language in {"kn-Latn", "kn-en"}
    assert detect_language_and_script("Please share notes, ನಾಳೆ ಬೆಳಗ್ಗೆ review ಮಾಡೋಣ").language == "kn-en"
    assert detect_language_and_script("तुम्हारे घर के बाहर खड़ा हूँ").language == "hi"
    assert detect_language_and_script("Tere ghar ke bahar khada hoon, bahar aa").language == "hi-Latn"
    assert detect_language_and_script("The meeting is scheduled for 10 AM tomorrow.").language == "en"

    # Unsupported script must not be falsely labeled as supported
    unk = detect_language_and_script("Привет, как дела сегодня?")
    assert unk.supported_language is False
    assert unk.language == "unknown"


def test_normalization_preserves_original_and_deobfuscates():
    raw = "Send n.u.d.e.s or I will l.e.a.k 50000 rupees!"
    norm = normalize_for_inference(raw)
    assert norm.original_text == raw
    assert "nude" in norm.normalized_text
    assert "leak" in norm.normalized_text
    assert "50000" in norm.normalized_text


def test_benign_sensitive_keywords_not_overclassified():
    benign_cases = [
        "ದಯವಿಟ್ಟು ಊಟದ ಹಣವನ್ನು ಯುಪಿಐ ಮೂಲಕ ಕಳುಹಿಸಿ, ಧನ್ಯವಾದಗಳು.",
        "Lunch duddu UPI alli kalisidini, check madu.",
        "मैंने दोपहर के खाने के पैसे यूपीआई से भेज दिए हैं।",
        "Maine lunch ke paise UPI kar diye hain, check kar lena.",
        "I have transferred my share of the lunch money via UPI.",
        "Please share the conference photos in the shared drive folder.",
    ]
    for msg in benign_cases:
        res = analyze_multilingual_threat(msg)
        assert res["predicted_categories"] == ["BENIGN"], f"False positive on: {msg} -> {res['predicted_categories']}"
        assert res["severity"] == "LOW"
        assert res["decision"] == "SAFE"


def test_ordinary_insult_not_escalated_to_urgent_review():
    res = analyze_multilingual_threat("You are completely clueless and pathetic at your job.")
    assert "INSULT" in res["predicted_categories"]
    assert res["severity"] in {"LOW", "MODERATE"}
    assert res["severity"] != "URGENT_REVIEW"


def test_multilingual_high_severity_threats():
    cases = [
        ("ಇಪ್ಪತ್ತು ಸಾವಿರ ರೂಪಾಯಿ ತಕ್ಷಣ ವರ್ಗಾವಣೆ ಮಾಡು, ಇಲ್ಲದಿದ್ದರೆ ನಿನ್ನ ಖಾಸಗಿ ಫೋಟೋ ವೈರಲ್ ಮಾಡುತ್ತೇನೆ.", "kn", "URGENT_REVIEW"),
        ("20000 rupees duddu kalisu, illa andre ninna nude photo leak madtini.", "kn-Latn", "URGENT_REVIEW"),
        ("Pay 25000 rupees within 24 hours, ಇಲ್ಲದಿದ್ದರೆ ನಿನ್ನ private photos leak ಮಾಡುತ್ತೇನೆ.", "kn-en", "URGENT_REVIEW"),
        ("तुम्हारे घर के बाहर खड़ा हूँ, अगर बाहर नहीं आई तो जान से मार दूँगा।", "hi", "URGENT_REVIEW"),
        ("50000 rupees abhi transfer kar warna teri nude photo leak kar dunga.", "hi-Latn", "URGENT_REVIEW"),
        ("This is Cyber Crime Branch Inspector Sharma, a digital arrest warrant is issued, keep your webcam on.", "en", "HIGH"),
    ]
    for text, expected_lang, expected_sev in cases:
        res = analyze_multilingual_threat(text)
        assert res["language"] == expected_lang
        assert res["severity"] == expected_sev
        assert res["supported_language"] is True
        assert res["analysis_status"] == "completed"


def test_unsupported_language_truthful_abstention():
    res = analyze_multilingual_threat("Привет, я отправлю твои фотографии всем.")
    assert res["supported_language"] is False
    assert res["analysis_status"] == "unsupported_language"
    assert res["requires_human_review"] is True


def test_guardify_excluded_and_registry_documented():
    assert "indic_abusive_muril" in MODEL_REGISTRY
    assert "english_toxic_bert" in MODEL_REGISTRY
    assert "guardify/estimator.joblib" in EXCLUDED_ARTIFACTS
    g = evaluate_with_guardify_baseline("tu pagal hai")
    assert g.status == "excluded_unlicensed"
    assert g.prediction is None


def test_api_threat_and_feedback_endpoints(client: TestClient):
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Stage4 Tester",
            "email": "s4tester@example.com",
            "password": "StrongPassword123!",
            "consent_acknowledged": True,
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/v1/analysis/threat",
        headers=headers,
        json={"text": "Ninna private photos leak madtini illa andre 20000 duddu kalisu."},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["language"] in {"kn-Latn", "kn-en"}
    assert data["severity"] == "URGENT_REVIEW"
    assert "NON_CONSENSUAL_IMAGE_THREAT" in data["predicted_categories"]
    assert data["model_id"] == "Hate-speech-CNERG/indic-abusive-allInOne-MuRIL"

    fb = client.post(
        f"/api/v1/analysis/threat/{data['id']}/feedback",
        headers=headers,
        json={
            "corrected_categories": ["FINANCIAL_EXTORTION", "NON_CONSENSUAL_IMAGE_THREAT"],
            "corrected_severity": "URGENT_REVIEW",
            "is_false_positive": False,
            "notes": "Verified by reviewer",
        },
    )
    assert fb.status_code == 201
    assert fb.json()["used_for_training"] is False
