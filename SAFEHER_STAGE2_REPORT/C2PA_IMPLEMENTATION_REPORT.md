# SafeHER Stage 2: C2PA Implementation Report
## Cryptographic Content Credentials Verification

## 1. Specification & Library Information

- **Library**: `c2pa` (Official Coalition for Content Provenance and Authenticity Python SDK)
- **SDK Version**: `0.39.0`
- **Core Engine**: `c2pa-rs` Rust native bindings (`0.92.0`)
- **License**: MIT / Apache-2.0
- **Supported Formats**: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/tiff`, `image/heic`, `video/mp4`, `video/quicktime`, `audio/mp4`, `audio/wav`

SafeHER completely removed the legacy heuristic check (`b"c2pa" in content.lower()`) and implemented full cryptographic manifest inspection via `c2pa.Reader`.

---

## 2. Architecture & In-Memory Stream Processing

To uphold survivor privacy and fulfill SafeHER's cryptographic requirements:
1. Evidence is fetched from AES-256-GCM encrypted storage and decrypted directly into an in-memory buffer (`bytes`).
2. The bytes are wrapped in an `io.BytesIO` stream.
3. `c2pa.Reader(mime_type, stream)` parses the JUMBF (JPEG Universal Metadata Box Format) boxes directly from the stream.
4. Plaintext evidence is never written to disk or temporary cache folders.

```python
with c2pa.Reader(normalized_mime, stream) as reader:
    manifest_json_str = reader.json()
    is_valid = bool(reader.is_valid)
    validation_state = reader.get_validation_state()
```

---

## 3. Manifest Extraction & Cryptographic Validation

The C2PA service extracts rich provenance metadata from the active manifest:

### 3.1 Claim Information
- `title`: Title of the assertion/claim.
- `claim_generator`: Software/tool that created the manifest (e.g., `Adobe Firefly`, `Photoshop 25.0`, `Truepic Lens`).
- `claim_generator_info`: List of generator metadata and version numbers.
- `format`: Declared media MIME type.
- `instance_id`: Unique URN identifying this manifest instance.

### 3.2 Cryptographic Signature Details
- `is_valid`: Boolean indicating whether digital signatures over claim data match.
- `validation_state`: Human-readable status string (`Valid`, `Invalid`, `Revoked`, etc.).
- `issuer`: Name of the Certificate Authority or entity that signed the claim.
- `certificate_info`: X.509 certificate hierarchy details when available.

### 3.3 Ingredient & Action History
- `ingredients`: Prior assets used to construct this media (identifies source photos, parent artwork).
- `actions`: Exact editing steps recorded in the provenance graph (e.g., `c2pa.created`, `c2pa.edited`, `c2pa.resized`, `c2pa.color_adjustments`).

---

## 4. Status Normalization & Error Taxonomy

SafeHER normalizes C2PA verification outcomes into 5 deterministic statuses:

| Status Code | Description | Survivor / Analyst Meaning |
| :--- | :--- | :--- |
| `valid_credentials` | Manifest discovered; signature validated against signing certificate. | Provenance chain is intact and untampered since issuance. |
| `invalid_credentials` | Manifest discovered, but signature verification or asset hash failed. | File was altered after the manifest was signed, or certificate is revoked. |
| `credentials_not_present` | File contains no C2PA JUMBF metadata box. | Normal status for cameras/apps without C2PA or social media uploads. |
| `unsupported_format` | MIME type is not covered by C2PA standard (e.g. PDF, plain text). | Provenance checking is not applicable to this file type. |
| `verification_error` | Corrupted byte stream, malformed JUMBF box, or unhandled exception. | Technical verification fault during parsing. |

---

## 5. Verification Results on Authentic Test Fixtures

Testing was performed using official Adobe / Content Authenticity Initiative fixtures from `SafeHER-Research/c2pa-python/tests/fixtures`:

1. **`C.jpg` (Adobe CAI Signed Fixture)**:
   - `status`: `valid_credentials`
   - `has_manifest`: `True`
   - `is_valid`: `True`
   - `validation_state`: `"Valid"`
   - `claim_generator`: `"make_test_images/0.1.0 c2pa-rs/0.11.2"`
   - `actions`: Recorded `c2pa.created` action.

2. **`CA.jpg` (Multi-Assertion Signed Fixture)**:
   - `status`: `valid_credentials`
   - `has_manifest`: `True`
   - `is_valid`: `True`
   - `validation_state`: `"Valid"`
   - Extracted both parent claims and ingredient references.

3. **Plain Synthesized JPEG (`_make_test_image()`)**:
   - `status`: `credentials_not_present`
   - `has_manifest`: `False`
   - `is_valid`: `False`
   - `manifest`: `None`

4. **Unsupported Text Buffer (`text/plain`)**:
   - `status`: `unsupported_format`
   - `has_manifest`: `False`
   - `is_valid`: `False`

---

## 6. Forensic Limitations & Legal Safeguards

SafeHER enforces clear forensic guardrails in documentation, API responses, and the frontend UI:
1. **Absence Does Not Imply Forgery**: Most consumer smartphones and social media messaging platforms (WhatsApp, Signal, Telegram, Instagram) strip C2PA metadata during transmission or recompression. An image with `credentials_not_present` is not suspicious by default.
2. **Presence Does Not Imply Physical Reality**: A valid C2PA credential only proves who signed the claim and what edits were logged. An AI generator (e.g. DALL-E, Firefly) can sign an entirely synthetic image with valid C2PA credentials; the manifest accurately reports that it was AI-generated.
3. **No Sole Determiner of Authenticity**: C2PA is one layer in SafeHER's multi-modal forensic architecture, operating alongside facial localization and forensic visual analysis.
