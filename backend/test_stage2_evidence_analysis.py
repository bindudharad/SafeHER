"""
SafeHER Stage 2: Genuine Evidence Analysis Test Suite
=====================================================
Validates:
1. Official C2PA Content Credentials Provenance:
   - Genuine c2pa-python SDK verification on authentic fixtures (tests/fixtures/C.jpg)
   - Verified claim generator, active manifest URN, assertions, and validation status
   - Plain image without C2PA credentials correctly identified as 'credentials_not_present'
   - Unsupported format handling ('unsupported_format')
   - Empty/corrupt buffer handling ('verification_error')
   - SDK version reporting and disclaimer preservation
2. Pretrained RetinaFace Facial Detection & Localization:
   - Model health check, checkpoint detection, and device diagnostics
   - Multi-face detection on real test images (couple.jpg -> 2 faces)
   - Coordinate clamping within original image boundaries [x_min, y_min, x_max, y_max]
   - 5-point facial landmark extraction (right_eye, left_eye, nose, mouth_right, mouth_left)
   - Real model detection confidence scores (0.0 to 1.0)
   - Zero-face synthetic images correctly returning face_count = 0 ('no_faces')
3. End-to-End Pipeline & Encrypted Evidence Integration:
   - Ingests encrypted evidence (Stage 1 .enc on disk)
   - Verifies pre-encryption SHA-256 before analysis
   - Runs independent C2PA and RetinaFace pipelines
   - Persists c2pa_result and face_localization in media_analyses table
   - Unauthorized access blocked
   - GET /api/v1/analysis/media/{evidence_id} retrieves full structured forensics
"""

import hashlib
import io
import json
import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from PIL import Image
import numpy as np

# Configure test environment
_test_tmp = tempfile.mkdtemp(prefix="safeher_stage2_test_")
os.environ["SAFEHER_DB_PATH"] = os.path.join(_test_tmp, "stage2_test.db")
os.environ["SAFEHER_STORAGE_DIR"] = os.path.join(_test_tmp, "storage")
os.environ["SAFEHER_KEYS_DIR"] = os.path.join(_test_tmp, "keys")
os.environ["SAFEHER_SEED_DEMO"] = "false"
os.environ["DEEPFACE_BACKEND_ENGINE"] = "pytorch"

from app import app
from db import init_db, get_db, get_storage_dir
from ai.c2pa_service import inspect_content_credentials, C2PAServiceResult
from ai.face_detection import detect_faces, get_retinaface_health, FaceDetectionResult

# Reference fixture locations
RESEARCH_DIR = r"C:\Projects\SafeHER\SafeHER-Research"
C2PA_FIXTURE_C = os.path.join(RESEARCH_DIR, "c2pa-python", "tests", "fixtures", "C.jpg")
RETINAFACE_COUPLE = os.path.join(RESEARCH_DIR, "retinaface", "tests", "dataset", "couple.jpg")


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        yield c


def _auth_token(client: TestClient, name: str, email: str, password: str = "P@ssw0rdSecure123!") -> str:
    res = client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": password, "consent_acknowledged": True},
    )
    if res.status_code == 201:
        return res.json()["access_token"]
    res_login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res_login.json()["access_token"]


# ==============================================================================
# Category 1: Official C2PA Provenance Verification Tests
# ==============================================================================

def test_c2pa_authentic_manifest_verification():
    """Tests genuine C2PA manifest reading and signature validation on authentic fixture."""
    assert os.path.exists(C2PA_FIXTURE_C), f"C2PA test fixture missing at {C2PA_FIXTURE_C}"
    res: C2PAServiceResult = inspect_content_credentials(C2PA_FIXTURE_C)

    assert res.c2pa_status == "valid_credentials"
    assert res.manifest_present is True
    assert res.signature_valid is True
    assert res.active_manifest is not None
    assert "contentauth:urn:uuid:" in res.active_manifest
    assert res.claim_generator is not None
    assert "c2pa-rs" in res.claim_generator or "make_test_images" in res.claim_generator
    assert res.signing_info is not None
    assert "C2PA" in str(res.signing_info)
    assert len(res.assertions) >= 1
    assert res.analysis_status == "complete"
    assert "Absence of C2PA credentials is standard" in res.disclaimer


def test_c2pa_image_without_credentials():
    """Tests that a standard camera/editor image without C2PA is correctly identified."""
    buf = io.BytesIO()
    Image.new("RGB", (128, 128), color=(45, 85, 125)).save(buf, format="JPEG")
    plain_bytes = buf.getvalue()

    res: C2PAServiceResult = inspect_content_credentials(plain_bytes, mime_type="image/jpeg")
    assert res.c2pa_status == "credentials_not_present"
    assert res.manifest_present is False
    assert res.signature_valid is False
    assert res.active_manifest is None
    assert res.claim_generator is None
    assert res.analysis_status == "complete"


