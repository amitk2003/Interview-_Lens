import os
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.auth_service import AuthService
from backend.services.storage import InterviewStorage

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_state():
    AuthService._sessions.clear()
    InterviewStorage._instance = None

def get_token_for(email: str, role: str = "CANDIDATE") -> str:
    name = "Alex Chen" if "alex" in email else ("Dr. Marcus Vance" if "vance" in email else "Test User")
    res = client.post("/api/auth/oauth", json={"provider": "Google", "email": email, "name": name, "role": role})
    return res.json()["token"]

def test_candidate_profile_retrieval_and_assessment_history():
    token = get_token_for("alex.chen@example.com", "CANDIDATE")
    res = client.get("/api/candidate/profile", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "profile" in data
    assert "assessment_history" in data
    assert "summary_metrics" in data
    assert data["is_owner"] is True
    
    profile = data["profile"]
    assert profile["name"] == "Alex Chen"
    assert profile["headline"] is not None
    assert len(profile["skills"]) > 0
    assert len(profile["education"]) > 0
    assert len(profile["work_experience"]) > 0
    assert len(profile["projects"]) > 0
    assert profile["resume_filename"] is not None

    assessments = data["assessment_history"]
    assert len(assessments) >= 3
    statuses = [a["status"] for a in assessments]
    # Check that required statuses exist in assessment history
    assert "Finalized" in statuses
    assert "Revision Required" in statuses

    # Check first assessment structure
    first = assessments[0]
    assert "title" in first
    assert "job_role" in first
    assert "overall_score" in first
    assert "dimension_scores" in first
    assert "strengths" in first
    assert "weaknesses" in first
    assert "supporting_evidence" in first
    assert "confidence_score" in first
    assert "uncertainty_score" in first

def test_candidate_profile_permitted_updates_and_field_protection():
    token = get_token_for("alex.chen@example.com", "CANDIDATE")
    update_payload = {
        "headline": "Lead Staff Architect | Cloud & Distributed Databases",
        "target_role": "Staff Distributed Systems Engineer",
        "skills": ["Go", "Python", "Rust", "Kafka", "Raft", "Distributed SQL"],
        # Malicious attempts to alter role or verified status
        "role": "ADMIN",
        "is_verified_expert": True
    }
    res = client.put("/api/candidate/profile", json=update_payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    updated = res.json()
    assert updated["headline"] == "Lead Staff Architect | Cloud & Distributed Databases"
    assert updated["target_role"] == "Staff Distributed Systems Engineer"
    assert "Rust" in updated["skills"]
    # Role and expert verification must remain immutable
    assert updated["role"] == "CANDIDATE"
    assert updated["is_verified_expert"] is False

def test_privacy_unauthorized_candidate_cannot_view_other_profile():
    token = get_token_for("candidate.demo@interviewlens.ai", "CANDIDATE")
    # Try viewing Alex Chen's profile by ID usr_001
    res = client.get("/api/candidate/profile/usr_001", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]

def test_privacy_authorized_expert_gets_masked_contact_info():
    expert_token = get_token_for("dr.marcus.vance@techlead.org", "EXPERT")
    # Dr. Marcus Vance is assigned to Alex Chen's interviews, so authorized
    res = client.get("/api/candidate/profile/usr_001", headers={"Authorization": f"Bearer {expert_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_owner"] is False
    profile = data["profile"]
    assert profile["name"] == "Alex Chen"
    # Contact info must be masked for privacy
    assert "***" in profile["email"]
    assert "***" in profile["phone"]

def test_resume_upload_and_download():
    token = get_token_for("alex.chen@example.com", "CANDIDATE")
    sample_resume_content = b"Alex Chen Resume\nSenior Distributed Systems Engineer\nSkills: Kafka, Redis, Go"
    
    files = {"file": ("test_resume.pdf", sample_resume_content, "application/pdf")}
    res = client.post("/api/candidate/resume-upload", files=files, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "file_url" in data
    assert data["filename"] == "test_resume.pdf"
    
    # Test file retrieval
    filename = data["file_url"].split("/")[-1]
    download_res = client.get(f"/api/candidate/resume/{filename}", headers={"Authorization": f"Bearer {token}"})
    assert download_res.status_code == 200
    assert download_res.content == sample_resume_content

def test_resume_upload_rejects_oversized_file():
    token = get_token_for("alex.chen@example.com", "CANDIDATE")
    oversized_content = b"x" * (6 * 1024 * 1024) # 6 MB > 5 MB
    files = {"file": ("huge_resume.pdf", oversized_content, "application/pdf")}
    res = client.post("/api/candidate/resume-upload", files=files, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    assert "exceeds maximum allowed size of 5MB" in res.json()["detail"]
