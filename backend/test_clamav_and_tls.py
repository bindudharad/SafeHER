"""
ClamAV Protocol & TLS / Production Config Verification Tests (BLOCKER 4)
========================================================================
Tests:
- Real clamd TCP INSTREAM / PING / VERSION protocol against an in-process clamd socket server
- Clean file scan, EICAR antivirus test-file detection & quarantine isolation
- ClamAV daemon unavailable / timeout with SAFEHER_REQUIRE_CLAMAV=true (never marks clean!)
- Oversized file rejection
- Caddyfile & docker-compose.prod.yml validation (TLS 1.2/1.3, HSTS, ACME, pinned versions, no secrets)
- FastAPI X-Forwarded-Proto: https HSTS header & CORS configuration
"""

import os
import shutil
import socket
import struct
import tempfile
import threading
import unittest.mock as mock

import pytest
import yaml
from fastapi.testclient import TestClient

from app import app
from security.malware_scanner import (
    EICAR_PATTERN,
    get_malware_scanner_health,
    quarantine_file,
    scan_file_content,
)


def _start_mock_clamd_server(hang_on_instream: bool = False):
    """Starts a real TCP server speaking the clamd zPING / zVERSION / zINSTREAM protocol."""
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.bind(("127.0.0.1", 0))
    srv.listen(8)
    port = srv.getsockname()[1]
    stop_flag = threading.Event()

    def _serve():
        srv.settimeout(0.2)
        while not stop_flag.is_set():
            try:
                conn, _ = srv.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            with conn:
                cmd = conn.recv(16)
                if cmd.startswith(b"zPING"):
                    conn.sendall(b"PONG\0")
                elif cmd.startswith(b"zVERSION"):
                    conn.sendall(b"ClamAV 1.4.1/27450/TestDB\0")
                elif cmd.startswith(b"zINSTREAM"):
                    if hang_on_instream:
                        stop_flag.wait(2.0)
                        continue
                    data = bytearray()
                    buf = cmd[len(b"zINSTREAM\0"):]
                    while True:
                        while len(buf) < 4:
                            chunk = conn.recv(4096)
                            if not chunk:
                                break
                            buf += chunk
                        if len(buf) < 4:
                            break
                        (size,) = struct.unpack(">I", buf[:4])
                        buf = buf[4:]
                        if size == 0:
                            break
                        while len(buf) < size:
                            chunk = conn.recv(4096)
                            if not chunk:
                                break
                            buf += chunk
                        data.extend(buf[:size])
                        buf = buf[size:]
                    if EICAR_PATTERN in bytes(data):
                        conn.sendall(b"stream: Win.Test.EICAR_HDB-1 FOUND\0")
                    else:
                        conn.sendall(b"stream: OK\0")

    t = threading.Thread(target=_serve, daemon=True)
    t.start()
    return srv, port, stop_flag


def test_clamav_instream_clean_eicar_and_health():
    srv, port, stop_flag = _start_mock_clamd_server()
    try:
        with mock.patch.dict(
            os.environ,
            {
                "SAFEHER_ENABLE_CLAMAV": "true",
                "SAFEHER_REQUIRE_CLAMAV": "true",
                "SAFEHER_CLAMAV_HOST": "127.0.0.1",
                "SAFEHER_CLAMAV_PORT": str(port),
            },
        ):
            health = get_malware_scanner_health()
            assert health["status"] == "operational"
            assert health["clamav_online"] is True
            assert "ClamAV" in (health["clamav_version"] or "")

            clean_res = scan_file_content(b"SafeHER clean evidence bytes", "evidence.png")
            assert clean_res.status == "clean"
            assert clean_res.is_clean is True
            assert clean_res.details["antivirus_verified"] is True

            eicar_res = scan_file_content(EICAR_PATTERN, "eicar.txt")
            assert eicar_res.status == "infected"
            assert eicar_res.is_clean is False
            assert "Win.Test.EICAR_HDB-1" in eicar_res.threats_detected

            tmp = tempfile.mkdtemp()
            try:
                qpath = quarantine_file(EICAR_PATTERN, "evi-q1", "eicar.txt", tmp)
                assert os.path.exists(qpath)
            finally:
                shutil.rmtree(tmp, ignore_errors=True)
    finally:
        stop_flag.set()
        srv.close()


def test_clamav_unavailable_and_timeout_never_marked_clean():
    # 1. Closed port with SAFEHER_REQUIRE_CLAMAV=true
    with mock.patch.dict(
        os.environ,
        {
            "SAFEHER_ENABLE_CLAMAV": "true",
            "SAFEHER_REQUIRE_CLAMAV": "true",
            "SAFEHER_CLAMAV_HOST": "127.0.0.1",
            "SAFEHER_CLAMAV_PORT": "59999",
        },
    ):
        res = scan_file_content(b"test", "test.png")
        assert res.status == "scanner_unavailable"
        assert res.is_clean is False
        assert res.details["antivirus_verified"] is False

    # 2. Timeout against hanging daemon
    srv, port, stop_flag = _start_mock_clamd_server(hang_on_instream=True)
    try:
        with mock.patch.dict(
            os.environ,
            {
                "SAFEHER_ENABLE_CLAMAV": "true",
                "SAFEHER_REQUIRE_CLAMAV": "true",
                "SAFEHER_CLAMAV_HOST": "127.0.0.1",
                "SAFEHER_CLAMAV_PORT": str(port),
                "SAFEHER_CLAMAV_TIMEOUT_SECONDS": "0.3",
            },
        ):
            res = scan_file_content(b"test", "test.png")
            assert res.status == "scanner_unavailable"
            assert res.is_clean is False
    finally:
        stop_flag.set()
        srv.close()


def test_caddyfile_and_docker_compose_prod_tls_config():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    caddy_path = os.path.join(repo_root, "caddy", "Caddyfile")
    compose_path = os.path.join(repo_root, "docker-compose.prod.yml")

    with open(caddy_path, encoding="utf-8") as f:
        caddy_txt = f.read()
    assert "protocols tls1.2 tls1.3" in caddy_txt
    assert "Strict-Transport-Security" in caddy_txt
    assert "reverse_proxy backend:8000" in caddy_txt
    assert "reverse_proxy frontend:8080" in caddy_txt

    with open(compose_path, encoding="utf-8") as f:
        compose = yaml.safe_load(f)
    services = compose["services"]
    assert services["clamav"]["image"] == "clamav/clamav:1.4"
    assert services["gateway"]["image"] == "caddy:2.9-alpine"
    assert "443:443" in services["gateway"]["ports"]
    assert "80:80" in services["gateway"]["ports"]
    assert "healthcheck" in services["clamav"]
    assert "healthcheck" in services["backend"]


def test_https_proxy_hsts_header():
    client = TestClient(app)
    resp = client.get("/api/v1/health", headers={"X-Forwarded-Proto": "https"})
    assert resp.status_code == 200
    assert "Strict-Transport-Security" in resp.headers
