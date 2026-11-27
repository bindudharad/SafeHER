# SafeHER Stage 2: API Changelog

## 1. REST API Changes

### 1.1 `POST /api/v1/evidence/{evidence_id}/analyze`
Initiates end-to-end multi-modal forensic inspection of the specified evidence file.

#### Authentication
- Requires Bearer JWT token (`Authorization: Bearer <token>`).

#### Behavior Changes in Stage 2
1. Reads envelope-encrypted ciphertext and unwraps the Data Encryption Key (DEK).
2. Decrypts plaintext directly into memory (`io.BytesIO`).
3. Executes official C2PA manifest reader (`c2pa-python`).
4. Executes genuine RetinaFace PyTorch ResNet-50 face detection.
5. Persists `c2pa_result` and `face_localization` in `media_analyses` database table.
6. Returns enriched forensic response with complete backwards compatibility.

#### Enriched Response Schema (200 OK)
```json
{
  "id": 1,
  "evidence_id": 4,
  "visual_authenticity_score": 0.5,
  "facial_deepfake_score": 0.5,
  "physical_forensic_score": 0.5,
  "metadata_integrity_score": 0.95,
  "multi_modal_composite_score": 0.61,
  "risk_level": "medium",
  "created_at": "2026-11-27T01:30:00Z",
  "c2pa_analysis": {
    "status": "valid_credentials",
    "has_manifest": true,
    "is_valid": true,
    "validation_state": "Valid",
    "claim_generator": "make_test_images/0.1.0 c2pa-rs/0.11.2",
    "title": "C.jpg",
    "format": "image/jpeg",
    "instance_id": "urn:uuid:68e98628-8772-4d56-a401-44755ebaa921",
    "manifest_count": 1,
    "issuer": "Test Signing Authority",
    "actions": [
      {
        "action": "c2pa.created"
      }
    ],
    "ingredients": [],
    "error_message": null,
    "sdk_version": "0.39.0"
  },
  "face_localization": {
    "face_count": 2,
    "faces": [
      {
        "face_id": 1,
        "confidence": 0.9995,
        "box": {
          "x1": 52,
          "y1": 41,
          "x2": 189,
          "y2": 215,
          "width": 137,
          "height": 174
        },
        "landmarks": {
          "right_eye": [82, 102],
          "left_eye": [146, 105],
          "nose": [112, 145],
          "mouth_right": [88, 178],
          "mouth_left": [140, 180]
        },
        "aligned_crop_size": [256, 256],
        "context_padding_pct": 15.0
      }
    ],
    "model": "retinaface_resnet50",
    "backend": "pytorch",
    "device": "cpu",
    "disclaimer": "RetinaFace provides facial localization and landmark extraction only. It does not perform deepfake classification."
  },
  "c2pa_provenance": {
    "has_manifest": true,
    "is_valid": true,
    "status": "valid_credentials"
  },
  "faces": [...]
}
```

---

### 1.2 `GET /api/v1/evidence/{evidence_id}/analyses`
Retrieves forensic analyses for a specific evidence file.

#### Response
- Returns a list of analyses. If `c2pa_result` and `face_localization` columns contain serialized JSON, they are automatically deserialized into `c2pa_analysis` and `face_localization` response objects.

---

## 2. Internal Service API Additions

### `backend.ai.c2pa_service`
- `inspect_content_credentials(content: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]`
- `read_active_manifest(reader: c2pa.Reader) -> Dict[str, Any]`
- `extract_claim_information(active_manifest: Dict[str, Any]) -> Dict[str, Any]`
- `extract_ingredient_information(active_manifest: Dict[str, Any]) -> List[Dict[str, Any]]`
- `extract_actions_information(active_manifest: Dict[str, Any]) -> List[Dict[str, Any]]`
- `validate_manifest_signature(reader: c2pa.Reader) -> Dict[str, Any]`
- `normalize_c2pa_result(...) -> Dict[str, Any]`

### `backend.ai.face_detection`
- `get_retinaface_model() -> Any` (Singleton initializer with thread-safe caching)
- `detect_faces(image_input: Union[bytes, Image.Image, np.ndarray], confidence_threshold: float = 0.5) -> Dict[str, Any]`
- `get_retinaface_health() -> Dict[str, Any]`

---

## 3. Backward Compatibility Statement

All existing frontend and client integrations continue to function without modification:
- Fields `visual_authenticity_score`, `facial_deepfake_score`, `risk_level`, and `c2pa_provenance` remain populated.
- Clients unaware of `c2pa_analysis` and `face_localization` simply ignore the additional keys.
- Clients supporting Stage 2 render the new dedicated verification and localization panels.
