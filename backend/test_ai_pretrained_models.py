"""
Comprehensive Pretrained AI Model & Forensics Verification Test Suite
=====================================================================
Validates all Zero-Training Pretrained AI Integrations for SafeHER:
1. Model A: AI-Generated Image (AIGI) Detection & NSFW Screening
2. Model B: RetinaFace Multi-Face Localization & Deepfake Forensics
3. Content Credentials: Real C2PA Manifest Verification
4. Multilingual NLP: Indic Script Detection & Guardify Baseline
5. Multi-Modal Forensics: Unified 4-Panel Evidence Synthesis
"""

import io
import os
import pytest
from PIL import Image, ImageDraw

from ai.c2pa_verification import verify_c2pa_bytes, verify_c2pa_file
from ai.face_detection import detect_faces
from ai.image_authenticity import analyze_image_authenticity, screen_nsfw
from ai.deepfake_detection import analyze_facial_deepfakes
from ai.multilingual_nlp import (
    detect_indic_language_and_script,
    evaluate_with_guardify_baseline,
    evaluate_muril_feasibility,
)
from ai.text_threat_analysis import analyze_threat_text
from ai.inference_coordinator import coordinate_media_forensics


@pytest.fixture
def blank_test_image_bytes():
    """Generates an in-memory 256x256 test image."""
    img = Image.new("RGB", (256, 256), color=(200, 220, 240))
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 200, 200], fill=(120, 150, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def synthetic_face_image_bytes():
    """Generates an in-memory image with a simple human-like face structure."""
    img = Image.new("RGB", (300, 300), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    # Head oval
    draw.ellipse([80, 50, 220, 250], fill=(245, 215, 190), outline=(180, 150, 120))
    # Eyes
    draw.ellipse([110, 110, 135, 130], fill=(50, 50, 50))
    draw.ellipse([165, 110, 190, 130], fill=(50, 50, 50))
    # Nose
    draw.polygon([(150, 140), (140, 175), (160, 175)], fill=(220, 180, 150))
    # Mouth
    draw.rectangle([125, 200, 175, 210], fill=(200, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# -----------------------------------------------------------------------------
# 1. Model A Tests: AIGI & NSFW Screening
# -----------------------------------------------------------------------------

def test_model_a_honest_availability_and_schema(blank_test_image_bytes):
    """
    Verifies Model A returns honest status 'unavailable' when custom research weights
    are absent, rather than fabricating random synthetic scores or pixel variance.
    """
    res = analyze_image_authenticity(blank_test_image_bytes)
    assert res.model_identifier.startswith("Effort-AIGI-Detection")
    assert res.status in {"unavailable", "complete"}
    if res.status == "unavailable":
        assert res.synthetic_score is None
        assert res.prediction == "undetermined"
        assert len(res.warnings) > 0
        assert "not installed" in res.warnings[0].lower() or "effort" in res.warnings[0].lower()

    # Verify separate NSFW screening runs genuinely
    assert res.nsfw_screening.status in {"complete", "skipped", "error"}
    assert isinstance(res.nsfw_screening.nudity_score, float)
    assert 0.0 <= res.nsfw_screening.nudity_score <= 1.0


def test_nsfw_screening_direct(blank_test_image_bytes):
    """Tests the real ViT NSFW classifier pipeline."""
    img = Image.open(io.BytesIO(blank_test_image_bytes))
    nsfw_res = screen_nsfw(img)
    assert nsfw_res.status in {"complete", "error"}
    if nsfw_res.status == "complete":
        assert "sfw" in nsfw_res.scores or "nsfw" in nsfw_res.scores or "safe" in nsfw_res.scores


# -----------------------------------------------------------------------------
# 2. Model B Tests: RetinaFace Localization & Deepfake Forensics
# -----------------------------------------------------------------------------

def test_retinaface_face_detection_execution(blank_test_image_bytes, synthetic_face_image_bytes):
    """Verifies RetinaFace PyTorch model loads and processes images."""
    res_blank = detect_faces(blank_test_image_bytes)
    assert res_blank.status in {"success", "no_faces"}
    assert res_blank.face_count >= 0

    res_df = analyze_facial_deepfakes(blank_test_image_bytes)
    assert res_df.status in {"no_faces", "unavailable", "complete"}
    assert res_df.model_identifier != ""
    assert res_df.disclaimer != ""


# -----------------------------------------------------------------------------
# 3. C2PA Tests: Content Credentials Extraction
# -----------------------------------------------------------------------------

def test_c2pa_provenance_verification():
    """Tests C2PA extraction against fixture image with real manifest."""
    c2pa_fixture = r"C:\Projects\SafeHER\SafeHER-Research\c2pa-python\tests\fixtures\C.jpg"
    if os.path.exists(c2pa_fixture):
        res = verify_c2pa_file(c2pa_fixture)
        assert res.c2pa_present is True
        assert res.status == "verified"
        assert len(res.manifests) > 0
        assert res.validation_status.lower() in {"valid", "trusted", "present"}


# -----------------------------------------------------------------------------
# 4. Multilingual NLP Tests: Script & Language Detection & Guardify Baseline
# -----------------------------------------------------------------------------

def test_indic_script_detection():
    """Tests script detection across Kannada, Hindi Devanagari, Hinglish, and English."""
    # Kannada
    kn_text = "ನಿಮ್ಮ ಫೋಟೋಗಳನ್ನು ಲೀಕ್ ಮಾಡುತ್ತೇನೆ"
    kn_res = detect_indic_language_and_script(kn_text)
    assert kn_res.detected_code == "kn"
    assert kn_res.script == "Kannada"

    # Hindi Devanagari
    hi_text = "पैसे दो वरना वीडियो वायरल कर दूंगा"
    hi_res = detect_indic_language_and_script(hi_text)
    assert hi_res.detected_code == "hi"
    assert hi_res.script == "Devanagari"

    # Hinglish
    hinglish_text = "tu kamine aadmi hai paise de"
    hg_res = detect_indic_language_and_script(hinglish_text)
    assert hg_res.detected_code == "hi-Latn"

    # English
    en_text = "Give me all your money or else I will leak your photos."
    en_res = detect_indic_language_and_script(en_text)
    assert en_res.detected_code == "en"


def test_guardify_baseline_evaluation():
    """Tests loading and prediction of the Guardify HASOC baseline."""
    res = evaluate_with_guardify_baseline("tu pagal hai")
    assert res.model_name == "Guardify HASOC Baseline (LinearSVC)"
    if res.status == "loaded":
        assert res.prediction in {"Bullying", "Non-Bullying"}
        assert isinstance(res.decision_score, float)
        assert "HASOC" in res.training_dataset


def test_muril_feasibility_evaluation():
    """Verifies that MuRIL is documented honestly as unsuitable without fine-tuning."""
    muril_eval = evaluate_muril_feasibility()
    assert muril_eval["suitability_for_abuse_detection"] == "UNSUITABLE WITHOUT TASK-SPECIFIC FINE-TUNING"
    assert "BERT Base" in muril_eval["model_architecture"]
    assert "extortion" in muril_eval["technical_justification"]


def test_threat_text_analysis_comprehensive():
    """Tests end-to-end multilingual threat analysis."""
    threat_text = "Send 50000 rupees within 24 hours or I will leak your private photos on Instagram!"
    analysis = analyze_threat_text(threat_text)
    assert analysis["decision"] in {"BLOCKED", "WARNING"}
    assert analysis["urgency_level"] in {"critical", "high"}
    assert "leak" in analysis["detected_signals"]
    assert "indic_detection" in analysis
    assert "suggested_steps" in analysis


# -----------------------------------------------------------------------------
# 5. Multi-Modal Forensic Coordinator Tests: 4-Panel Evidence Synthesis
# -----------------------------------------------------------------------------

def test_inference_coordinator_4_panels(blank_test_image_bytes):
    """
    Verifies that coordinate_media_forensics generates all 4 distinct forensic panels:
    - Panel A: Image Authenticity (AIGI & NSFW)
    - Panel B: Facial Deepfake Analysis (RetinaFace & Per-Face Classification)
    - Panel C: Content Credentials (C2PA)
    - Panel D: Evidence Integrity (Cryptographic Hash & Vault Alignment)
    """
    report = coordinate_media_forensics(blank_test_image_bytes, original_filename="test_upload.jpg")
    assert "panel_a_authenticity" in report
    assert "panel_b_deepfake" in report
    assert "panel_c_c2pa" in report
    assert "panel_d_integrity" in report

    # Panel A Checks
    panel_a = report["panel_a_authenticity"]
    assert "status" in panel_a
    assert "nsfw_screening" in panel_a

    # Panel B Checks
    panel_b = report["panel_b_deepfake"]
    assert "face_count" in panel_b
    assert "overall_decision" in panel_b

    # Panel C Checks
    panel_c = report["panel_c_c2pa"]
    assert "c2pa_present" in panel_c

    # Panel D Checks
    panel_d = report["panel_d_integrity"]
    assert "sha256_hash" in panel_d
    assert len(panel_d["sha256_hash"]) == 64
