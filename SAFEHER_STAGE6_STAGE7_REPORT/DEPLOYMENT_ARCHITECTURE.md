# SafeHER — Production Deployment Architecture Report
## Containerized Multi-Tier Topology, Hardening & Isolation

---

### 1. System Topology Overview

SafeHER employs a secure containerized 4-tier deployment topology running on isolated Docker bridge networks:

```mermaid
graph TB
    subgraph PublicInternet ["Public Internet"]
        Client["Browser Client / Mobile Survivor"]
    end

    subgraph EdgeTier ["Edge Ingress Tier (safeher-edge network)"]
        Gateway["Nginx Edge Gateway (Port 80/443)<br/>- TLS 1.2/1.3 Termination<br/>- Strict Security Headers<br/>- Rate Limiting Zones<br/>- Reverse Proxying"]
    end

    subgraph InternalNetwork ["Isolated Internal Network (safeher-internal)"]
        Frontend["Frontend UI Container<br/>- Non-root Alpine Nginx (UID 101)<br/>- Port 8080<br/>- Static Optimized Assets"]
        Backend["FastAPI Backend Container<br/>- Non-root safeher user (UID 10001)<br/>- Uvicorn/Gunicorn Workers (Port 8000)<br/>- AES-256-GCM Crypto Engine<br/>- Pretrained AI Forensics Pipeline"]
        ClamAV["ClamAV Antivirus Daemon<br/>- ClamAV container (Port 3310)<br/>- FreshClam Auto-Updates<br/>- INSTREAM socket scanner"]
    end

    subgraph StorageVolumes ["Isolated Persistent Volumes"]
        DBVol["SQLite Persistent Volume<br/>/app/data/safeher.db"]
        EviVol["Encrypted Evidence Blobs<br/>/app/storage/evidence/ (*.enc)"]
        QuarVol["Quarantined Threats<br/>/app/storage/quarantine/"]
        ClamVol["Antivirus Virus Definitions<br/>/var/lib/clamav"]
    end

    Client -->|HTTPS (443)| Gateway
    Gateway -->|Static HTTP (8080)| Frontend
    Gateway -->|API HTTP (8000)| Backend
    Backend -->|TCP (3310)| ClamAV
    Backend --> DBVol
    Backend --> EviVol
    Backend --> QuarVol
    ClamAV --> ClamVol
```

---

### 2. Container Hardening & Security Configuration

#### 2.1 Backend Container (`backend/Dockerfile`)
- **Base Image**: `python:3.11-slim` with multi-stage build pattern.
- **Dedicated Non-Root User**:
  ```dockerfile
  RUN groupadd -g 10001 safeher && \
      useradd -u 10001 -g safeher -d /app -s /bin/false safeher
  USER safeher
  ```
- **File System Permissions**: Storage directories set to `chmod 700` with ownership assigned to `safeher:safeher`.
- **Minimal Packages**: Build tools (gcc, git, build-essential) are stripped in the final runner stage.
- **Docker Security Option**: `no-new-privileges:true` prevents privilege escalation via setuid binaries.

#### 2.2 Frontend Container (`frontend/Dockerfile`)
- **Stage 1 (Build)**: `node:20-alpine` runs `npm ci && npm run build`.
- **Stage 2 (Runtime)**: `nginxinc/nginx-unprivileged:alpine` (runs as default unprivileged UID 101).
- **Listening Port**: Default unprivileged port `8080`.

#### 2.3 Edge Gateway (`nginx/nginx.conf`)
- **SSL Protocols**: `TLSv1.2 TLSv1.3` only; SSLv3, TLS 1.0, and TLS 1.1 explicitly disabled.
- **Cipher Suites**: `HIGH:!aNULL:!MD5`.
- **Request Size Limits**: Evidence upload constrained to 25 MB (`client_max_body_size 25M`).
- **Rate Limiting Configuration**:
  - Authentication `/api/v1/auth/`: 5 requests per minute with burst of 10.
  - Evidence Upload `/api/v1/evidence/`: 10 requests per minute with burst of 5.
  - General API `/api/`: 30 requests per minute with burst of 20.

---

### 3. Resource Allocations & Limits

To prevent noisy-neighbor interference and denial-of-service vulnerabilities, explicit container constraints are configured in `docker-compose.prod.yml`:

| Service | CPU Allocation | Memory Limit | Restart Policy | Healthcheck |
| :--- | :--- | :--- | :--- | :--- |
| **`gateway`** | 0.5 Cores | 256 MB | `unless-stopped` | Nginx HTTP status |
| **`frontend`** | 0.5 Cores | 256 MB | `unless-stopped` | `wget -q --spider http://localhost:8080/` |
| **`backend`** | 2.0 Cores | 2048 MB | `unless-stopped` | `curl -f http://localhost:8000/api/v1/health` |
| **`clamav`** | 1.0 Cores | 1536 MB | `unless-stopped` | `clamdscan --ping 3310` |
