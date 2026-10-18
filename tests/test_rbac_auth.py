import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.auth_service import AuthService

client = TestClient(app)

def test_public_registration_defaults_to_candidate():
    """Requirement: New public registrations must default to Candidate."""
    email = "new_user_candidate@test.com"
    payload = {
        "name": "Jane Candidate",
        "email": email,
        "password": "securepassword123",
        "target_role": "Backend Engineer",
        "apply_as_expert": False
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["user"]["role"] == "CANDIDATE"
    assert data["user"]["is_verified_expert"] is False
    assert data["user"]["expert_approval_status"] == "NOT_APPLIED"

def test_public_registration_cannot_escalate_role():
    """
    Requirement: Users must not be able to make themselves Experts or Admins
    by editing a request, frontend state, or database-facing API payload.
    """
    email = "attacker_trying_admin@test.com"
    # An attacker passes role: "ADMIN" or role: "EXPERT" in the registration payload
    payload = {
        "name": "Malicious User",
        "email": email,
        "password": "hackerpassword",
        "role": "ADMIN",
        "is_verified_expert": True
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    # Server-side enforcement guarantees role is still CANDIDATE
    assert data["user"]["role"] == "CANDIDATE"
    assert data["user"]["is_verified_expert"] is False

def test_expert_registration_defaults_to_pending():
    """
    Requirement: Expert access must remain pending until an administrator verifies and approves.
    """
    email = "applicant_expert@test.com"
    payload = {
        "name": "Dr. Applicant",
        "email": email,
        "password": "expertpassword",
        "apply_as_expert": True,
        "expert_title": "Staff Cloud Architect",
        "expert_organization": "Tier-1 Cloud Provider",
        "expert_domain": ["Cloud Architecture", "Distributed Systems"]
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    token = data["token"]

    # Role must be PENDING_EXPERT
    assert data["user"]["role"] == "PENDING_EXPERT"
    assert data["user"]["is_verified_expert"] is False
    assert data["user"]["expert_approval_status"] == "PENDING"

    # Pending applicant MUST NOT be allowed to access expert queue
    queue_res = client.get(f"/api/expert/queue?token={token}")
    assert queue_res.status_code == 403
    assert "pending admin approval" in queue_res.json()["detail"].lower()

def test_candidate_cannot_access_expert_queue():
    """Requirement: Prevent candidates from accessing expert consoles."""
    # Login as pre-seeded candidate
    login_res = client.post("/api/auth/login", json={
        "email": "alex.chen@example.com",
        "password": "password123"
    })
    assert login_res.status_code == 200
    candidate_token = login_res.json()["token"]

    # Candidate attempts to fetch expert queue
    queue_res = client.get(f"/api/expert/queue?token={candidate_token}")
    assert queue_res.status_code == 403
    assert "industry expert" in queue_res.json()["detail"].lower()

def test_expert_cannot_access_admin_console():
    """Requirement: Prevent experts from accessing administrative controls."""
    # Login as pre-seeded verified expert
    login_res = client.post("/api/auth/login", json={
        "email": "dr.marcus.vance@techlead.org",
        "password": "expert123"
    })
    assert login_res.status_code == 200
    expert_token = login_res.json()["token"]

    # Expert attempts to access admin user list
    admin_res = client.get(f"/api/admin/users?token={expert_token}")
    assert admin_res.status_code == 403
    assert "administrator access required" in admin_res.json()["detail"].lower()

    # Expert attempts to approve another expert
    approve_res = client.post(
        f"/api/admin/approve-expert?token={expert_token}",
        json={"user_email": "priya.sharma@evaluator.org", "action": "APPROVE"}
    )
    assert approve_res.status_code == 403

def test_admin_can_view_users_and_approve_expert():
    """
    Requirement: Admin can view pending experts, approve them, and the approved user
    then immediately gains access to expert consoles.
    """
    # 1. Login as Admin
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@interviewlens.ai",
        "password": "admin2024!"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["token"]

    # 2. Admin retrieves user list
    users_res = client.get(f"/api/admin/users?token={admin_token}")
    assert users_res.status_code == 200
    user_list = users_res.json()
    assert any(u["email"] == "priya.sharma@evaluator.org" for u in user_list)

    # 3. Before approval, Priya (PENDING_EXPERT) cannot access queue
    priya_login = client.post("/api/auth/login", json={
        "email": "priya.sharma@evaluator.org",
        "password": "expert123"
    })
    assert priya_login.status_code == 200
    priya_token = priya_login.json()["token"]
    assert priya_login.json()["user"]["role"] == "PENDING_EXPERT"

    pre_queue = client.get(f"/api/expert/queue?token={priya_token}")
    assert pre_queue.status_code == 403

    # 4. Admin approves Priya
    approve_res = client.post(
        f"/api/admin/approve-expert?token={admin_token}",
        json={
            "user_email": "priya.sharma@evaluator.org",
            "action": "APPROVE",
            "admin_notes": "Verified past credentials at OpenScale / ex-Anthropic."
        }
    )
    assert approve_res.status_code == 200
    approved_user = approve_res.json()
    assert approved_user["role"] == "EXPERT"
    assert approved_user["is_verified_expert"] is True
    assert approved_user["expert_approval_status"] == "APPROVED"

    # 5. After approval, Priya CAN access the expert queue!
    post_queue = client.get(f"/api/expert/queue?token={priya_token}")
    assert post_queue.status_code == 200
    assert isinstance(post_queue.json(), list)

def test_update_profile_cannot_escalate_role():
    """
    Requirement: Users must not be able to elevate their role via POST /api/user/profile.
    """
    login_res = client.post("/api/auth/login", json={
        "email": "alex.chen@example.com",
        "password": "password123"
    })
    token = login_res.json()["token"]

    # Candidate attempts to update their own profile with role="ADMIN"
    profile_payload = login_res.json()["user"]
    profile_payload["role"] = "ADMIN"
    profile_payload["is_verified_expert"] = True

    update_res = client.post(f"/api/user/profile?token={token}", json=profile_payload)
    assert update_res.status_code == 200
    updated_user = update_res.json()
    # The role is NEVER changed; stays CANDIDATE
    assert updated_user["role"] == "CANDIDATE"
    assert updated_user["is_verified_expert"] is False
