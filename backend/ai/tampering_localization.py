"""
SafeHER Image Tampering Detection & Localization Service (Stage 5)
==================================================================
Provides genuine pretrained image manipulation detection and localization (IMDL)
using IMDLBenCo's TruFor architecture (Noiseprint++ + CMX RGB-Noise Fusion Transformer)
and verified GRIP-UNINA pretrained weights (`trufor.pth.tar`).

Strict Forensic Integrity Rules:
1. NEVER fabricate heatmaps or use pixel-variance/threshold heuristics.
2. NEVER equate AI-generated image detection (Model A) with localized editing.
3. If no permitted pretrained IMDL checkpoint or model package is available,
   explicitly return analysis_status='unavailable' and localization_available=False.
4. Preserve original image dimensions and coordinate mapping metadata.
5. Encrypt derived heatmap/mask artifacts at rest using Stage 1 AES-256-GCM.
6. Verify checkpoint SHA-256 integrity before loading into memory.
"""

from __future__ import annotations

import hashlib
import io
import logging
import os
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image, UnidentifiedImageError

logger = logging.getLogger("safeher.ai.tampering")

SUPPORTED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP", "TIFF", "BMP"}
MAX_IMAGE_PIXELS = 4096 * 4096
MAX_MODEL_INPUT_SIDE = 1024  # Sensible memory limit for CPU/GPU inference

# Official GRIP-UNINA TruFor checkpoint SHA-256
VERIFIED_CHECKPOINT_SHA256 = {
    "trufor.pth.tar": "ac1d90e329a72e0d66e8665e123a19e94bfae3209c3ef8a4f9ca3b91578c7844",
}

CANDIDATE_MODELS = {
    "trufor": {
        "model_id": "trufor",
        "model_version": "1.0.0",
        "architecture": "TruFor (Noiseprint++ + CMX SegFormer-B2 RGB-Noise Fusion)",
        "source": "GRIP-UNINA / IMDLBenCo (https://www.grip.unina.it/download/prog/TruFor/TruFor_weights.zip)",
        "license": "GRIP-UNINA Non-Profit / Informational Use License (Non-Commercial)",
        "default_checkpoint": "trufor.pth.tar",
        "input_size": (512, 512),
    },
    "catnet": {
        "model_id": "catnet",
        "model_version": "1.0.0",
        "architecture": "CAT-Net (Compression Artifact Tracing HRNet + DCT)",
        "source": "IMDLBenCo / KAIST",
        "license": "MIT (code) / Verify checkpoint license",
        "default_checkpoint": "CAT_full_v2.pth.tar",
        "input_size": (512, 512),
    },
    "mantranet": {
        "model_id": "mantranet",
        "model_version": "1.0.0",
        "architecture": "ManTra-Net (Manipulation Tracing Network)",
        "source": "IMDLBenCo / USC",
        "license": "USC Research License (Non-Commercial)",
        "default_checkpoint": "ManTraNet_Ptrain.h5",
        "input_size": (512, 512),
    },
}

SCIENTIFIC_LIMITATIONS = [
    "A localization heatmap is an analytical signal, not definitive proof of manipulation.",
    "Heavy JPEG recompression, social-media resizing, and screenshots can cause false positives or obscure traces.",
    "Localized tampering detection differs from AI-generated image detection (Model A) and facial deepfake detection (Model B).",
    "Absence of a highlighted region does not guarantee an image is authentic or unedited.",
    "TruFor pretrained weights are licensed by GRIP-UNINA for informational and non-profit purposes.",
]

# Thread-safe singleton model cache to avoid loading multiple 280MB+ models into memory
_MODEL_CACHE: Dict[str, Tuple[Any, str, str]] = {}  # cache_key -> (model, device, ckpt_sha256)
_MODEL_LOCK = threading.Lock()


def _models_dir() -> str:
    return os.path.abspath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "models")
    )


