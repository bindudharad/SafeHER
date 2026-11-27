"""
SafeHER Digital Forensics Metadata, Magic-Byte & Perceptual Hash Service
========================================================================
Integrates three permissively licensed open-source forensic libraries:
1. filetype (h2non/filetype.py, MIT) - magic-byte file type & MIME verification
2. ExifRead (ianare/exif-py, BSD-3-Clause) - EXIF/TIFF/GPS metadata extraction
3. ImageHash (JohannesBuchner/imagehash, BSD-2-Clause) - perceptual hashing (pHash, dHash, aHash)

All analysis runs in-memory on decrypted evidence bytes; no plaintext is written to disk.
"""

from __future__ import annotations

import hashlib
import io
import os
from typing import Any, Dict, List, Optional

import exifread
import filetype
import imagehash
from PIL import Image, UnidentifiedImageError


_EXTENSION_MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".bmp": "image/bmp",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".txt": "text/plain",
}


def detect_magic_filetype(content: bytes, filename: Optional[str] = None, claimed_mime: Optional[str] = None) -> Dict[str, Any]:
    """
    Verifies actual file format via magic bytes (filetype.guess) and compares
    against the claimed filename extension / MIME type to flag spoofing.
    """
    kind = filetype.guess(content)
    detected_mime = kind.mime if kind else None
    detected_ext = f".{kind.extension}" if kind else None

    claimed_ext = os.path.splitext((filename or "").lower())[1] or None
    expected_mime = _EXTENSION_MIME_MAP.get(claimed_ext) if claimed_ext else None

    mismatch = False
    mismatch_reason = None
    if detected_mime:
        if claimed_mime and claimed_mime.lower() != "application/octet-stream":
            norm_claimed = "image/jpeg" if claimed_mime.lower() == "image/jpg" else claimed_mime.lower()
            if norm_claimed != detected_mime.lower():
                mismatch = True
                mismatch_reason = f"Claimed MIME '{claimed_mime}' does not match magic-byte MIME '{detected_mime}'."
        if not mismatch and expected_mime and expected_mime != detected_mime.lower():
            mismatch = True
            mismatch_reason = f"Filename extension '{claimed_ext}' does not match magic-byte format '{detected_mime}'."

    return {
        "detected_mime": detected_mime,
        "detected_extension": detected_ext,
        "claimed_extension": claimed_ext,
        "claimed_mime": claimed_mime,
        "extension_mismatch": mismatch,
        "mismatch_reason": mismatch_reason,
    }


def extract_exif_metadata(content: bytes) -> Dict[str, Any]:
    """
    Extracts structured EXIF/TIFF metadata using ExifRead without loading binary MakerNote blobs.
    """
    tags_summary: Dict[str, str] = {}
    gps_present = False
    try:
        tags = exifread.process_file(io.BytesIO(content), details=False)
        interesting_keys = {
            "Image Make": "camera_make",
            "Image Model": "camera_model",
            "Image Software": "software",
            "Image DateTime": "file_datetime",
            "EXIF DateTimeOriginal": "captured_at",
            "EXIF DateTimeDigitized": "digitized_at",
            "EXIF ExifImageWidth": "exif_width",
            "EXIF ExifImageLength": "exif_height",
            "Image Orientation": "orientation",
        }
        for raw_key, out_key in interesting_keys.items():
            if raw_key in tags:
                tags_summary[out_key] = str(tags[raw_key]).strip()

        gps_present = any(k.startswith("GPS ") for k in tags.keys())
        return {
            "exif_present": len(tags) > 0,
            "tag_count": len(tags),
            "gps_present": gps_present,
            "fields": tags_summary,
        }
    except Exception as exc:
        return {
            "exif_present": False,
            "tag_count": 0,
            "gps_present": False,
            "fields": {},
            "error": str(exc),
        }


def compute_perceptual_hashes(content: bytes) -> Dict[str, Any]:
    """
    Computes perceptual hashes (pHash, dHash, aHash) for image evidence using ImageHash.
    Enables near-duplicate / recompressed evidence correlation across incidents.
    """
    try:
        with Image.open(io.BytesIO(content)) as img:
            rgb = img.convert("RGB")
            phash = str(imagehash.phash(rgb))
            dhash = str(imagehash.dhash(rgb))
            ahash = str(imagehash.average_hash(rgb))
            return {
                "available": True,
                "width": img.width,
                "height": img.height,
                "format": img.format,
                "mode": img.mode,
                "phash": phash,
                "dhash": dhash,
                "ahash": ahash,
            }
    except (UnidentifiedImageError, OSError):
        return {
            "available": False,
            "reason": "Payload is not a supported raster image.",
        }


def compute_phash_similarity(hash_a: str, hash_b: str) -> Dict[str, Any]:
    """
    Computes Hamming distance and normalized similarity (0.0-1.0) between two 64-bit hex perceptual hashes.
    """
    h1 = imagehash.hex_to_hash(hash_a)
    h2 = imagehash.hex_to_hash(hash_b)
    distance = int(h1 - h2)
    max_bits = len(h1.hash.flatten())
    similarity = max(0.0, round(1.0 - (distance / max_bits), 4)) if max_bits > 0 else 0.0
    return {
        "hamming_distance": distance,
        "similarity": similarity,
        "is_near_duplicate": distance <= 10,
    }


def analyze_evidence_metadata(
    content: bytes,
    filename: Optional[str] = None,
    claimed_mime: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Full in-memory forensic metadata inspection for uploaded or stored evidence.
    """
    sha256_hex = hashlib.sha256(content).hexdigest()
    magic = detect_magic_filetype(content, filename=filename, claimed_mime=claimed_mime)
    exif = extract_exif_metadata(content)
    perceptual = compute_perceptual_hashes(content)

    warnings: List[str] = []
    if magic["extension_mismatch"] and magic["mismatch_reason"]:
        warnings.append(magic["mismatch_reason"])
    if exif.get("gps_present"):
        warnings.append("Embedded GPS metadata detected in image EXIF; handle location data with survivor privacy care.")
    if not exif.get("exif_present") and (magic.get("detected_mime") or "").startswith("image/"):
        warnings.append("No EXIF metadata present (common for screenshots and social-media downloads).")

    return {
        "sha256": sha256_hex,
        "byte_size": len(content),
        "file_type": magic,
        "exif": exif,
        "perceptual_hashes": perceptual,
        "warnings": warnings,
    }
