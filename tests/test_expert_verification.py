import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.auth_service import AuthService
from backend.services.expert_verification_service import ExpertVerificationService

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_state():
    AuthService._sessions.clear()
    ExpertVerificationService._instance = None

def get_token(email: str, role: str = "CANDIDATE", name: str = "Test User") -> str:
    res = client.post("/api/auth/oauth", json={"provider": "Google", "email": email, "name": name, "role": role})
    return res.json()["token"]

def test_expert_application_submission_lifecycle():
    # 1. Candidate applies to become an expert
    cand_token = get_token("john.doe@expertapplicant.io", "CANDIDATE", "John Doe")
    
    apply_payload = {
        "full_name": "John Doe",
        "headline": "Staff SRE & Distributed Infrastructure Architect",
        "current_experience": "Staff SRE at Datadog managing multi-region Kubernetes clusters",
        "years_of_experience": 10.5,
        "technical_expertise": ["Kubernetes", "Linux Kernel", "eBPF", "Prometheus", "High Availability"],
        "supported_interview_categories": ["SRE / DevOps", "System Design", "Cloud Infrastructure"],
        "industry_specialization": "Cloud Observability & Distributed Infrastructure",
        "portfolio_url": "https://linkedin.com/in/johndoe-sre",
        "conflict_of_interest_declaration": "I declare that I have disclosed all active commercial affiliations. I will recuse myself from reviewing current Datadog personnel.",
        "credential_documents": []
    }

    res = client.post("/api/expert/apply", json=apply_payload, headers={"Authorization": f"Bearer {cand_token}"})
    assert res.status_code == 200
    app_data = res.json()
    assert app_data["status"] == "PENDING"
    assert app_data["full_name"] == "John Doe"
    assert len(app_data["status_history"]) >= 1
    assert app_data["status_history"][-1]["action"] == "SUBMITTED"

    # User profile should now be PENDING_EXPERT
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {cand_token}"})
    me_data = me_res.json()
    assert me_data["role"] == "PENDING_EXPERT"
    assert me_data["expert_approval_status"] == "PENDING"
    assert me_data["is_verified_expert"] is False

    # Pending expert CANNOT access expert queue yet (must be 403)
    queue_res = client.get("/api/expert/queue", headers={"Authorization": f"Bearer {cand_token}"})
    assert queue_res.status_code == 403

def test_admin_request_info_and_applicant_response():
    cand_token = get_token("sarah.applicant@systems.io", "CANDIDATE", "Sarah Systems")
    admin_token = get_token("admin@interviewlens.ai", "ADMIN", "Admin")

    # Apply
    apply_payload = {
        "full_name": "Sarah Systems",
        "headline": "Senior Staff Architect",
        "current_experience": "Leading distributed consensus teams",
        "years_of_experience": 8.0,
        "technical_expertise": ["Distributed Systems", "Raft", "PostgreSQL"],
        "supported_interview_categories": ["System Design"],
        "industry_specialization": "Distributed Databases",
        "portfolio_url": "https://github.com/sarah-systems",
        "conflict_of_interest_declaration": "No commercial conflicts of interest.",
        "credential_documents": []
    }
    apply_res = client.post("/api/expert/apply", json=apply_payload, headers={"Authorization": f"Bearer {cand_token}"})
    app_id = apply_res.json()["id"]

    # Admin requests information
    req_info_payload = {
        "action": "REQUEST_INFO",
        "admin_notes": "Please provide proof of employment as Staff Architect or patent / publication citations.",
        "requested_info": "We require verification of your Staff Architect appointment or peer-reviewed publication."
    }
    decision_res = client.post(
        f"/api/admin/expert-applications/{app_id}/decision",
        json=req_info_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert decision_res.status_code == 200
    updated_app = decision_res.json()
    assert updated_app["status"] == "INFO_REQUESTED"
    assert updated_app["requested_info_details"] is not None
    assert updated_app["status_history"][-1]["action"] == "INFO_REQUESTED"

    # Applicant responds to information request
    respond_payload = {
        "application_id": app_id,
        "response_text": "I have attached my ACM Distributed Systems publication and official promotion announcement letter.",
        "additional_documents": [
            {
                "id": "doc_acm_01",
                "filename": "ACM_Paper_Consensus_Sarah.pdf",
                "file_url": "/api/expert/credential/ACM_Paper_Consensus_Sarah.pdf",
                "file_size_bytes": 1240000,
                "document_type": "ACM Research Publication"
            }
        ]
    }
    respond_res = client.post("/api/expert/respond-info", json=respond_payload, headers={"Authorization": f"Bearer {cand_token}"})
    assert respond_res.status_code == 200
    res_data = respond_res.json()
    # Should move back to PENDING for admin review
    assert res_data["status"] == "PENDING"
    assert res_data["status_history"][-1]["action"] == "INFO_PROVIDED"
    assert len(res_data["credential_documents"]) >= 1

    # Admin now APPROVES the application
    approve_payload = {
        "action": "APPROVE",
        "admin_notes": "ACM publication and credentials verified. Promoting to Verified Industry Expert."
    }
    approve_res = client.post(
        f"/api/admin/expert-applications/{app_id}/decision",
        json=approve_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert approve_res.status_code == 200
    approved_app = approve_res.json()
    assert approved_app["status"] == "APPROVED"
    assert approved_app["status_history"][-1]["action"] == "APPROVED"

    # User profile should now be verified EXPERT
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {cand_token}"})
    me_data = me_res.json()
    assert me_data["role"] == "EXPERT"
    assert me_data["is_verified_expert"] is True
    assert me_data["expert_approval_status"] == "APPROVED"

    # Approved expert CAN now access the expert queue
    queue_res = client.get("/api/expert/queue", headers={"Authorization": f"Bearer {cand_token}"})
    assert queue_res.status_code == 200

def test_expert_credential_document_upload_and_limit():
    cand_token = get_token("alex.chen@example.com", "CANDIDATE", "Alex Chen")

    # Valid credential upload
    sample_bytes = b"Stanford Certificate of Completion in Distributed Systems"
    files = {"file": ("stanford_cert.pdf", sample_bytes, "application/pdf")}
    data = {"document_type": "Academic Certificate"}
    res = client.post("/api/expert/upload-credential", files=files, data=data, headers={"Authorization": f"Bearer {cand_token}"})
    assert res.status_code == 200
    doc = res.json()
    assert "file_url" in doc
    assert doc["filename"] == "stanford_cert.pdf"

    # Oversized document upload (> 5MB)
    huge_bytes = b"0" * (6 * 1024 * 1024)
    files = {"file": ("huge_cert.pdf", huge_bytes, "application/pdf")}
    err_res = client.post("/api/expert/upload-credential", files=files, data=data, headers={"Authorization": f"Bearer {cand_token}"})
    assert err_res.status_code == 400
    assert "5MB" in err_res.json()["detail"]