def compute_file_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_checkpoint_integrity(ckpt_path: str) -> Tuple[bool, str, Optional[str]]:
    """
    Computes SHA-256 of the checkpoint and verifies it against known-good hashes when available.
    Returns: (is_valid, sha256_hex, error_message_or_none)
    """
    sha256_hex = compute_file_sha256(ckpt_path)
    basename = os.path.basename(ckpt_path)
    expected = VERIFIED_CHECKPOINT_SHA256.get(basename)
    if expected and sha256_hex.lower() != expected.lower():
        return (
            False,
            sha256_hex,
            f"Checkpoint SHA-256 mismatch for {basename}: expected {expected}, got {sha256_hex}.",
        )
    return True, sha256_hex, None


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


def _load_trufor_model(ckpt_path: str, device: str) -> Tuple[Any, str]:
    """Loads and caches IMDLBenCo TruFor (Noiseprint++ + CMX SegFormer-B2) with strict weight verification."""
    cache_key = f"trufor:{ckpt_path}:{device}"
    if cache_key in _MODEL_CACHE:
        model, _, ckpt_sha256 = _MODEL_CACHE[cache_key]
        return model, ckpt_sha256

    with _MODEL_LOCK:
        if cache_key in _MODEL_CACHE:
            model, _, ckpt_sha256 = _MODEL_CACHE[cache_key]
            return model, ckpt_sha256

        ok, ckpt_sha256, err = verify_checkpoint_integrity(ckpt_path)
        if not ok:
            raise RuntimeError(err or "Checkpoint integrity verification failed.")

        import torch
        from IMDLBenCo.model_zoo.trufor.cmx.builder_np_conf import myEncoderDecoder as confcmx
        from IMDLBenCo.model_zoo.trufor.config import _C as base_cfg

        cfg = base_cfg.clone()
        cfg.defrost()
        cfg.MODEL.NAME = "detconfcmx"
        cfg.MODEL.MODS = ("RGB", "NP++")
        cfg.MODEL.EXTRA.PREPRC = "imagenet"
        cfg.MODEL.EXTRA.BACKBONE = "mit_b2"
        cfg.MODEL.EXTRA.DECODER = "MLPDecoder"
        cfg.MODEL.EXTRA.DECODER_EMBED_DIM = 512
        cfg.MODEL.EXTRA.PREPROC = "dncnn"
        cfg.MODEL.EXTRA.BN_EPS = 0.001
        cfg.MODEL.EXTRA.BN_MOMENTUM = 0.1
        cfg.MODEL.EXTRA.DETECTION = "confpool"
        cfg.MODEL.EXTRA.CONF = True
        cfg.MODEL.EXTRA.NP_WEIGHTS = ""
        cfg.DATASET.NUM_CLASSES = 2
        cfg.freeze()

        model = confcmx(cfg=cfg)
        state = torch.load(ckpt_path, map_location=device, weights_only=False)
        sd = state.get("state_dict", state.get("model", state))
        model.load_state_dict(sd, strict=True)
        model.to(device).eval()

        _MODEL_CACHE[cache_key] = (model, device, ckpt_sha256)
        logger.info("Loaded TruFor model on %s (sha256=%s)", device, ckpt_sha256[:16])
        return model, ckpt_sha256


def _extract_suspicious_regions(
    prob_map_orig: Any,
    threshold: float = 0.5,
    min_area_ratio: float = 0.002,
    max_regions: int = 8,
) -> List[Dict[str, Any]]:
    """Extracts connected suspicious regions with bounding boxes and scores from the aligned probability map."""
    import numpy as np
    from scipy import ndimage

    h, w = prob_map_orig.shape
    total_pixels = max(1, h * w)
    binary = prob_map_orig >= threshold
    labeled, num_features = ndimage.label(binary)
    if num_features == 0:
        return []

    regions: List[Dict[str, Any]] = []
    slices = ndimage.find_objects(labeled)
    for idx, sl in enumerate(slices, start=1):
        if sl is None:
            continue
        y_slice, x_slice = sl
        region_mask = labeled[y_slice, x_slice] == idx
        area_px = int(np.sum(region_mask))
        area_ratio = area_px / float(total_pixels)
        if area_ratio < min_area_ratio:
            continue

        region_probs = prob_map_orig[y_slice, x_slice][region_mask]
        regions.append(
            {
                "region_id": len(regions) + 1,
                "bbox": [
                    int(x_slice.start),
                    int(y_slice.start),
                    int(x_slice.stop - x_slice.start),
                    int(y_slice.stop - y_slice.start),
                ],
                "area_percent": round(area_ratio * 100.0, 2),
                "mean_probability": round(float(np.mean(region_probs)), 4),
                "peak_probability": round(float(np.max(region_probs)), 4),
            }
        )

    regions.sort(key=lambda r: r["peak_probability"], reverse=True)
    return regions[:max_regions]


