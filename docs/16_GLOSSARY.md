# 16 — Glossary

| Term | Definition |
|---|---|
| **C2PA** | Coalition for Content Provenance and Authenticity — open standard for cryptographic content credentials and edit history |
| **Calibration (`is_calibrated`)** | Whether a model's output probability reflects true empirical likelihood; uncalibrated scores are advisory only |
| **Evidence Vault** | Protected SafeHER module (`EvidenceVaultPage.tsx`) for uploading, hashing, and inspecting abuse artifacts |
| **Midnight Aurora** | SafeHER's dark visual design language (`#080B18` void canvas, `#8B7CFF` aurora violet, `#5EEAD4` / cyan accents) |
| **NCW** | National Commission for Women (India) — external reporting destination supported in SafeHER's Reporting Assistant |
| **PBKDF2-HMAC-SHA256** | Password-based key derivation function used in `backend/auth.py` with 120,000 iterations |
| **Quick Exit** | Trauma-informed safety button (`QuickExitButton.tsx`) that immediately replaces the browser location with a neutral site |
| **SHA-256** | 256-bit cryptographic hash computed client-side (`Web Crypto API`) and verified server-side (`hashlib.sha256`) for tamper detection |
| **vgpu** | WebGPU rendering library + Vite plugin (`wgslVitePlugin`) powering SafeHER's `.wgsl` shader experiences |
| **WAL Mode** | SQLite Write-Ahead Logging mode enabling concurrent reads alongside writes |
| **WGSL** | WebGPU Shading Language used in `frontend/src/components/3d/**/*.wgsl` |
