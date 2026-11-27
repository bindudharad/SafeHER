# C2PA License Compliance Statement

## 1. Overview

SafeHER incorporates the official **Coalition for Content Provenance and Authenticity (C2PA)** Python SDK (`c2pa-python` v0.39.0) and its underlying Rust library (`c2pa-rs` v0.92.0).

Both projects are officially published by the Content Authenticity Initiative (CAI) and are dual-licensed under:
- **Apache License, Version 2.0** (`Apache-2.0`)
- **MIT License** (`MIT`)

SafeHER elects to consume and distribute the C2PA SDK under the terms of the **Apache License, Version 2.0**.

---

## 2. Compliance Checklist

- [x] **Copyright Attribution**: Retained original copyright notices of the Content Authenticity Initiative.
- [x] **License Distribution**: Provided full Apache-2.0 and MIT license terms in `THIRD_PARTY_NOTICES.md`.
- [x] **State Changes Documented**: Wrapper functions in `backend/ai/c2pa_service.py` cleanly interface with public `c2pa.Reader` methods without modifying upstream binary distributions.
- [x] **Patent Grant**: Complies with Section 3 of the Apache 2.0 license regarding perpetual, worldwide, non-exclusive patent licensing granted by contributors.
- [x] **Trademark Notice**: CAI and C2PA trademarks are used purely descriptively to identify the standard and technology, without claiming endorsement.

---

## 3. Contact & Attribution

- **CAI Project URL**: https://contentauthenticity.org
- **C2PA Standard Specifications**: https://c2pa.org/specifications
- **Source Code Repository**: https://github.com/contentauth/c2pa-python