def get_tampering_health() -> Dict[str, Any]:
    ckpt_path, model_id, blocker = resolve_tampering_checkpoint()
    imdl_installed = False
    try:
        import IMDLBenCo  # type: ignore  # noqa: F401
        imdl_installed = True
    except ImportError:
        imdl_installed = False

    torch_device = "cpu"
    cuda_available = False
    try:
        import torch
        cuda_available = bool(torch.cuda.is_available())
        if cuda_available:
            torch_device = "cuda"
    except Exception:
        pass

    ckpt_verified = False
    ckpt_sha256 = None
    if ckpt_path and os.path.exists(ckpt_path):
        ckpt_verified, ckpt_sha256, _ = verify_checkpoint_integrity(ckpt_path)

    available = bool(ckpt_path and imdl_installed and ckpt_verified)
    return {
        "service": "tampering_localization",
        "model_id": model_id,
        "status": "available" if available else "unavailable",
        "checkpoint_present": bool(ckpt_path),
        "checkpoint_verified": ckpt_verified,
        "checkpoint_sha256": ckpt_sha256,
        "imdlbenco_installed": imdl_installed,
        "device": torch_device,
        "cuda_available": cuda_available,
        "model_cached": any(k.startswith(f"{model_id}:") for k in _MODEL_CACHE),
        "blocker": blocker if not available else None,
        "candidates": list(CANDIDATE_MODELS.keys()),
    }


