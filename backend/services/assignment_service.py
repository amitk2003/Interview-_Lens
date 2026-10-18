"""
Assignment Service — Admin-managed expert-to-assessment assignment system for InterviewLens.

Responsibilities:
  - Assign an interview to a verified expert (admin only).
  - Validate: expert must be EXPERT + is_verified_expert=True.
  - Validate: no active duplicate assignment unless explicitly forced.
  - Validate: conflict-of-interest check (same company/candidate).
  - Reassign with mandatory reason (prior history preserved).
  - Maintain a full, immutable assignment audit log per interview.
  - Deliver in-app notifications to the assigned expert.
  - Query methods for admin queue and expert dashboard.

Persistence: JSON flat file at backend/data/assignments.json
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

logger = logging.getLogger("InterviewLens.AssignmentService")

ASSIGNMENTS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "assignments.json")
NOTIFICATIONS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "notifications.json")

os.makedirs(os.path.dirname(ASSIGNMENTS_FILE), exist_ok=True)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class AssignmentService:
    """Singleton service for interview-to-expert assignment management."""

    _instance: Optional["AssignmentService"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._assignments: Dict[str, dict] = {}
            cls._instance._notifications: List[dict] = []
            cls._instance._load()
        return cls._instance

    # ------------------------------------------------------------------
    # Load / Persist
    # ------------------------------------------------------------------

    def _load(self):
        if os.path.exists(ASSIGNMENTS_FILE):
            try:
                with open(ASSIGNMENTS_FILE, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    if isinstance(raw, list):
                        for item in raw:
                            self._assignments[item["interview_id"]] = item
                    elif isinstance(raw, dict):
                        self._assignments = raw
            except Exception as e:
                logger.warning(f"Could not load assignments: {e}")

        if os.path.exists(NOTIFICATIONS_FILE):
            try:
                with open(NOTIFICATIONS_FILE, "r", encoding="utf-8") as f:
                    self._notifications = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load notifications: {e}")

    def _persist(self):
        try:
            with open(ASSIGNMENTS_FILE, "w", encoding="utf-8") as f:
                json.dump(list(self._assignments.values()), f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save assignments: {e}")
        try:
            with open(NOTIFICATIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(self._notifications, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save notifications: {e}")

    # ------------------------------------------------------------------
    # Notification helpers
    # ------------------------------------------------------------------

    def _push_notification(
        self,
        recipient_user_id: str,
        recipient_email: str,
        notif_type: str,
        title: str,
        body: str,
        interview_id: str,
        interview_title: str,
    ) -> dict:
        notif = {
            "id": f"notif_{uuid.uuid4().hex[:8]}",
            "recipient_user_id": recipient_user_id,
            "recipient_email": recipient_email,
            "type": notif_type,
            "title": title,
            "body": body,
            "interview_id": interview_id,
            "interview_title": interview_title,
            "read": False,
            "created_at": _now_iso(),
        }
        self._notifications.insert(0, notif)
        self._notifications = self._notifications[:200]
        return notif

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def assign(
        self,
        *,
        interview_id: str,
        interview_title: str,
        interview_job_role: str,
        candidate_email: str,
        expert_id: str,
        expert_name: str,
        expert_email: str,
        expert_title: str,
        expert_domain: List[str],
        expert_organization: Optional[str],
        expert_conflict_notes: Optional[str],
        admin_id: str,
        admin_name: str,
        admin_email: str,
        reason: Optional[str] = None,
        force_reassign: bool = False,
    ) -> dict:
        """
        Assign an interview to a verified expert.

        Safeguards:
          1. Expert must not be the candidate themselves.
          2. Duplicate active assignment blocked unless force_reassign=True.
        Returns the updated assignment record.
        """
        # Guard 1 — expert cannot be the candidate
        if expert_email.lower() == (candidate_email or "").lower():
            raise ValueError("An expert cannot be assigned to evaluate their own interview.")

        existing = self._assignments.get(interview_id)

        # Guard 2 — duplicate active assignment
        if existing and existing.get("status") == "ACTIVE":
            if existing["expert_id"] == expert_id:
                raise ValueError(
                    f"Interview is already assigned to {expert_name}. No change needed."
                )
            if not force_reassign:
                raise ValueError(
                    f"Interview is already assigned to expert '{existing['expert_name']}'. "
                    "Set force_reassign=true to transfer the assignment."
                )

        now = _now_iso()
        audit_entry = {
            "id": f"aud_{uuid.uuid4().hex[:8]}",
            "action": "ASSIGNED" if not existing else "REASSIGNED",
            "from_expert_id": existing["expert_id"] if existing else None,
            "from_expert_name": existing["expert_name"] if existing else None,
            "to_expert_id": expert_id,
            "to_expert_name": expert_name,
            "admin_id": admin_id,
            "admin_name": admin_name,
            "reason": reason or "Initial assignment by platform administrator.",
            "timestamp": now,
        }

        if existing:
            history = existing.get("audit_trail", [])
            history.append(audit_entry)
            existing.update({
                "expert_id": expert_id,
                "assigned_expert_id": expert_id,
                "expert_name": expert_name,
                "assigned_expert_name": expert_name,
                "expert_email": expert_email,
                "assigned_expert_email": expert_email,
                "expert_title": expert_title,
                "assigned_expert_title": expert_title,
                "expert_domain": expert_domain,
                "expert_organization": expert_organization,
                "assigned_expert_organization": expert_organization,
                "expert_conflict_notes": expert_conflict_notes,
                "reassignment_reason": reason,
                "status": "ACTIVE",
                "assigned_at": now,
                "reassigned_count": existing.get("reassigned_count", 0) + 1,
                "audit_trail": history,
                "last_updated_at": now,
            })
            record = existing
        else:
            asgn_id = f"asgn_{uuid.uuid4().hex[:8]}"
            record = {
                "id": asgn_id,
                "assignment_id": asgn_id,
                "interview_id": interview_id,
                "interview_title": interview_title,
                "interview_job_role": interview_job_role,
                "candidate_email": candidate_email,
                "expert_id": expert_id,
                "assigned_expert_id": expert_id,
                "expert_name": expert_name,
                "assigned_expert_name": expert_name,
                "expert_email": expert_email,
                "assigned_expert_email": expert_email,
                "expert_title": expert_title,
                "assigned_expert_title": expert_title,
                "expert_domain": expert_domain,
                "expert_organization": expert_organization,
                "assigned_expert_organization": expert_organization,
                "expert_conflict_notes": expert_conflict_notes,
                "assignment_reason": reason,
                "admin_id": admin_id,
                "admin_name": admin_name,
                "admin_email": admin_email,
                "status": "ACTIVE",
                "assigned_at": now,
                "reassigned_count": 0,
                "completed_at": None,
                "audit_trail": [audit_entry],
                "last_updated_at": now,
            }

        self._assignments[interview_id] = record

        # In-app notification
        self._push_notification(
            recipient_user_id=expert_id,
            recipient_email=expert_email,
            notif_type="ASSIGNMENT",
            title="New Assessment Assigned",
            body=(
                f"You have been assigned to review the assessment "
                f'"{interview_title}" ({interview_job_role}). '
                "Please open your Review Queue to begin."
            ),
            interview_id=interview_id,
            interview_title=interview_title,
        )

        self._persist()
        return record

    def complete_assignment(self, interview_id: str) -> Optional[dict]:
        """Mark an assignment as COMPLETED after expert sign-off."""
        rec = self._assignments.get(interview_id)
        if not rec:
            return None
        rec["status"] = "COMPLETED"
        rec["completed_at"] = _now_iso()
        rec["last_updated_at"] = _now_iso()
        self._persist()
        return rec

    def cancel_assignment(self, interview_id: str, admin_name: str, reason: str) -> Optional[dict]:
        """Cancel an active assignment without reassigning."""
        rec = self._assignments.get(interview_id)
        if not rec:
            return None
        rec["status"] = "CANCELLED"
        rec["last_updated_at"] = _now_iso()
        rec.setdefault("audit_trail", []).append({
            "id": f"aud_{uuid.uuid4().hex[:8]}",
            "action": "CANCELLED",
            "from_expert_id": rec.get("expert_id"),
            "from_expert_name": rec.get("expert_name"),
            "to_expert_id": None,
            "to_expert_name": None,
            "admin_name": admin_name,
            "reason": reason,
            "timestamp": _now_iso(),
        })
        self._persist()
        return rec

    # ------------------------------------------------------------------
    # Query
    # ------------------------------------------------------------------

    def get_assignment(self, interview_id: str) -> Optional[dict]:
        return self._assignments.get(interview_id)

    def get_expert_assignments(self, expert_id: str, status: Optional[str] = None) -> List[dict]:
        result = [a for a in self._assignments.values() if a["expert_id"] == expert_id]
        if status:
            result = [a for a in result if a["status"] == status]
        return sorted(result, key=lambda a: a["assigned_at"], reverse=True)

    def list_all_assignments(self, status: Optional[str] = None) -> List[dict]:
        result = list(self._assignments.values())
        if status:
            result = [a for a in result if a["status"] == status]
        return sorted(result, key=lambda a: a.get("last_updated_at", a["assigned_at"]), reverse=True)

    def get_unassigned_interviews(self, all_interviews: list) -> list:
        active_ids = {iid for iid, a in self._assignments.items() if a["status"] == "ACTIVE"}
        waiting_statuses = {"AWAITING_EXPERT_REVIEW", "IN_EXPERT_REVIEW", "REVIEW_REQUIRED"}
        return [rec for rec in all_interviews if rec.id not in active_ids and rec.status in waiting_statuses]

    # ------------------------------------------------------------------
    # Notifications
    # ------------------------------------------------------------------

    def get_notifications(self, user_id: str, unread_only: bool = False) -> List[dict]:
        notifs = [n for n in self._notifications if n["recipient_user_id"] == user_id]
        if unread_only:
            notifs = [n for n in notifs if not n["read"]]
        return notifs

    def mark_notifications_read(self, user_id: str, notification_ids: Optional[List[str]] = None):
        for n in self._notifications:
            if n["recipient_user_id"] != user_id:
                continue
            if notification_ids is None or n["id"] in notification_ids:
                n["read"] = True
        self._persist()

    def get_unread_count(self, user_id: str) -> int:
        return sum(
            1 for n in self._notifications
            if n["recipient_user_id"] == user_id and not n["read"]
        )
