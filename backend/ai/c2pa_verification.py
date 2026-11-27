"""
SafeHER C2PA Content Credentials Provenance Engine
==================================================
Official Coalition for Content Provenance and Authenticity (C2PA) verification
powered by the c2pa-python SDK (Adobe / Content Authenticity Initiative).

Distinguishes:
- Verified: Valid C2PA manifest with authentic cryptographic signature
- Invalid: Manifest present but cryptographic signature or hash is broken
- Not Present: No C2PA manifest found in container
- Unsupported: Media container type not supported by C2PA specification
- Error: Parsing or stream read error

IMPORTANT: Missing C2PA credentials NEVER imply manipulation.
"""

from __future__ import annotations

import io
import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

try:
    import c2pa
    C2PA_AVAILABLE = True
except ImportError:
    c2pa = None
    C2PA_AVAILABLE = False


@dataclass
class C2PAValidationResult:
    status: str  # 'verified', 'invalid', 'not_present', 'unsupported', 'unavailable', 'error'
    has_manifest: bool
    is_valid: bool
    claim_generator: Optional[str]
    title: Optional[str]
    active_manifest: Optional[str]
    validation_state: Optional[str]
    validation_errors: List[str]
    assertions: List[Dict[str, Any]]
    disclaimer: str
    raw_manifest: Optional[Dict[str, Any]] = None

    @property
    def c2pa_present(self) -> bool:
        return self.has_manifest

    @property
    def validation_status(self) -> str:
        return self.validation_state or self.status

    @property
    def manifests(self) -> List[Any]:
        if self.raw_manifest and "manifests" in self.raw_manifest:
            return list(self.raw_manifest["manifests"].values())
        return [self.active_manifest] if self.active_manifest else []


def verify_c2pa_bytes(content: bytes, mime_type: str = "image/jpeg") -> C2PAValidationResult:
    """
    Validates C2PA Content Credentials directly from an in-memory byte buffer.
    Delegates to the official c2pa_service engine.
    """
    from ai.c2pa_service import inspect_content_credentials

    res = inspect_content_credentials(content, mime_type=mime_type)

    # Map c2pa_service statuses to C2PAValidationResult backward-compatible statuses
    status_map = {
        "valid_credentials": "verified",
        "invalid_credentials": "invalid",
        "credentials_not_present": "not_present",
        "unsupported_format": "unsupported",
        "verification_error": "error",
    }
    compat_status = status_map.get(res.c2pa_status, "error")

    return C2PAValidationResult(
        status=compat_status,
        has_manifest=res.manifest_present,
        is_valid=res.signature_valid,
        claim_generator=res.claim_generator,
        title=res.title,
        active_manifest=res.active_manifest,
        validation_state="Valid" if res.signature_valid else ("NoManifestFound" if not res.manifest_present else "Invalid"),
        validation_errors=res.validation_errors,
        assertions=res.assertions,
        disclaimer=res.disclaimer,
        raw_manifest=res.raw_manifest,
    )


def verify_c2pa_file(file_path: str, mime_type: Optional[str] = None) -> C2PAValidationResult:
    """Validates C2PA Content Credentials for a file path on disk."""
    if not os.path.exists(file_path):
        return C2PAValidationResult(
            status="error",
            has_manifest=False,
            is_valid=False,
            claim_generator=None,
            title=None,
            active_manifest=None,
            validation_state="FileNotFound",
            validation_errors=[f"File not found on disk: {file_path}"],
            assertions=[],
            disclaimer="File missing",
        )
    with open(file_path, "rb") as f:
        content = f.read()
    return verify_c2pa_bytes(content, mime_type=mime_type or "image/jpeg")