def _compute_inference_dimensions(orig_w: int, orig_h: int) -> Tuple[int, int]:
    """Computes dimensions divisible by 32 (required by SegFormer-B2) within memory limits."""
    scale = min(1.0, MAX_MODEL_INPUT_SIDE / float(max(orig_w, orig_h)))
    target_w = max(64, int(round((orig_w * scale) / 32.0)) * 32)
    target_h = max(64, int(round((orig_h * scale) / 32.0)) * 32)
    return target_w, target_h


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
            "checkpoint_sha256": None,
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
            "suspicious_regions": [],
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
            if orig_w * orig_h > MAX_IMAGE_PIXELS:
                raise ValueError(f"Image exceeds maximum pixel limit ({orig_w}x{orig_h}).")
            if fmt and fmt not in SUPPORTED_IMAGE_FORMATS:
                return {
                    "model_id": preferred_model,
                    "model_version": CANDIDATE_MODELS.get(preferred_model, CANDIDATE_MODELS["trufor"])["model_version"],
                    "checkpoint_id": None,
                    "checkpoint_sha256": None,
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
                    "suspicious_regions": [],
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
            "checkpoint_sha256": None,
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
            "suspicious_regions": [],
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
            "checkpoint_sha256": None,
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
            "suspicious_regions": [],
            "processing_time_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            "device": "cpu",
            "warnings": warnings,
            "limitations": SCIENTIFIC_LIMITATIONS,
        }

    # Genuine IMDL inference path when checkpoint & IMDLBenCo are present
    try:
        import numpy as np
        import torch
        import torch.nn.functional as F

        if model_id != "trufor":
            raise RuntimeError(f"Model '{model_id}' checkpoint loader is not configured; only 'trufor' has verified weights.")

        device = "cuda" if torch.cuda.is_available() else "cpu"
        in_w, in_h = _compute_inference_dimensions(orig_w, orig_h)
        resized = rgb_img.resize((in_w, in_h), Image.BILINEAR)
        # TruFor's myEncoderDecoder expects [0, 1] RGB tensor (it applies Noiseprint++ on raw RGB, then ImageNet preproc internally)
        arr = np.asarray(resized, dtype=np.float32) / 255.0
        tensor = torch.from_numpy(arr.transpose(2, 0, 1)).unsqueeze(0).to(device)

        model, ckpt_sha256 = _load_trufor_model(ckpt_path, device)

        with torch.no_grad():
            pred_mask_logits, conf_logits, det_logit, _ = model(tensor)
            prob_map = F.softmax(pred_mask_logits, dim=1)[:, 1, :, :].squeeze(0).detach().cpu().numpy()
            det_prob = float(torch.sigmoid(det_logit).squeeze().detach().cpu().item()) if det_logit is not None else float(np.percentile(prob_map, 95))
            mean_conf = float(torch.sigmoid(conf_logits).mean().detach().cpu().item()) if conf_logits is not None else None

        # Resize probability map back to exact original image dimensions
        prob_img = Image.fromarray((np.clip(prob_map, 0.0, 1.0) * 255).astype(np.uint8), mode="L")
        aligned_mask = prob_img.resize((orig_w, orig_h), Image.BILINEAR)
        mask_arr = np.asarray(aligned_mask, dtype=np.uint8)
        prob_orig = mask_arr.astype(np.float32) / 255.0

        # Build RGBA heatmap overlay aligned with original dimensions (blue/green -> amber -> red)
        rgba = np.zeros((orig_h, orig_w, 4), dtype=np.uint8)
        rgba[..., 0] = np.clip(mask_arr * 1.4, 0, 255).astype(np.uint8)
        rgba[..., 1] = np.clip(255 - np.abs(mask_arr.astype(np.int16) - 128) * 2, 0, 255).astype(np.uint8)
        rgba[..., 2] = np.clip(255 - mask_arr, 0, 255).astype(np.uint8)
        rgba[..., 3] = np.where(mask_arr > 30, np.clip(mask_arr, 50, 210), 0)
        heatmap_img = Image.fromarray(rgba, mode="RGBA")

        hm_buf = io.BytesIO()
        heatmap_img.save(hm_buf, format="PNG")
        mask_buf = io.BytesIO()
        aligned_mask.save(mask_buf, format="PNG")

        suspicious_regions = _extract_suspicious_regions(prob_orig)
        warnings = []
        if orig_w < 128 or orig_h < 128:
            warnings.append(f"Low-resolution image ({orig_w}x{orig_h}) may reduce localization accuracy.")
        if 0.35 <= det_prob <= 0.65:
            warnings.append("Inconclusive manipulation score (mid-range confidence); review suspicious regions and metadata carefully.")

        return {
            "model_id": model_id,
            "model_version": meta["model_version"],
            "checkpoint_id": os.path.basename(ckpt_path),
            "checkpoint_sha256": ckpt_sha256,
            "analysis_status": "completed",
            "tampering_score": round(det_prob, 4),
            "spatial_confidence": round(mean_conf, 4) if mean_conf is not None else None,
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
                "checkpoint_sha256": ckpt_sha256,
                "spatial_confidence": round(mean_conf, 4) if mean_conf is not None else None,
                "suspicious_regions": suspicious_regions,
            },
            "suspicious_regions": suspicious_regions,
            "processing_time_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            "device": device,
            "warnings": warnings,
            "limitations": SCIENTIFIC_LIMITATIONS,
        }
    except Exception as exc:
        logger.error("Tampering localization inference failed: %s", exc)
        return {
            "model_id": model_id,
            "model_version": meta["model_version"],
            "checkpoint_id": os.path.basename(ckpt_path) if ckpt_path else None,
            "checkpoint_sha256": None,
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
            "suspicious_regions": [],
            "processing_time_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            "device": "cpu",
            "warnings": [f"Tampering inference error: {exc}"],
            "limitations": SCIENTIFIC_LIMITATIONS,
        }
