# ==========================================================
# SafeHER Production Multi-Stage Backend Dockerfile
# Hardened non-root runtime container for FastAPI backend
# ==========================================================

# Stage 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


# Stage 2: Hardened Runtime
FROM python:3.11-slim AS runner

WORKDIR /app

# Install minimal runtime shared libraries (libmagic for MIME typing, ffmpeg for media forensics)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    ffmpeg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root application user
RUN groupadd -g 10001 safeher && \
    useradd -u 10001 -g safeher -d /app -s /bin/false safeher

# Copy installed python wheels from builder
COPY --from=builder /root/.local /home/safeher/.local
ENV PATH=/home/safeher/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy backend source code
COPY --chown=safeher:safeher . /app

# Create storage and quarantine directories with secure permissions
RUN mkdir -p /app/storage/evidence /app/storage/quarantine && \
    chown -R safeher:safeher /app/storage && \
    chmod 700 /app/storage /app/storage/evidence /app/storage/quarantine

USER safeher

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
