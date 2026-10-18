import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from threading import Lock
from pydantic import BaseModel, Field

logger = logging.getLogger("InterviewLens.AuditService")

AUDIT_LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "security_audit_log.json")

# Sensitive keys that must NEVER appear in audit logs
REDACTED_KEY_PATTERNS = {
    "password", "password_hash", "token", "access_token", "secret",
    "api_key", "authorization", "auth_header", "credential", "private_key"
}

def sanitize_metadata(data: Any, depth: int = 0) -> Any:
    """
    Recursively scrubs sensitive keys, tokens, and credentials from audit metadata.
    Truncates long string blobs to prevent log bloating.
    """
    if depth > 5:
        return "<depth_limit_exceeded>"
    
    if isinstance(data, dict):
        clean = {}
        for k, v in data.items():
            lower_k = str(k).lower()
            if any(pat in lower_k for pat in REDACTED_KEY_PATTERNS):
                clean[k] = "[REDACTED]"
            elif lower_k in ("resume_text", "raw_transcript", "transcript_text"):
                # Truncate large raw text
                clean[k] = f"<{len(str(v))} characters omitted for privacy>"
            else:
                clean[k] = sanitize_metadata(v, depth + 1)
        return clean
    elif isinstance(data, list):
        return [sanitize_metadata(item, depth + 1) for item in data]
    elif isinstance(data, str) and len(data) > 500:
        return data[:500] + "... [truncated]"
    return data


class SecurityAuditEntry(BaseModel):
    id: str = Field(default_factory=lambda: f"aud_{str(uuid.uuid4())[:12]}")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    actor_id: str
    actor_name: str
    actor_email: str
    actor_role: str
    action: str
    target_type: str  # e.g. "ASSESSMENT", "USER", "EXPERT_APPLICATION", "SYSTEM"
    target_id: str
    target_name: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class SecurityAuditService:
    """
    Centralized, append-only security audit log service.
    Audit records are immutable and cannot be edited or deleted via user APIs.
    """
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SecurityAuditService, cls).__new__(cls)
            cls._instance._logs: List[SecurityAuditEntry] = []
            cls._instance._load_logs()
        return cls._instance

    def _load_logs(self):
        os.makedirs(os.path.dirname(AUDIT_LOG_FILE), exist_ok=True)
        if os.path.exists(AUDIT_LOG_FILE):
            try:
                with open(AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    self._logs = [SecurityAuditEntry(**item) for item in raw]
            except Exception as e:
                logger.warning(f"Could not load audit log file: {e}")
                self._logs = []

    def _persist(self):
        try:
            with open(AUDIT_LOG_FILE, "w", encoding="utf-8") as f:
                json.dump([e.model_dump() for e in self._logs], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to persist audit log: {e}")

    def log(
        self,
        actor: Any,  # UserProfile or dict
        action: str,
        target_type: str,
        target_id: str,
        target_name: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> SecurityAuditEntry:
        """
        Appends an immutable audit log entry.
        Never logs passwords, tokens, or private applicant credentials.
        """
        # Extract actor properties safely
        actor_id = getattr(actor, "id", None) or (actor.get("id") if isinstance(actor, dict) else "system")
        actor_name = getattr(actor, "name", None) or (actor.get("name") if isinstance(actor, dict) else "System")
        actor_email = getattr(actor, "email", None) or (actor.get("email") if isinstance(actor, dict) else "system@interviewlens.ai")
        actor_role = getattr(actor, "role", None) or (actor.get("role") if isinstance(actor, dict) else "SYSTEM")

        clean_details = sanitize_metadata(details or {})

        entry = SecurityAuditEntry(
            actor_id=str(actor_id),
            actor_name=str(actor_name),
            actor_email=str(actor_email),
            actor_role=str(actor_role),
            action=action,
            target_type=target_type,
            target_id=str(target_id),
            target_name=target_name,
            details=clean_details
        )

        with self._lock:
            self._logs.append(entry)
            self._persist()

        logger.info(f"AUDIT: [{entry.action}] by {entry.actor_name} ({entry.actor_role}) on {entry.target_type}:{entry.target_id}")
        return entry

    def get_logs(
        self,
        target_id: Optional[str] = None,
        target_type: Optional[str] = None,
        actor_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100
    ) -> List[SecurityAuditEntry]:
        """
        Query audit logs (Read-only for Admins).
        """
        with self._lock:
            res = self._logs
            if target_id:
                res = [e for e in res if e.target_id == target_id]
            if target_type:
                res = [e for e in res if e.target_type == target_type]
            if actor_id:
                res = [e for e in res if e.actor_id == actor_id]
            if action:
                res = [e for e in res if e.action == action]
            # Return most recent first
            return sorted(res, key=lambda x: x.timestamp, reverse=True)[:limit]

# Singleton instance
audit_service = SecurityAuditService()
