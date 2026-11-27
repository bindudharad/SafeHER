"""
SafeHER Official C2PA Provenance & Content Credentials Service
=============================================================
Cryptographic inspection of Content Credentials manifests powered by
the official c2pa-python SDK (Coalition for Content Provenance and Authenticity).

Replaces legacy byte-substring heuristics with genuine cryptographic
signature and claim validation.

Statuses:
1. 'valid_credentials': Manifest present, cryptographic signature and hashes verified.
2. 'invalid_credentials': Manifest present, but cryptographic signature or hash is broken/tampered.
3. 'credentials_not_present': No JUMBF/C2PA manifest found in container.
4. 'unsupported_format': Media format not supported by C2PA standard.
5. 'verification_error': I/O or manifest parsing exception.

IMPORTANT LEGAL & FORENSIC SAFEGUARDS:
- Absence of C2PA credentials is standard for messaging platforms and screenshots;
  it does NOT imply image manipulation or deception.
- Presence of C2PA credentials indicates traceable origin only if digital
  signatures are cryptographically valid.
"""

from __future__ import annotations

import datetime
import io
import json
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union

try:
    import c2pa
    C2PA_AVAILABLE = True
except ImportError:
    c2pa = None
    C2PA_AVAILABLE = False

DISCLAIMER_TEXT = (
    "Content Credentials (C2PA) establish digital provenance and editing history. "
    "Absence of C2PA credentials is standard across social media, messaging platforms, and screenshots, "
    "and does NOT imply manipulation or malice. "
    "Presence of credentials confirms authentic origin only if cryptographic signatures are valid."
)

SUPPORTED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
    "image/avif",
    "image/heic",
    "video/mp4",
    "video/quicktime",
    "audio/mp3",
    "audio/wav",
    "application/pdf",
}

EXTENSION_TO_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".avif": "image/avif",
    ".heic": "image/heic",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".mp3": "audio/mp3",
    ".wav": "audio/wav",
    ".pdf": "application/pdf",
}


@dataclass
class C2PAServiceResult:
    c2pa_status: str  # 'valid_credentials', 'invalid_credentials', 'credentials_not_present', 'unsupported_format', 'verification_error'
    manifest_present: bool
    signature_valid: bool
    active_manifest: Optional[str]
    claim_generator: Optional[str]
    title: Optional[str]
    format: Optional[str]
    ingredients: List[Dict[str, Any]]
    actions: List[Dict[str, Any]]
    assertions: List[Dict[str, Any]]
    signing_info: Dict[str, Any]
    validation_errors: List[str]
    validation_warnings: List[str]
    analysis_timestamp: str
    sdk_version: str
    analysis_status: str  # 'complete' | 'failed'
    disclaimer: str = DISCLAIMER_TEXT
    raw_manifest: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "c2pa_status": self.c2pa_status,
            "manifest_present": self.manifest_present,
            "signature_valid": self.signature_valid,
            "active_manifest": self.active_manifest,
            "claim_generator": self.claim_generator,
            "title": self.title,
            "format": self.format,
            "ingredients": self.ingredients,
            "actions": self.actions,
            "assertions": self.assertions,
            "signing_info": self.signing_info,
            "validation_errors": self.validation_errors,
            "validation_warnings": self.validation_warnings,
            "analysis_timestamp": self.analysis_timestamp,
            "sdk_version": self.sdk_version,
            "analysis_status": self.analysis_status,
            "disclaimer": self.disclaimer,
        }


def read_active_manifest(manifest_data: Dict[str, Any]) -> Tuple[Optional[str], Dict[str, Any]]:
    """Extracts the active manifest URN and dictionary from parsed manifest JSON."""
    active_label = manifest_data.get("active_manifest")
    manifests = manifest_data.get("manifests", {})
    if active_label and active_label in manifests:
        return active_label, manifests[active_label]
    if manifests:
        # Fallback to first available manifest if active_manifest key missing
        first_key = next(iter(manifests))
        return first_key, manifests[first_key]
    return active_label, {}


def extract_claim_information(active_manifest: Dict[str, Any]) -> Dict[str, Any]:
    """Extracts generator, title, format, and claim metadata from active manifest."""
    return {
        "claim_generator": active_manifest.get("claim_generator"),
        "title": active_manifest.get("title"),
        "format": active_manifest.get("format"),
        "instance_id": active_manifest.get("instance_id"),
        "claim_generator_info": active_manifest.get("claim_generator_info", []),
    }


