import os
import sys
import uuid
import requests
import json
from datetime import datetime

LIVE_URL = "https://interview-lens-2qgc.onrender.com"

def log_step(step_num: str, title: str, status: str = "RUNNING", details: str = ""):
    icon = "[...]" if status == "RUNNING" else ("[OK]" if status == "PASSED" else "[FAIL]")
    print(f"\n{icon} STEP {step_num}: {title}")
    if details:
        print(f"    -> {details}")

def run_e2e():
    print("=" * 80)
    print("INTERVIEWLENS: END-TO-END HUMAN-IN-THE-LOOP WORKFLOW VERIFICATION")
    print(f"Target Live Backend: {LIVE_URL}")
    print("=" * 80)

    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})

    # -------------------------------------------------------------
    # 0. Health Check
    # -------------------------------------------------------------
    log_step("0", "Live Health Check")
    res = session.get(f"{LIVE_URL}/api/health", timeout=15)
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    log_step("0", "Live Health Check", "PASSED", f"Engine: {health_data.get('llm_engine')}, Model: {health_data.get('groq_model')}, Indexed: {health_data.get('total_interviews_indexed')}")

    # -------------------------------------------------------------
    # 1. Candidate Registration & Login
    # -------------------------------------------------------------
    cand_id = uuid.uuid4().hex[:6]
    cand_email = f"candidate_e2e_{cand_id}@example.com"
    cand_name = f"Alex Rivera {cand_id}"
    log_step("1", f"Candidate Registration ({cand_email})")
    
    cand_reg = session.post(f"{LIVE_URL}/api/auth/register", json={
        "name": cand_name,
        "email": cand_email,
        "password": "Password123!",
        "apply_as_expert": False,
        "target_role": "Staff Distributed Systems Engineer"
    }, timeout=15)
    assert cand_reg.status_code == 200, f"Candidate registration failed: {cand_reg.text}"
    cand_token = cand_reg.json()["token"]
    assert cand_reg.json()["user"]["role"] == "CANDIDATE"
    log_step("1", "Candidate Registration", "PASSED", f"Role: CANDIDATE, Token: {cand_token[:12]}...")

    # -------------------------------------------------------------
    # 2. Candidate Completes / Submits Interview Assessment
    # -------------------------------------------------------------
    log_step("2", "Candidate Submits Technical Interview for AI Assessment")
    sample_transcript = (
        "[00:01:10] Interviewer: How do you design high-throughput idempotency for Kafka message streams?\n"
        "[00:01:45] Candidate: We used transactional producers with idempotent producer configs, storing deduplication offsets in Redis with atomic multi-exec blocks.\n"
        "[00:02:30] Interviewer: What happens during a network partition?\n"
        "[00:03:00] Candidate: Raft quorum requires majority nodes. If partitioned, minority halts writes to preserve consistency."
    )
    analyze_res = session.post(
        f"{LIVE_URL}/api/interviews/workspace/create?token={cand_token}",
        json={
            "title": f"Distributed Systems Screen {cand_id}",
            "job_role": "Staff Distributed Systems Engineer",
            "job_description": "Build high-throughput event-driven microservices.",
            "adapter_type": "UPLOAD_TRANSCRIPT",
            "transcript_text": sample_transcript,
            "user_email": cand_email,
            "user_name": cand_name
        },
        timeout=60
    )
    assert analyze_res.status_code == 200, f"Interview creation failed: {analyze_res.text}"
    interview_data = analyze_res.json()
    interview_id = interview_data["id"]
    scores = interview_data.get("scores", {})
    log_step("2", "AI Assessment Saved", "PASSED", f"Interview ID: {interview_id}, Status: {interview_data.get('status')}, Overall Score: {scores.get('overall')}")

    # -------------------------------------------------------------
    # 3. Assessment Enters Pending Expert Review Queue
    # -------------------------------------------------------------
    log_step("3", "Candidate Requests Expert Review")
    req_review_res = session.post(
        f"{LIVE_URL}/api/interviews/{interview_id}/request-expert-review",
        headers={"Authorization": f"Bearer {cand_token}"},
        timeout=15
    )
    assert req_review_res.status_code == 200, f"Request expert review failed: {req_review_res.text}"
    log_step("3", "Enters Expert Review Queue", "PASSED", f"Status: {req_review_res.json().get('status')}")

    # -------------------------------------------------------------
    # 4. Expert Registers & Admin Verifies / Approves Expert
    # -------------------------------------------------------------
    exp_id = uuid.uuid4().hex[:6]
    exp_email = f"expert_evaluator_{exp_id}@expertlead.io"
    log_step("4a", f"Expert Registers as PENDING_EXPERT ({exp_email})")
    exp_reg = session.post(f"{LIVE_URL}/api/auth/register", json={
        "name": f"Dr. Sophia Sterling {exp_id}",
        "email": exp_email,
        "password": "ExpertPassword123!",
        "apply_as_expert": True,
        "expert_title": "Principal Distributed Systems Architect",
        "expert_organization": "Tier-1 Cloud Provider",
        "expert_domain": ["Distributed Systems", "Consensus"]
    }, timeout=15)
    assert exp_reg.status_code == 200, f"Expert registration failed: {exp_reg.text}"
    exp_data = exp_reg.json()
    exp_token = exp_data["token"]
    expert_user_id = exp_data["user"]["id"]
    assert exp_data["user"]["role"] == "PENDING_EXPERT"
    log_step("4a", "Expert Registered", "PASSED", f"User ID: {expert_user_id}, Role: PENDING_EXPERT")

    # 4b. Pending Expert cannot open queue yet
    queue_attempt = session.get(
        f"{LIVE_URL}/api/expert/queue",
        headers={"Authorization": f"Bearer {exp_token}"},
        timeout=15
    )
    assert queue_attempt.status_code == 403, f"Pending expert should be blocked from queue: {queue_attempt.status_code}"
    log_step("4b", "Security Check: Pending Expert Access Blocked", "PASSED", "Received 403 Forbidden as expected")

    # 4c. Admin logs in and approves expert
    log_step("4c", "Admin Logs In and Approves Expert")
    admin_login = session.post(f"{LIVE_URL}/api/auth/login", json={
        "email": "admin@interviewlens.ai",
        "password": "admin2024!"
    }, timeout=15)
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["token"]

    approve_res = session.post(
        f"{LIVE_URL}/api/admin/approve-expert",
        json={
            "user_email": exp_email,
            "action": "APPROVE",
            "admin_notes": "Verified credentials in Distributed Systems Architecture."
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=15
    )
    assert approve_res.status_code == 200, f"Admin approve expert failed: {approve_res.text}"
    approved_user = approve_res.json()
    assert approved_user["role"] == "EXPERT"
    assert approved_user["is_verified_expert"] is True
    log_step("4c", "Admin Approves Expert", "PASSED", f"Role upgraded to EXPERT, is_verified_expert=True")

    # Re-login expert to get fresh session profile with EXPERT role
    exp_login = session.post(f"{LIVE_URL}/api/auth/login", json={
        "email": exp_email,
        "password": "ExpertPassword123!"
    }, timeout=15)
    assert exp_login.status_code == 200
    exp_token = exp_login.json()["token"]

    # -------------------------------------------------------------
    # 5. Admin Assigns Expert to the Assessment
    # -------------------------------------------------------------
    log_step("5", "Admin Assigns Expert to Assessment")
    assign_res = session.post(
        f"{LIVE_URL}/api/admin/assign-expert",
        json={
            "interview_id": interview_id,
            "expert_id": expert_user_id,
            "reason": "Direct specialization match in Distributed Systems."
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=15
    )
    assert assign_res.status_code == 200, f"Admin assign expert failed: {assign_res.text}"
    log_step("5", "Assessment Assigned", "PASSED", f"Assigned to {approved_user['name']}")

    # -------------------------------------------------------------
    # 6. Assigned Expert Inspects Candidate Profile & Evidence
    # -------------------------------------------------------------
    log_step("6", "Assigned Expert Views Assessment")
    expert_view_res = session.get(
        f"{LIVE_URL}/api/interviews/{interview_id}",
        headers={"Authorization": f"Bearer {exp_token}"},
        timeout=15
    )
    assert expert_view_res.status_code == 200, f"Expert view interview failed: {expert_view_res.text}"
    exp_view_data = expert_view_res.json()
    assert exp_view_data["candidate_email"] == cand_email
    assert exp_view_data["assigned_expert_id"] == expert_user_id
    log_step("6", "Evidence Verified by Assigned Expert", "PASSED", f"Candidate: {exp_view_data['candidate_name']}, Role: {exp_view_data['job_role']}")

    # -------------------------------------------------------------
    # 7. Expert Reviews & Adjusts Scores with Rationale
    # -------------------------------------------------------------
    # 7a. Negative Test: Missing required review fields (e.g. missing 'comments')
    log_step("7a", "Negative Test: Missing Required Review Fields")
    missing_fields_res = session.post(
        f"{LIVE_URL}/api/interviews/{interview_id}/review",
        json={
            "expert_id": expert_user_id,
            "expert_name": approved_user["name"],
            "verdict": "APPROVED"
            # 'comments' is deliberately omitted
        },
        headers={"Authorization": f"Bearer {exp_token}"},
        timeout=15
    )
    assert missing_fields_res.status_code == 422, f"Expected 422 on missing required fields: {missing_fields_res.status_code}"
    log_step("7a", "Missing Required Review Fields Rejected", "PASSED", "422 Unprocessable Entity")

    # 7b. Valid Review Submission with Score Adjustment
    log_step("7b", "Expert Submits Valid Review with Score Calibration")
    review_res = session.post(
        f"{LIVE_URL}/api/interviews/{interview_id}/review",
        json={
            "expert_id": expert_user_id,
            "expert_name": approved_user["name"],
            "verdict": "MODIFIED",
            "overall_rating": 8.4,
            "comments": "Candidate demonstrated strong production knowledge of Kafka idempotency and Raft quorum.",
            "dimension_overrides": {
                "technical_knowledge": 8.8,
                "communication": 8.0,
                "answer_structure": 8.0,
                "problem_solving": 8.5,
                "behavioral": 8.0,
                "question_understanding": 8.5,
                "overall": 8.4
            }
        },
        headers={"Authorization": f"Bearer {exp_token}"},
        timeout=15
    )
    assert review_res.status_code == 200, f"Expert submit review failed: {review_res.text}"
    log_step("7b", "Expert Review Submitted", "PASSED", "Verdict: MODIFIED, Overall Rating: 8.4")

    # -------------------------------------------------------------
    # 8. Expert Finalizes Review
    # -------------------------------------------------------------
    log_step("8", "Expert Finalizes Review via Lifecycle Transition")
    finalize_res = session.post(
        f"{LIVE_URL}/api/interviews/{interview_id}/lifecycle/transition",
        json={"target_status": "FINALIZED", "reason": "Expert review complete and verified."},
        headers={"Authorization": f"Bearer {exp_token}"},
        timeout=15
    )
    assert finalize_res.status_code == 200, f"Expert finalize failed: {finalize_res.text}"
    log_step("8", "Review Finalized", "PASSED", f"Lifecycle Status: FINALIZED")

    # -------------------------------------------------------------
    # 9. Admin Releases Report & Candidate Sees Final Report
    # -------------------------------------------------------------
    log_step("9", "Admin Releases Final Report & Candidate Accesses")
    release_res = session.post(
        f"{LIVE_URL}/api/interviews/{interview_id}/release",
        json={"notes": "E2E verification release."},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=15
    )
    assert release_res.status_code == 200, f"Release report failed: {release_res.text}"

    # Candidate accesses released report
    cand_report_res = session.get(
        f"{LIVE_URL}/api/interviews/{interview_id}",
        headers={"Authorization": f"Bearer {cand_token}"},
        timeout=15
    )
    assert cand_report_res.status_code == 200, f"Candidate view report failed: {cand_report_res.text}"
    cand_report = cand_report_res.json()
    assert cand_report.get("lifecycle_status") in ("RELEASED", "FINALIZED")
    assert cand_report.get("expert_review") is not None
    log_step("9", "Report Released & Verified by Candidate", "PASSED", f"Report is live with expert verdict: {cand_report['expert_review']['verdict']}")

    # -------------------------------------------------------------
    # 10. Audit Log Inspection
    # -------------------------------------------------------------
    log_step("10", "Audit Log Inspection for Assessment Trail")
    audit_res = session.get(
        f"{LIVE_URL}/api/admin/audit-logs?target_id={interview_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=15
    )
    assert audit_res.status_code == 200, f"Audit logs failed: {audit_res.text}"
    logs = audit_res.json()
    actions = [l.get("action") for l in logs]
    log_step("10", "Audit Log Events Recorded", "PASSED", f"Recorded actions: {actions}")

    # -------------------------------------------------------------
    # 11. Security & Edge Case Tests
    # -------------------------------------------------------------
    log_step("11a", "Negative Test: Invalid Login Credentials")
    bad_login = session.post(f"{LIVE_URL}/api/auth/login", json={
        "email": cand_email,
        "password": "WrongPassword999!"
    }, timeout=15)
    assert bad_login.status_code == 401, f"Expected 401 on bad login: {bad_login.status_code}"
    log_step("11a", "Invalid Login Blocked", "PASSED", "401 Unauthorized")

    log_step("11b", "Negative Test: Unauthorized Candidate Access to Admin APIs")
    unauth_admin = session.get(
        f"{LIVE_URL}/api/admin/users",
        headers={"Authorization": f"Bearer {cand_token}"},
        timeout=15
    )
    assert unauth_admin.status_code == 403, f"Expected 403 on candidate accessing admin: {unauth_admin.status_code}"
    log_step("11b", "Unauthorized Role Blocked", "PASSED", "403 Forbidden")

    log_step("11c", "Negative Test: Unassigned Expert Accessing Review")
    other_exp = session.post(f"{LIVE_URL}/api/auth/login", json={
        "email": "dr.marcus.vance@techlead.org",
        "password": "password123"
    }, timeout=15)
    if other_exp.status_code == 200:
        other_exp_token = other_exp.json()["token"]
        unassigned_review = session.post(
            f"{LIVE_URL}/api/interviews/{interview_id}/review",
            json={
                "expert_id": "exp_001",
                "expert_name": "Dr. Marcus Vance",
                "verdict": "APPROVED",
                "comments": "Unauthorized review attempt"
            },
            headers={"Authorization": f"Bearer {other_exp_token}"},
            timeout=15
        )
        assert unassigned_review.status_code == 403, f"Expected 403 for unassigned expert: {unassigned_review.status_code}"
        log_step("11c", "Unassigned Expert Blocked", "PASSED", "403 Forbidden")

    log_step("11d", "Negative Test: Duplicate Assignment Prevention")
    dup_assign = session.post(
        f"{LIVE_URL}/api/admin/assign-expert",
        json={
            "interview_id": interview_id,
            "expert_id": expert_user_id,
            "reason": "Duplicate assign attempt"
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=15
    )
    assert dup_assign.status_code in (409, 400), f"Expected 409 Conflict on duplicate assignment: {dup_assign.status_code}"
    log_step("11d", "Duplicate Assignment Blocked", "PASSED", f"Status code: {dup_assign.status_code}")

    log_step("11e", "Negative Test: Non-Existent Record (Failed Database Query)")
    missing_rec = session.get(
        f"{LIVE_URL}/api/interviews/int_non_existent_99999",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=15
    )
    assert missing_rec.status_code == 404, f"Expected 404 for missing assessment: {missing_rec.status_code}"
    log_step("11e", "Non-Existent Query Handled", "PASSED", "404 Not Found")

    print("\n" + "=" * 80)
    print("ALL 11 END-TO-END WORKFLOW & SECURITY PHASES PASSED ON LIVE DEPLOYMENT!")
    print("=" * 80)

if __name__ == "__main__":
    try:
        run_e2e()
    except Exception as e:
        print(f"\n[ERROR] E2E Verification Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