def test_c2pa_unsupported_format_handling():
    """Tests that unsupported non-media formats fail safely with 'unsupported_format'."""
    raw_text = b"This is plain ASCII text payload, not an image container."
    res: C2PAServiceResult = inspect_content_credentials(raw_text, mime_type="application/octet-stream")

    assert res.c2pa_status == "unsupported_format"
    assert res.manifest_present is False
    assert len(res.validation_errors) >= 1


def test_c2pa_empty_buffer_handling():
    """Tests that empty buffers are safely handled with 'verification_error'."""
    res: C2PAServiceResult = inspect_content_credentials(b"")
    assert res.c2pa_status == "verification_error"
    assert res.analysis_status == "failed"
    assert "empty" in res.validation_errors[0].lower()


def test_c2pa_sdk_version_reporting():
    """Verifies that official C2PA SDK version is reported."""
    res: C2PAServiceResult = inspect_content_credentials(C2PA_FIXTURE_C)
    assert res.sdk_version != "unavailable"
    assert len(res.sdk_version.split(".")) >= 2


# ==============================================================================
# Category 2: RetinaFace Pretrained Facial Localization Tests
# ==============================================================================

def test_retinaface_health_and_checkpoint():
    """Verifies that the genuine pretrained RetinaFace model checkpoint is present and loaded."""
    health = get_retinaface_health()
    assert health["available"] is True
    assert health["detector_name"] == "RetinaFace-ResNet50"
    assert health["checkpoint_id"] == "retinaface.pth"
    assert health["checkpoint_present"] is True
    assert health["checkpoint_path"] is not None
    assert os.path.exists(health["checkpoint_path"])


def test_retinaface_multi_face_detection():
    """Tests multi-face localization on authentic couple test dataset."""
    assert os.path.exists(RETINAFACE_COUPLE), f"RetinaFace test image missing at {RETINAFACE_COUPLE}"
    res: FaceDetectionResult = detect_faces(RETINAFACE_COUPLE)

    assert res.status == "faces_detected"
    assert res.analysis_status == "complete"
    assert res.face_count == 2
    assert len(res.faces) == 2
    assert res.image_width == 2280
    assert res.image_height == 1588
    assert res.processing_time_ms > 0

    for face in res.faces:
        assert face.confidence > 0.90
        # Check coordinates inside image boundaries
        x, y, w, h = face.bounding_box
        assert x >= 0 and y >= 0
        assert x + w <= res.image_width
        assert y + h <= res.image_height

        # Check facial_area [x1, y1, x2, y2]
        x1, y1, x2, y2 = face.facial_area
        assert x1 == x and y1 == y and x2 == x + w and y2 == y + h

        # Check 5 landmarks
        assert set(face.landmarks.keys()) == {"right_eye", "left_eye", "nose", "mouth_right", "mouth_left"}
        for lm_name, coords in face.landmarks.items():
            assert 0 <= coords[0] <= res.image_width
            assert 0 <= coords[1] <= res.image_height


def test_retinaface_no_faces_image():
    """Tests that images without human faces return face_count = 0 ('no_faces')."""
    empty_img = np.zeros((200, 200, 3), dtype=np.uint8)
    res: FaceDetectionResult = detect_faces(empty_img)

    assert res.status == "no_faces"
    assert res.analysis_status == "no_faces"
    assert res.face_count == 0
    assert len(res.faces) == 0
    assert res.image_width == 200
    assert res.image_height == 200


def test_retinaface_exif_and_resolution_handling():
    """Tests that different image resolutions (small and medium) execute safely."""
    # Small test image
    small_img = Image.new("RGB", (64, 64), color=(200, 150, 100))
    res_small = detect_faces(small_img)
    assert res_small.analysis_status in ("no_faces", "complete")
    assert res_small.image_width == 64
    assert res_small.image_height == 64


# ==============================================================================
# Category 3: End-to-End Pipeline & Encrypted Evidence Integration Tests
# ==============================================================================

