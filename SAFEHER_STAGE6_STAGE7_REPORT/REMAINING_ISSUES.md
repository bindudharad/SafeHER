# SafeHER — Remaining Considerations, Edge Cases & Production Prerequisites
## Honest Engineering Disclosures & Future Roadmap

---

### 1. Honest Technical Disclosures & Known Limitations

In keeping with SafeHER's commitment to complete technical transparency, the following edge cases and operational constraints are formally documented:

#### 1.1 Client Browser Background Tab Suspension
- **Limitation**: Modern mobile and desktop browsers (iOS WebKit, Android Chrome, macOS Safari, Windows Edge) aggressively throttle JavaScript execution (e.g. `setInterval`, `setTimeout`, and Web Audio scheduling) in inactive tabs to preserve battery and memory.
- **Impact on SafeHER**: The Journey Check-In timer countdown may appear to pause while the tab is backgrounded. However, upon returning to the tab, the timestamp delta (`expires_at - now`) immediately reconciles the true elapsed time.
- **Mitigation Implemented**: A prominent advisory banner is displayed inside the Journey tab instructing survivors to keep the SafeHER browser tab active or pinned while monitoring journeys.

#### 1.2 Quick Exit Limitations in Shared Devices
- **Limitation**: While Quick Exit (`Alt + Q`) immediately navigates the active tab to `https://www.weather.com` using `window.location.replace()`, browser security sandboxes strictly prevent web pages from programmatically erasing:
  - The browser's global browsing history.
  - The local HTTP disk cache.
  - DNS lookup logs on local Wi-Fi routers.
- **Mitigation Implemented**: The Quick Exit banner and Privacy Settings page explicitly inform survivors of these constraints and provide guidance on using Private Browsing / Incognito mode.

#### 1.3 Emergency Helpline Call Invocation Boundaries
- **Limitation**: Browser security models intentionally prohibit web pages from placing cellular telephone calls silently or autonomously without user confirmation. Clicking `tel:112` or `tel:1091` opens the device's native dialer, requiring the user to press "Call".
- **Mitigation Implemented**: Clear interface copy clarifies that SafeHER initiates dialer pre-fill rather than autonomous dispatch.

---

### 2. Final Production Deployment Prerequisites

Before deploying SafeHER into public production facing real survivors, the following operational steps must be performed by infrastructure administrators:

1. **Commercial TLS Certificates**:
   - Replace self-signed development certificates in `nginx/certs/` with commercial certificates from a trusted Certificate Authority (e.g. Let's Encrypt / DigiCert).
2. **Dedicated Cloud Key Management Service (KMS)**:
   - For high-volume multi-region cloud deployments, connect the KEK provider interface (`BaseKeyProvider` in `backend/security/evidence_storage.py`) to AWS KMS, Google Cloud KMS, or HashiCorp Vault.
3. **Live ClamAV Daemon Deployment**:
   - In production Docker Compose (`docker-compose.prod.yml`), deploy the `clamav` container and ensure FreshClam successfully downloads initial virus definition signatures on first boot.
4. **Section 65B Electronic Certificate Signing**:
   - For evidentiary submissions in Indian judicial proceedings, legal counsel should bind the RSA-PSS public key (`km.get_public_key()`) to an institutional Section 65B compliance certificate.

---

### 3. Conclusion & Final System Readiness

With the successful completion of **Stage 6 (Survivor Safety & Protection)** and **Stage 7 (Production Hardening & Validation)**, SafeHER has transitioned from an initial research prototype into a robust, cryptographically sound, and trauma-informed **PRODUCTION CANDIDATE** digital safety platform.
