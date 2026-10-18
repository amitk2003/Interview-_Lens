import json
import os
import uuid
import logging
from typing import Dict, List, Optional
from datetime import datetime

try:
    from ..models.schemas import (
        ExpertApplication,
        ExpertCredentialDocument,
        ExpertAuditLogEntry,
        UserProfile
    )
    from .auth_service import AuthService
    from .mongodb import mongo_manager
except (ImportError, ValueError):
    from backend.models.schemas import (
        ExpertApplication,
        ExpertCredentialDocument,
        ExpertAuditLogEntry,
        UserProfile
    )
    from backend.services.auth_service import AuthService
    from backend.services.mongodb import mongo_manager

logger = logging.getLogger("InterviewLens.ExpertVerification")
APPLICATIONS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "expert_applications.json")


class ExpertVerificationService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ExpertVerificationService, cls).__new__(cls)
            cls._instance.applications: Dict[str, ExpertApplication] = {}
            cls._instance._init_default_data()
        return cls._instance

    def _init_default_data(self):
        os.makedirs(os.path.dirname(APPLICATIONS_FILE), exist_ok=True)

        if os.path.exists(APPLICATIONS_FILE):
            try:
                with open(APPLICATIONS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        app = ExpertApplication(**item)
                        self.applications[app.id] = app
            except Exception as e:
                logger.warning(f"Error loading expert applications file: {e}")

        # Seed pre-configured realistic applications if missing
        self._ensure_seed_applications()
        self.save_to_disk()

    def _ensure_seed_applications(self):
        # 1. Pre-seeded APPROVED application: Dr. Marcus Vance
        if not any(a.user_email == "dr.marcus.vance@techlead.org" for a in self.applications.values()):
            app_vance = ExpertApplication(
                id="app_vance_001",
                user_id="exp_001",
                user_email="dr.marcus.vance@techlead.org",
                full_name="Dr. Marcus Vance",
                headline="Staff Distributed Systems Architect | Ex-Google / Stripe",
                current_experience="Staff Systems Architect at Stripe, leading consensus and high-throughput real-time ledgers.",
                years_of_experience=14.0,
                technical_expertise=["Distributed Consensus (Raft/Paxos)", "Kafka & Event Streams", "Database Internals", "System Design"],
                supported_interview_categories=["System Design", "Distributed Systems", "Backend Architecture", "Engineering Leadership"],
                industry_specialization="FinTech Infrastructure & High-Reliability Core Services",
                portfolio_url="https://linkedin.com/in/marcus-vance-dist-sys",
                credential_documents=[
                    ExpertCredentialDocument(
                        id="doc_vance_01",
                        filename="Stanford_PhD_Distributed_Systems.pdf",
                        file_url="/api/expert/credential/Stanford_PhD_Distributed_Systems.pdf",
                        file_size_bytes=1420500,
                        document_type="Doctoral Degree & Academic Verification",
                        uploaded_at="2026-09-10T14:20:00Z"
                    ),
                    ExpertCredentialDocument(
                        id="doc_vance_02",
                        filename="Stripe_Staff_Architect_Employment_Proof.pdf",
                        file_url="/api/expert/credential/Stripe_Staff_Architect_Employment_Proof.pdf",
                        file_size_bytes=840200,
                        document_type="Employment Verification",
                        uploaded_at="2026-09-10T14:25:00Z"
                    )
                ],
                conflict_of_interest_declaration="I disclose full-time advisory roles with fintech platforms. I agree to recuse myself from any interview candidates employed by current commercial partners.",
                conflict_declared=True,
                status="APPROVED",
                admin_notes="Verified via corporate domain authentication, academic transcript review, and industry leadership committee recommendation.",
                status_history=[
                    ExpertAuditLogEntry(
                        id="aud_vance_01",
                        timestamp="2026-09-10T14:30:00Z",
                        action="SUBMITTED",
                        actor_email="dr.marcus.vance@techlead.org",
                        actor_name="Dr. Marcus Vance",
                        actor_role="APPLICANT",
                        notes="Initial application submitted with doctoral and employer credentials."
                    ),
                    ExpertAuditLogEntry(
                        id="aud_vance_02",
                        timestamp="2026-09-12T10:15:00Z",
                        action="APPROVED",
                        actor_email="admin@interviewlens.ai",
                        actor_name="Chief Platform Administrator",
                        actor_role="ADMIN",
                        notes="Credentials, conflict declarations, and employment history verified. Approved for Staff/Principal reviews."
                    )
                ],
                applied_at="2026-09-10T14:30:00Z",
                updated_at="2026-09-12T10:15:00Z",
                reviewed_at="2026-09-12T10:15:00Z",
                reviewed_by="admin@interviewlens.ai"
            )
            self.applications[app_vance.id] = app_vance

        # 2. Pre-seeded PENDING application: Priya Sharma
        if not any(a.user_email == "priya.sharma@evaluator.org" for a in self.applications.values()):
            app_priya = ExpertApplication(
                id="app_priya_001",
                user_id="pex_001",
                user_email="priya.sharma@evaluator.org",
                full_name="Priya Sharma",
                headline="Staff Performance & Linux Kernel Engineer | Netflix",
                current_experience="Senior Staff Performance Engineer at Netflix streaming core; 9 years optimizing eBPF observability and distributed RPC latencies.",
                years_of_experience=9.5,
                technical_expertise=["Linux eBPF", "Latency Profiling", "Distributed Tracing", "C++ / Rust", "Kernel Network Stacks"],
                supported_interview_categories=["Systems Performance", "Linux Internals", "Low Latency Networking", "Backend Systems"],
                industry_specialization="High-Throughput Media Streaming & Low-Latency Cloud Compute",
                portfolio_url="https://linkedin.com/in/priya-sharma-perf",
                credential_documents=[
                    ExpertCredentialDocument(
                        id="doc_priya_01",
                        filename="Priya_Sharma_USENIX_Paper_eBPF.pdf",
                        file_url="/api/expert/credential/Priya_Sharma_USENIX_Paper_eBPF.pdf",
                        file_size_bytes=2150000,
                        document_type="Conference Publication / Research Verification",
                        uploaded_at="2026-10-17T09:10:00Z"
                    )
                ],
                conflict_of_interest_declaration="I declare no direct conflicts. Will recuse myself from reviewing direct colleagues within the Netflix CDN organization.",
                conflict_declared=True,
                status="PENDING",
                status_history=[
                    ExpertAuditLogEntry(
                        id="aud_priya_01",
                        timestamp="2026-10-17T09:15:00Z",
                        action="SUBMITTED",
                        actor_email="priya.sharma@evaluator.org",
                        actor_name="Priya Sharma",
                        actor_role="APPLICANT",
                        notes="Candidate submitted application for Staff Performance & Linux Systems expert accreditation."
                    )
                ],
                applied_at="2026-10-17T09:15:00Z",
                updated_at="2026-10-17T09:15:00Z"
            )
            self.applications[app_priya.id] = app_priya

        # 3. Pre-seeded INFO_REQUESTED application: David Zheng
        if not any(a.user_email == "david.zheng@cloudai.io" for a in self.applications.values()):
            app_david = ExpertApplication(
                id="app_david_001",
                user_id="usr_david_001",
                user_email="david.zheng@cloudai.io",
                full_name="David Zheng",
                headline="Principal Cloud AI Infrastructure Architect",
                current_experience="Principal AI Systems Architect at CloudAI, designing GPU cluster interconnects and InfiniBand topologies.",
                years_of_experience=11.0,
                technical_expertise=["GPU Orchestration", "InfiniBand / RoCE", "Kubernetes AI Workloads", "Distributed LLM Serving"],
                supported_interview_categories=["AI Infrastructure", "High Performance Computing", "Cloud Architecture"],
                industry_specialization="Hyperscale AI / GPU Compute Clusters",
                portfolio_url="https://github.com/davidzheng-ai",
                credential_documents=[
                    ExpertCredentialDocument(
                        id="doc_david_01",
                        filename="David_Zheng_Resume.pdf",
                        file_url="/api/expert/credential/David_Zheng_Resume.pdf",
                        file_size_bytes=520000,
                        document_type="Resume Overview",
                        uploaded_at="2026-10-15T11:00:00Z"
                    )
                ],
                conflict_of_interest_declaration="No active commercial conflicts outside CloudAI.",
                conflict_declared=True,
                status="INFO_REQUESTED",
                admin_notes="Resume uploaded, but certified vendor accreditation or employer verification proof is required.",
                requested_info_details="Please provide official proof of Staff/Principal employment verification or AWS/NVIDIA HPC Solutions Architect Certification before we can approve your evaluator status.",
                status_history=[
                    ExpertAuditLogEntry(
                        id="aud_david_01",
                        timestamp="2026-10-15T11:05:00Z",
                        action="SUBMITTED",
                        actor_email="david.zheng@cloudai.io",
                        actor_name="David Zheng",
                        actor_role="APPLICANT",
                        notes="Submitted initial application."
                    ),
                    ExpertAuditLogEntry(
                        id="aud_david_02",
                        timestamp="2026-10-16T14:20:00Z",
                        action="INFO_REQUESTED",
                        actor_email="admin@interviewlens.ai",
                        actor_name="Chief Platform Administrator",
                        actor_role="ADMIN",
                        notes="Requested proof of HPC/InfiniBand production certifications or employer title verification.",
                        requested_info="Please provide official proof of Staff/Principal employment verification or AWS/NVIDIA HPC Solutions Architect Certification."
                    )
                ],
                applied_at="2026-10-15T11:05:00Z",
                updated_at="2026-10-16T14:20:00Z",
                reviewed_at="2026-10-16T14:20:00Z",
                reviewed_by="admin@interviewlens.ai"
            )
            self.applications[app_david.id] = app_david

    def save_to_disk(self):
        try:
            data = [app.model_dump() for app in self.applications.values()]
            with open(APPLICATIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning(f"Error saving expert applications to disk: {e}")

    def get_application_by_id(self, application_id: str) -> Optional[ExpertApplication]:
        return self.applications.get(application_id)

    def get_application_for_user(self, user_email: str) -> Optional[ExpertApplication]:
        norm = (user_email or "").strip().lower()
        for app in self.applications.values():
            if app.user_email.strip().lower() == norm:
                return app
        return None

    def list_applications(self, status_filter: Optional[str] = None) -> List[ExpertApplication]:
        apps = list(self.applications.values())
        if status_filter and status_filter.upper() != "ALL":
            apps = [a for a in apps if a.status == status_filter.upper()]
        return sorted(apps, key=lambda a: a.applied_at, reverse=True)

    def submit_application(
        self,
        user: UserProfile,
        full_name: str,
        headline: str,
        current_experience: str,
        years_of_experience: float,
        technical_expertise: List[str],
        supported_interview_categories: List[str],
        industry_specialization: str,
        portfolio_url: Optional[str],
        conflict_of_interest_declaration: str,
        credential_documents: Optional[List[ExpertCredentialDocument]] = None
    ) -> ExpertApplication:
        existing = self.get_application_for_user(user.email)
        now_iso = datetime.utcnow().isoformat()

        if existing:
            # Update existing application
            existing.full_name = full_name
            existing.headline = headline
            existing.current_experience = current_experience
            existing.years_of_experience = years_of_experience
            existing.technical_expertise = technical_expertise
            existing.supported_interview_categories = supported_interview_categories
            existing.industry_specialization = industry_specialization
            existing.portfolio_url = portfolio_url
            existing.conflict_of_interest_declaration = conflict_of_interest_declaration
            existing.conflict_declared = True
            existing.status = "PENDING"
            existing.updated_at = now_iso
            if credential_documents:
                existing.credential_documents = credential_documents

            existing.status_history.append(
                ExpertAuditLogEntry(
                    id=f"aud_{str(uuid.uuid4())[:8]}",
                    timestamp=now_iso,
                    action="SUBMITTED",
                    actor_email=user.email,
                    actor_name=full_name,
                    actor_role="APPLICANT",
                    notes="Applicant updated application fields and submitted for administrative review."
                )
            )
            app = existing
        else:
            app = ExpertApplication(
                id=f"app_{str(uuid.uuid4())[:8]}",
                user_id=user.id,
                user_email=user.email,
                full_name=full_name,
                headline=headline,
                current_experience=current_experience,
                years_of_experience=years_of_experience,
                technical_expertise=technical_expertise,
                supported_interview_categories=supported_interview_categories,
                industry_specialization=industry_specialization,
                portfolio_url=portfolio_url,
                credential_documents=credential_documents or [],
                conflict_of_interest_declaration=conflict_of_interest_declaration,
                conflict_declared=True,
                status="PENDING",
                applied_at=now_iso,
                updated_at=now_iso,
                status_history=[
                    ExpertAuditLogEntry(
                        id=f"aud_{str(uuid.uuid4())[:8]}",
                        timestamp=now_iso,
                        action="SUBMITTED",
                        actor_email=user.email,
                        actor_name=full_name,
                        actor_role="APPLICANT",
                        notes="Candidate submitted formal application for Verified Industry Expert accreditation."
                    )
                ]
            )
            self.applications[app.id] = app

        # Update user profile in AuthService: role becomes PENDING_EXPERT
        try:
            if user.role != "EXPERT":
                user_data = AuthService._users.get(user.email)
                if user_data:
                    user_data["role"] = "PENDING_EXPERT"
                    user_data["expert_approval_status"] = "PENDING"
                    user_data["expert_title"] = headline
                    user_data["expert_domain"] = technical_expertise
                    user_data["years_of_experience"] = years_of_experience
                    user_data["supported_interview_categories"] = supported_interview_categories
                    user_data["conflict_of_interest_declaration"] = conflict_of_interest_declaration
        except Exception as e:
            logger.warning(f"Failed to update user profile on application submission: {e}")

        self.save_to_disk()
        return app

    def respond_to_info_request(
        self,
        application_id: str,
        response_text: str,
        user: UserProfile,
        additional_documents: Optional[List[ExpertCredentialDocument]] = None
    ) -> ExpertApplication:
        app = self.get_application_by_id(application_id)
        if not app:
            raise ValueError(f"Application '{application_id}' not found.")
        if app.user_email.strip().lower() != user.email.strip().lower():
            raise PermissionError("You can only respond to your own application.")

        now_iso = datetime.utcnow().isoformat()
        app.status = "PENDING"  # Moves back to pending for admin evaluation
        app.applicant_response = response_text
        app.updated_at = now_iso

        if additional_documents:
            app.credential_documents.extend(additional_documents)

        app.status_history.append(
            ExpertAuditLogEntry(
                id=f"aud_{str(uuid.uuid4())[:8]}",
                timestamp=now_iso,
                action="INFO_PROVIDED",
                actor_email=user.email,
                actor_name=user.name,
                actor_role="APPLICANT",
                notes="Applicant provided answers and additional proof documents in response to admin information request.",
                provided_info=response_text
            )
        )

        user_data = AuthService._users.get(user.email)
        if user_data:
            user_data["expert_approval_status"] = "PENDING"

        self.save_to_disk()
        return app

    def admin_review_decision(
        self,
        application_id: str,
        action: str,  # "APPROVE", "REJECT", "REQUEST_INFO"
        admin_notes: Optional[str],
        requested_info: Optional[str],
        admin_user: UserProfile
    ) -> ExpertApplication:
        app = self.get_application_by_id(application_id)
        if not app:
            raise ValueError(f"Application '{application_id}' not found.")

        now_iso = datetime.utcnow().isoformat()
        app.reviewed_at = now_iso
        app.reviewed_by = admin_user.email
        app.admin_notes = admin_notes

        if action == "APPROVE":
            app.status = "APPROVED"
            AuthService.admin_set_expert_approval(
                target_email=app.user_email,
                action="APPROVE",
                admin_notes=admin_notes
            )
            # Sync metadata to profile
            user_data = AuthService._users.get(app.user_email)
            if user_data:
                user_data["expert_title"] = app.headline
                user_data["expert_domain"] = app.technical_expertise
                user_data["years_of_experience"] = app.years_of_experience

            app.status_history.append(
                ExpertAuditLogEntry(
                    id=f"aud_{str(uuid.uuid4())[:8]}",
                    timestamp=now_iso,
                    action="APPROVED",
                    actor_email=admin_user.email,
                    actor_name=admin_user.name,
                    actor_role="ADMIN",
                    notes=admin_notes or "Application approved. User promoted to Verified Industry Expert."
                )
            )

        elif action == "REJECT":
            app.status = "REJECTED"
            AuthService.admin_set_expert_approval(
                target_email=app.user_email,
                action="REJECT",
                admin_notes=admin_notes
            )
            app.status_history.append(
                ExpertAuditLogEntry(
                    id=f"aud_{str(uuid.uuid4())[:8]}",
                    timestamp=now_iso,
                    action="REJECTED",
                    actor_email=admin_user.email,
                    actor_name=admin_user.name,
                    actor_role="ADMIN",
                    notes=admin_notes or "Application rejected based on administrative review."
                )
            )

        elif action == "REQUEST_INFO":
            if not requested_info or not requested_info.strip():
                raise ValueError("Must specify requested information/clarification details.")
            app.status = "INFO_REQUESTED"
            app.requested_info_details = requested_info.strip()

            user_data = AuthService._users.get(app.user_email)
            if user_data:
                user_data["expert_approval_status"] = "INFO_REQUESTED"

            app.status_history.append(
                ExpertAuditLogEntry(
                    id=f"aud_{str(uuid.uuid4())[:8]}",
                    timestamp=now_iso,
                    action="INFO_REQUESTED",
                    actor_email=admin_user.email,
                    actor_name=admin_user.name,
                    actor_role="ADMIN",
                    notes=admin_notes or "Additional supporting credentials and clarifications requested.",
                    requested_info=requested_info.strip()
                )
            )
        else:
            raise ValueError(f"Unknown administrative action '{action}'")

        self.save_to_disk()
        return app
