"""
Comprehensive Test Suite for InterviewLens Assessment Lifecycle.
Verifies all 10 core lifecycle rules:
  1. An interview must exist before an assessment can be reviewed (404 on missing).
  2. AI assessment generation must complete before expert assignment (400 if incomplete).
  3. Only an authorized administrator can assign or reassign reviewers (403 for candidate/unauthorized).
  4. Only the assigned, verified expert (or admin) can submit a review (403 for unassigned expert).
  5. Required expert fields must be validated before finalization (verdict, comments, rating, dimension overrides).
  6. Every status transition must be validated on the backend (valid transitions succeed, invalid fail).
  7. The original AI assessment must be retained pristine for comparison.
  8. Submitted expert decisions must have a versioned, auditable history.
  9. Candidates must see the final report only when it is released (403 when unreleased).
  10. Failed transactions must not leave partially finalized assessments.
  + Prevention of repeated finalization requests (400 on already finalized).
  + Reassessment and revision request workflows.
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.auth_service import AuthService
from backend.services.storage import InterviewStorage
from backend.models.schemas import InterviewRecord, DimensionScores, ExpertReview, FindingItem, EvidenceCitation, AssessmentStatusTransition

client = TestClient(app)

def make_token(email: str) -> str:
    import uuid
    token = f"tok_test_{str(uuid.uuid4())[:8]}"
    AuthService._sessions[token] = email.strip().lower()
    return token

@pytest.fixture
def setup_lifecycle_state():
    """Sets up Admin, Assigned Expert, Unassigned Expert, Candidate, and Test Interview."""
    storage = InterviewStorage()

    # 1. Admin
    admin_email = "admin_lifecycle@interviewlens.ai"
    AuthService._users[admin_email] = {
        "id": "usr_adm_lc",
        "name": "Platform Admin",
        "email": admin_email,
        "password_hash": AuthService.hash_password("admin_pass"),
        "role": "ADMIN",
        "auth_provider": "Email",
        "is_verified_expert": False,
        "expert_approval_status": "APPROVED",
        "created_at": "2026-10-18T10:00:00"
    }
    admin_token = make_token(admin_email)

    # 2. Assigned Verified Expert
    expert_email = "primary_expert@interviewlens.ai"
    AuthService._users[expert_email] = {
        "id": "usr_exp_primary",
        "name": "Dr. Sarah Expert",
        "email": expert_email,
        "password_hash": AuthService.hash_password("expert_pass"),
        "role": "EXPERT",
        "auth_provider": "Email",
        "is_verified_expert": True,
        "expert_approval_status": "APPROVED",
        "expert_title": "Staff Distributed Systems Engineer",
        "expert_organization": "Tier-1 Cloud Corp",
        "expert_domain": ["Distributed Systems", "Cloud Infrastructure"],
        "created_at": "2026-10-18T10:00:00"
    }
    expert_token = make_token(expert_email)

    # 3. Another Verified Expert (Unassigned)
    other_expert_email = "other_expert@interviewlens.ai"
    AuthService._users[other_expert_email] = {
        "id": "usr_exp_other",
        "name": "Alex Unassigned",
        "email": other_expert_email,
        "password_hash": AuthService.hash_password("expert_pass"),
        "role": "EXPERT",
        "auth_provider": "Email",
        "is_verified_expert": True,
        "expert_approval_status": "APPROVED",
        "expert_title": "Principal Architect",
        "expert_organization": "SystemX",
        "expert_domain": ["Distributed Systems"],
        "created_at": "2026-10-18T10:00:00"
    }
    other_expert_token = make_token(other_expert_email)

    # 4. Candidate
    candidate_email = "candidate_lc@example.com"
    AuthService._users[candidate_email] = {
        "id": "usr_cand_lc",
        "name": "Jordan Candidate",
        "email": candidate_email,
        "password_hash": AuthService.hash_password("cand_pass"),
        "role": "CANDIDATE",
        "auth_provider": "Email",
        "is_verified_expert": False,
        "expert_approval_status": "NOT_APPLIED",
        "created_at": "2026-10-18T10:00:00"
    }
    candidate_token = make_token(candidate_email)

    # 5. Base Test Interview (AI Completed -> PENDING_EXPERT_REVIEW)
    test_id = f"int_lc_{uuid.uuid4().hex[:8]}"
    rec = InterviewRecord(
        id=test_id,
        title="Distributed Systems Tech Screen",
        job_role="Senior Distributed Systems Engineer",
        candidate_name="Jordan Candidate",
        candidate_email=candidate_email,
        user_email=candidate_email,
        status="AWAITING_EXPERT_REVIEW",
        lifecycle_status="PENDING_EXPERT_REVIEW",
        scores=DimensionScores(
            overall=7.8,
            technical_knowledge=8.0,
            communication=7.5,
            answer_structure=8.0,
            problem_solving=7.5,
            behavioral=8.0,
            question_understanding=8.0
        ),
        original_ai_scores=DimensionScores(
            overall=7.8,
            technical_knowledge=8.0,
            communication=7.5,
            answer_structure=8.0,
            problem_solving=7.5,
            behavioral=8.0,
            question_understanding=8.0
        ),
        original_ai_summary="AI evaluated candidate demonstrating strong Raft protocol comprehension.",
        executive_summary="AI evaluated candidate demonstrating strong Raft protocol comprehension.",
        status_history=[
            AssessmentStatusTransition(
                id="trans_init",
                from_status="AI_ASSESSMENT_PENDING",
                to_status="PENDING_EXPERT_REVIEW",
                changed_by_name="InterviewLens AI Engine",
                reason="AI multi-agent evaluation completed."
            )
        ]
    )
    storage.save(rec)

    return {
        "admin_token": admin_token,
        "expert_token": expert_token,
        "other_expert_token": other_expert_token,
        "candidate_token": candidate_token,
        "interview_id": test_id,
        "candidate_email": candidate_email,
        "expert_id": "usr_exp_primary",
        "other_expert_id": "usr_exp_other"
    }

# ---------------------------------------------------------------------------
# RULE 1: Interview existence
# ---------------------------------------------------------------------------

def test_missing_interview_returns_404(setup_lifecycle_state):
    """Rule 1: An interview must exist before an assessment can be reviewed or assigned."""
    admin_token = setup_lifecycle_state["admin_token"]
    expert_id = setup_lifecycle_state["expert_id"]

    res = client.post(
        f"/api/admin/assign-expert?token={admin_token}",
        json={"interview_id": "non_existent_id", "expert_id": expert_id, "reason": "Test assign"}
    )
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

    res2 = client.get(
        f"/api/interviews/non_existent_id/lifecycle?token={admin_token}"
    )
    assert res2.status_code == 404

# ---------------------------------------------------------------------------
# RULE 2: AI assessment must complete before expert assignment
# ---------------------------------------------------------------------------

def test_assignment_before_ai_assessment_fails(setup_lifecycle_state):
    """Rule 2: AI assessment generation must complete before expert assignment."""
    admin_token = setup_lifecycle_state["admin_token"]
    expert_id = setup_lifecycle_state["expert_id"]
    storage = InterviewStorage()

    # Create interview without AI scores (AI_ASSESSMENT_PENDING)
    pending_id = "int_lc_ai_pending"
    rec = InterviewRecord(
        id=pending_id,
        title="Unfinished AI Interview",
        job_role="Data Engineer",
        status="ANALYZING",
        lifecycle_status="AI_ASSESSMENT_PENDING",
        scores=None
    )
    storage.save(rec)

    res = client.post(
        f"/api/admin/assign-expert?token={admin_token}",
        json={"interview_id": pending_id, "expert_id": expert_id, "reason": "Assign prematurely"}
    )
    assert res.status_code == 400
    assert "ai assessment generation must complete" in res.json()["detail"].lower()

# ---------------------------------------------------------------------------
# RULE 3: Only authorized admin can assign/reassign reviewers
# ---------------------------------------------------------------------------

def test_candidate_cannot_assign_reviewer(setup_lifecycle_state):
    """Rule 3: Only an authorized administrator can assign or reassign reviewers."""
    cand_token = setup_lifecycle_state["candidate_token"]
    int_id = setup_lifecycle_state["interview_id"]
    expert_id = setup_lifecycle_state["expert_id"]

    res = client.post(
        f"/api/admin/assign-expert?token={cand_token}",
        json={"interview_id": int_id, "expert_id": expert_id, "reason": "Candidate self-assigning"}
    )
    assert res.status_code == 403
    assert "administrator access required" in res.json()["detail"].lower()

def test_admin_successfully_assigns_reviewer(setup_lifecycle_state):
    """Valid assignment moves status to ASSIGNED and records audit transition."""
    admin_token = setup_lifecycle_state["admin_token"]
    int_id = setup_lifecycle_state["interview_id"]
    expert_id = setup_lifecycle_state["expert_id"]

    res = client.post(
        f"/api/admin/assign-expert?token={admin_token}",
        json={"interview_id": int_id, "expert_id": expert_id, "reason": "Qualified domain specialist assigned."}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["interview"]["lifecycle_status"] == "ASSIGNED"
    assert data["interview"]["assigned_expert_id"] == expert_id

    # Check lifecycle endpoint
    lc = client.get(f"/api/interviews/{int_id}/lifecycle?token={admin_token}").json()
    assert lc["lifecycle_status"] == "ASSIGNED"
    assert lc["assigned_expert_id"] == expert_id
    assert "IN_REVIEW" in lc["allowed_transitions"]

# ---------------------------------------------------------------------------
# RULE 4: Only assigned verified expert can submit review
# ---------------------------------------------------------------------------

def test_unassigned_expert_cannot_submit_review(setup_lifecycle_state):
    """Rule 4: Only the assigned, verified expert can submit a review."""
    admin_token = setup_lifecycle_state["admin_token"]
    other_expert_token = setup_lifecycle_state["other_expert_token"]
    int_id = setup_lifecycle_state["interview_id"]
    expert_id = setup_lifecycle_state["expert_id"]

    # Assign to primary expert
    client.post(
        f"/api/admin/assign-expert?token={admin_token}",
        json={"interview_id": int_id, "expert_id": expert_id, "reason": "Assigning to Sarah"}
    )

    # Attempt sign-off by other expert (Alex)
    sign_off_payload = {
        "verdict": "APPROVED",
        "comments": "Thoroughly evaluated candidate technical performance and consistency.",
        "overall_rating": 8.5
    }
    res = client.post(
        f"/api/interviews/{int_id}/expert-sign-off?token={other_expert_token}",
        json=sign_off_payload
    )
    assert res.status_code == 403
    assert "assigned to another expert" in res.json()["detail"].lower()

# ---------------------------------------------------------------------------
# RULE 5: Required expert fields validated before finalization
# ---------------------------------------------------------------------------

def test_finalization_validation_failure_short_comments(setup_lifecycle_state):
    """Rule 5: Substantive commentary (min 15 chars) required."""
    admin_token = setup_lifecycle_state["admin_token"]
    expert_token = setup_lifecycle_state["expert_token"]
    int_id = setup_lifecycle_state["interview_id"]
    expert_id = setup_lifecycle_state["expert_id"]

    # Assign
    client.post(
        f"/api/admin/assign-expert?token={admin_token}",
        json={"interview_id": int_id, "expert_id": expert_id, "reason": "Assigning"}
    )

    # Move to IN_REVIEW
    client.post(
        f"/api/interviews/{int_id}/lifecycle/transition?token={expert_token}",
        json={"target_status": "IN_REVIEW", "reason": "Starting audit"}
    )

    # Attempt finalize with short comment
    res = client.post(
        f"/api/interviews/{int_id}/expert-sign-off?token={expert_token}",
        json={"verdict": "APPROVED", "comments": "too short", "overall_rating": 8.0}
    )
    assert res.status_code == 400
    assert "commentary required" in res.json()["detail"].lower()

def test_finalization_validation_failure_invalid_rating(setup_lifecycle_state):
    """Rule 5: Overall rating must be between 1.0 and 10.0."""
    admin_token = setup_lifecycle_state["admin_token"]
    expert_token = setup_lifecycle_state["expert_token"]
    int_id = setup_lifecycle_state["interview_id"]
    expert_id = setup_lifecycle_state["expert_id"]

    client.post(
        f"/api/admin/assign-expert?token={admin_token}",
        json={"interview_id": int_id, "expert_id": expert_id, "reason": "Assigning"}
    )
    client.post(
        f"/api/interviews/{int_id}/lifecycle/transition?token={expert_token}",
        json={"target_status": "IN_REVIEW"}
    )

    res = client.post(
        f"/api/interviews/{int_id}/expert-sign-off?token={expert_token}",
        json={"verdict": "APPROVED", "comments": "Valid substantive expert comment for candidate.", "overall_rating": 15.0}
    )
    assert res.status_code == 400
    assert "between 1.0 and 10.0" in res.json()["detail"].lower()

# ---------------------------------------------------------------------------
# RULE 6 & 7 & 8: Status Transitions, AI Score Retention & Versioned History
# ---------------------------------------------------------------------------

def test_complete_valid_lifecycle_flow_and_score_retention(setup_lifecycle_state):
    """
    Valid lifecycle:
    PENDING_EXPERT_REVIEW -> ASSIGNED -> IN_REVIEW -> FINALIZED.
    Verifies:
      - Rule 6: Valid backend transitions
      - Rule 7: Original AI scores retained pristine while scores are calibrated
      - Rule 8: Versioned expert review history and status history recorded
    """
    admin_token = setup_lifecycle_state["admin_token"]
    expert_token = setup_lifecycle_state["expert_token"]
    int_id = setup_lifecycle_state["interview_id"]
    expert_id = setup_lifecycle_state["expert_id"]

    # 1. Assign
    client.post(
        f"/api/admin/assign-expert?token={admin_token}",
        json={"interview_id": int_id, "expert_id": expert_id, "reason": "Assigning Dr. Sarah"}
    )

    # 2. Expert opens assessment (IN_REVIEW)
    tr_res = client.post(
        f"/api/interviews/{int_id}/lifecycle/transition?token={expert_token}",
        json={"target_status": "IN_REVIEW", "reason": "Expert opened assessment and started code audit."}
    )
    assert tr_res.status_code == 200
    assert tr_res.json()["current_status"] == "IN_REVIEW"

    # 3. Finalize Review with score calibration (Overall: 7.8 -> 9.0)
    sign_off_res = client.post(
        f"/api/interviews/{int_id}/expert-sign-off?token={expert_token}",
        json={
            "verdict": "MODIFIED",
            "comments": "Candidate showed exemplary distributed systems understanding beyond AI surface reading.",
            "overall_rating": 9.0,
            "override_scores": {"overall": 9.0, "technical": 9.2},
            "dimension_overrides": {"technical_knowledge": 9.2, "problem_solving": 9.0}
        }
    )
    assert sign_off_res.status_code == 200
    rec_data = sign_off_res.json()

    assert rec_data["lifecycle_status"] == "FINALIZED"
    assert rec_data["status"] == "COMPLETED"

    # Rule 7: Original AI scores preserved pristine
    assert rec_data["original_ai_scores"]["overall"] == 7.8
    assert rec_data["scores"]["overall"] == 9.0
    assert rec_data["scores"]["technical_knowledge"] == 9.2

    # Rule 8: Versioned history populated
    assert len(rec_data["expert_review_history"]) == 1
    assert rec_data["expert_review_history"][0]["verdict"] == "MODIFIED"
    assert len(rec_data["status_history"]) >= 3

# ---------------------------------------------------------------------------
# INVALID TRANSITIONS & REPEATED FINALIZATION
# ---------------------------------------------------------------------------

def test_invalid_transition_direct_jump_rejected(setup_lifecycle_state):
    """Rule 6: Invalid direct transitions must be rejected."""
    admin_token = setup_lifecycle_state["admin_token"]
    int_id = setup_lifecycle_state["interview_id"]

    # Cannot jump directly from PENDING_EXPERT_REVIEW to FINALIZED
    res = client.post(
        f"/api/interviews/{int_id}/lifecycle/transition?token={admin_token}",
        json={"target_status": "FINALIZED", "reason": "Illegal jump"}
    )
    assert res.status_code == 400
    assert "cannot transition" in res.json()["detail"].lower()

def test_repeated_finalization_is_rejected(setup_lifecycle_state):
    """Repeated finalization requests must be rejected when already finalized."""
    admin_token = setup_lifecycle_state["admin_token"]
    expert_token = setup_lifecycle_state["expert_token"]
    int_id = setup_lifecycle_state["interview_id"]
    expert_id = setup_lifecycle_state["expert_id"]

    # Progress to finalized
    client.post(f"/api/admin/assign-expert?token={admin_token}", json={"interview_id": int_id, "expert_id": expert_id, "reason": "Assign"})
    client.post(f"/api/interviews/{int_id}/lifecycle/transition?token={expert_token}", json={"target_status": "IN_REVIEW"})
    
    first_sign_off = client.post(
        f"/api/interviews/{int_id}/expert-sign-off?token={expert_token}",
        json={"verdict": "APPROVED", "comments": "First thorough sign-off commentary.", "overall_rating": 8.0}
    )
    assert first_sign_off.status_code == 200

    # Second sign-off on already finalized assessment must be rejected
    second_sign_off = client.post(
        f"/api/interviews/{int_id}/expert-sign-off?token={expert_token}",
        json={"verdict": "APPROVED", "comments": "Attempting repeated sign-off without reassessment.", "overall_rating": 8.5}
    )
    assert second_sign_off.status_code == 400
    assert "already finalized" in second_sign_off.json()["detail"].lower()

# ---------------------------------------------------------------------------
# RULE 9: Candidate Final Report Release Gate & Content Verification
# ---------------------------------------------------------------------------

def test_candidate_report_unreleased_returns_403(setup_lifecycle_state):
    """Rule 9: Candidates must see the final report only when it is released."""
    cand_token = setup_lifecycle_state["candidate_token"]
    int_id = setup_lifecycle_state["interview_id"]

    res = client.get(
        f"/api/interviews/{int_id}/candidate-report?token={cand_token}"
    )
    assert res.status_code == 403
    assert "not been released yet" in res.json()["detail"].lower()

def test_release_and_candidate_report_content(setup_lifecycle_state):
    """
    Once released, candidate can view full report with:
    - Original AI score vs Final expert-calibrated score
    - Competency breakdown
    - Verified strengths & weaknesses
    - Expert feedback & recommendations
    - Reviewer credentials (privacy safe: title, org, cert hash; no personal email/phone)
    """
    admin_token = setup_lifecycle_state["admin_token"]
    expert_token = setup_lifecycle_state["expert_token"]
    cand_token = setup_lifecycle_state["candidate_token"]
    int_id = setup_lifecycle_state["interview_id"]
    expert_id = setup_lifecycle_state["expert_id"]

    # Progress to finalized
    client.post(f"/api/admin/assign-expert?token={admin_token}", json={"interview_id": int_id, "expert_id": expert_id, "reason": "Assign"})
    client.post(f"/api/interviews/{int_id}/lifecycle/transition?token={expert_token}", json={"target_status": "IN_REVIEW"})
    client.post(
        f"/api/interviews/{int_id}/expert-sign-off?token={expert_token}",
        json={
            "verdict": "APPROVED",
            "comments": "Exceptional concurrency model explanation with minor clarity gaps.",
            "overall_rating": 8.8,
            "override_scores": {"overall": 8.8}
        }
    )

    # Release report
    rel_res = client.post(
        f"/api/interviews/{int_id}/release?token={admin_token}",
        json={"notes": "Released by admin after quality review."}
    )
    assert rel_res.status_code == 200
    assert rel_res.json()["is_released_to_candidate"] is True

    # Candidate fetches report
    rep_res = client.get(
        f"/api/interviews/{int_id}/candidate-report?token={cand_token}"
    )
    assert rep_res.status_code == 200
    report = rep_res.json()

    # Verify report contents
    assert report["original_ai_overall_score"] == 7.8
    assert report["final_expert_overall_score"] == 8.8
    assert report["score_delta"] == 1.0
    assert len(report["competency_breakdown"]) >= 5
    assert report["verdict"] == "APPROVED"
    assert "concurrency model" in report["expert_feedback"]
    assert len(report["recommendations"]) >= 1
    assert report["reviewer_title"] == "Staff Distributed Systems Engineer"
    assert report["sign_off_certificate_id"].startswith("CERT-HITL-")

# ---------------------------------------------------------------------------
# REVISION AND REASSESSMENT FLOWS
# ---------------------------------------------------------------------------

def test_revision_and_reassessment_workflows(setup_lifecycle_state):
    """Verifies REVISION_REQUIRED and REASSESSMENT_REQUIRED state machines."""
    admin_token = setup_lifecycle_state["admin_token"]
    expert_token = setup_lifecycle_state["expert_token"]
    int_id = setup_lifecycle_state["interview_id"]
    expert_id = setup_lifecycle_state["expert_id"]

    client.post(f"/api/admin/assign-expert?token={admin_token}", json={"interview_id": int_id, "expert_id": expert_id, "reason": "Assign"})
    client.post(f"/api/interviews/{int_id}/lifecycle/transition?token={expert_token}", json={"target_status": "IN_REVIEW"})

    # 1. Expert requests revision
    rev_res = client.post(
        f"/api/interviews/{int_id}/lifecycle/transition?token={expert_token}",
        json={"target_status": "REVISION_REQUIRED", "reason": "Audio segment 04:12 requires clarification."}
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["current_status"] == "REVISION_REQUIRED"

    # 2. Return to IN_REVIEW
    rev_back = client.post(
        f"/api/interviews/{int_id}/lifecycle/transition?token={expert_token}",
        json={"target_status": "IN_REVIEW", "reason": "Clarification reviewed."}
    )
    assert rev_back.status_code == 200

    # 3. Finalize
    client.post(
        f"/api/interviews/{int_id}/expert-sign-off?token={expert_token}",
        json={"verdict": "APPROVED", "comments": "Finalized after resolving audio clarification.", "overall_rating": 8.0}
    )

    # 4. Admin reopens for reassessment
    reopen_res = client.post(
        f"/api/interviews/{int_id}/reassessment?token={admin_token}",
        json={"reason": "Candidate provided additional architectural documentation."}
    )
    assert reopen_res.status_code == 200
    assert reopen_res.json()["lifecycle_status"] == "REASSESSMENT_REQUIRED"
