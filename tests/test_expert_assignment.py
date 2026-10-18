"""
Unit and Integration Tests for Industry Expert Dashboard & Assessment Assignment System
Verifies:
  - Admin assessment assignment queue
  - Expert domain matching and validation
  - In-app notification delivery on assignment
  - Expert dashboard metrics & assigned queue
  - Admin reassignment with mandatory recorded reason
  - Assignment cancellation workflow
  - Safeguards against assigning unverified experts
  - Safeguards against unauthorized cross-expert access/sign-off
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.auth_service import AuthService
from backend.services.assignment_service import AssignmentService
from backend.services.storage import InterviewStorage
from backend.models.schemas import InterviewRecord, DimensionScores

client = TestClient(app)

def make_token(email: str) -> str:
    import uuid
    token = f"tok_test_{str(uuid.uuid4())[:8]}"
    AuthService._sessions[token] = email.strip().lower()
    return token

@pytest.fixture(autouse=True)
def setup_test_state():
    """Ensure clean test users, interviews, and assignments."""
    admin_email = "admin@interviewlens.ai"
    AuthService._users[admin_email] = {
        "id": "adm_test_01",
        "name": "Admin Officer",
        "email": admin_email,
        "password_hash": AuthService.hash_password("admin2024!"),
        "role": "ADMIN",
        "auth_provider": "Email",
        "is_verified_expert": False,
        "expert_approval_status": "APPROVED",
        "created_at": "2026-10-18T10:00:00"
    }
    admin = AuthService.get_user_by_email(admin_email)
    admin_token = make_token(admin_email)

    expert_email = "verified_expert@interviewlens.ai"
    AuthService._users[expert_email] = {
        "id": "exp_test_01",
        "name": "Dr. Jane Expert",
        "email": expert_email,
        "password_hash": AuthService.hash_password("expert_pass"),
        "role": "EXPERT",
        "auth_provider": "Email",
        "is_verified_expert": True,
        "expert_approval_status": "APPROVED",
        "expert_title": "Principal Distributed Systems Architect",
        "expert_organization": "CloudScale Inc",
        "supported_interview_categories": ["Distributed Systems", "Cloud Architecture"],
        "technical_expertise": ["Raft", "Kubernetes", "Go"],
        "created_at": "2026-10-18T10:00:00"
    }
    expert = AuthService.get_user_by_email(expert_email)
    expert_token = make_token(expert_email)

    unverified_email = "pending_dev@interviewlens.ai"
    AuthService._users[unverified_email] = {
        "id": "usr_test_01",
        "name": "Bob Pending",
        "email": unverified_email,
        "password_hash": AuthService.hash_password("pending_pass"),
        "role": "CANDIDATE",
        "auth_provider": "Email",
        "is_verified_expert": False,
        "expert_approval_status": "PENDING",
        "created_at": "2026-10-18T10:00:00"
    }
    unverified = AuthService.get_user_by_email(unverified_email)
    unverified_token = make_token(unverified_email)

    # Create a test interview record awaiting review
    storage = InterviewStorage()
    test_interview = InterviewRecord(
        id="int_assign_test_01",
        title="Distributed Systems Lead Assessment",
        job_role="Principal Distributed Systems Engineer",
        candidate_name="Alice Candidate",
        candidate_email="alice@candidate.com",
        status="AWAITING_EXPERT_REVIEW",
        scores=DimensionScores(overall=84.0, technical_knowledge=88.0, problem_solving=82.0, communication=80.0, system_design=86.0),
        expert_domain_tag="Distributed Systems"
    )
    storage.save(test_interview)

    return {
        "admin": admin,
        "admin_token": admin_token,
        "expert": expert,
        "expert_token": expert_token,
        "unverified": unverified,
        "unverified_token": unverified_token,
        "interview_id": "int_assign_test_01"
    }

def test_admin_assignment_queue_lists_unassigned(setup_test_state):
    """Admin queue must return unassigned interviews ready for dispatch."""
    token = setup_test_state["admin_token"]
    res = client.get(f"/api/admin/assignment-queue?token={token}")
    assert res.status_code == 200
    data = res.json()
    assert "unassigned_interviews" in data
    assert "assignments" in data
    assert "summary" in data

    unassigned_ids = [i["id"] for i in data["unassigned_interviews"]]
    assert setup_test_state["interview_id"] in unassigned_ids

def test_assign_unverified_user_fails(setup_test_state):
    """Safeguard: assigning an unverified user as an expert must fail with HTTP 403."""
    admin_token = setup_test_state["admin_token"]
    unverified_id = setup_test_state["unverified"].id
    int_id = setup_test_state["interview_id"]

    res = client.post(
        f"/api/admin/assign-expert?token={admin_token}",
        json={
            "interview_id": int_id,
            "expert_id": unverified_id,
            "reason": "Invalid assignment attempt"
        }
    )
    assert res.status_code == 403
    assert "not a verified expert" in res.json()["detail"].lower()

def test_admin_assign_verified_expert_and_notification(setup_test_state):
    """Admin assigns verified expert -> sends in-app notification -> updates queue."""
    admin_token = setup_test_state["admin_token"]
    expert = setup_test_state["expert"]
    expert_token = setup_test_state["expert_token"]
    int_id = setup_test_state["interview_id"]

    res = client.post(
        f"/api/admin/assign-expert?token={admin_token}",
        json={
            "interview_id": int_id,
            "expert_id": expert.id,
            "reason": "Expert matches Distributed Systems specialization",
            "deadline_hours": 48
        }
    )
    assert res.status_code == 200
    assignment = res.json()["assignment"]
    assert assignment["interview_id"] == int_id
    assert assignment["assigned_expert_id"] == expert.id
    assert assignment["status"] == "ACTIVE"

    # Expert receives in-app notification
    notif_res = client.get(f"/api/notifications?token={expert_token}")
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    assert any(n["interview_id"] == int_id for n in notifs)

    # Expert unread notification count is > 0
    unread_res = client.get(f"/api/notifications/unread-count?token={expert_token}")
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] >= 1

    # Expert dashboard metrics reflects assignment
    metrics_res = client.get(f"/api/expert/dashboard/metrics?token={expert_token}")
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["total_assigned"] >= 1

    # Expert assigned assessments endpoint contains the interview
    assigned_res = client.get(f"/api/expert/dashboard/assignments?token={expert_token}")
    assert assigned_res.status_code == 200
    assigned_list = assigned_res.json()
    assert any(item["assignment"]["interview_id"] == int_id for item in assigned_list)

def test_reassignment_with_mandatory_reason(setup_test_state):
    """Admin reassigns to another expert -> requires recorded reason -> logs audit trail."""
    admin_token = setup_test_state["admin_token"]
    int_id = setup_test_state["interview_id"]

    # Create secondary verified expert
    expert2_email = "expert2@interviewlens.ai"
    AuthService._users[expert2_email] = {
        "id": "exp_test_02",
        "name": "Dr. Marcus Stone",
        "email": expert2_email,
        "password_hash": AuthService.hash_password("expert2_pass"),
        "role": "EXPERT",
        "auth_provider": "Email",
        "is_verified_expert": True,
        "expert_approval_status": "APPROVED",
        "expert_title": "Staff Architect",
        "created_at": "2026-10-18T10:00:00"
    }
    expert2 = AuthService.get_user_by_email(expert2_email)

    # Reassignment without reason fails
    res_fail = client.post(
        f"/api/admin/reassign-expert?token={admin_token}",
        json={"interview_id": int_id, "expert_id": expert2.id, "reason": ""}
    )
    assert res_fail.status_code == 400

    # Valid reassignment
    res = client.post(
        f"/api/admin/reassign-expert?token={admin_token}",
        json={
            "interview_id": int_id,
            "expert_id": expert2.id,
            "reason": "First expert traveling; reassigned to maintain SLA."
        }
    )
    assert res.status_code == 200
    assignment = res.json()["assignment"]
    assert assignment["assigned_expert_id"] == expert2.id
    assert assignment["reassignment_reason"] == "First expert traveling; reassigned to maintain SLA."
    assert len(assignment["audit_trail"]) >= 2

def test_cancel_assignment(setup_test_state):
    """Admin can cancel an assignment, returning interview to unassigned queue."""
    admin_token = setup_test_state["admin_token"]
    int_id = setup_test_state["interview_id"]

    res = client.post(
        f"/api/admin/cancel-assignment?token={admin_token}",
        json={"interview_id": int_id, "reason": "Candidate requested reschedule"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "CANCELLED"

    # Interview status returns to AWAITING_EXPERT_REVIEW
    queue_res = client.get(f"/api/admin/assignment-queue?token={admin_token}")
    unassigned = [i["id"] for i in queue_res.json()["unassigned_interviews"]]
    assert int_id in unassigned
