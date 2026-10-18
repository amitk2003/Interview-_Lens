"""
InterviewLens Security & Authorization Test Suite

Covers the required authorization test scenarios:
  1. Candidate attempting to edit an expert score.
  2. Candidate attempting to view another candidate's transcript.
  3. Unverified expert attempting to open the review console.
  4. Verified but unassigned expert attempting to review an assessment.
  5. Expert attempting to access admin-only actions.
  6. Unauthorized user attempting to publish a report.

Plus additional coverage:
  7. Path traversal & cross-candidate resume/credential access.
  8. Audit log sanitization, immutability, and completeness.
  9. Rate limiting on login and sensitive endpoints.
  10. IDOR: Candidate requesting expert review on another candidate's interview.
  11. Lifecycle transition authorization (candidates blocked).
  12. Conflict of interest: expert cannot claim own interview.
  13. Auth endpoint hardening (no demo user leakage).
  14. Role escalation prevention through profile updates.
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.auth_service import AuthService
from backend.services.storage import InterviewStorage
from backend.services.rate_limiter import rate_limiter
from backend.services.audit_service import audit_service
from backend.models.schemas import (
    InterviewRecord,
    ExpertReview,
    DimensionScores,
    ClaimVerificationRequest,
    ReleaseReportRequest
)

client = TestClient(app)


def get_token(email: str, role: str = "CANDIDATE") -> str:
    res = client.post("/api/auth/oauth", json={"email": email, "role": role})
    assert res.status_code == 200, res.text
    return res.json()["token"]


@pytest.fixture(autouse=True)
def reset_rate_limits():
    rate_limiter.reset()
    yield
    rate_limiter.reset()


# ===========================================================================
# 1. Candidate Attempting to Edit an Expert Score
# ===========================================================================

def test_candidate_cannot_edit_expert_score_or_submit_review():
    """
    Requirement: Candidate attempting to edit an expert score or review must be rejected (403 Forbidden).
    """
    candidate_token = get_token("alex.chen@example.com", "CANDIDATE")

    # Target an interview
    target_int_id = "int_sec_test_01"
    storage = InterviewStorage()
    rec = InterviewRecord(
        id=target_int_id,
        title="Distributed Systems Reliability Engineer",
        job_role="Distributed Systems Reliability Engineer",
        candidate_name="Alex Chen",
        candidate_email="alex.chen@example.com",
        scores=DimensionScores(
            technical_knowledge=7.5,
            communication=7.0,
            problem_solving=7.2,
            experience_depth=7.0,
            leadership_culture=7.0,
            systems_architecture=7.5,
            overall=7.2
        ),
        lifecycle_status="ASSIGNED",
        assigned_expert_id="exp_001",
        assigned_expert_name="Dr. Marcus Vance",
        assigned_expert_email="dr.marcus.vance@techlead.org"
    )
    storage.save(rec)

    # 1. Candidate attempts POST /review to modify expert review
    review_payload = {
        "interview_id": target_int_id,
        "reviewer_id": "usr_alex_chen",
        "reviewer_name": "Alex Chen (Self)",
        "overall_rating": 9.9,
        "verdict": "APPROVED",
        "comments": "Self-awarding top marks across all dimensions with perfect scores."
    }
    res = client.post(
        f"/api/interviews/{target_int_id}/review",
        json=review_payload,
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert res.status_code == 403, res.text
    assert "expert" in res.json()["detail"].lower()

    # 2. Candidate attempts POST /expert-sign-off
    sign_off_payload = {
        "overall_rating": 9.8,
        "verdict": "APPROVED",
        "comments": "Substantive commentary trying to finalize score as candidate.",
        "dimension_overrides": {"technical_knowledge": 9.8}
    }
    res_signoff = client.post(
        f"/api/interviews/{target_int_id}/expert-sign-off",
        json=sign_off_payload,
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert res_signoff.status_code == 403, res_signoff.text
    assert "expert" in res_signoff.json()["detail"].lower()

    # 3. Candidate attempts POST /claim/verify to alter evidence findings
    claim_payload = {
        "finding_id": "f_1",
        "action": "VERIFY",
        "expert_score_override": 10.0,
        "expert_comment": "Candidate trying to verify own claim"
    }
    res_claim = client.post(
        f"/api/interviews/{target_int_id}/claim/verify",
        json=claim_payload,
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert res_claim.status_code == 403, res_claim.text

    # 4. Candidate attempts lifecycle transition to FINALIZED
    transition_payload = {
        "target_status": "FINALIZED",
        "reason": "Candidate trying to finalize own assessment"
    }
    res_transition = client.post(
        f"/api/interviews/{target_int_id}/lifecycle/transition",
        json=transition_payload,
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert res_transition.status_code == 403, res_transition.text
    assert "candidates cannot" in res_transition.json()["detail"].lower()


# ===========================================================================
# 2. Candidate Attempting to View Another Candidate's Transcript
# ===========================================================================

def test_candidate_cannot_view_another_candidates_transcript():
    """
    Requirement: Candidate attempting to view another candidate's transcript must be rejected (403 Forbidden).
    """
    # Candidate A
    token_candidate_a = get_token("candidate.demo@interviewlens.ai", "CANDIDATE")

    # Create assessment owned by Candidate B
    target_int_id = "int_sec_cand_b"
    storage = InterviewStorage()
    rec = InterviewRecord(
        id=target_int_id,
        title="Principal AI Platform Engineer",
        job_role="AI Platform Engineer",
        candidate_name="Jane Private",
        candidate_email="jane.private@target.org",
        raw_transcript="Interviewer: Welcome Jane. Tell us about your private infrastructure.\nJane: Confidential cluster details...",
        scores=DimensionScores(technical_knowledge=8.5, overall=8.5),
        lifecycle_status="PENDING_EXPERT_REVIEW"
    )
    storage.save(rec)

    # Candidate A tries to access Candidate B's transcript
    res = client.get(
        f"/api/interviews/{target_int_id}",
        headers={"Authorization": f"Bearer {token_candidate_a}"}
    )
    assert res.status_code == 403, res.text
    assert "not have permission" in res.json()["detail"].lower()


# ===========================================================================
# 3. Unverified Expert Attempting to Open Review Console
# ===========================================================================

def test_unverified_expert_cannot_open_review_console_or_access_queue():
    """
    Requirement: Unverified expert (PENDING_EXPERT) attempting to open the review console or queue must be rejected (403 Forbidden).
    """
    # Register an unverified/pending expert
    pending_email = f"pending_expert_{uuid.uuid4().hex[:6]}@evaluator.org"
    reg_res = client.post("/api/auth/register", json={
        "name": "Dr. Applicant",
        "email": pending_email,
        "password": "expertpassword",
        "apply_as_expert": True,
        "expert_title": "Systems Architect",
        "expert_organization": "Independent",
        "expert_domain": ["Cloud Architecture"]
    })
    assert reg_res.status_code == 200, reg_res.text
    pending_token = reg_res.json()["token"]

    # 1. Pending expert attempts to fetch review queue
    res_queue = client.get(
        "/api/expert/queue",
        headers={"Authorization": f"Bearer {pending_token}"}
    )
    assert res_queue.status_code == 403, res_queue.text
    assert "pending admin approval" in res_queue.json()["detail"].lower()

    # 2. Pending expert attempts to access expert dashboard assignments
    res_dash = client.get(
        "/api/expert/dashboard/assignments",
        headers={"Authorization": f"Bearer {pending_token}"}
    )
    assert res_dash.status_code == 403, res_dash.text
    assert "pending admin approval" in res_dash.json()["detail"].lower()

    # 3. Pending expert attempts to view assessment in review console
    target_int_id = "int_sec_console_view"
    storage = InterviewStorage()
    storage.save(InterviewRecord(
        id=target_int_id,
        title="Backend Security Lead",
        job_role="Security Lead",
        candidate_name="Bob Candidate",
        candidate_email="bob@candidate.io",
        scores=DimensionScores(overall=7.0),
        lifecycle_status="PENDING_EXPERT_REVIEW"
    ))
    res_view = client.get(
        f"/api/interviews/{target_int_id}",
        headers={"Authorization": f"Bearer {pending_token}"}
    )
    assert res_view.status_code == 403, res_view.text

    # 4. Pending expert attempts lifecycle transition
    res_transition = client.post(
        f"/api/interviews/{target_int_id}/lifecycle/transition",
        json={"target_status": "IN_REVIEW"},
        headers={"Authorization": f"Bearer {pending_token}"}
    )
    assert res_transition.status_code == 403, res_transition.text


# ===========================================================================
# 4. Verified but Unassigned Expert Attempting to Review an Assessment
# ===========================================================================

def test_verified_unassigned_expert_cannot_review_assessment():
    """
    Requirement: Verified but unassigned expert attempting to review an assessment must be rejected (403 Forbidden).
    """
    # Elena Rostova is a verified expert (exp_002)
    elena_token = get_token("elena.rostova@cloudscale.io", "EXPERT")

    # Assessment is assigned to Dr. Marcus Vance (exp_001), NOT Elena
    target_int_id = "int_sec_assigned_marcus"
    storage = InterviewStorage()
    rec = InterviewRecord(
        id=target_int_id,
        title="High Performance Storage Engine Lead",
        job_role="Storage Engine Lead",
        candidate_name="Alex Chen",
        candidate_email="alex.chen@example.com",
        scores=DimensionScores(
            technical_knowledge=8.0,
            communication=7.5,
            problem_solving=8.0,
            experience_depth=8.0,
            leadership_culture=7.5,
            systems_architecture=8.0,
            overall=7.8
        ),
        lifecycle_status="ASSIGNED",
        assigned_expert_id="exp_001",
        assigned_expert_name="Dr. Marcus Vance",
        assigned_expert_email="dr.marcus.vance@techlead.org"
    )
    storage.save(rec)

    # Elena attempts to submit review for Marcus's assigned assessment
    review_payload = {
        "overall_rating": 8.8,
        "verdict": "APPROVED",
        "comments": "Substantive evaluation submitted by unauthorized expert Elena Rostova.",
        "dimension_overrides": {"technical_knowledge": 8.8}
    }
    res_review = client.post(
        f"/api/interviews/{target_int_id}/review",
        json=review_payload,
        headers={"Authorization": f"Bearer {elena_token}"}
    )
    assert res_review.status_code == 403, res_review.text
    assert "not assigned" in res_review.json()["detail"].lower()

    # Elena attempts to finalize sign-off
    res_signoff = client.post(
        f"/api/interviews/{target_int_id}/expert-sign-off",
        json=review_payload,
        headers={"Authorization": f"Bearer {elena_token}"}
    )
    assert res_signoff.status_code == 403, res_signoff.text
    assert "assigned to another expert" in res_signoff.json()["detail"].lower() or "not assigned" in res_signoff.json()["detail"].lower()

    # Elena attempts to claim the assessment (should be blocked — already assigned)
    res_claim = client.post(
        f"/api/expert/claim/{target_int_id}",
        headers={"Authorization": f"Bearer {elena_token}"}
    )
    assert res_claim.status_code == 403, res_claim.text
    assert "already assigned" in res_claim.json()["detail"].lower()


# ===========================================================================
# 5. Expert Attempting to Access Admin-Only Actions
# ===========================================================================

def test_expert_cannot_access_admin_only_actions():
    """
    Requirement: Expert attempting to access admin-only actions must be rejected (403 Forbidden).
    """
    expert_token = get_token("dr.marcus.vance@techlead.org", "EXPERT")

    # 1. Expert tries to access admin user management
    res_users = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {expert_token}"}
    )
    assert res_users.status_code == 403, res_users.text
    assert "administrator access required" in res_users.json()["detail"].lower()

    # 2. Expert tries to assign an assessment
    assign_payload = {
        "interview_id": "int_seed_1",
        "expert_id": "exp_002",
        "reason": "Expert attempting unauthorized self-delegation"
    }
    res_assign = client.post(
        "/api/admin/assign-expert",
        json=assign_payload,
        headers={"Authorization": f"Bearer {expert_token}"}
    )
    assert res_assign.status_code == 403, res_assign.text

    # 3. Expert tries to approve an expert application
    approve_payload = {
        "user_email": "priya.sharma@evaluator.org",
        "action": "APPROVE",
        "admin_notes": "Expert trying to approve another expert"
    }
    res_approve = client.post(
        "/api/admin/approve-expert",
        json=approve_payload,
        headers={"Authorization": f"Bearer {expert_token}"}
    )
    assert res_approve.status_code == 403, res_approve.text

    # 4. Expert tries to access platform security audit logs
    res_audit = client.get(
        "/api/admin/audit-logs",
        headers={"Authorization": f"Bearer {expert_token}"}
    )
    assert res_audit.status_code == 403, res_audit.text

    # 5. Expert tries to reassign expert (admin-only)
    res_reassign = client.post(
        "/api/admin/reassign-expert",
        json={"interview_id": "int_seed_1", "expert_id": "exp_002", "reason": "Expert attempting reassignment"},
        headers={"Authorization": f"Bearer {expert_token}"}
    )
    assert res_reassign.status_code == 403, res_reassign.text

    # 6. Expert tries to cancel assignment (admin-only)
    res_cancel = client.post(
        "/api/admin/cancel-assignment",
        json={"interview_id": "int_seed_1", "reason": "Expert attempting cancellation"},
        headers={"Authorization": f"Bearer {expert_token}"}
    )
    assert res_cancel.status_code == 403, res_cancel.text


# ===========================================================================
# 6. Unauthorized User Attempting to Publish a Report
# ===========================================================================

def test_unauthorized_user_cannot_publish_report():
    """
    Requirement: Unauthorized user attempting to publish a report must be rejected (403 Forbidden).
    """
    storage = InterviewStorage()
    target_int_id = "int_sec_publish_test"
    rec = InterviewRecord(
        id=target_int_id,
        title="Senior Security Architect",
        job_role="Security Architect",
        candidate_name="Alice Candidate",
        candidate_email="alice.candidate@security.io",
        scores=DimensionScores(overall=8.2),
        lifecycle_status="FINALIZED",
        assigned_expert_id="exp_001",
        assigned_expert_name="Dr. Marcus Vance",
        assigned_expert_email="dr.marcus.vance@techlead.org"
    )
    storage.save(rec)

    # 1. Candidate attempts to publish report
    candidate_token = get_token("alice.candidate@security.io", "CANDIDATE")
    res_cand = client.post(
        f"/api/interviews/{target_int_id}/release",
        json={"notes": "Candidate publishing own report"},
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert res_cand.status_code == 403, res_cand.text
    assert "only an authorized administrator or assigned" in res_cand.json()["detail"].lower()

    # 2. Unassigned verified expert (Elena) attempts to publish Marcus's assigned report
    unassigned_expert_token = get_token("elena.rostova@cloudscale.io", "EXPERT")
    res_unassigned = client.post(
        f"/api/interviews/{target_int_id}/release",
        json={"notes": "Unassigned expert publishing report"},
        headers={"Authorization": f"Bearer {unassigned_expert_token}"}
    )
    assert res_unassigned.status_code == 403, res_unassigned.text
    assert "only the assigned expert or an admin" in res_unassigned.json()["detail"].lower()

    # 3. Unauthenticated request
    res_anon = client.post(f"/api/interviews/{target_int_id}/release")
    assert res_anon.status_code == 401, res_anon.text


# ===========================================================================
# 7. Secure Handling of Resumes, Transcripts & Path Traversal Checks
# ===========================================================================

def test_path_traversal_and_cross_candidate_resume_access_protection():
    """
    Requirement: Path traversal attempts must be rejected (400 Bad Request)
    and cross-candidate access must be rejected (403 Forbidden).
    """
    token_a = get_token("candidate.demo@interviewlens.ai", "CANDIDATE")

    # Path traversal attempts
    res_traversal1 = client.get(
        "/api/candidate/resume/..secret.txt",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res_traversal1.status_code == 400, res_traversal1.text
    assert "path traversal" in res_traversal1.json()["detail"].lower()

    res_traversal2 = client.get(
        "/api/expert/credential/..secret.txt",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res_traversal2.status_code == 400, res_traversal2.text
    assert "path traversal" in res_traversal2.json()["detail"].lower()

    # Candidate A attempting to download Candidate B (Alex Chen)'s resume
    res_idor = client.get(
        "/api/candidate/resume/Alex_Chen_Principal_Engineer_Resume.pdf",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res_idor.status_code == 403, res_idor.text
    assert "not authorized" in res_idor.json()["detail"].lower()


# ===========================================================================
# 8. Audit Logging Sanitization & Immutability Checks
# ===========================================================================

def test_audit_logs_record_actions_and_sanitize_sensitive_data():
    """
    Requirement: Audit records must include acting user, action, target, timestamp,
    change metadata, and NEVER log passwords or access tokens.
    """
    admin_token = get_token("admin@interviewlens.ai", "ADMIN")

    # Perform assignment action which generates audit log
    test_int_id = f"int_sec_audit_{uuid.uuid4().hex[:8]}"
    storage = InterviewStorage()
    rec = InterviewRecord(
        id=test_int_id,
        title="Cloud Infrastructure Lead",
        job_role="Cloud Infrastructure Lead",
        candidate_name="Alex Chen",
        candidate_email="alex.chen@example.com",
        user_email="alex.chen@example.com",
        scores=DimensionScores(overall=8.0),
        lifecycle_status="PENDING_EXPERT_REVIEW"
    )
    storage.save(rec)

    # Admin assigns expert Elena Rostova
    assign_res = client.post(
        "/api/admin/assign-expert",
        json={
            "interview_id": test_int_id,
            "expert_id": "exp_002",
            "reason": "Top tier cloud architecture match"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert assign_res.status_code == 200, assign_res.text

    # Retrieve audit logs
    audit_res = client.get(
        f"/api/admin/audit-logs?target_id={test_int_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert audit_res.status_code == 200, audit_res.text
    logs = audit_res.json()
    assert len(logs) >= 1

    for entry in logs:
        assert "actor_id" in entry
        assert "actor_role" in entry
        assert "action" in entry
        assert "target_id" in entry
        assert "timestamp" in entry

        # Verify no passwords or tokens were logged
        details_str = str(entry.get("details", {}))
        assert "password123" not in details_str
        assert "tok_" not in details_str
        # Verify redaction of sensitive keys
        if "password" in entry.get("details", {}):
            assert entry["details"]["password"] == "[REDACTED]"
        if "token" in entry.get("details", {}):
            assert entry["details"]["token"] == "[REDACTED]"


def test_audit_logs_are_immutable_through_user_apis():
    """
    Requirement: Audit history cannot be modified through normal user-facing APIs.
    There must be no PUT, PATCH, or DELETE endpoints for audit logs.
    """
    admin_token = get_token("admin@interviewlens.ai", "ADMIN")

    # Attempt to DELETE audit logs (should be 405 or 404)
    res_delete = client.delete(
        "/api/admin/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_delete.status_code in (404, 405), f"DELETE on audit logs should not be allowed: {res_delete.status_code}"

    # Attempt to PUT audit logs (should be 405 or 404)
    res_put = client.put(
        "/api/admin/audit-logs",
        json={"action": "TAMPERED"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_put.status_code in (404, 405), f"PUT on audit logs should not be allowed: {res_put.status_code}"


# ===========================================================================
# 9. Rate Limiting Protection on Sensitive Endpoints
# ===========================================================================

def test_rate_limiting_protects_login_endpoint():
    """
    Requirement: Rate limiting on sensitive endpoints (sliding window) protects against brute force.
    """
    test_email = "brute_force_victim@test.com"

    # Max requests is 15 in 60s
    for i in range(15):
        rate_limiter.check(f"login:{test_email}", max_requests=15, window_seconds=60)

    # 16th call should raise 429
    with pytest.raises(Exception) as exc_info:
        rate_limiter.check(f"login:{test_email}", max_requests=15, window_seconds=60)

    assert exc_info.value.status_code == 429
    assert "Retry-After" in exc_info.value.headers


# ===========================================================================
# 10. IDOR: Candidate Requesting Expert Review on Another's Interview
# ===========================================================================

def test_candidate_cannot_request_review_on_another_candidates_interview():
    """
    Requirement: IDOR protection — candidates must only request expert review on their own interviews.
    """
    storage = InterviewStorage()

    # Create interview owned by Candidate B
    target_int_id = f"int_sec_idor_{uuid.uuid4().hex[:8]}"
    rec = InterviewRecord(
        id=target_int_id,
        title="SRE Lead - Private Company",
        job_role="SRE Lead",
        candidate_name="Private Candidate",
        candidate_email="private.candidate@corp.io",
        user_email="private.candidate@corp.io",
        scores=DimensionScores(overall=7.5),
        lifecycle_status="PENDING_EXPERT_REVIEW",
        status="AWAITING_EXPERT_REVIEW"
    )
    storage.save(rec)

    # Candidate A tries to request expert review on Candidate B's interview
    candidate_a_token = get_token("alex.chen@example.com", "CANDIDATE")
    res = client.post(
        f"/api/interviews/{target_int_id}/request-expert-review",
        headers={"Authorization": f"Bearer {candidate_a_token}"}
    )
    assert res.status_code == 403, res.text
    assert "your own assessments" in res.json()["detail"].lower()


# ===========================================================================
# 11. Lifecycle Transition: Candidates Blocked from State Changes
# ===========================================================================

def test_candidate_cannot_trigger_lifecycle_transitions():
    """
    Requirement: Candidates must not be able to modify assessment lifecycle status.
    """
    storage = InterviewStorage()
    target_int_id = f"int_sec_lc_{uuid.uuid4().hex[:8]}"
    rec = InterviewRecord(
        id=target_int_id,
        title="ML Engineer Assessment",
        job_role="ML Engineer",
        candidate_name="Alex Chen",
        candidate_email="alex.chen@example.com",
        scores=DimensionScores(overall=7.0),
        lifecycle_status="ASSIGNED",
        assigned_expert_id="exp_001",
        assigned_expert_name="Dr. Marcus Vance"
    )
    storage.save(rec)

    candidate_token = get_token("alex.chen@example.com", "CANDIDATE")

    # Candidate tries to start review
    res_start = client.post(
        f"/api/interviews/{target_int_id}/lifecycle/transition",
        json={"target_status": "IN_REVIEW"},
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert res_start.status_code == 403, res_start.text
    assert "candidates cannot" in res_start.json()["detail"].lower()

    # Candidate tries reassessment
    res_reassess = client.post(
        f"/api/interviews/{target_int_id}/lifecycle/transition",
        json={"target_status": "REASSESSMENT_REQUIRED", "reason": "I want a redo"},
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert res_reassess.status_code == 403, res_reassess.text


# ===========================================================================
# 12. Conflict of Interest: Expert Cannot Claim Own Interview
# ===========================================================================

def test_expert_cannot_claim_own_interview():
    """
    Requirement: An expert cannot claim/review their own interview (conflict of interest).
    """
    storage = InterviewStorage()
    target_int_id = f"int_sec_conflict_{uuid.uuid4().hex[:8]}"

    # Create an interview where the candidate email matches an expert
    rec = InterviewRecord(
        id=target_int_id,
        title="System Design Assessment",
        job_role="Systems Architect",
        candidate_name="Dr. Marcus Vance",
        candidate_email="dr.marcus.vance@techlead.org",  # Same as expert email
        scores=DimensionScores(overall=8.0),
        lifecycle_status="PENDING_EXPERT_REVIEW",
        status="AWAITING_EXPERT_REVIEW"
    )
    storage.save(rec)

    expert_token = get_token("dr.marcus.vance@techlead.org", "EXPERT")
    res = client.post(
        f"/api/expert/claim/{target_int_id}",
        headers={"Authorization": f"Bearer {expert_token}"}
    )
    assert res.status_code == 409, res.text
    assert "conflict of interest" in res.json()["detail"].lower()


# ===========================================================================
# 13. Auth Endpoint Hardening (No Demo User Leakage)
# ===========================================================================

def test_unauthenticated_auth_me_does_not_leak_demo_user():
    """
    Requirement: Unauthenticated requests to /api/auth/me must not return real user data.
    """
    res = client.get("/api/auth/me")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"


def test_unauthenticated_user_profile_does_not_leak_data():
    """
    Requirement: Unauthenticated requests to /api/user/profile must not return real user data.
    """
    res = client.get("/api/user/profile")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"


# ===========================================================================
# 14. Role Escalation Prevention Through Profile Updates
# ===========================================================================

def test_profile_update_cannot_escalate_role():
    """
    Requirement: Users must not be able to elevate their role or verification status
    via the profile update API.
    """
    candidate_token = get_token("alex.chen@example.com", "CANDIDATE")

    # Get current profile
    profile_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert profile_res.status_code == 200
    profile = profile_res.json()

    # Attempt to escalate role through profile update
    profile["role"] = "ADMIN"
    profile["is_verified_expert"] = True
    profile["expert_approval_status"] = "APPROVED"

    update_res = client.post(
        f"/api/user/profile?token={candidate_token}",
        json=profile
    )
    assert update_res.status_code == 200
    updated = update_res.json()

    # Verify role was NOT changed
    assert updated["role"] == "CANDIDATE"
    assert updated["is_verified_expert"] is False


# ===========================================================================
# 15. Audit Logging Covers Key Actions
# ===========================================================================

def test_audit_logs_record_report_publication():
    """
    Requirement: Publishing a report generates an audit log entry.
    """
    admin_token = get_token("admin@interviewlens.ai", "ADMIN")
    storage = InterviewStorage()
    target_int_id = f"int_sec_pub_{uuid.uuid4().hex[:8]}"
    rec = InterviewRecord(
        id=target_int_id,
        title="Publication Audit Test",
        job_role="Test Engineer",
        candidate_name="Audit Candidate",
        candidate_email="audit.candidate@test.io",
        scores=DimensionScores(overall=8.0),
        lifecycle_status="FINALIZED",
        assigned_expert_id="exp_001",
        assigned_expert_name="Dr. Marcus Vance",
        assigned_expert_email="dr.marcus.vance@techlead.org"
    )
    storage.save(rec)

    # Admin releases report
    release_res = client.post(
        f"/api/interviews/{target_int_id}/release",
        json={"notes": "Audit test release"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert release_res.status_code == 200, release_res.text

    # Check audit logs for REPORT_PUBLISHED action
    audit_res = client.get(
        f"/api/admin/audit-logs?target_id={target_int_id}&action=REPORT_PUBLISHED",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 1, "Expected at least one REPORT_PUBLISHED audit log entry"
    assert logs[0]["action"] == "REPORT_PUBLISHED"
    assert logs[0]["target_id"] == target_int_id
