import os
import sqlite3
from contextlib import contextmanager
from typing import Iterator

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "safeher.db")
DEFAULT_STORAGE_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "storage", "evidence"
)


def get_db_path() -> str:
    return os.environ.get("SAFEHER_DB_PATH", DEFAULT_DB_PATH)


def get_storage_dir() -> str:
    path = os.environ.get("SAFEHER_STORAGE_DIR", DEFAULT_STORAGE_DIR)
    os.makedirs(path, exist_ok=True)
    return path


def get_database_config() -> dict:
    db_url = os.environ.get("DATABASE_URL", "").strip()
    return {
        "engine": "postgresql" if db_url.startswith("postgres") else "sqlite",
        "database_url_configured": bool(db_url),
        "sqlite_path": get_db_path(),
        "storage_mode": os.environ.get("SAFEHER_STORAGE_MODE", "local"),
        "wal_enabled": True,
    }


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(get_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    os.makedirs(os.path.dirname(os.path.abspath(get_db_path())), exist_ok=True)
    get_storage_dir()
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                consent_acknowledged INTEGER NOT NULL DEFAULT 1,
                consent_date TEXT NOT NULL,
                preferred_language TEXT NOT NULL DEFAULT 'en',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                platform TEXT NOT NULL,
                incident_date TEXT NOT NULL,
                incident_time TEXT,
                relevant_urls TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'open',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS evidence (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                sha256_hash TEXT NOT NULL,
                upload_timestamp TEXT NOT NULL,
                storage_status TEXT NOT NULL DEFAULT 'stored_encrypted',
                validation_status TEXT NOT NULL DEFAULT 'passed',
                malware_status TEXT NOT NULL DEFAULT 'clean',
                processing_status TEXT NOT NULL DEFAULT 'ready',
                duplicate_status TEXT NOT NULL DEFAULT 'unique',
                notes TEXT,
                FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS media_analyses (
                id TEXT PRIMARY KEY,
                evidence_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                media_type TEXT NOT NULL,
                model_name TEXT NOT NULL,
                model_version TEXT NOT NULL,
                deepfake_score REAL NOT NULL,
                nudity_score REAL NOT NULL,
                is_calibrated INTEGER NOT NULL DEFAULT 0,
                uncertainty_state TEXT NOT NULL,
                decision TEXT NOT NULL,
                compression_anomaly_detected INTEGER NOT NULL DEFAULT 0,
                c2pa_provenance TEXT NOT NULL,
                limitations TEXT NOT NULL,
                recommended_next_steps TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS threat_analyses (
                id TEXT PRIMARY KEY,
                incident_id TEXT,
                user_id TEXT NOT NULL,
                input_text TEXT NOT NULL,
                toxicity_score REAL NOT NULL,
                insult_score REAL NOT NULL,
                threat_score REAL NOT NULL,
                harassment_score REAL NOT NULL,
                blackmail_score REAL NOT NULL,
                extortion_score REAL NOT NULL,
                urgency_level TEXT NOT NULL,
                decision TEXT NOT NULL,
                detected_signals TEXT NOT NULL,
                explanation TEXT NOT NULL,
                limitations TEXT NOT NULL,
                suggested_steps TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS timeline_events (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                source TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                related_evidence_id TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS complaint_drafts (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                incident_summary TEXT NOT NULL,
                affected_party_statement TEXT NOT NULL,
                platform_details TEXT NOT NULL,
                timeline_summary TEXT NOT NULL,
                evidence_inventory TEXT NOT NULL,
                threat_indicators TEXT NOT NULL,
                requested_authorities TEXT NOT NULL,
                full_draft_text TEXT NOT NULL,
                is_user_confirmed INTEGER NOT NULL DEFAULT 0,
                user_confirmed_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                follow_up_date TEXT,
                reporting_references TEXT NOT NULL DEFAULT '[]',
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reporting_records (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                destination_id TEXT NOT NULL,
                destination_name TEXT NOT NULL,
                submission_date TEXT NOT NULL,
                reference_number TEXT NOT NULL,
                status TEXT NOT NULL,
                follow_up_date TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
