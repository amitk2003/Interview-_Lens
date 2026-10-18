import uuid
import hashlib
import logging
from typing import Dict, Optional, List
from datetime import datetime
from ..models.schemas import UserProfile, UserRole
from .mongodb import mongo_manager

logger = logging.getLogger("InterviewLens.Auth")

# ---------------------------------------------------------------------------
# Fields that are SERVER-OWNED and must never be overwritten by client payloads
# ---------------------------------------------------------------------------
_SERVER_OWNED_FIELDS = {
    "password_hash",
    "id",
    "role",
    "is_verified_expert",
    "expert_approval_status",
    "expert_rating",
    "reviews_completed_count",
    "interviews_count",
    "expert_scores",
    "ai_scores",
    "review_decisions"
}

# ---------------------------------------------------------------------------
# Pre-seeded demo accounts whose roles ARE trusted on oauth/demo login.
# Any email NOT in this set will have its role forced to CANDIDATE on oauth.
# ---------------------------------------------------------------------------
TRUSTED_DEMO_EMAILS: Dict[str, str] = {
    # candidate demos
    "alex.chen@example.com": "CANDIDATE",
    "candidate.demo@interviewlens.ai": "CANDIDATE",
    # verified experts (pre-approved)
    "dr.marcus.vance@techlead.org": "EXPERT",
    "elena.rostova@cloudscale.io": "EXPERT",
    # pending expert (awaiting admin verification)
    "priya.sharma@evaluator.org": "PENDING_EXPERT",
    # admin
    "admin@interviewlens.ai": "ADMIN",
}


