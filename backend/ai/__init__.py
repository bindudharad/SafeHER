"""
SafeHER AI & Forensic Intelligence Package
==========================================
Modular AI inference services:
- C2PA Content Credentials Provenance
- RetinaFace Multi-Face Localization
- Model A: AI-Generated Image (AIGI) Detection
- Model B: Facial Deepfake Forensics
- Multilingual Text Threat Intelligence (Kannada/Hindi/English)
"""

from ai.c2pa_service import inspect_content_credentials, C2PAServiceResult
from ai.c2pa_verification import verify_c2pa_bytes, verify_c2pa_file, C2PAValidationResult
from ai.face_detection import detect_faces, FaceDetectionResult, DetectedFace
from ai.image_authenticity import analyze_image_authenticity, screen_nsfw, AIGIAnalysisResult
from ai.deepfake_detection import analyze_facial_deepfakes, DeepfakeAnalysisResult
from ai.text_threat_analysis import analyze_threat_text
from ai.multilingual_nlp import (
    detect_indic_language_and_script,
    evaluate_with_guardify_baseline,
    evaluate_muril_feasibility,
    GuardifyBaselineResult,
    IndicLanguageDetection,
)
from ai.inference_coordinator import coordinate_media_forensics

__all__ = [
    "verify_c2pa_bytes",
    "verify_c2pa_file",
    "C2PAValidationResult",
    "detect_faces",
    "FaceDetectionResult",
    "DetectedFace",
    "analyze_image_authenticity",
    "screen_nsfw",
    "AIGIAnalysisResult",
    "analyze_facial_deepfakes",
    "DeepfakeAnalysisResult",
    "analyze_threat_text",
    "detect_indic_language_and_script",
    "evaluate_with_guardify_baseline",
    "evaluate_muril_feasibility",
    "GuardifyBaselineResult",
    "IndicLanguageDetection",
    "coordinate_media_forensics",
]
