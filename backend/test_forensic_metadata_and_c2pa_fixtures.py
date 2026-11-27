"""
Tests for Stage 5+ Forensic Metadata, Magic-Byte Verification, Perceptual Hashing,
and Real C2PA Public Testfile Verification.
"""

from __future__ import annotations

import io
import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai.c2pa_service import C2PA_AVAILABLE, inspect_content_credentials
from app import app
from db import init_db
from forensics.metadata_service import (
    analyze_evidence_metadata,
    compute_perceptual_hashes,
    compute_phash_similarity,
    detect_magic_filetype,
    extract_exif_metadata,
)

PUBLIC_TESTFILES_SAMPLE = os.environ.get("SAFEHER_C2PA_PUBLIC_TESTFILE", "")


def _make_test_scene(color=(120, 45, 200), size=(128, 128)) -> Image.Image:
    from PIL import ImageDraw

    img = Image.new("RGB", size, color=color)
    draw = ImageDraw.Draw(img)
    w, h = size
    draw.rectangle([w // 8, h // 8, w * 7 // 8, h * 7 // 8], fill=(220, 180, 90))
    draw.ellipse([w // 4, h // 4, w * 3 // 4, h * 3 // 4], fill=(40, 90, 170))
    draw.polygon([(0, h), (w // 2, h // 3), (w, h)], fill=(180, 50, 70))
    draw.line([(0, 0), (w, h)], fill=(255, 255, 255), width=6)
    return img


def _make_png_bytes(color=(120, 45, 200), size=(128, 128)) -> bytes:
    buf = io.BytesIO()
    _make_test_scene(color=color, size=size).save(buf, format="PNG")
    return buf.getvalue()


def _make_jpeg_bytes(color=(120, 45, 200), size=(128, 128), quality=90) -> bytes:
    buf = io.BytesIO()
    _make_test_scene(color=color, size=size).save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


def test_magic_filetype_valid_and_spoofed():
    png_bytes = _make_png_bytes()
    res_valid = detect_magic_filetype(png_bytes, filename="evidence.png", claimed_mime="image/png")
    assert res_valid["detected_mime"] == "image/png"
    assert res_valid["detected_extension"] == ".png"
    assert res_valid["extension_mismatch"] is False

    # Spoofed extension: PNG bytes uploaded as .jpg
    res_spoof_ext = detect_magic_filetype(png_bytes, filename="disguised.jpg", claimed_mime="image/png")
    assert res_spoof_ext["extension_mismatch"] is True
    assert "does not match" in res_spoof_ext["mismatch_reason"]

    # Spoofed MIME: PNG bytes claiming application/pdf
    res_spoof_mime = detect_magic_filetype(png_bytes, filename="doc.png", claimed_mime="application/pdf")
    assert res_spoof_mime["extension_mismatch"] is True


def test_exif_metadata_extraction():
    png_bytes = _make_png_bytes()
    exif_res = extract_exif_metadata(png_bytes)
    assert exif_res["exif_present"] is False
    assert exif_res["gps_present"] is False


def test_perceptual_hashing_near_duplicate_and_distinct():
    # Use a real photographic image if configured, else a smooth non-wrapping gradient + blocks
    photo_path = os.environ.get("SAFEHER_SAMPLE_PHOTO_PATH", "")
    if photo_path and os.path.exists(photo_path):
        with Image.open(photo_path) as im:
            rgb = im.convert("RGB")
            buf1 = io.BytesIO()
            rgb.save(buf1, format="PNG")
            png_bytes = buf1.getvalue()
            buf2 = io.BytesIO()
            rgb.resize((rgb.width // 2, rgb.height // 2)).save(buf2, format="JPEG", quality=70)
            jpeg_recompressed = buf2.getvalue()
    else:
        png_bytes = _make_png_bytes(size=(128, 128))
        jpeg_recompressed = _make_jpeg_bytes(size=(128, 128), quality=75)

    h_png = compute_perceptual_hashes(png_bytes)
    h_jpg = compute_perceptual_hashes(jpeg_recompressed)
    assert h_png["available"] is True
    assert h_jpg["available"] is True

    sim_same = compute_phash_similarity(h_png["phash"], h_jpg["phash"])
    assert sim_same["is_near_duplicate"] is True
    assert sim_same["similarity"] >= 0.85

    # Distinct solid-opposite pattern
    other_img = Image.new("RGB", (128, 128), color=(10, 10, 10))
    for x in range(64, 128):
        for y in range(64, 128):
            other_img.putpixel((x, y), (250, 250, 250))
    buf = io.BytesIO()
    other_img.save(buf, format="PNG")
    h_other = compute_perceptual_hashes(buf.getvalue())
    sim_diff = compute_phash_similarity(h_png["phash"], h_other["phash"])
    assert sim_diff["hamming_distance"] > sim_same["hamming_distance"]


def test_forensic_metadata_endpoint_authenticated():
    init_db()
    client = TestClient(app)

    email_a = f"meta_a_{uuid.uuid4().hex[:8]}@example.com"
    email_b = f"meta_b_{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword!123"

    r_reg_a = client.post("/api/v1/auth/register", json={"email": email_a, "password": password, "name": "Meta User A", "consent_acknowledged": True})
    assert r_reg_a.status_code == 201
    token_a = r_reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    r_reg_b = client.post("/api/v1/auth/register", json={"email": email_b, "password": password, "name": "Meta User B", "consent_acknowledged": True})
    assert r_reg_b.status_code == 201
    token_b = r_reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Create incident
    r_inc = client.post(
        "/api/v1/incidents",
        json={
            "title": "Metadata Test Incident",
            "category": "deepfake_media",
            "description": "Testing forensic metadata endpoint",
            "platform": "WhatsApp",
            "incident_date": "2026-11-27",
        },
        headers=headers_a,
    )
    assert r_inc.status_code == 201
    inc_id = r_inc.json()["id"]

    # Upload PNG evidence
    png_bytes = _make_png_bytes()
    r_up = client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        files={"file": ("screenshot.png", png_bytes, "image/png")},
        headers=headers_a,
    )
    assert r_up.status_code == 201
    evi_id = r_up.json()["id"]

    # Owner retrieves forensic metadata
    r_meta = client.get(f"/api/v1/evidence/{evi_id}/metadata", headers=headers_a)
    assert r_meta.status_code == 200
    data = r_meta.json()
    assert data["evidence_id"] == evi_id
    assert data["file_type"]["detected_mime"] == "image/png"
    assert data["file_type"]["extension_mismatch"] is False
    assert data["perceptual_hashes"]["available"] is True
    assert len(data["perceptual_hashes"]["phash"]) == 16

    # Unauthorized user gets 404
    r_unauth = client.get(f"/api/v1/evidence/{evi_id}/metadata", headers=headers_b)
    assert r_unauth.status_code == 404


@pytest.mark.skipif(
    not (C2PA_AVAILABLE and os.path.exists(PUBLIC_TESTFILES_SAMPLE)),
    reason="c2pa-python or c2pa-org/public-testfiles fixture not available",
)
def test_c2pa_public_testfiles_real_manifest_and_tampering():
    with open(PUBLIC_TESTFILES_SAMPLE, "rb") as f:
        valid_bytes = f.read()

    res_valid = inspect_content_credentials(valid_bytes, mime_type="image/jpeg")
    assert res_valid.analysis_status == "complete"
    assert res_valid.manifest_present is True
    assert res_valid.active_manifest is not None
    assert res_valid.claim_generator is not None

    # Tamper with image pixel bytes near the end of the JPEG stream
    tampered = bytearray(valid_bytes)
    tampered[-100] ^= 0xFF
    tampered[-101] ^= 0xFF
    res_tampered = inspect_content_credentials(bytes(tampered), mime_type="image/jpeg")
    assert res_tampered.manifest_present is True
    assert res_tampered.signature_valid is False
    assert res_tampered.c2pa_status == "invalid_credentials"