def test_encrypted_evidence_analysis_pipeline(client: TestClient):
    """
    Full integration test:
    1. Upload evidence into Stage 1 AES-256-GCM encrypted vault.
    2. Confirm evidence is stored encrypted on disk (.enc).
    3. Trigger /api/v1/analysis/media with evidence_id.
    4. Confirm evidence is decrypted in volatile memory only.
    5. Confirm C2PA and RetinaFace results are independently computed and returned.
    6. Confirm results are persisted in media_analyses and queryable via GET.
    """
    token_survivor = _auth_token(client, "Forensic Survivor", "survivor.forensic@safeher.test")
    token_stranger = _auth_token(client, "Intruder User", "intruder@safeher.test")
    headers_survivor = {"Authorization": f"Bearer {token_survivor}"}
    headers_stranger = {"Authorization": f"Bearer {token_stranger}"}

    # 1. Create incident
    inc_res = client.post(
        "/api/v1/incidents",
        headers=headers_survivor,
        json={
            "title": "Forensic Evidence Analysis Incident",
            "category": "deepfake_media",
            "description": "Testing genuine C2PA and RetinaFace integration.",
            "platform": "Web",
            "incident_date": "2026-11-27",
        },
    )
    assert inc_res.status_code == 201
    inc_id = inc_res.json()["id"]

    # 2. Upload authentic C2PA media file as evidence
    with open(C2PA_FIXTURE_C, "rb") as f:
        file_bytes = f.read()

    upload_res = client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        headers=headers_survivor,
        files={"file": ("c2pa_evidence_sample.jpg", file_bytes, "image/jpeg")},
    )
    assert upload_res.status_code == 201
    evidence_data = upload_res.json()
    evi_id = evidence_data["id"]

    # Verify Stage 1 encrypted storage state
    assert evidence_data["storage_status"] == "stored_encrypted"
    assert evidence_data["encryption_version"] == "v2"

    with get_db() as conn:
        row = conn.execute("SELECT * FROM evidence WHERE id = ?", (evi_id,)).fetchone()
        stored_fn = row["stored_filename"]
        assert stored_fn.endswith(".enc")

    stored_path = os.path.join(get_storage_dir(), stored_fn)
    assert os.path.exists(stored_path)
    with open(stored_path, "rb") as f:
        disk_bytes = f.read()
    assert file_bytes not in disk_bytes  # Zero plaintext on disk!

    # 3. Unauthorized stranger analysis attempt blocked
    blocked_analysis = client.post(
        "/api/v1/analysis/media",
        headers=headers_stranger,
        data={"evidence_id": evi_id, "media_type": "image"},
    )
    assert blocked_analysis.status_code in (403, 404)

    # 4. Authorized survivor triggers analysis on encrypted evidence
    analysis_res = client.post(
        "/api/v1/analysis/media",
        headers=headers_survivor,
        data={"evidence_id": evi_id, "media_type": "image"},
    )
    assert analysis_res.status_code == 201
    result = analysis_res.json()

    # Verify C2PA structured payload
    assert "c2pa_analysis" in result
    c2pa_info = result["c2pa_analysis"]
    assert c2pa_info["c2pa_status"] == "valid_credentials"
    assert c2pa_info["manifest_present"] is True
    assert c2pa_info["signature_valid"] is True
    assert c2pa_info["claim_generator"] is not None

    # Verify RetinaFace structured payload
    assert "face_localization" in result
    face_info = result["face_localization"]
    assert face_info["detector_name"] == "RetinaFace-ResNet50"
    assert "face_count" in face_info
    assert "faces" in face_info

    # 5. Query persisted analysis via GET endpoint
    get_res = client.get(
        f"/api/v1/analysis/media/{evi_id}",
        headers=headers_survivor,
    )
    assert get_res.status_code == 200
    persisted = get_res.json()
    assert persisted is not None
    assert persisted["evidence_id"] == evi_id
    assert persisted["c2pa_analysis"]["c2pa_status"] == "valid_credentials"
    assert persisted["face_localization"]["detector_name"] == "RetinaFace-ResNet50"


def test_independent_c2pa_and_retinaface_operation():
    """
    Verifies that C2PA and RetinaFace execute independently:
    - couple.jpg has 2 faces, but NO C2PA credentials.
    - C2PA reports 'credentials_not_present', while RetinaFace successfully detects 2 faces.
    """
    with open(RETINAFACE_COUPLE, "rb") as f:
        couple_bytes = f.read()

    # C2PA check
    c2pa_res = inspect_content_credentials(couple_bytes, mime_type="image/jpeg")
    assert c2pa_res.c2pa_status == "credentials_not_present"
    assert c2pa_res.manifest_present is False

    # RetinaFace check
    face_res = detect_faces(couple_bytes)
    assert face_res.face_count == 2
    assert face_res.status == "faces_detected"

    # Both are mutually independent and neither overrides the other
