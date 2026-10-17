import uuid
import hashlib
from typing import Dict, Optional, List
from datetime import datetime
from ..models.schemas import UserProfile

class AuthService:
    """
    Manages user registration, authentication, sessions, and guest permission levels.
    """
    _users: Dict[str, Dict] = {
        "alex.chen@example.com": {
            "id": "usr_001",
            "name": "Alex Chen",
            "email": "alex.chen@example.com",
            "password_hash": hashlib.sha256("password123".encode()).hexdigest(),
            "auth_provider": "Google",
            "target_role": "Senior Distributed Systems Engineer",
            "skills": ["Python", "FastAPI", "Kafka", "Redis", "Distributed Systems", "PostgreSQL"],
            "resume_summary": "5+ years backend engineering, distributed event streams, microservices architecture, and caching strategies.",
            "interviews_count": 3,
            "created_at": datetime.utcnow().isoformat()
        },
        "candidate.demo@interviewlens.ai": {
            "id": "usr_002",
            "name": "Sarah Miller",
            "email": "candidate.demo@interviewlens.ai",
            "password_hash": hashlib.sha256("demo123".encode()).hexdigest(),
            "auth_provider": "Demo",
            "target_role": "Full Stack & AI Engineer",
            "skills": ["React", "TypeScript", "Python", "LLMs", "Node.js", "Docker"],
            "resume_summary": "Full stack engineer specializing in AI agent applications, React architecture, and modern cloud deployment.",
            "interviews_count": 1,
            "created_at": datetime.utcnow().isoformat()
        }
    }

    _sessions: Dict[str, str] = {} # token -> email

    @classmethod
    def hash_password(cls, password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    @classmethod
    def register(cls, name: str, email: str, password: str, target_role: Optional[str] = None) -> Dict:
        email = email.strip().lower()
        if email in cls._users:
            raise ValueError("An account with this email already exists.")
        
        user_id = f"usr_{str(uuid.uuid4())[:8]}"
        user_data = {
            "id": user_id,
            "name": name.strip(),
            "email": email,
            "password_hash": cls.hash_password(password),
            "auth_provider": "Email",
            "target_role": target_role or "Software Engineer",
            "skills": ["Python", "React", "System Design"],
            "resume_summary": f"Software engineering candidate focused on {target_role or 'Software Engineer'}.",
            "interviews_count": 0,
            "created_at": datetime.utcnow().isoformat()
        }
        cls._users[email] = user_data
        token = f"tok_{str(uuid.uuid4())}"
        cls._sessions[token] = email
        return {"token": token, "user": cls._to_profile(user_data)}

    @classmethod
    def login(cls, email: str, password: str) -> Dict:
        email = email.strip().lower()
        user_data = cls._users.get(email)
        if not user_data or user_data["password_hash"] != cls.hash_password(password):
            raise ValueError("Invalid email or password.")
        
        token = f"tok_{str(uuid.uuid4())}"
        cls._sessions[token] = email
        return {"token": token, "user": cls._to_profile(user_data)}

    @classmethod
    def oauth_or_demo_login(cls, provider: str = "Demo", name: Optional[str] = None, email: Optional[str] = None) -> Dict:
        email = (email or "alex.chen@example.com").strip().lower()
        if email not in cls._users:
            user_id = f"usr_{str(uuid.uuid4())[:8]}"
            cls._users[email] = {
                "id": user_id,
                "name": name or "Interview Candidate",
                "email": email,
                "password_hash": cls.hash_password("oauth_dummy"),
                "auth_provider": provider,
                "target_role": "Senior Software Engineer",
                "skills": ["Python", "JavaScript", "Cloud Architecture"],
                "resume_summary": "Experienced engineer preparing for technical and behavioral interviews.",
                "interviews_count": 0,
                "created_at": datetime.utcnow().isoformat()
            }
        
        user_data = cls._users[email]
        user_data["auth_provider"] = provider
        if name:
            user_data["name"] = name
            
        token = f"tok_{str(uuid.uuid4())}"
        cls._sessions[token] = email
        return {"token": token, "user": cls._to_profile(user_data)}

    @classmethod
    def get_user_by_token(cls, token: Optional[str]) -> Optional[UserProfile]:
        if not token:
            return None
        email = cls._sessions.get(token)
        if not email or email not in cls._users:
            return None
        return cls._to_profile(cls._users[email])

    @classmethod
    def update_profile(cls, email: str, updates: Dict) -> UserProfile:
        if email not in cls._users:
            raise ValueError("User not found.")
        user_data = cls._users[email]
        for k, v in updates.items():
            if k in user_data and k != "password_hash" and k != "id":
                user_data[k] = v
        return cls._to_profile(user_data)

    @classmethod
    def _to_profile(cls, user_data: Dict) -> UserProfile:
        return UserProfile(
            id=user_data["id"],
            name=user_data["name"],
            email=user_data["email"],
            auth_provider=user_data.get("auth_provider", "Google"),
            target_role=user_data.get("target_role", "Senior Distributed Systems Engineer"),
            skills=user_data.get("skills", []),
            resume_summary=user_data.get("resume_summary", ""),
            interviews_count=user_data.get("interviews_count", 0),
            created_at=user_data.get("created_at", datetime.utcnow().isoformat())
        )
