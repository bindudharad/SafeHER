"""
SafeHER Image Tampering Detection & Localization Service (Stage 5)
==================================================================
Provides genuine pretrained image manipulation detection and localization (IMDL)
inspired by ForensicHub (CC BY 4.0) and IMDLBenCo (TruFor, Cat-Net, ManTraNet).

Strict Forensic Integrity Rules:
1. NEVER fabricate heatmaps or use pixel-variance/threshold heuristics.
2. NEVER equate AI-generated image detection (Model A) with localized editing.
3. If no permitted pretrained IMDL checkpoint or model package is available,
   explicitly return analysis_status='unavailable' and localization_available=False.
4. Preserve original image dimensions and coordinate mapping metadata.
5. Encrypt derived heatmap/mask artifacts at rest using Stage 1 AES-256-GCM.
"""

from __future__ import annotations

import io
import logging
import os
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image, UnidentifiedImageError

logger = logging.getLogger("safeher.ai.tampering")

SUPPORTED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP", "TIFF", "BMP"}

CANDIDATE_MODELS = {
    "trufor": {
        "model_id": "trufor",
        "model_version": "1.0.0",
        "architecture": "TruFor (Noiseprint++ + CMX RGB-Noise Fusion Transformer)",
        "license": "Academic / Non-Commercial Research (verify checkpoint terms)",
        "default_checkpoint": "trufor.pth.tar",
        "input_size": (512, 512),
    },
    "catnet": {
        "model_id": "catnet",
        "model_version": "1.0.0",
        "architecture": "CAT-Net (Compression Artifact Tracing HRNet + DCT)",
        "license": "MIT (code) / Verify checkpoint license",
        "default_checkpoint": "CAT_full_v2.pth.tar",
        "input_size": (512, 512),
    },
    "mantranet": {
        "model_id": "mantranet",
        "model_version": "1.0.0",
        "architecture": "ManTra-Net (Manipulation Tracing Network)",
        "license": "USC Research License (verify commercial restrictions)",
        "default_checkpoint": "ManTraNet_Ptrain.h5",
        "input_size": (512, 512),
    },
}

SCIENTIFIC_LIMITATIONS = [
    "A localization heatmap is an analytical signal, not definitive proof of manipulation.",
    "Heavy JPEG recompression, social-media resizing, and screenshots can cause false positives or obscure traces.",
    "Localized tampering detection differs from AI-generated image detection (Model A) and facial deepfake detection (Model B).",
    "Absence of a highlighted region does not guarantee an image is authentic or unedited.",
]


def _models_dir() -> str:
    return os.path.abspath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "models")
    )


def resolve_tampering_checkpoint(preferred_model: str = "trufor") -> Tuple[Optional[str], str, Optional[str]]:
    """
    Checks whether a genuine pretrained IMDL checkpoint and runtime exist.
    Returns: (checkpoint_path_or_none, model_id, blocker_reason_or_none)
    """
    model_id = preferred_model if preferred_model in CANDIDATE_MODELS else "trufor"
    env_ckpt = os.environ.get("SAFEHER_TAMPERING_CHECKPOINT", "").strip()
    if env_ckpt:
        if os.path.exists(env_ckpt):
            return env_ckpt, model_id, None
        return None, model_id, f"Configured SAFEHER_TAMPERING_CHECKPOINT not found: {env_ckpt}"

    default_name = CANDIDATE_MODELS[model_id]["default_checkpoint"]
    candidate_path = os.path.join(_models_dir(), default_name)
    if os.path.exists(candidate_path):
        return candidate_path, model_id, None

    return (
        None,
        model_id,
        (
            f"Pretrained IMDL checkpoint '{default_name}' is not present in models/ "
            f"and IMDLBenCo runtime is not installed. Tampering localization is unavailable "
            f"(no fake heatmap generated)."
        ),
    )


def get_tampering_health() -> Dict[str, Any]:
    ckpt_path, model_id, blocker = resolve_tampering_checkpoint()
    imdl_installed = False
    try:
        import IMDLBenCo  # type: ignore  # noqa: F401
        imdl_installed = True
    except ImportError:
        imdl_installed = False

    torch_device = "cpu"
    try:
        import torch
        if torch.cuda.is_available():
            torch_device = "cuda"
    except Exception:
        pass

    available = bool(ckpt_path and imdl_installed)
    return {
        "service": "tampering_localization",
        "model_id": model_id,
        "status": "available" if available else "unavailable",
        "checkpoint_present": bool(ckpt_path),
        "imdlbenco_installed": imdl_installed,
        "device": torch_device,
        "blocker": blocker if not available else None,
        "candidates": list(CANDIDATE_MODELS.keys()),
    }


