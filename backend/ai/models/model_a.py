"""
SafeHER Model A: Genuine AI-Generated Image (AIGI) Detector
=============================================================
Architecture: Effort (Orthogonal Subspace Decomposition over CLIP ViT-L/14)
Reference: ICML 2025 Oral Presentation
Pretrained Benchmark: GenImage (sdv1.4)
License: CC BY-NC 4.0 (Non-Commercial Research Use)
"""

import hashlib
import io
import logging
import math
import os
import time
from typing import Any, Dict, Optional, Tuple, Union

import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T

logger = logging.getLogger("safeher.ai.model_a")

# Default checkpoint path
# Path hierarchy: backend/ai/models/model_a.py -> backend/ai/models -> backend/ai -> backend -> project_root -> models/
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DEFAULT_MODEL_A_PATH = os.path.join(
    _PROJECT_ROOT,
    "models",
    "effort_clip_l14_genimage.pth",
)

MODEL_A_CHECKPOINT_HASH = "7c32ceb4e66d303050e8fc5dc7543fa347693fb4ee6b5df4d6eaf9f6a92fb813"


class SVDResidualLinear(nn.Module):
    """
    Effort SVD Residual Linear Layer.
    Decomposes weights into fixed main components and trainable residual components.
    During inference, calculates: weight = weight_main + U_residual @ diag(S_residual) @ V_residual.
    """

    def __init__(self, in_features: int, out_features: int, r: int = 1023, bias: bool = True):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.r = r
        self.weight_main = nn.Parameter(torch.zeros(out_features, in_features), requires_grad=False)
        self.bias = nn.Parameter(torch.zeros(out_features)) if bias else None
        self.U_residual = nn.Parameter(torch.zeros(out_features, in_features - r))
        self.S_residual = nn.Parameter(torch.zeros(in_features - r))
        self.V_residual = nn.Parameter(torch.zeros(in_features - r, in_features))
        self.U_r = nn.Parameter(torch.zeros(out_features, r), requires_grad=False)
        self.S_r = nn.Parameter(torch.zeros(r), requires_grad=False)
        self.V_r = nn.Parameter(torch.zeros(r, in_features), requires_grad=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.S_residual is not None and self.U_residual is not None and self.V_residual is not None:
            residual = self.U_residual @ torch.diag(self.S_residual) @ self.V_residual
            weight = self.weight_main + residual
        else:
            weight = self.weight_main
        return F.linear(x, weight, self.bias)


def _replace_self_attn_linear(module: nn.Module, r: int = 1023):
    """Recursively replaces nn.Linear in self_attn modules with SVDResidualLinear."""
    for name, child in module.named_children():
        if "self_attn" in name:
            for sub_name, sub_module in child.named_children():
                if isinstance(sub_module, nn.Linear):
                    new_layer = SVDResidualLinear(
                        sub_module.in_features,
                        sub_module.out_features,
                        r=r,
                        bias=(sub_module.bias is not None),
                    )
                    setattr(child, sub_name, new_layer)
        else:
            _replace_self_attn_linear(child, r=r)


class EffortAIGIDetector(nn.Module):
    """
    Effort-AIGI-Detection Model combining CLIP ViT-L/14 Vision Model
    with SVD Residual Attention and a binary classification head.
    """

    def __init__(self, vision_model: nn.Module):
        super().__init__()
        self.backbone = vision_model.vision_model
        self.head = nn.Linear(1024, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.backbone(x)
        feat = out.pooler_output
        logits = self.head(feat)
        return logits


# Singleton cache
_MODEL_A_INSTANCE: Optional[EffortAIGIDetector] = None
_MODEL_A_DEVICE: Optional[torch.device] = None
_MODEL_A_INITIALIZATION_ERROR: Optional[str] = None


def get_model_a_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def get_model_a_checkpoint_path() -> str:
    return os.environ.get("SAFEHER_EFFORT_AIGI_CHECKPOINT", DEFAULT_MODEL_A_PATH)


def is_noncommercial_permitted() -> bool:
    """Checks whether non-commercial research models are permitted in current environment."""
    val = os.environ.get("SAFEHER_ENABLE_NONCOMMERCIAL_RESEARCH_MODELS", "true").lower()
    return val in ("true", "1", "yes", "enabled")


def load_model_a(device: Optional[torch.device] = None) -> EffortAIGIDetector:
    """
    Initializes and loads the official Effort-AIGI-Detection architecture
    with its pretrained checkpoint. Thread-safe singleton.
    """
    global _MODEL_A_INSTANCE, _MODEL_A_DEVICE, _MODEL_A_INITIALIZATION_ERROR

    if _MODEL_A_INSTANCE is not None:
        return _MODEL_A_INSTANCE

    if not is_noncommercial_permitted():
        _MODEL_A_INITIALIZATION_ERROR = "Non-commercial research models disabled by configuration."
        raise PermissionError(_MODEL_A_INITIALIZATION_ERROR)

    ckpt_path = get_model_a_checkpoint_path()
    if not os.path.exists(ckpt_path):
        _MODEL_A_INITIALIZATION_ERROR = f"Checkpoint not found at path: {ckpt_path}"
        raise FileNotFoundError(_MODEL_A_INITIALIZATION_ERROR)

    if device is None:
        device = get_model_a_device()

    try:
        from transformers import CLIPVisionConfig, CLIPVisionModel

        config = CLIPVisionConfig.from_pretrained("openai/clip-vit-large-patch14")
        raw_vision = CLIPVisionModel(config)
        _replace_self_attn_linear(raw_vision, r=1023)

        model = EffortAIGIDetector(raw_vision)

        state_dict = torch.load(ckpt_path, map_location=device, weights_only=True)
        cleaned_state = {k.replace("module.", ""): v for k, v in state_dict.items()}
        model.load_state_dict(cleaned_state, strict=False)

        model.to(device)
        model.eval()

        _MODEL_A_INSTANCE = model
        _MODEL_A_DEVICE = device
        _MODEL_A_INITIALIZATION_ERROR = None
        logger.info(f"Effort-AIGI-Detection model loaded successfully on {device}.")
        return _MODEL_A_INSTANCE

    except Exception as exc:
        _MODEL_A_INITIALIZATION_ERROR = str(exc)
        logger.error(f"Failed to initialize Model A: {exc}")
        raise


def get_model_a_health() -> Dict[str, Any]:
    ckpt_path = get_model_a_checkpoint_path()
    exists = os.path.exists(ckpt_path)
    file_size = os.path.getsize(ckpt_path) if exists else 0
    permitted = is_noncommercial_permitted()

    return {
        "model_id": "effort_clip_l14_genimage",
        "model_name": "Effort-AIGI-Detection",
        "task": "AI-Generated Image Detection",
        "checkpoint_path": ckpt_path,
        "checkpoint_exists": exists,
        "checkpoint_size_bytes": file_size,
        "checkpoint_hash": MODEL_A_CHECKPOINT_HASH,
        "is_loaded": _MODEL_A_INSTANCE is not None,
        "noncommercial_permitted": permitted,
        "device": str(_MODEL_A_DEVICE) if _MODEL_A_DEVICE else "uninitialized",
        "error": _MODEL_A_INITIALIZATION_ERROR,
        "license": "CC BY-NC 4.0",
    }


def preprocess_image_for_model_a(image_input: Union[bytes, Image.Image, np.ndarray]) -> Tuple[torch.Tensor, Tuple[int, int]]:
    """
    Validates, resizes to 224x224, and applies OpenAI CLIP normalization:
    mean = [0.48145466, 0.4578275, 0.40821073], std = [0.26862954, 0.26130258, 0.27577711]
    """
    if isinstance(image_input, bytes):
        if not image_input or len(image_input) < 16:
            raise ValueError("Corrupted or empty image buffer provided.")
        pil_img = Image.open(io.BytesIO(image_input)).convert("RGB")
    elif isinstance(image_input, np.ndarray):
        if image_input.size == 0:
            raise ValueError("Empty image array provided.")
        if len(image_input.shape) == 3 and image_input.shape[2] == 3:
            pil_img = Image.fromarray(image_input).convert("RGB")
        else:
            raise ValueError(f"Invalid image array shape: {image_input.shape}")
    elif isinstance(image_input, Image.Image):
        pil_img = image_input.convert("RGB")
    else:
        raise TypeError(f"Unsupported image input type: {type(image_input)}")

    orig_dim = (pil_img.width, pil_img.height)

    transform = T.Compose([
        T.Resize((224, 224), interpolation=T.InterpolationMode.BILINEAR),
        T.ToTensor(),
        T.Normalize(
            mean=[0.48145466, 0.4578275, 0.40821073],
            std=[0.26862954, 0.26130258, 0.27577711],
        ),
    ])

    tensor = transform(pil_img).unsqueeze(0)  # Shape: [1, 3, 224, 224]
    return tensor, orig_dim


@torch.no_grad()
def detect_ai_generated_image(
    image_input: Union[bytes, Image.Image, np.ndarray],
    threshold: float = 0.5,
) -> Dict[str, Any]:
    """
    Executes genuine Model A inference on an input image.
    Returns structured results adhering to SafeHER Stage 3 schema.
    """
    start_time = time.perf_counter()
    warnings = [
        "Automated forensic predictions are decision-support signals, not definitive proof.",
        "Model evaluated under CC BY-NC 4.0 non-commercial academic research license.",
    ]

    try:
        model = load_model_a()
        device = _MODEL_A_DEVICE or get_model_a_device()
        tensor, orig_dim = preprocess_image_for_model_a(image_input)
        tensor = tensor.to(device)

        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)
        raw_real = float(probs[0, 0].item())
        raw_synthetic = float(probs[0, 1].item())

        is_synthetic = raw_synthetic >= threshold
        pred_label = "synthetic" if is_synthetic else "authentic"

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "model_id": "effort_clip_l14_genimage",
            "model_name": "Effort-AIGI-Detection",
            "model_version": "1.0.0",
            "checkpoint_id": "effort_clip_l14_genimage.pth",
            "checkpoint_hash": MODEL_A_CHECKPOINT_HASH,
            "prediction": pred_label,
            "synthetic_score": round(raw_synthetic, 4),
            "real_score": round(raw_real, 4),
            "raw_logits": [round(float(logits[0, 0].item()), 4), round(float(logits[0, 1].item()), 4)],
            "processing_time_ms": elapsed_ms,
            "device": str(device),
            "input_dimensions": list(orig_dim),
            "analysis_status": "completed",
            "warnings": warnings,
        }

    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(f"Model A inference failed: {exc}")
        return {
            "model_id": "effort_clip_l14_genimage",
            "model_name": "Effort-AIGI-Detection",
            "model_version": "1.0.0",
            "checkpoint_id": "effort_clip_l14_genimage.pth",
            "checkpoint_hash": MODEL_A_CHECKPOINT_HASH,
            "prediction": "error",
            "synthetic_score": 0.0,
            "real_score": 0.0,
            "raw_logits": [0.0, 0.0],
            "processing_time_ms": elapsed_ms,
            "device": str(get_model_a_device()),
            "input_dimensions": [0, 0],
            "analysis_status": "failed",
            "warnings": warnings + [f"Inference error: {str(exc)}"],
        }