class AuthService:
    """
    Manages user registration, authentication, RBAC permissions, and session state.

    Security invariants:
    - Public registration ALWAYS produces a CANDIDATE (or PENDING_EXPERT for applicants).
    - Only an ADMIN can promote a PENDING_EXPERT to EXPERT.
    - oauth/demo login respects the requested role ONLY for pre-seeded TRUSTED_DEMO_EMAILS.
    - update_profile strips all server-owned fields (role, id, is_verified_expert, etc.).
    """

    _users: Dict[str, Dict] = {
        # --- Pre-seeded Candidates ---
        "alex.chen@example.com": {
            "id": "usr_001",
            "name": "Alex Chen",
            "email": "alex.chen@example.com",
            "password_hash": hashlib.sha256("password123".encode()).hexdigest(),
            "role": "CANDIDATE",
            "auth_provider": "Google",
            "headline": "Senior Distributed Systems Engineer | Event Streams & Cloud Infrastructure",
            "target_role": "Senior Distributed Systems Engineer",
            "profile_photo_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
            "bio": "Passionate systems engineer with 6+ years designing event-driven pipelines handling 100k+ events/sec, Raft consensus clusters, and low-latency financial ledger services.",
            "phone": "+1 (415) 890-2341",
            "location": "San Francisco, CA",
            "skills": ["Python", "FastAPI", "Kafka", "Redis", "Distributed Systems", "PostgreSQL", "System Design", "Go", "Docker", "Kubernetes"],
            "specializations": ["Distributed Systems & Consensus", "High-Throughput Ingestion", "Event-Driven Microservices", "Data Consistency (ACID/BASE)"],
            "education": [
                {
                    "id": "edu_01",
                    "institution": "University of California, Berkeley",
                    "degree": "B.S. in Electrical Engineering & Computer Sciences (EECS)",
                    "field_of_study": "Computer Science & Distributed Systems",
                    "start_year": "2015",
                    "end_year": "2019",
                    "description": "Focus on Operating Systems, Database System Internals, and Computer Networking. Dean's Honors List."
                }
            ],
            "work_experience": [
                {
                    "id": "exp_01",
                    "company": "FinScale Technologies",
                    "title": "Senior Backend Systems Engineer",
                    "location": "San Francisco, CA",
                    "start_date": "2022-03",
                    "end_date": None,
                    "is_current": True,
                    "highlights": "Architected real-time idempotency deduplication layer over Kafka and Redis, reducing duplicate payment order processing to 0.00%. Scaled transactional write throughput from 12k to 85k ops/sec."
                },
                {
                    "id": "exp_02",
                    "company": "DataGrid Cloud",
                    "title": "Distributed Systems Engineer",
                    "location": "San Jose, CA",
                    "start_date": "2019-07",
                    "end_date": "2022-02",
                    "is_current": False,
                    "highlights": "Maintained distributed metadata store backed by etcd and Raft consensus; led zero-downtime rolling cluster upgrades across 4 global cloud regions with strict p99 latency SLA (<15ms)."
                }
            ],
            "projects": [
                {
                    "id": "prj_01",
                    "name": "RaftLog-Go Engine",
                    "description": "Production-grade Raft consensus state machine in Go with snapshotting, dynamic cluster membership change, and persistent write-ahead logging.",
                    "technologies": ["Go", "Raft Consensus", "gRPC", "Protobuf"],
                    "project_url": "https://github.com/alexchen/raftlog-go"
                },
                {
                    "id": "prj_02",
                    "name": "Kafka-Idempotent-Stream",
                    "description": "End-to-end exactly-once messaging middleware leveraging Redis distributed locks and atomic transactional offsets.",
                    "technologies": ["Python", "Kafka", "Redis", "FastAPI"],
                    "project_url": "https://github.com/alexchen/kafka-idempotent-stream"
                }
            ],
            "resume_summary": "6+ years backend engineering, distributed event streams, microservices architecture, and caching strategies. Proven experience scaling Kafka pipelines to 85k ops/sec.",
            "resume_filename": "Alex_Chen_Senior_Backend_Resume.pdf",
            "resume_file_url": "/api/candidate/resume/Alex_Chen_Senior_Backend_Resume.pdf",
            "resume_text": "Alex Chen\nSenior Distributed Systems Engineer\nEmail: alex.chen@example.com | Location: San Francisco, CA\n\nPROFESSIONAL SUMMARY\nExperienced distributed systems engineer with 6+ years building fault-tolerant backend infrastructure, Kafka streaming pipelines, and microservices.\n\nTECHNICAL SKILLS\nLanguages: Python, Go, SQL, Bash\nSystems: Apache Kafka, Redis, PostgreSQL, Docker, Kubernetes, gRPC, etcd/Raft\nConcepts: High Availability, Distributed Consensus, Idempotency, Event Sourcing, CAP Theorem\n\nEXPERIENCE\nFinScale Technologies — Senior Backend Systems Engineer (2022 - Present)\n- Architected idempotency middleware for order processing across distributed ledger clusters.\n- Increased write throughput by 7x while maintaining strict sub-15ms p99 latency guarantees.\n\nDataGrid Cloud — Distributed Systems Engineer (2019 - 2022)\n- Managed etcd metadata cluster and implemented automatic partition rebalancing.\n\nEDUCATION\nUC Berkeley — B.S. in EECS (2015 - 2019)",
            "resume_uploaded_at": "2026-10-15T10:30:00Z",
            "is_verified_expert": False,
            "expert_approval_status": "NOT_APPLIED",
            "expert_title": None,
            "expert_organization": None,
            "expert_domain": [],
            "expert_rating": None,
            "reviews_completed_count": 0,
            "linkedin_url": "https://linkedin.com/in/alexchen-dist-sys",
            "github_url": "https://github.com/alexchen",
            "interviews_count": 3,
            "created_at": datetime.utcnow().isoformat()
        },
        "candidate.demo@interviewlens.ai": {
            "id": "usr_002",
            "name": "Sarah Miller",
            "email": "candidate.demo@interviewlens.ai",
            "password_hash": hashlib.sha256("demo123".encode()).hexdigest(),
            "role": "CANDIDATE",
            "auth_provider": "Demo",
            "headline": "Staff Full Stack & Agentic AI Systems Architect",
            "target_role": "Full Stack & AI Engineer",
            "profile_photo_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
            "bio": "Specializing in high-performance React architectures, TypeScript systems, and multi-agent LLM reasoning workflows.",
            "phone": "+1 (206) 555-0199",
            "location": "Seattle, WA",
            "skills": ["React", "TypeScript", "Python", "LLMs", "Node.js", "Docker", "TailwindCSS", "Next.js", "FastAPI"],
            "specializations": ["Multi-Agent Orchestration", "Modern React Architecture", "LLM Evaluation Pipelines"],
            "education": [
                {
                    "id": "edu_02",
                    "institution": "University of Washington",
                    "degree": "M.S. in Computer Science",
                    "field_of_study": "Human-AI Interaction & Systems",
                    "start_year": "2016",
                    "end_year": "2018",
                    "description": "Graduate research in AI workflow interfaces and responsive data visualization."
                }
            ],
            "work_experience": [
                {
                    "id": "exp_03",
                    "company": "SynthLabs AI",
                    "title": "Staff AI Frontend Architect",
                    "location": "Seattle, WA",
                    "start_date": "2021-08",
                    "end_date": None,
                    "is_current": True,
                    "highlights": "Spearheaded the agent telemetry cockpit used by 150+ enterprise teams. Reduced initial bundle size by 42% using dynamic chunking and virtualized stream trees."
                }
            ],
            "projects": [
                {
                    "id": "prj_03",
                    "name": "AgentTelemetry-Visualizer",
                    "description": "Real-time acyclic graph visualizer for monitoring multi-agent planning trajectories and latency percentiles.",
                    "technologies": ["React", "TypeScript", "D3.js", "WebSockets"],
                    "project_url": "https://github.com/sarahmiller/agent-telemetry"
                }
            ],
            "resume_summary": "Full stack engineer specializing in AI agent applications, React architecture, and modern cloud deployment.",
            "resume_filename": "Sarah_Miller_AI_Lead_Resume.pdf",
            "resume_file_url": "/api/candidate/resume/Sarah_Miller_AI_Lead_Resume.pdf",
            "resume_text": "Sarah Miller\nStaff Full Stack & AI Engineer\nSeattle, WA | sarah.miller@example.com\n\nFocus: Multi-agent systems, React 19, TypeScript, async execution graphs.",
            "resume_uploaded_at": "2026-10-14T09:15:00Z",
            "is_verified_expert": False,
            "expert_approval_status": "NOT_APPLIED",
            "expert_title": None,
            "expert_organization": None,
            "expert_domain": [],
            "expert_rating": None,
            "reviews_completed_count": 0,
            "linkedin_url": "https://linkedin.com/in/sarahmiller-ai",
            "github_url": "https://github.com/sarahmiller",
            "interviews_count": 1,
            "created_at": datetime.utcnow().isoformat()
        },

        # --- Pre-seeded Verified Industry Experts (admin-approved) ---
        "dr.marcus.vance@techlead.org": {
            "id": "exp_001",
            "name": "Dr. Marcus Vance",
            "email": "dr.marcus.vance@techlead.org",
            "password_hash": hashlib.sha256("expert123".encode()).hexdigest(),
            "role": "EXPERT",
            "auth_provider": "Expert Verification Portal",
            "target_role": "Staff Distributed Systems Architect",
            "skills": ["Distributed Consensus", "Raft/Paxos", "High Throughput Systems", "Database Internals", "Kafka"],
            "resume_summary": "12+ years Staff Architect at Tier-1 FinTech & Cloud Infra. Former distributed systems hiring committee lead.",
            "is_verified_expert": True,
            "expert_approval_status": "APPROVED",
            "expert_title": "Staff Distributed Systems Architect",
            "expert_organization": "Stripe / ex-Google",
            "expert_domain": ["Distributed Systems", "Backend Architecture", "Kafka/Redis", "System Design"],
            "expert_rating": 4.96,
            "reviews_completed_count": 48,
            "interviews_count": 0,
            "created_at": datetime.utcnow().isoformat()
        },
        "elena.rostova@cloudscale.io": {
            "id": "exp_002",
            "name": "Elena Rostova",
            "email": "elena.rostova@cloudscale.io",
            "password_hash": hashlib.sha256("expert123".encode()).hexdigest(),
            "role": "EXPERT",
            "auth_provider": "Expert Verification Portal",
            "target_role": "Principal Full Stack & AI Systems Lead",
            "skills": ["React", "TypeScript", "Python", "LLMs", "FastAPI", "Cloud Scalability"],
            "resume_summary": "10+ years engineering leadership across modern web applications, agentic AI workflows, and frontend performance.",
            "is_verified_expert": True,
            "expert_approval_status": "APPROVED",
            "expert_title": "Principal Full Stack & AI Systems Lead",
            "expert_organization": "CloudScale / ex-Meta",
            "expert_domain": ["Full Stack", "React", "AI Agents", "Node.js", "Python"],
            "expert_rating": 4.92,
            "reviews_completed_count": 31,
            "interviews_count": 0,
            "created_at": datetime.utcnow().isoformat()
        },

        # --- Pre-seeded Pending Industry Expert (awaiting admin approval) ---
        "priya.sharma@evaluator.org": {
            "id": "pex_001",
            "name": "Priya Sharma",
            "email": "priya.sharma@evaluator.org",
            "password_hash": hashlib.sha256("expert123".encode()).hexdigest(),
            "role": "PENDING_EXPERT",
            "auth_provider": "Email",
            "target_role": "Senior Staff ML Infrastructure Engineer",
            "skills": ["Distributed Model Training", "LLM Evaluation", "CUDA / PyTorch", "Cluster Orchestration", "MLOps"],
            "resume_summary": "10+ years engineering lead scaling distributed model training clusters and evaluating AI infra candidates. Seeking industry expert accreditation.",
            "is_verified_expert": False,
            "expert_approval_status": "PENDING",
            "expert_title": "Senior Staff ML Infrastructure Engineer",
            "expert_organization": "OpenScale / ex-Anthropic",
            "expert_domain": ["ML Infrastructure", "Distributed Training", "LLM Evaluation"],
            "expert_rating": None,
            "reviews_completed_count": 0,
            "interviews_count": 0,
            "created_at": datetime.utcnow().isoformat()
        },

        # --- Pre-seeded Admin ---
        "admin@interviewlens.ai": {
            "id": "adm_001",
            "name": "InterviewLens Admin",
            "email": "admin@interviewlens.ai",
            "password_hash": hashlib.sha256("admin2024!".encode()).hexdigest(),
            "role": "ADMIN",
            "auth_provider": "Email",
            "target_role": "Platform Administrator",
            "skills": ["Platform Administration", "Expert Verification", "RBAC"],
            "resume_summary": "Platform administrator responsible for expert vetting and approval.",
            "is_verified_expert": False,
            "expert_approval_status": "NOT_APPLIED",
            "expert_title": None,
            "expert_organization": "InterviewLens",
            "expert_domain": [],
            "expert_rating": None,
            "reviews_completed_count": 0,
            "interviews_count": 0,
            "created_at": datetime.utcnow().isoformat()
        }
    }

    _sessions: Dict[str, str] = {}  # token -> email

    @classmethod
    def hash_password(cls, password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    @classmethod
    def register(
        cls,
        name: str,
        email: str,
        password: str,
        apply_as_expert: bool = False,
        target_role: Optional[str] = None,
        expert_title: Optional[str] = None,
        expert_organization: Optional[str] = None,
        expert_domain: Optional[List[str]] = None
    ) -> Dict:
        """
        Public registration. Always creates a CANDIDATE.
        If apply_as_expert=True, role is set to PENDING_EXPERT and must be
        approved by an ADMIN before gaining expert access.
        """
        email = email.strip().lower()
        if email in cls._users:
            raise ValueError("An account with this email already exists.")

        # Security: role is NEVER taken from the client request payload.
        # Expert applicants start as PENDING_EXPERT, not EXPERT.
        if apply_as_expert:
            assigned_role = "PENDING_EXPERT"
            approval_status = "PENDING"
            user_id = f"pex_{str(uuid.uuid4())[:8]}"
        else:
            assigned_role = "CANDIDATE"
            approval_status = "NOT_APPLIED"
            user_id = f"usr_{str(uuid.uuid4())[:8]}"

        user_data = {
            "id": user_id,
            "name": name.strip(),
            "email": email,
            "password_hash": cls.hash_password(password),
            "role": assigned_role,
            "auth_provider": "Email",
            "target_role": target_role or ("Staff Systems Architect" if apply_as_expert else "Software Engineer"),
            "skills": expert_domain or (["System Architecture", "Code Review"] if apply_as_expert else ["Python", "React", "System Design"]),
            "resume_summary": (
                f"Expert applicant at {expert_organization or 'Tech Industry'}. Pending admin verification."
                if apply_as_expert
                else f"Candidate targeting {target_role or 'Software Engineer'}."
            ),
            "is_verified_expert": False,          # Always False until admin approves
            "expert_approval_status": approval_status,
            "expert_title": expert_title or ("Staff Technical Evaluator" if apply_as_expert else None),
            "expert_organization": expert_organization or ("Pending Verification" if apply_as_expert else None),
            "expert_domain": expert_domain or (["System Design", "Backend Architecture"] if apply_as_expert else []),
            "expert_rating": None,                # Starts at None; earned over time
            "reviews_completed_count": 0,
            "interviews_count": 0,
            "created_at": datetime.utcnow().isoformat()
        }
        cls._users[email] = user_data

        # Sync to Mongo if connected
        if mongo_manager.is_connected:
            try:
                col = mongo_manager.get_collection("users")
                if col is not None:
                    col.update_one({"email": email}, {"$set": user_data}, upsert=True)
            except Exception as e:
                logger.warning(f"Mongo user registration sync warning: {e}")

        token = f"tok_{str(uuid.uuid4())}"
        cls._sessions[token] = email
        return {"token": token, "user": cls._to_profile(user_data)}

    @classmethod
    def login(cls, email: str, password: str) -> Dict:
        email = email.strip().lower()

        # Check Mongo if user not in memory
        if email not in cls._users and mongo_manager.is_connected:
            try:
                col = mongo_manager.get_collection("users")
                if col is not None:
                    doc = col.find_one({"email": email}, {"_id": 0})
                    if doc:
                        cls._users[email] = doc
            except Exception as e:
                logger.warning(f"Mongo user lookup warning: {e}")

        user_data = cls._users.get(email)
        if not user_data or user_data["password_hash"] != cls.hash_password(password):
            raise ValueError("Invalid email or password.")

        token = f"tok_{str(uuid.uuid4())}"
        cls._sessions[token] = email
        return {"token": token, "user": cls._to_profile(user_data)}

    @classmethod
    def oauth_or_demo_login(
        cls,
        provider: str = "Demo",
        name: Optional[str] = None,
        email: Optional[str] = None,
        role: UserRole = "CANDIDATE",
        expert_title: Optional[str] = None,
        expert_domain: Optional[List[str]] = None
    ) -> Dict:
        """
        OAuth / demo login.
        Security: The 'role' parameter is ONLY honoured for emails listed in
        TRUSTED_DEMO_EMAILS. Unknown emails are always created as CANDIDATE.
        """
        resolved_email = (email or "").strip().lower()

        # Determine the real role this session is allowed to assume
        if resolved_email in TRUSTED_DEMO_EMAILS:
            real_role = TRUSTED_DEMO_EMAILS[resolved_email]
        else:
            # Unknown/new OAuth user → always CANDIDATE regardless of what frontend says
            real_role = "CANDIDATE"
            logger.info(f"OAuth login for untrusted email '{resolved_email}'; role forced to CANDIDATE")

        if not resolved_email:
            # No email provided — create ephemeral candidate
            resolved_email = f"oauth_{str(uuid.uuid4())[:8]}@{provider.lower()}.demo"
            real_role = "CANDIDATE"

        if resolved_email not in cls._users:
            is_expert = real_role == "EXPERT"
            is_admin = real_role == "ADMIN"
            uid_prefix = "adm" if is_admin else ("exp" if is_expert else "usr")
            cls._users[resolved_email] = {
                "id": f"{uid_prefix}_{str(uuid.uuid4())[:8]}",
                "name": name or ("Admin" if is_admin else ("Dr. Marcus Vance" if is_expert else "Interview Candidate")),
                "email": resolved_email,
                "password_hash": cls.hash_password("oauth_dummy"),
                "role": real_role,
                "auth_provider": provider,
                "target_role": "Platform Administrator" if is_admin else ("Staff Distributed Systems Architect" if is_expert else "Senior Software Engineer"),
                "skills": expert_domain or (["Distributed Systems", "Architecture"] if is_expert else ["Python", "JavaScript", "Cloud Architecture"]),
                "resume_summary": "Accredited Senior Engineering Evaluator." if is_expert else "Experienced engineer preparing for interviews.",
                "is_verified_expert": is_expert,
                "expert_approval_status": "APPROVED" if is_expert else "NOT_APPLIED",
                "expert_title": expert_title or ("Staff Distributed Systems Architect" if is_expert else None),
                "expert_organization": "Tier-1 Tech" if is_expert else None,
                "expert_domain": expert_domain or (["Distributed Systems", "Backend"] if is_expert else []),
                "expert_rating": 4.95 if is_expert else None,
                "reviews_completed_count": 12 if is_expert else 0,
                "interviews_count": 0,
                "created_at": datetime.utcnow().isoformat()
            }

        user_data = cls._users[resolved_email]
        # Only update cosmetic fields; never allow role to be overwritten via this path
        user_data["auth_provider"] = provider
        if name:
            user_data["name"] = name

        token = f"tok_{str(uuid.uuid4())}"
        cls._sessions[token] = resolved_email
        return {"token": token, "user": cls._to_profile(user_data)}

    @classmethod
    def get_user_by_token(cls, token: Optional[str]) -> Optional[UserProfile]:
        if not token:
            return None
        cleaned_token = token.strip()
        if cleaned_token.lower().startswith("bearer "):
            cleaned_token = cleaned_token[7:].strip()
        email = cls._sessions.get(cleaned_token)
        if not email or email not in cls._users:
            return None
        return cls._to_profile(cls._users[email])

    @classmethod
    def is_expert(cls, token: Optional[str]) -> bool:
        user = cls.get_user_by_token(token)
        return bool(user and user.role == "EXPERT" and user.is_verified_expert)

    @classmethod
    def is_admin(cls, token: Optional[str]) -> bool:
        user = cls.get_user_by_token(token)
        return bool(user and user.role == "ADMIN")

    @classmethod
    def update_profile(cls, email: str, updates: Dict) -> UserProfile:
        """
        Update a user profile. Server-owned security fields are stripped from
        the updates dict and can never be changed by client-supplied payloads.
        """
        if email not in cls._users:
            raise ValueError("User not found.")
        user_data = cls._users[email]

        # Strip ALL server-owned fields — clients can never set these
        safe_updates = {k: v for k, v in updates.items() if k not in _SERVER_OWNED_FIELDS}

        for k, v in safe_updates.items():
            if k in user_data:
                user_data[k] = v

        if mongo_manager.is_connected:
            try:
                col = mongo_manager.get_collection("users")
                if col is not None:
                    col.update_one({"email": email}, {"$set": user_data})
            except Exception as e:
                logger.warning(f"Mongo user update warning: {e}")

        return cls._to_profile(user_data)

    @classmethod
    def admin_set_expert_approval(
        cls,
        target_email: str,
        action: str,   # "APPROVE" or "REJECT"
        admin_notes: Optional[str] = None
    ) -> UserProfile:
        """
        Called by an ADMIN to approve or reject a PENDING_EXPERT application.
        This is the ONLY code path that promotes a user to EXPERT role.
        """
        target_email = target_email.strip().lower()
        if target_email not in cls._users:
            raise ValueError(f"User '{target_email}' not found.")

        user_data = cls._users[target_email]
        if user_data.get("role") not in ("PENDING_EXPERT", "EXPERT", "CANDIDATE"):
            raise ValueError("Target user is not in a promotable state.")

        if action == "APPROVE":
            user_data["role"] = "EXPERT"
            user_data["is_verified_expert"] = True
            user_data["expert_approval_status"] = "APPROVED"
            user_data["expert_rating"] = 5.0   # Starts at 5.0; adjusts over time
            logger.info(f"Admin promoted '{target_email}' to EXPERT")
        elif action == "REJECT":
            user_data["role"] = "CANDIDATE"    # Demote back to candidate
            user_data["is_verified_expert"] = False
            user_data["expert_approval_status"] = "REJECTED"
            logger.info(f"Admin rejected expert application for '{target_email}'")
        else:
            raise ValueError(f"Unknown action '{action}'")

        if mongo_manager.is_connected:
            try:
                col = mongo_manager.get_collection("users")
                if col is not None:
                    col.update_one({"email": target_email}, {"$set": user_data})
            except Exception as e:
                logger.warning(f"Mongo expert approval sync warning: {e}")

        return cls._to_profile(user_data)

    @classmethod
    def get_all_users(cls) -> List[UserProfile]:
        """Return all users. Admin-only."""
        return [cls._to_profile(u) for u in cls._users.values()]

    @classmethod
    def get_user_by_id(cls, user_id: str) -> Optional[UserProfile]:
        for u in cls._users.values():
            if u.get("id") == user_id:
                return cls._to_profile(u)
        if mongo_manager.is_connected:
            try:
                col = mongo_manager.get_collection("users")
                if col is not None:
                    doc = col.find_one({"id": user_id}, {"_id": 0})
                    if doc:
                        cls._users[doc["email"]] = doc
                        return cls._to_profile(doc)
            except Exception:
                pass
        return None

    @classmethod
    def get_user_by_email(cls, email: str) -> Optional[UserProfile]:
        norm = (email or "").strip().lower()
        if norm in cls._users:
            return cls._to_profile(cls._users[norm])
        if mongo_manager.is_connected:
            try:
                col = mongo_manager.get_collection("users")
                if col is not None:
                    doc = col.find_one({"email": norm}, {"_id": 0})
                    if doc:
                        cls._users[norm] = doc
                        return cls._to_profile(doc)
            except Exception:
                pass
        return None

    @classmethod
    def mask_private_contact_info(cls, profile: UserProfile) -> UserProfile:
        """
        Masks personal contact info (phone, email) for privacy when viewed by third parties (authorized experts).
        """
        masked = profile.model_copy()
        if masked.email and "@" in masked.email:
            parts = masked.email.split("@")
            user_part = parts[0]
            masked_user = f"{user_part[0]}***" if len(user_part) > 1 else "***"
            masked.email = f"{masked_user}@{parts[1]}"
        if masked.phone:
            cleaned = masked.phone.strip()
            masked.phone = f"***-***-{cleaned[-4:]}" if len(cleaned) >= 4 else "***-***-****"
        return masked

    @classmethod
    def update_resume_for_user(
        cls,
        email: str,
        filename: str,
        file_url: str,
        extracted_text: str,
        resume_summary: Optional[str] = None
    ) -> UserProfile:
        norm = email.strip().lower()
        if norm not in cls._users:
            raise ValueError(f"User '{norm}' not found.")
        user_data = cls._users[norm]
        user_data["resume_filename"] = filename
        user_data["resume_file_url"] = file_url
        user_data["resume_text"] = extracted_text
        user_data["resume_uploaded_at"] = datetime.utcnow().isoformat()
        if resume_summary:
            user_data["resume_summary"] = resume_summary
        elif extracted_text:
            lines = [l.strip() for l in extracted_text.splitlines() if l.strip()]
            user_data["resume_summary"] = " ".join(lines[:3])[:200]

        if mongo_manager.is_connected:
            try:
                col = mongo_manager.get_collection("users")
                if col is not None:
                    col.update_one({"email": norm}, {"$set": user_data})
            except Exception as e:
                logger.warning(f"Mongo resume update warning: {e}")

        return cls._to_profile(user_data)

    @classmethod
    def _to_profile(cls, user_data: Dict) -> UserProfile:
        return UserProfile(
            id=user_data["id"],
            name=user_data["name"],
            email=user_data["email"],
            role=user_data.get("role", "CANDIDATE"),
            auth_provider=user_data.get("auth_provider", "Google"),
            headline=user_data.get("headline"),
            target_role=user_data.get("target_role", "Senior Distributed Systems Engineer"),
            profile_photo_url=user_data.get("profile_photo_url"),
            bio=user_data.get("bio"),
            phone=user_data.get("phone"),
            location=user_data.get("location"),
            skills=user_data.get("skills", []),
            specializations=user_data.get("specializations", []),
            education=user_data.get("education", []),
            work_experience=user_data.get("work_experience", []),
            projects=user_data.get("projects", []),
            resume_summary=user_data.get("resume_summary", ""),
            resume_filename=user_data.get("resume_filename"),
            resume_file_url=user_data.get("resume_file_url"),
            resume_text=user_data.get("resume_text"),
            resume_uploaded_at=user_data.get("resume_uploaded_at"),
            is_verified_expert=user_data.get("is_verified_expert", False),
            expert_approval_status=user_data.get("expert_approval_status", "NOT_APPLIED"),
            expert_title=user_data.get("expert_title"),
            expert_organization=user_data.get("expert_organization"),
            expert_domain=user_data.get("expert_domain", []),
            expert_rating=user_data.get("expert_rating"),
            reviews_completed_count=user_data.get("reviews_completed_count", 0),
            linkedin_url=user_data.get("linkedin_url"),
            github_url=user_data.get("github_url"),
            interviews_count=user_data.get("interviews_count", 0),
            created_at=user_data.get("created_at", datetime.utcnow().isoformat())
        )