def analyze_image_tampering(
    image_bytes: bytes,
    preferred_model: str = "trufor",
) -> Dict[str, Any]:
    """
    Validates image bytes and runs genuine tampering localization inference
    when a permitted pretrained checkpoint and runtime are available.
    Never fabricates heatmaps or scores when unavailable.
    """
    t0 = time.perf_counter()
    if not image_bytes:
        return {
            "model_id": preferred_model,
            "model_version": CANDIDATE_MODELS.get(preferred_model, CANDIDATE_MODELS["trufor"])["model_version"],
            "checkpoint_id": None,
            "analysis_status": "failed",
            "tampering_score": None,
            "localization_available": False,
            "heatmap_png_bytes": None,
            "mask_png_bytes": None,
            "original_width": None,
            "original_height": None,
            "input_width": None,
            "input_height": None,
            "coordinate_transform": {},
            "processing_time_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            "device": "cpu",
            "warnings": ["Empty image payload."],
            "limitations": SCIENTIFIC_LIMITATIONS,
        }

    # 1. Validate image and extract original dimensions
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            fmt = (img.format or "").upper()
            orig_w, orig_h = img.size
            if fmt and fmt not in SUPPORTED_IMAGE_FORMATS:
                return {
                    "model_id": preferred_model,
                    "model_version": CANDIDATE_MODELS.get(preferred_model, CANDIDATE_MODELS["trufor"])["model_version"],
                    "checkpoint_id": None,
                    "analysis_status": "unsupported",
                    "tampering_score": None,
                    "localization_available": False,
                    "heatmap_png_bytes": None,
                    "mask_png_bytes": None,
                    "original_width": orig_w,
                    "original_height": orig_h,
                    "input_width": None,
                    "input_height": None,
                    "coordinate_transform": {},
                    "processing_time_ms": round((time.perf_counter() - t0) * 1000.0, 2),
                    "device": "cpu",
                    "warnings": [f"Unsupported image format '{fmt}'. Supported: {sorted(SUPPORTED_IMAGE_FORMATS)}."],
                    "limitations": SCIENTIFIC_LIMITATIONS,
                }
            rgb_img = img.convert("RGB")
    except (UnidentifiedImageError, OSError, Exception) as exc:
        return {
            "model_id": preferred_model,
            "model_version": CANDIDATE_MODELS.get(preferred_model, CANDIDATE_MODELS["trufor"])["model_version"],
            "checkpoint_id": None,
            "analysis_status": "failed",
            "tampering_score": None,
            "localization_available": False,
            "heatmap_png_bytes": None,
            "mask_png_bytes": None,
            "original_width": None,
            "original_height": None,
            "input_width": None,
            "input_height": None,
            "coordinate_transform": {},
            "processing_time_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            "device": "cpu",
            "warnings": [f"Corrupt or unreadable image: {exc}"],
            "limitations": SCIENTIFIC_LIMITATIONS,
        }

    meta = CANDIDATE_MODELS.get(preferred_model, CANDIDATE_MODELS["trufor"])
    ckpt_path, model_id, blocker = resolve_tampering_checkpoint(preferred_model)

    imdl_available = False
    try:
        import IMDLBenCo  # type: ignore  # noqa: F401
        imdl_available = True
    except ImportError:
        imdl_available = False

    if not ckpt_path or not imdl_available:
        warnings = []
        if blocker:
            warnings.append(blocker)
        if not imdl_available:
            warnings.append(
                "IMDLBenCo package is not installed; ForensicHub IMDL models require IMDLBenCo + verified checkpoints."
            )
        if orig_w < 128 or orig_h < 128:
            warnings.append(
                f"Low-resolution image ({orig_w}x{orig_h}) degrades forensic manipulation localization reliability."
            )
        return {
            "model_id": model_id,
            "model_version": meta["model_version"],
            "checkpoint_id": os.path.basename(ckpt_path) if ckpt_path else None,
            "analysis_status": "unavailable",
            "tampering_score": None,
            "localization_available": False,
            "heatmap_png_bytes": None,
            "mask_png_bytes": None,
            "original_width": orig_w,
            "original_height": orig_h,
            "input_width": None,
            "input_height": None,
            "coordinate_transform": {
                "original_dimensions": [orig_w, orig_h],
                "alignment": "not_run_unavailable",
            },
            "processing_time_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            "device": "cpu",
            "warnings": warnings,
            "limitations": SCIENTIFIC_LIMITATIONS,
        }

    # Genuine IMDL inference path when checkpoint & IMDLBenCo are present
    try:
        import numpy as np
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        in_w, in_h = meta["input_size"]
        resized = rgb_img.resize((in_w, in_h), Image.BILINEAR)
        arr = np.asarray(resized, dtype=np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        tensor = torch.from_numpy(((arr - mean) / std).transpose(2, 0, 1)).unsqueeze(0).to(device)

        from IMDLBenCo.model_zoo import TruFor, CatNet, ManTraNet  # type: ignore
        model_cls_map = {"trufor": TruFor, "catnet": CatNet, "mantranet": ManTraNet}
        model_cls = model_cls_map.get(model_id, TruFor)
        model = model_cls()
        state = torch.load(ckpt_path, map_location=device, weights_only=True)
        model.load_state_dict(state.get("model", state), strict=False)
        model.to(device).eval()

        with torch.no_grad():
            out = model(tensor)
            pred_mask = out["pred_mask"] if isinstance(out, dict) else out
            prob_map = torch.sigmoid(pred_mask).squeeze().detach().cpu().numpy()

        # Resize probability map back to exact original image dimensions
        prob_img = Image.fromarray((np.clip(prob_map, 0.0, 1.0) * 255).astype(np.uint8), mode="L")
        aligned_mask = prob_img.resize((orig_w, orig_h), Image.BILINEAR)
        mask_arr = np.asarray(aligned_mask, dtype=np.uint8)

        # Build RGBA heatmap overlay aligned with original dimensions
        rgba = np.zeros((orig_h, orig_w, 4), dtype=np.uint8)
        rgba[..., 0] = mask_arr
        rgba[..., 1] = np.clip(255 - mask_arr, 0, 255)
        rgba[..., 3] = np.where(mask_arr > 25, np.clip(mask_arr, 40, 200), 0)
        heatmap_img = Image.fromarray(rgba, mode="RGBA")

        hm_buf = io.BytesIO()
        heatmap_img.save(hm_buf, format="PNG")
        mask_buf = io.BytesIO()
        aligned_mask.save(mask_buf, format="PNG")

        score = float(np.percentile(prob_map, 95))
        return {
            "model_id": model_id,
            "model_version": meta["model_version"],
            "checkpoint_id": os.path.basename(ckpt_path),
            "analysis_status": "completed",
            "tampering_score": round(score, 4),
            "localization_available": True,
            "heatmap_png_bytes": hm_buf.getvalue(),
            "mask_png_bytes": mask_buf.getvalue(),
            "original_width": orig_w,
            "original_height": orig_h,
            "input_width": in_w,
            "input_height": in_h,
            "coordinate_transform": {
                "original_dimensions": [orig_w, orig_h],
                "model_input_dimensions": [in_w, in_h],
                "scale_x": orig_w / float(in_w),
                "scale_y": orig_h / float(in_h),
                "alignment": "bilinear_rescaled_to_original",
            },
            "processing_time_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            "device": device,
            "warnings": (
                [f"Low-resolution image ({orig_w}x{orig_h}) may reduce localization accuracy."]
                if (orig_w < 128 or orig_h < 128)
                else []
            ),
            "limitations": SCIENTIFIC_LIMITATIONS,
        }
    except Exception as exc:
        logger.error("Tampering localization inference failed: %s", exc)
        return {
            "model_id": model_id,
            "model_version": meta["model_version"],
            "checkpoint_id": os.path.basename(ckpt_path) if ckpt_path else None,
            "analysis_status": "failed",
            "tampering_score": None,
            "localization_available": False,
            "heatmap_png_bytes": None,
            "mask_png_bytes": None,
            "original_width": orig_w,
            "original_height": orig_h,
            "input_width": None,
            "input_height": None,
            "coordinate_transform": {},
            "processing_time_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            "device": "cpu",
            "warnings": [f"Tampering inference error: {exc}"],
            "limitations": SCIENTIFIC_LIMITATIONS,
        }
