import datetime
import json
import os
import sqlite3
from contextlib import contextmanager
from typing import Iterator, Dict, Any, Optional, List

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


get_connection = get_db


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
                storage_status TEXT NOT NULL DEFAULT 'pending',
                validation_status TEXT NOT NULL DEFAULT 'passed',
                malware_status TEXT NOT NULL DEFAULT 'clean',
                processing_status TEXT NOT NULL DEFAULT 'ready',
                duplicate_status TEXT NOT NULL DEFAULT 'unique',
                notes TEXT,
                encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
                encryption_version TEXT NOT NULL DEFAULT 'v2',
                data_nonce TEXT,
                wrapped_dek TEXT,
                wrapping_nonce TEXT,
                key_id TEXT NOT NULL DEFAULT 'kek-local-v1',
                key_version TEXT NOT NULL DEFAULT '1',
                original_sha256 TEXT,
                ciphertext_sha256 TEXT,
                encryption_timestamp TEXT,
                wrapped_key TEXT,
                signature TEXT,
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
                c2pa_result TEXT,
                face_localization TEXT,
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
                multilingual_metadata TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS threat_analysis_feedback (
                id TEXT PRIMARY KEY,
                analysis_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                corrected_categories TEXT NOT NULL,
                corrected_severity TEXT,
                is_false_positive INTEGER NOT NULL DEFAULT 0,
                notes TEXT,
                used_for_training INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (analysis_id) REFERENCES threat_analyses(id) ON DELETE CASCADE,
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

            CREATE TABLE IF NOT EXISTS custody_records (
                id TEXT PRIMARY KEY,
                evidence_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                prev_record_hash TEXT,
                record_hash TEXT,
                FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS revoked_tokens (
                token_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                revoked_at TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS analysis_jobs (
                id TEXT PRIMARY KEY,
                evidence_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                model_type TEXT NOT NULL,
                status TEXT NOT NULL,
                result_json TEXT,
                error_message TEXT,
                created_at TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
            );

            -- ==========================================================
            -- STAGE 5: EVIDENCE INTELLIGENCE GRAPH
            -- ==========================================================
            CREATE TABLE IF NOT EXISTS evidence_graph_nodes (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                incident_id TEXT NOT NULL,
                case_id TEXT,
                node_type TEXT NOT NULL,
                label TEXT NOT NULL,
                entity_ref_id TEXT,
                metadata_json TEXT NOT NULL DEFAULT '{}',
                privacy_redacted INTEGER NOT NULL DEFAULT 0,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS evidence_graph_edges (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                incident_id TEXT NOT NULL,
                case_id TEXT,
                source_node_id TEXT NOT NULL,
                target_node_id TEXT NOT NULL,
                relationship_type TEXT NOT NULL,
                extraction_method TEXT NOT NULL,
                source_evidence_id TEXT,
                supporting_ref TEXT,
                confidence_score REAL,
                confidence_note TEXT,
                verification_status TEXT NOT NULL DEFAULT 'suggested',
                reviewed_by TEXT,
                reviewed_at TEXT,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
                FOREIGN KEY (source_node_id) REFERENCES evidence_graph_nodes(id) ON DELETE CASCADE,
                FOREIGN KEY (target_node_id) REFERENCES evidence_graph_nodes(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS relationship_reviews (
                id TEXT PRIMARY KEY,
                edge_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                reviewer_id TEXT NOT NULL,
                previous_status TEXT NOT NULL,
                new_status TEXT NOT NULL,
                review_note TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (edge_id) REFERENCES evidence_graph_edges(id) ON DELETE CASCADE,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
            );

            -- ==========================================================
            -- STAGE 5: NORMALIZED TIMELINE SOURCES, RELATIONS & REVISIONS
            -- ==========================================================
            CREATE TABLE IF NOT EXISTS timeline_event_sources (
                id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL,
                evidence_id TEXT,
                source_type TEXT NOT NULL,
                extraction_method TEXT NOT NULL,
                raw_excerpt TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (event_id) REFERENCES timeline_events(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS timeline_event_relations (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                source_event_id TEXT NOT NULL,
                target_event_id TEXT NOT NULL,
                relation_type TEXT NOT NULL,
                correlation_rule TEXT NOT NULL,
                reason TEXT NOT NULL,
                supporting_evidence_id TEXT,
                confidence REAL,
                verification_status TEXT NOT NULL DEFAULT 'suggested',
                reviewed_by TEXT,
                reviewed_at TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (source_event_id) REFERENCES timeline_events(id) ON DELETE CASCADE,
                FOREIGN KEY (target_event_id) REFERENCES timeline_events(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS timeline_event_revisions (
                id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL,
                editor_id TEXT NOT NULL,
                previous_json TEXT NOT NULL,
                new_json TEXT NOT NULL,
                reason TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (event_id) REFERENCES timeline_events(id) ON DELETE CASCADE
            );

            -- ==========================================================
            -- STAGE 5: IMAGE TAMPERING DETECTION & LOCALIZATION
            -- ==========================================================
            CREATE TABLE IF NOT EXISTS tampering_analyses (
                id TEXT PRIMARY KEY,
                evidence_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                model_id TEXT NOT NULL,
                model_version TEXT NOT NULL,
                checkpoint_id TEXT,
                analysis_status TEXT NOT NULL,
                tampering_score REAL,
                localization_available INTEGER NOT NULL DEFAULT 0,
                heatmap_artifact_id TEXT,
                mask_artifact_id TEXT,
                input_width INTEGER,
                input_height INTEGER,
                original_width INTEGER,
                original_height INTEGER,
                coordinate_transform_json TEXT NOT NULL DEFAULT '{}',
                processing_time_ms REAL NOT NULL DEFAULT 0.0,
                device TEXT NOT NULL DEFAULT 'cpu',
                warnings_json TEXT NOT NULL DEFAULT '[]',
                limitations_json TEXT NOT NULL DEFAULT '[]',
                review_status TEXT NOT NULL DEFAULT 'unreviewed',
                reviewed_by TEXT,
                review_notes TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tampering_artifacts (
                id TEXT PRIMARY KEY,
                analysis_id TEXT NOT NULL,
                evidence_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                artifact_type TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                sha256_hash TEXT NOT NULL,
                encryption_version TEXT NOT NULL DEFAULT 'v2',
                data_nonce TEXT,
                wrapped_dek TEXT,
                wrapping_nonce TEXT,
                key_id TEXT NOT NULL DEFAULT 'kek-local-v1',
                key_version TEXT NOT NULL DEFAULT '1',
                width INTEGER,
                height INTEGER,
                created_at TEXT NOT NULL,
                FOREIGN KEY (analysis_id) REFERENCES tampering_analyses(id) ON DELETE CASCADE,
                FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            -- ==========================================================
            -- STAGE 5: ADVANCED CASE MANAGEMENT & COLLABORATION
            -- ==========================================================
            CREATE TABLE IF NOT EXISTS case_evidence_links (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                evidence_id TEXT NOT NULL,
                linked_by TEXT NOT NULL,
                link_reason TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
                FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS case_assignments (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                assigned_by TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                assigned_at TEXT NOT NULL,
                revoked_at TEXT,
                revoke_reason TEXT,
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS case_notes (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                evidence_id TEXT,
                author_id TEXT NOT NULL,
                note_type TEXT NOT NULL DEFAULT 'investigation',
                content TEXT NOT NULL,
                is_system_generated INTEGER NOT NULL DEFAULT 0,
                revision_number INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS case_activity (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                action TEXT NOT NULL,
                from_status TEXT,
                to_status TEXT,
                reason TEXT,
                details_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
            );

            -- Indexes for Stage 5 forensic performance
            CREATE INDEX IF NOT EXISTS idx_graph_nodes_incident ON evidence_graph_nodes(incident_id, owner_id);
            CREATE INDEX IF NOT EXISTS idx_graph_edges_incident ON evidence_graph_edges(incident_id, owner_id);
            CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON evidence_graph_edges(source_node_id);
            CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON evidence_graph_edges(target_node_id);
            CREATE INDEX IF NOT EXISTS idx_timeline_incident_ts ON timeline_events(incident_id, timestamp);
            CREATE INDEX IF NOT EXISTS idx_tampering_evidence ON tampering_analyses(evidence_id, user_id);
            CREATE INDEX IF NOT EXISTS idx_case_assignments_user ON case_assignments(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_case_notes_case ON case_notes(case_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_case_activity_case ON case_activity(case_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_custody_evidence ON custody_records(evidence_id, timestamp);

            -- ==========================================================
            -- STAGE 6: SURVIVOR SAFETY, TRUSTED CONTACTS & JOURNEY CHECK-IN
            -- ==========================================================
            CREATE TABLE IF NOT EXISTS trusted_contacts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                relationship TEXT NOT NULL DEFAULT 'other',
                notify_on_escalation INTEGER NOT NULL DEFAULT 1,
                is_verified INTEGER NOT NULL DEFAULT 0,
                verified_at TEXT,
                verification_code_hash TEXT,
                verification_expires_at TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sms_notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                contact_id TEXT,
                journey_id TEXT,
                correlation_id TEXT NOT NULL,
                idempotency_key TEXT NOT NULL UNIQUE,
                event_type TEXT NOT NULL,
                recipient_masked TEXT NOT NULL,
                recipient_phone_e164 TEXT NOT NULL,
                message_body TEXT NOT NULL,
                reference_code TEXT NOT NULL,
                provider TEXT NOT NULL,
                provider_message_sid TEXT,
                status TEXT NOT NULL DEFAULT 'queued',
                attempts INTEGER NOT NULL DEFAULT 0,
                max_attempts INTEGER NOT NULL DEFAULT 3,
                next_retry_at TEXT,
                last_error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                sent_at TEXT,
                delivered_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_sms_queue ON sms_notifications(status, next_retry_at);
            CREATE INDEX IF NOT EXISTS idx_sms_user ON sms_notifications(user_id, created_at);

            CREATE TABLE IF NOT EXISTS journey_checkins (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                destination_label TEXT NOT NULL,
                duration_minutes INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                contact_id TEXT,
                started_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (contact_id) REFERENCES trusted_contacts(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS user_safety_settings (
                user_id TEXT PRIMARY KEY,
                quick_exit_url TEXT NOT NULL DEFAULT 'https://www.weather.com',
                siren_duration_seconds INTEGER NOT NULL DEFAULT 30,
                siren_volume REAL NOT NULL DEFAULT 0.8,
                fake_call_caller_name TEXT NOT NULL DEFAULT 'Mom',
                fake_call_delay_seconds INTEGER NOT NULL DEFAULT 10,
                emergency_number TEXT NOT NULL DEFAULT '112',
                show_siren_in_drawer INTEGER NOT NULL DEFAULT 1,
                show_fake_call_in_drawer INTEGER NOT NULL DEFAULT 1,
                show_journey_in_drawer INTEGER NOT NULL DEFAULT 1,
                show_emergency_call_in_drawer INTEGER NOT NULL DEFAULT 1,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            -- ==========================================================
            -- STAGE 7: PRODUCTION MALWARE SCANNING & AUDIT LOGS
            -- ==========================================================
            CREATE TABLE IF NOT EXISTS malware_scan_logs (
                id TEXT PRIMARY KEY,
                evidence_id TEXT,
                user_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                scan_status TEXT NOT NULL,
                scanner_engine TEXT NOT NULL,
                threats_detected_json TEXT NOT NULL DEFAULT '[]',
                scan_duration_ms REAL NOT NULL DEFAULT 0.0,
                quarantine_path TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON trusted_contacts(user_id);
            CREATE INDEX IF NOT EXISTS idx_journey_checkins_user ON journey_checkins(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_malware_scan_evidence ON malware_scan_logs(evidence_id, user_id);
            """
        )

        # Non-destructive migrations for existing sqlite databases
        # 1. users.role
        user_cols = {row["name"] for row in conn.execute("PRAGMA table_info(users);").fetchall()}
        if "role" not in user_cols:
            conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'survivor';")

        # 2. evidence crypto columns
        evi_cols = {row["name"] for row in conn.execute("PRAGMA table_info(evidence);").fetchall()}
        if "encryption_algorithm" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM';")
        if "encryption_version" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN encryption_version TEXT NOT NULL DEFAULT 'v2';")
        if "data_nonce" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN data_nonce TEXT;")
        if "wrapped_dek" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN wrapped_dek TEXT;")
        if "wrapping_nonce" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN wrapping_nonce TEXT;")
        if "key_id" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN key_id TEXT NOT NULL DEFAULT 'kek-local-v1';")
        if "key_version" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN key_version TEXT NOT NULL DEFAULT '1';")
        if "original_sha256" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN original_sha256 TEXT;")
        if "ciphertext_sha256" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN ciphertext_sha256 TEXT;")
        if "encryption_timestamp" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN encryption_timestamp TEXT;")
        if "wrapped_key" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN wrapped_key TEXT;")
        if "signature" not in evi_cols:
            conn.execute("ALTER TABLE evidence ADD COLUMN signature TEXT;")

        # 3. media_analyses Stage 2 & Stage 3 columns
        media_cols = {row["name"] for row in conn.execute("PRAGMA table_info(media_analyses);").fetchall()}
        if "c2pa_result" not in media_cols:
            conn.execute("ALTER TABLE media_analyses ADD COLUMN c2pa_result TEXT;")
        if "face_localization" not in media_cols:
            conn.execute("ALTER TABLE media_analyses ADD COLUMN face_localization TEXT;")
        if "model_a_result" not in media_cols:
            conn.execute("ALTER TABLE media_analyses ADD COLUMN model_a_result TEXT;")
        if "model_b_result" not in media_cols:
            conn.execute("ALTER TABLE media_analyses ADD COLUMN model_b_result TEXT;")

        # 4. timeline_events Stage 5 normalized columns
        tl_cols = {row["name"] for row in conn.execute("PRAGMA table_info(timeline_events);").fetchall()}
        for col_name, col_def in [
            ("case_id", "TEXT"),
            ("event_time_original", "TEXT"),
            ("event_time_utc", "TEXT"),
            ("timezone_original", "TEXT"),
            ("timezone_confidence", "TEXT DEFAULT 'unknown'"),
            ("time_precision", "TEXT DEFAULT 'exact'"),
            ("time_end_original", "TEXT"),
            ("time_source", "TEXT DEFAULT 'manual_entry'"),
            ("extraction_method", "TEXT DEFAULT 'user_input'"),
            ("confidence_status", "TEXT DEFAULT 'unverified'"),
            ("verification_status", "TEXT DEFAULT 'user_asserted'"),
            ("reviewed_by", "TEXT"),
            ("reviewed_at", "TEXT"),
            ("created_at", "TEXT"),
            ("updated_at", "TEXT"),
            ("created_by", "TEXT"),
            ("is_deleted", "INTEGER NOT NULL DEFAULT 0"),
        ]:
            if col_name not in tl_cols:
                conn.execute(f"ALTER TABLE timeline_events ADD COLUMN {col_name} {col_def};")

        # 5. cases Stage 5 columns
        case_cols = {row["name"] for row in conn.execute("PRAGMA table_info(cases);").fetchall()}
        for col_name, col_def in [
            ("title", "TEXT"),
            ("description", "TEXT"),
            ("updated_by", "TEXT"),
            ("lifecycle_version", "INTEGER NOT NULL DEFAULT 1"),
        ]:
            if col_name not in case_cols:
                conn.execute(f"ALTER TABLE cases ADD COLUMN {col_name} {col_def};")

        # 6. custody_records Stage 5 columns
        cust_cols = {row["name"] for row in conn.execute("PRAGMA table_info(custody_records);").fetchall()}
        for col_name, col_def in [
            ("case_id", "TEXT"),
            ("prev_custody_holder", "TEXT"),
            ("new_custody_holder", "TEXT"),
            ("purpose", "TEXT"),
            ("transfer_reason", "TEXT"),
            ("integrity_hash", "TEXT"),
            ("verification_result", "TEXT"),
        ]:
            if col_name not in cust_cols:
                conn.execute(f"ALTER TABLE custody_records ADD COLUMN {col_name} {col_def};")

        # 7. trusted_contacts Stage 6 verification columns
        tc_cols = {row["name"] for row in conn.execute("PRAGMA table_info(trusted_contacts);").fetchall()}
        for col_name, col_def in [
            ("is_verified", "INTEGER NOT NULL DEFAULT 0"),
            ("verified_at", "TEXT"),
            ("verification_code_hash", "TEXT"),
            ("verification_expires_at", "TEXT"),
        ]:
            if col_name not in tc_cols:
                conn.execute(f"ALTER TABLE trusted_contacts ADD COLUMN {col_name} {col_def};")


def create_analysis_job(job_id: str, evidence_id: str, owner_id: str, model_type: str) -> Dict[str, Any]:
    with get_db() as conn:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO analysis_jobs (id, evidence_id, owner_id, model_type, status, created_at)
            VALUES (?, ?, ?, ?, 'queued', ?)
            """,
            (job_id, str(evidence_id), str(owner_id), model_type, now),
        )
        row = conn.execute("SELECT * FROM analysis_jobs WHERE id = ?", (job_id,)).fetchone()
        return dict(row)


def get_analysis_job(job_id: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM analysis_jobs WHERE id = ?", (job_id,)).fetchone()
        return dict(row) if row else None


def update_analysis_job(
    job_id: str,
    status: str,
    result_json: Optional[str] = None,
    error_message: Optional[str] = None,
    started_at: Optional[str] = None,
    completed_at: Optional[str] = None,
) -> bool:
    with get_db() as conn:
        params: List[Any] = [status]
        sql = "UPDATE analysis_jobs SET status = ?"
        if result_json is not None:
            sql += ", result_json = ?"
            params.append(result_json)
        if error_message is not None:
            sql += ", error_message = ?"
            params.append(error_message)
        if started_at is not None:
            sql += ", started_at = ?"
            params.append(started_at)
        if completed_at is not None:
            sql += ", completed_at = ?"
            params.append(completed_at)
        sql += " WHERE id = ?"
        params.append(job_id)
        cur = conn.execute(sql, tuple(params))
        return cur.rowcount > 0


def list_analysis_jobs_for_evidence(evidence_id: str, owner_id: str) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT * FROM analysis_jobs 
            WHERE evidence_id = ? AND owner_id = ?
            ORDER BY created_at DESC
            """,
            (str(evidence_id), str(owner_id)),
        ).fetchall()
        return [dict(r) for r in rows]


def cancel_analysis_job(job_id: str, owner_id: str) -> bool:
    with get_db() as conn:
        row = conn.execute(
            "SELECT status FROM analysis_jobs WHERE id = ? AND owner_id = ?",
            (job_id, str(owner_id)),
        ).fetchone()
        if not row:
            return False
        if row["status"] in ("completed", "failed", "cancelled"):
            return False
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cur = conn.execute(
            "UPDATE analysis_jobs SET status = 'cancelled', completed_at = ? WHERE id = ?",
            (now, job_id),
        )
        return cur.rowcount > 0


# =============================================================================
# STAGE 6: SURVIVOR SAFETY, TRUSTED CONTACTS & JOURNEY CHECK-IN HELPERS
# =============================================================================

def get_or_create_safety_settings(user_id: str) -> Dict[str, Any]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM user_safety_settings WHERE user_id = ?", (str(user_id),)).fetchone()
        if row:
            return dict(row)
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO user_safety_settings (
                user_id, quick_exit_url, siren_duration_seconds, siren_volume,
                fake_call_caller_name, fake_call_delay_seconds, emergency_number,
                show_siren_in_drawer, show_fake_call_in_drawer, show_journey_in_drawer,
                show_emergency_call_in_drawer, updated_at
            ) VALUES (?, 'https://www.weather.com', 30, 0.8, 'Mom', 10, '112', 1, 1, 1, 1, ?)
            """,
            (str(user_id), now),
        )
        new_row = conn.execute("SELECT * FROM user_safety_settings WHERE user_id = ?", (str(user_id),)).fetchone()
        return dict(new_row)


def update_safety_settings(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    current = get_or_create_safety_settings(user_id)
    allowed_keys = {
        "quick_exit_url", "siren_duration_seconds", "siren_volume",
        "fake_call_caller_name", "fake_call_delay_seconds", "emergency_number",
        "show_siren_in_drawer", "show_fake_call_in_drawer", "show_journey_in_drawer",
        "show_emergency_call_in_drawer"
    }
    filtered = {k: v for k, v in updates.items() if k in allowed_keys}
    if not filtered:
        return current

    with get_db() as conn:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        set_clauses = [f"{k} = ?" for k in filtered.keys()]
        set_clauses.append("updated_at = ?")
        params = list(filtered.values()) + [now, str(user_id)]
        conn.execute(
            f"UPDATE user_safety_settings SET {', '.join(set_clauses)} WHERE user_id = ?",
            tuple(params),
        )
        row = conn.execute("SELECT * FROM user_safety_settings WHERE user_id = ?", (str(user_id),)).fetchone()
        return dict(row)


def list_trusted_contacts(user_id: str) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM trusted_contacts WHERE user_id = ? ORDER BY created_at ASC",
            (str(user_id),),
        ).fetchall()
        return [dict(r) for r in rows]


def add_trusted_contact(
    contact_id: str,
    user_id: str,
    name: str,
    phone_number: str,
    relationship: str = "other",
    notify_on_escalation: bool = True,
) -> Dict[str, Any]:
    with get_db() as conn:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO trusted_contacts (id, user_id, name, phone_number, relationship, notify_on_escalation, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (contact_id, str(user_id), name.strip(), phone_number.strip(), relationship.strip(), 1 if notify_on_escalation else 0, now),
        )
        row = conn.execute("SELECT * FROM trusted_contacts WHERE id = ?", (contact_id,)).fetchone()
        return dict(row)


def delete_trusted_contact(contact_id: str, user_id: str) -> bool:
    with get_db() as conn:
        cur = conn.execute(
            "DELETE FROM trusted_contacts WHERE id = ? AND user_id = ?",
            (str(contact_id), str(user_id)),
        )
        return cur.rowcount > 0


def start_journey_checkin(
    journey_id: str,
    user_id: str,
    destination_label: str,
    duration_minutes: int,
    contact_id: Optional[str] = None,
) -> Dict[str, Any]:
    with get_db() as conn:
        # Cancel any existing active checkins for this user first
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        now_iso = now_dt.isoformat()
        conn.execute(
            "UPDATE journey_checkins SET status = 'cancelled', completed_at = ? WHERE user_id = ? AND status = 'active'",
            (now_iso, str(user_id)),
        )

        expires_dt = now_dt + datetime.timedelta(minutes=max(1, duration_minutes))
        expires_iso = expires_dt.isoformat()

        conn.execute(
            """
            INSERT INTO journey_checkins (id, user_id, destination_label, duration_minutes, status, contact_id, started_at, expires_at)
            VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
            """,
            (journey_id, str(user_id), destination_label.strip(), duration_minutes, str(contact_id) if contact_id else None, now_iso, expires_iso),
        )
        row = conn.execute("SELECT * FROM journey_checkins WHERE id = ?", (journey_id,)).fetchone()
        return dict(row)


def complete_journey_checkin(journey_id: str, user_id: str) -> bool:
    with get_db() as conn:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cur = conn.execute(
            "UPDATE journey_checkins SET status = 'completed_safely', completed_at = ? WHERE id = ? AND user_id = ? AND status = 'active'",
            (now_iso, str(journey_id), str(user_id)),
        )
        return cur.rowcount > 0


def cancel_journey_checkin(journey_id: str, user_id: str) -> bool:
    with get_db() as conn:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cur = conn.execute(
            "UPDATE journey_checkins SET status = 'cancelled', completed_at = ? WHERE id = ? AND user_id = ? AND status = 'active'",
            (now_iso, str(journey_id), str(user_id)),
        )
        return cur.rowcount > 0


def get_active_journey_checkin(user_id: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        row = conn.execute(
            "SELECT * FROM journey_checkins WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
            (str(user_id),),
        ).fetchone()
        if not row:
            return None
        res = dict(row)
        # Check if already expired based on current timestamp
        expires_dt = datetime.datetime.fromisoformat(res["expires_at"].replace("Z", "+00:00"))
        if now_dt > expires_dt:
            conn.execute(
                "UPDATE journey_checkins SET status = 'expired' WHERE id = ?",
                (res["id"],),
            )
            res["status"] = "expired"
        return res


# =============================================================================
# STAGE 7: MALWARE SCANNING AUDIT LOG HELPERS
# =============================================================================

def log_malware_scan(
    scan_id: str,
    evidence_id: Optional[str],
    user_id: str,
    filename: str,
    scan_status: str,
    scanner_engine: str,
    threats_detected: List[str],
    scan_duration_ms: float = 0.0,
    quarantine_path: Optional[str] = None,
) -> Dict[str, Any]:
    with get_db() as conn:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        threats_json = json.dumps(threats_detected)
        conn.execute(
            """
            INSERT INTO malware_scan_logs (
                id, evidence_id, user_id, filename, scan_status, scanner_engine,
                threats_detected_json, scan_duration_ms, quarantine_path, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scan_id,
                str(evidence_id) if evidence_id else None,
                str(user_id),
                filename,
                scan_status,
                scanner_engine,
                threats_json,
                float(scan_duration_ms),
                quarantine_path,
                now,
            ),
        )
        row = conn.execute("SELECT * FROM malware_scan_logs WHERE id = ?", (scan_id,)).fetchone()
        res = dict(row)
        res["threats_detected"] = json.loads(res["threats_detected_json"])
        return res


def get_malware_scan_log(evidence_id: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM malware_scan_logs WHERE evidence_id = ? ORDER BY created_at DESC LIMIT 1",
            (str(evidence_id),),
        ).fetchone()
        if not row:
            return None
        res = dict(row)
        res["threats_detected"] = json.loads(res["threats_detected_json"])
        return res