def extract_ingredient_information(active_manifest: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extracts component parent / ingredient records used in creating the asset."""
    ingredients = []
    for ing in active_manifest.get("ingredients", []):
        ingredients.append({
            "title": ing.get("title"),
            "format": ing.get("format"),
            "relationship": ing.get("relationship"),
            "document_id": ing.get("document_id"),
            "instance_id": ing.get("instance_id"),
            "description": ing.get("description"),
            "validation_status": ing.get("validation_status", []),
        })
    return ingredients


def extract_actions_information(active_manifest: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extracts editing history actions (c2pa.actions)."""
    actions_list = []
    for assertion in active_manifest.get("assertions", []):
        label = assertion.get("label", "")
        if "c2pa.actions" in label:
            data = assertion.get("data", {})
            for act in data.get("actions", []):
                actions_list.append({
                    "action": act.get("action"),
                    "softwareAgent": act.get("softwareAgent"),
                    "when": act.get("when"),
                    "parameters": act.get("parameters"),
                })
    return actions_list


def validate_manifest_signature(
    reader: Any,
    manifest_data: Dict[str, Any],
) -> Tuple[bool, Optional[str], List[str], List[str]]:
    """
    Validates cryptographic signature and digests using SDK Reader validation APIs.
    Returns (signature_valid, validation_state, validation_errors, validation_warnings).
    """
    validation_state = str(getattr(reader, "get_validation_state", lambda: "Unknown")())
    is_valid_attr = getattr(reader, "is_valid", False)
    is_valid_val = bool(is_valid_attr()) if callable(is_valid_attr) else bool(is_valid_attr)

    validation_errors: List[str] = []
    validation_warnings: List[str] = []

    # Check top-level validation_status or validation_results from SDK JSON
    raw_status_list = manifest_data.get("validation_status", [])
    for st in raw_status_list:
        code = st.get("code", "")
        explanation = st.get("explanation", "")
        msg = f"{code}: {explanation}" if explanation else code
        if "untrusted" in code.lower() or "skipped" in code.lower() or "revocation" in code.lower():
            validation_warnings.append(msg)
        else:
            validation_errors.append(msg)

    # Signature is valid only if SDK reports valid AND no validation errors were recorded
    signature_valid = bool(
        (is_valid_val or validation_state.lower() == "valid")
        and validation_state.lower() != "invalid"
        and not validation_errors
    )
    if not signature_valid and not validation_errors:
        validation_errors.append(f"Validation state reported as '{validation_state}' by C2PA SDK.")

    return signature_valid, validation_state, validation_errors, validation_warnings


def normalize_c2pa_result(
    c2pa_status: str,
    manifest_present: bool = False,
    signature_valid: bool = False,
    active_manifest: Optional[str] = None,
    claim_generator: Optional[str] = None,
    title: Optional[str] = None,
    format_name: Optional[str] = None,
    ingredients: Optional[List[Dict[str, Any]]] = None,
    actions: Optional[List[Dict[str, Any]]] = None,
    assertions: Optional[List[Dict[str, Any]]] = None,
    signing_info: Optional[Dict[str, Any]] = None,
    validation_errors: Optional[List[str]] = None,
    validation_warnings: Optional[List[str]] = None,
    raw_manifest: Optional[Dict[str, Any]] = None,
    analysis_status: str = "complete",
) -> C2PAServiceResult:
    """Constructs a normalized, compliant C2PAServiceResult."""
    sdk_ver = c2pa.sdk_version() if (C2PA_AVAILABLE and hasattr(c2pa, "sdk_version")) else "unavailable"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    return C2PAServiceResult(
        c2pa_status=c2pa_status,
        manifest_present=manifest_present,
        signature_valid=signature_valid,
        active_manifest=active_manifest,
        claim_generator=claim_generator,
        title=title,
        format=format_name,
        ingredients=ingredients or [],
        actions=actions or [],
        assertions=assertions or [],
        signing_info=signing_info or {},
        validation_errors=validation_errors or [],
        validation_warnings=validation_warnings or [],
        analysis_timestamp=now_iso,
        sdk_version=sdk_ver,
        analysis_status=analysis_status,
        disclaimer=DISCLAIMER_TEXT,
        raw_manifest=raw_manifest,
    )


def inspect_content_credentials(
    content_or_path: Union[bytes, str, io.IOBase],
    mime_type: Optional[str] = None,
) -> C2PAServiceResult:
    """
    Inspects Content Credentials using the official c2pa-python SDK.
    Accepts in-memory bytes, file path, or stream-like object.
    Never writes plaintext bytes to permanent storage.
    """
    if not C2PA_AVAILABLE:
        return normalize_c2pa_result(
            c2pa_status="verification_error",
            analysis_status="failed",
            validation_errors=["Official c2pa-python SDK is not available in the runtime environment."],
        )

    # 1. Resolve content stream and MIME type
    stream: io.IOBase
    detected_mime = mime_type

    if isinstance(content_or_path, str):
        if not os.path.exists(content_or_path):
            return normalize_c2pa_result(
                c2pa_status="verification_error",
                analysis_status="failed",
                validation_errors=[f"Target file does not exist: {content_or_path}"],
            )
        _, ext = os.path.splitext(content_or_path.lower())
        detected_mime = detected_mime or EXTENSION_TO_MIME.get(ext)
        try:
            with open(content_or_path, "rb") as f:
                stream = io.BytesIO(f.read())
        except Exception as exc:
            return normalize_c2pa_result(
                c2pa_status="verification_error",
                analysis_status="failed",
                validation_errors=[f"File read error: {exc}"],
            )
    elif isinstance(content_or_path, bytes):
        if not content_or_path:
            return normalize_c2pa_result(
                c2pa_status="verification_error",
                analysis_status="failed",
                validation_errors=["Input evidence buffer is empty."],
            )
        stream = io.BytesIO(content_or_path)
    elif isinstance(content_or_path, io.IOBase):
        stream = content_or_path
    else:
        return normalize_c2pa_result(
            c2pa_status="verification_error",
            analysis_status="failed",
            validation_errors=[f"Unsupported input type for C2PA inspection: {type(content_or_path)}"],
        )

    # Format fallback
    normalized_mime = (detected_mime or "image/jpeg").lower()

    # 2. Open C2PA Reader
    try:
        reader = c2pa.Reader(normalized_mime, stream)
    except Exception as exc:
        exc_str = str(exc)
        exc_type = type(exc).__name__

        # Check for ManifestNotFound
        if "ManifestNotFound" in exc_type or "no JUMBF data found" in exc_str:
            return normalize_c2pa_result(
                c2pa_status="credentials_not_present",
                manifest_present=False,
                signature_valid=False,
                format_name=normalized_mime,
            )

        # Check for NotSupported format
        if "NotSupported" in exc_type or "unsupported" in exc_str.lower():
            return normalize_c2pa_result(
                c2pa_status="unsupported_format",
                manifest_present=False,
                signature_valid=False,
                format_name=normalized_mime,
                validation_errors=[f"Container format '{normalized_mime}' is not supported by C2PA standard."],
            )

        # Other I/O or decode error
        return normalize_c2pa_result(
            c2pa_status="verification_error",
            analysis_status="failed",
            validation_errors=[f"C2PA Reader initialization failed: {exc_str}"],
        )

    # 3. Read and parse manifest
    try:
        with reader:
            manifest_json = reader.json()
            if not manifest_json or manifest_json.strip() == "{}":
                return normalize_c2pa_result(
                    c2pa_status="credentials_not_present",
                    manifest_present=False,
                    signature_valid=False,
                    format_name=normalized_mime,
                )

            manifest_data = json.loads(manifest_json)
            active_urn, active_dict = read_active_manifest(manifest_data)
            if not active_dict:
                return normalize_c2pa_result(
                    c2pa_status="credentials_not_present",
                    manifest_present=False,
                    signature_valid=False,
                    format_name=normalized_mime,
                )

            # Extract structured metadata
            claim_info = extract_claim_information(active_dict)
            ingredients = extract_ingredient_information(active_dict)
            actions = extract_actions_information(active_dict)
            assertions = [
                {"label": a.get("label", "unknown"), "data": a.get("data")}
                for a in active_dict.get("assertions", [])
            ]
            signing_info = active_dict.get("signature_info", {})

            # Validate signature
            is_valid, val_state, val_errors, val_warnings = validate_manifest_signature(reader, manifest_data)
            status_code = "valid_credentials" if is_valid else "invalid_credentials"

            return normalize_c2pa_result(
                c2pa_status=status_code,
                manifest_present=True,
                signature_valid=is_valid,
                active_manifest=active_urn,
                claim_generator=claim_info.get("claim_generator"),
                title=claim_info.get("title"),
                format_name=claim_info.get("format") or normalized_mime,
                ingredients=ingredients,
                actions=actions,
                assertions=assertions,
                signing_info=signing_info,
                validation_errors=val_errors,
                validation_warnings=val_warnings,
                raw_manifest=manifest_data,
            )

    except Exception as exc:
        return normalize_c2pa_result(
            c2pa_status="verification_error",
            analysis_status="failed",
            validation_errors=[f"Manifest reading failed: {exc}"],
        )
