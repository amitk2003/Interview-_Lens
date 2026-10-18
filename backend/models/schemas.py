import uuid
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

# ==========================================
# 1. USER & CANDIDATE PROFILE SCHEMAS
# ==========================================
UserRole = Literal["CANDIDATE", "EXPERT", "ADMIN", "PENDING_EXPERT"]

class EducationItem(BaseModel):
    id: str = Field(default_factory=lambda: f"edu_{str(uuid.uuid4())[:6]}")
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_year: Optional[str] = None
    end_year: Optional[str] = None
    description: Optional[str] = None

class WorkExperienceItem(BaseModel):
    id: str = Field(default_factory=lambda: f"exp_{str(uuid.uuid4())[:6]}")
    company: str
    title: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    highlights: Optional[str] = None

class ProjectItem(BaseModel):
    id: str = Field(default_factory=lambda: f"prj_{str(uuid.uuid4())[:6]}")
    name: str
    description: str
    technologies: List[str] = []
    project_url: Optional[str] = None

class CandidateAssessmentSummary(BaseModel):
    interview_id: str
    title: str
    job_role: str
    created_at: str
    status: str
    raw_status: str
    overall_score: float
    dimension_scores: Dict[str, float] = {}
    strengths: List[Dict[str, Any]] = []
    weaknesses: List[Dict[str, Any]] = []
    supporting_evidence: List[Dict[str, Any]] = []
    confidence_score: float = 0.92
    confidence_level: str = "High"
    uncertainty_score: float = 0.08
    assigned_expert_id: Optional[str] = None
    assigned_expert_name: Optional[str] = None
    assigned_expert_title: Optional[str] = None
    expert_feedback: Optional[Dict[str, Any]] = None
    retest_completed: bool = False

class UserProfile(BaseModel):
    id: str = "usr_001"
    name: str = "Alex Chen"
    email: str = "alex.chen@example.com"
    role: UserRole = "CANDIDATE"
    auth_provider: str = "Google"
    headline: Optional[str] = "Senior Distributed Systems Engineer | Event Streams & Cloud Infrastructure"
    target_role: str = "Senior Distributed Systems Engineer"
    profile_photo_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = "San Francisco, CA"
    skills: List[str] = ["Python", "FastAPI", "Kafka", "Redis", "Distributed Systems", "PostgreSQL", "System Design"]
    specializations: List[str] = ["Distributed Systems", "High Throughput Ingestion", "Event-Driven Microservices"]
    education: List[EducationItem] = []
    work_experience: List[WorkExperienceItem] = []
    projects: List[ProjectItem] = []
    resume_summary: str = "5+ years backend engineering, distributed event streams, microservices architecture, and caching strategies."
    resume_filename: Optional[str] = "Alex_Chen_Senior_Backend_Resume.pdf"
    resume_file_url: Optional[str] = None
    resume_text: Optional[str] = None
    resume_uploaded_at: Optional[str] = None
    is_verified_expert: bool = False
    # PENDING_EXPERT users are held here until an ADMIN promotes them
    expert_approval_status: Literal["NOT_APPLIED", "PENDING", "APPROVED", "REJECTED", "INFO_REQUESTED"] = "NOT_APPLIED"
    expert_title: Optional[str] = None
    expert_organization: Optional[str] = None
    expert_domain: List[str] = []
    years_of_experience: Optional[float] = None
    supported_interview_categories: List[str] = []
    conflict_of_interest_declaration: Optional[str] = None
    expert_rating: Optional[float] = None
    reviews_completed_count: int = 0
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    interviews_count: int = 3
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class CandidateProfileResponse(BaseModel):
    profile: UserProfile
    assessment_history: List[CandidateAssessmentSummary] = []
    summary_metrics: Dict[str, Any] = {}
    is_owner: bool = True

class CandidateProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    target_role: Optional[str] = None
    profile_photo_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    education: Optional[List[EducationItem]] = None
    work_experience: Optional[List[WorkExperienceItem]] = None
    projects: Optional[List[ProjectItem]] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    resume_summary: Optional[str] = None

# ==========================================
# 2. MEETING INTEGRATION & LIVE CAPTURE SCHEMAS
# ==========================================
class MeetingAdapterConfig(BaseModel):
    adapter_type: Literal["GOOGLE_MEET", "MS_TEAMS", "ZOOM", "UPLOAD_RECORDING", "UPLOAD_TRANSCRIPT"] = "GOOGLE_MEET"
    meeting_url: Optional[str] = "https://meet.google.com/abc-defg-hij"
    passcode: Optional[str] = None
    consent_authorized: bool = True
    bot_participant_name: str = "InterviewLens Capture Bot"
    platform_name: str = "Google Meet"

class ParticipantEvent(BaseModel):
    timestamp: str
    event_type: Literal["PARTICIPANT_JOIN", "PARTICIPANT_LEAVE", "SPEAKER_CHANGE", "LONG_PAUSE", "INTERRUPT_EVENT", "CLARIFICATION_PROMPT"]
    participant_name: str
    participant_role: Literal["interviewer", "candidate", "system"]
    detail: Optional[str] = None

class LiveCaptureChunk(BaseModel):
    chunk_id: int
    timestamp: str
    speaker: Literal["interviewer", "candidate"]
    text: str
    audio_level_rms: float = 0.85
    is_question: bool = False

class LiveCaptureSession(BaseModel):
    session_id: str
    adapter_config: MeetingAdapterConfig
    status: Literal["INITIALIZING", "CONNECTING", "LIVE_CAPTURING", "STREAM_PROCESSING", "COMPLETED", "FAILED"] = "INITIALIZING"
    started_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    duration_seconds: int = 0
    participant_events: List[ParticipantEvent] = []
    stream_chunks: List[LiveCaptureChunk] = []
    normalized_segment_count: int = 0

# ==========================================
# 3. TRANSCRIPT & FINDING SCHEMAS
# ==========================================
class TranscriptSegment(BaseModel):
    speaker: str = Field(..., description="'interviewer', 'candidate', or speaker name")
    timestamp: str = Field(..., description="HH:MM:SS or MM:SS timestamp")
    text: str = Field(..., description="Spoken text")
    is_question: Optional[bool] = None
    confidence: Optional[float] = 1.0
    participant_id: Optional[str] = None
    audio_offset_ms: Optional[int] = None

class NormalizedTranscript(BaseModel):
    interview_id: Optional[str] = None
    title: str = "Technical Interview"
    job_role: str = "Software Engineer"
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    platform: Optional[str] = "Google Meet Adapter"
    adapter_type: Optional[str] = "GOOGLE_MEET"
    meeting_url: Optional[str] = None
    segments: List[TranscriptSegment] = []
    participant_events: Optional[List[ParticipantEvent]] = []

class EvidenceCitation(BaseModel):
    timestamp: str
    quote: str
    speaker: str = "candidate"
    context: Optional[str] = None

class FindingItem(BaseModel):
    id: str
    category: str
    title: str
    description: str
    severity: Literal["positive", "neutral", "needs_improvement", "critical"] = "neutral"
    score_impact: float = 0.0
    evidence: List[EvidenceCitation] = []
    verification_status: Literal["VERIFIED", "MODIFIED", "REJECTED", "PENDING", "EXPERT_VERIFIED", "EXPERT_DISPUTED"] = "PENDING"
    verification_notes: Optional[str] = None
    expert_comment: Optional[str] = None
    expert_score_override: Optional[float] = None
    verified_by: Optional[str] = None

# ==========================================
# 4. AGENTIC ANALYSIS & VERIFICATION SCHEMAS
# ==========================================
class TechnicalAnalysisResult(BaseModel):
    score: float = Field(..., ge=0.0, le=10.0)
    question_understanding_score: float = Field(..., ge=0.0, le=10.0)
    problem_solving_score: float = Field(..., ge=0.0, le=10.0)
    expected_concepts: List[str] = []
    demonstrated_concepts: List[str] = []
    missing_concepts: List[str] = []
    strengths: List[FindingItem] = []
    weaknesses: List[FindingItem] = []
    struggled_questions: List[Dict[str, Any]] = []
    summary: str

class CommunicationAnalysisResult(BaseModel):
    score: float = Field(..., ge=0.0, le=10.0)
    structure_score: float = Field(..., ge=0.0, le=10.0)
    filler_words_detected: int = 0
    filler_word_breakdown: Dict[str, int] = {}
    long_pauses_count: int = 0
    clarification_requests_count: int = 0
    interviewer_followup_count: int = 0
    findings: List[FindingItem] = []
    summary: str

class BehavioralAnalysisResult(BaseModel):
    score: float = Field(..., ge=0.0, le=10.0)
    star_coverage: Dict[str, float] = {} # Situation, Task, Action, Result %
    ownership_score: float = Field(..., ge=0.0, le=10.0) # "I" vs "We" ownership
    specificity_score: float = Field(..., ge=0.0, le=10.0)
    findings: List[FindingItem] = []
    summary: str

class VerificationResult(BaseModel):
    total_claims_checked: int = 0
    verified_count: int = 0
    modified_count: int = 0
    rejected_count: int = 0
    expert_verified_count: int = 0
    verification_rate_pct: float = 100.0
    verified_findings: List[FindingItem] = []
    audit_trail: List[Dict[str, Any]] = []

class ExpertReview(BaseModel):
    id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:8]}")
    interview_id: Optional[str] = None
    expert_id: Optional[str] = None
    reviewer_name: str = "Industry Technical Lead"
    reviewer_title: str = "Staff Distributed Systems Architect"
    reviewer_company: Optional[str] = "Tier-1 Tech / FinTech"
    verdict: Literal["APPROVED", "MODIFIED", "REJECTED"] = "APPROVED"
    overall_rating: Optional[float] = None
    comments: str
    override_scores: Optional[Dict[str, float]] = None
    dimension_overrides: Optional[Dict[str, float]] = None
    modified_findings: Optional[List[FindingItem]] = None
    verified_claim_ids: List[str] = []
    disputed_claim_ids: List[str] = []
    audit_notes: Dict[str, str] = {}
    sign_off_certificate_id: Optional[str] = None
    reviewed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# ==========================================
# 5. DUAL PIPELINE: RE-TEST & CROSS-INTERVIEW MEMORY
# ==========================================
class ReTestQuestion(BaseModel):
    question_id: str
    topic: str
    original_question: str
    interview_score: float
    interview_evidence: str
    retest_prompt: str
    ideal_answer_points: List[str]

class ReTestSubmission(BaseModel):
    question_id: str
    candidate_answer: str

class ReTestEvaluation(BaseModel):
    question_id: str
    topic: str
    interview_score: float
    retest_score: float
    score_delta: float
    gap_type: Literal["PERFORMANCE_GAP", "KNOWLEDGE_GAP", "CONSISTENT_STRENGTH"]
    diagnosis: str
    recommendation: str

class CrossInterviewPattern(BaseModel):
    pattern_type: Literal["RECURRING_WEAKNESS", "IMPROVEMENT_TREND", "CONSISTENT_STRENGTH", "ROLE_SPECIFIC_ISSUE"]
    category: str
    title: str
    description: str
    occurrence_count: int
    affected_interview_ids: List[str]
    trend: str
    suggested_drill: str

class CrossInterviewInsights(BaseModel):
    total_interviews_analyzed: int
    average_score_trend: List[Dict[str, Any]]
    recurring_weaknesses: List[CrossInterviewPattern]
    top_strengths: List[CrossInterviewPattern]
    dimension_progression: Dict[str, List[float]]
    actionable_prep_roadmap: List[str]

class DimensionScores(BaseModel):
    technical_knowledge: float = 0.0
    communication: float = 0.0
    answer_structure: float = 0.0
    problem_solving: float = 0.0
    behavioral: float = 0.0
    question_understanding: float = 0.0
    overall: float = 0.0

AssessmentLifecycleStatus = Literal[
    "AI_ASSESSMENT_PENDING",
    "PENDING_EXPERT_REVIEW",
    "ASSIGNED",
    "IN_REVIEW",
    "REVISION_REQUIRED",
    "FINALIZED",
    "REASSESSMENT_REQUIRED",
    "FAILED"
]

class AssessmentStatusTransition(BaseModel):
    id: str = Field(default_factory=lambda: f"trans_{uuid.uuid4().hex[:8]}")
    from_status: str
    to_status: str
    changed_by_user_id: Optional[str] = None
    changed_by_name: Optional[str] = None
    changed_by_role: Optional[str] = None
    reason: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: Dict[str, Any] = Field(default_factory=dict)

class CandidateFinalReport(BaseModel):
    interview_id: str
    title: str
    candidate_name: str
    job_role: str
    status: str
    lifecycle_status: str
    is_released: bool
    released_at: Optional[str] = None
    
    # Original AI Score & Assessment
    original_ai_overall_score: float
    original_ai_scores: DimensionScores
    original_ai_summary: Optional[str] = None
    ai_confidence_score: float = 94.0
    
    # Final Expert-Calibrated Score
    final_expert_overall_score: float
    final_calibrated_scores: DimensionScores
    score_delta: float
    
    # Competency Breakdown
    competency_breakdown: List[Dict[str, Any]]
    
    # Verified Strengths and Weaknesses
    verified_strengths: List[FindingItem] = []
    verified_weaknesses: List[FindingItem] = []
    
    # Expert Feedback and Recommendations
    verdict: str
    expert_feedback: str
    recommendations: List[str] = []
    
    # Limitations or Unresolved Disagreements
    unresolved_disagreements: List[Dict[str, Any]] = []
    disputed_claims_count: int = 0
    limitations_notes: Optional[str] = None
    
    # Review Date and Reviewer Credentials (Privacy Safe)
    review_date: Optional[str] = None
    reviewer_name: Optional[str] = None
    reviewer_title: Optional[str] = None
    reviewer_organization: Optional[str] = None
    sign_off_certificate_id: Optional[str] = None

class StatusTransitionRequest(BaseModel):
    target_status: AssessmentLifecycleStatus
    reason: Optional[str] = None
    notes: Optional[str] = None

class ReleaseReportRequest(BaseModel):
    notes: Optional[str] = None

class ReassessmentRequest(BaseModel):
    reason: str
    requested_by: Optional[str] = None

class InterviewRecord(BaseModel):
    id: str
    title: str
    candidate_name: str = "Alex Chen"
    candidate_email: Optional[str] = None
    user_email: Optional[str] = None
    user_id: Optional[str] = None
    job_role: str = "Senior Distributed Systems Engineer"
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    meeting_url: Optional[str] = None
    adapter_type: str = "GOOGLE_MEET"
    platform: str = "Google Meet Adapter"
    status: Literal["WAITING_FOR_INTERVIEW", "LIVE_CAPTURING", "STREAM_PROCESSING", "TRANSCRIPT_AVAILABLE", "ANALYZING", "AWAITING_EXPERT_REVIEW", "IN_EXPERT_REVIEW", "REVIEW_REQUIRED", "COMPLETED", "FAILED"] = "TRANSCRIPT_AVAILABLE"
    lifecycle_status: AssessmentLifecycleStatus = "AI_ASSESSMENT_PENDING"
    assigned_expert_id: Optional[str] = None
    assigned_expert_name: Optional[str] = None
    assigned_expert_title: Optional[str] = None
    assigned_expert_email: Optional[str] = None
    expert_domain_tag: Optional[str] = None
    review_requested_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    raw_transcript: Optional[str] = None
    normalized_transcript: Optional[NormalizedTranscript] = None
    scores: Optional[DimensionScores] = None
    original_ai_scores: Optional[DimensionScores] = None
    original_ai_summary: Optional[str] = None
    technical_analysis: Optional[TechnicalAnalysisResult] = None
    communication_analysis: Optional[CommunicationAnalysisResult] = None
    behavioral_analysis: Optional[BehavioralAnalysisResult] = None
    verification_result: Optional[VerificationResult] = None
    expert_review: Optional[ExpertReview] = None
    expert_review_history: List[ExpertReview] = Field(default_factory=list)
    status_history: List[AssessmentStatusTransition] = Field(default_factory=list)
    is_released_to_candidate: bool = False
    released_at: Optional[str] = None
    released_by: Optional[str] = None
    reassessment_reason: Optional[str] = None
    revision_requested_reason: Optional[str] = None
    retest_questions: Optional[List[ReTestQuestion]] = None
    retest_results: Optional[List[ReTestEvaluation]] = None
    executive_summary: Optional[str] = None

# ==========================================
# 6. API REQUESTS & BENCHMARK
# ==========================================
class WorkspaceCreateRequest(BaseModel):
    title: str = "Senior Distributed Systems Interview"
    job_role: str = "Senior Distributed Systems Engineer"
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    adapter_type: Literal["GOOGLE_MEET", "MS_TEAMS", "ZOOM", "UPLOAD_RECORDING", "UPLOAD_TRANSCRIPT"] = "GOOGLE_MEET"
    meeting_url: Optional[str] = "https://meet.google.com/abc-defg-hij"
    consent_authorized: bool = True
    transcript_text: Optional[str] = None
    api_key: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None

class LiveConnectRequest(BaseModel):
    adapter_type: Literal["GOOGLE_MEET", "MS_TEAMS", "ZOOM", "UPLOAD_RECORDING", "UPLOAD_TRANSCRIPT"] = "GOOGLE_MEET"
    meeting_url: str = "https://meet.google.com/abc-defg-hij"
    candidate_name: str = "Alex Chen"
    job_role: str = "Senior Distributed Systems Engineer"
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    preset_scenario: Optional[str] = "fintech_distributed"
    user_email: Optional[str] = None

class AnalyzeRequest(BaseModel):
    title: Optional[str] = "Technical Interview"
    job_role: Optional[str] = "Software Engineer"
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    transcript_text: str
    platform: Optional[str] = "Upload"
    api_key: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None

class BaselineComparisonResult(BaseModel):
    eval_case_id: str
    interview_title: str
    baseline_output: Dict[str, Any]
    multi_agent_output: Dict[str, Any]
    metrics_comparison: Dict[str, Any]

# ==========================================
# 7. AUTH & DOCUMENT PARSE SCHEMAS
# ==========================================
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    # role is intentionally NOT accepted from clients; always forced to CANDIDATE server-side
    target_role: Optional[str] = "Software Engineer"
    # expert application fields — role stays PENDING_EXPERT until admin approves
    apply_as_expert: bool = False
    expert_title: Optional[str] = None
    expert_organization: Optional[str] = None
    expert_domain: Optional[List[str]] = None

class OAuthLoginRequest(BaseModel):
    provider: str = "Google"
    name: Optional[str] = None
    email: Optional[str] = None
    # role from client is ignored for public flows; only respected for pre-seeded demo accounts
    role: Optional[UserRole] = "CANDIDATE"
    expert_title: Optional[str] = None
    expert_domain: Optional[List[str]] = None

class AuthResponse(BaseModel):
    token: str
    user: UserProfile

class ExpertQueueItem(BaseModel):
    interview_id: str
    title: str
    candidate_name: str
    job_role: str
    created_at: str
    status: str
    scores: Optional[DimensionScores] = None
    assigned_expert_id: Optional[str] = None
    assigned_expert_name: Optional[str] = None
    domain_tags: List[str] = []
    finding_count: int = 0
    retest_completed: bool = False

class DocumentParseResponse(BaseModel):
    filename: str
    extracted_text: str
    char_count: int
    word_count: int

class InteractiveStartRequest(BaseModel):
    job_role: str = "Software Engineer"
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    question_count: int = 4
    api_key: Optional[str] = None

class InteractiveQuestionItem(BaseModel):
    index: int
    category: str
    question: str
    focus_skills: List[str] = []
    expected_criteria: List[str] = []

class InteractivePlanResponse(BaseModel):
    session_id: str
    job_role: str
    questions: List[InteractiveQuestionItem]

class InteractiveCandidateTurnRequest(BaseModel):
    session_id: Optional[str] = None
    job_role: str = "Software Engineer"
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    current_question: str
    candidate_answer: str
    conversation_history: List[Dict[str, str]] = []
    current_question_index: int = 0
    total_questions: int = 4
    plan_questions: List[Dict[str, Any]] = []
    api_key: Optional[str] = None

class InteractiveCandidateTurnResponse(BaseModel):
    interviewer_speech: str
    is_followup: bool
    next_question_index: int
    current_topic: str
    detected_signals: List[Dict[str, Any]] = []
    depth_score: float = 7.5
    rubric_feedback: str
    is_interview_complete: bool = False

class ClaimVerificationRequest(BaseModel):
    finding_id: str
    action: Literal["VERIFY", "DISPUTE", "MODIFY"]
    expert_name: str = "Industry Tech Lead"
    expert_title: str = "Staff Systems Engineer"
    expert_comment: Optional[str] = None
    expert_score_override: Optional[float] = None

class BenchmarkTestCaseResult(BaseModel):
    case_id: str
    title: str
    scenario_type: str
    candidate_profile: str
    ground_truth_summary: str
    single_step_baseline: Dict[str, Any]
    multi_agent_system: Dict[str, Any]
    verbatim_citations_baseline: int
    verbatim_citations_multi_agent: int
    hallucinations_in_baseline: int
    hallucinations_in_multi_agent: int
    expert_alignment_error_baseline: float
    expert_alignment_error_multi_agent: float
    baseline_case_score: float
    multi_agent_case_score: float

class BenchmarkSuiteReport(BaseModel):
    suite_id: str
    timestamp: str
    total_cases_evaluated: int
    test_cases: List[BenchmarkTestCaseResult]
    aggregate_metrics: Dict[str, Any]
    reproducibility_proof: str


# ==========================================
# 9. ADMIN SCHEMAS
# ==========================================
class AdminApproveExpertRequest(BaseModel):
    user_email: str
    action: Literal["APPROVE", "REJECT"]
    admin_notes: Optional[str] = None

class AdminUserSummary(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    expert_approval_status: str
    expert_title: Optional[str] = None
    expert_organization: Optional[str] = None
    expert_domain: List[str] = []
    skills: List[str] = []
    resume_summary: Optional[str] = None
    created_at: str
    reviews_completed_count: int = 0
    interviews_count: int = 0

# ==========================================
# 10. EXPERT ONBOARDING & CREDENTIAL VERIFICATION
# ==========================================
class ExpertCredentialDocument(BaseModel):
    id: str = Field(default_factory=lambda: f"doc_{str(uuid.uuid4())[:8]}")
    filename: str
    file_url: str
    file_size_bytes: int = 0
    document_type: str = "Credential Verification"
    uploaded_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ExpertAuditLogEntry(BaseModel):
    id: str = Field(default_factory=lambda: f"aud_{str(uuid.uuid4())[:8]}")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    action: Literal["SUBMITTED", "APPROVED", "REJECTED", "INFO_REQUESTED", "INFO_PROVIDED", "PROFILE_UPDATED"]
    actor_email: str
    actor_name: str
    actor_role: str = "ADMIN"
    notes: Optional[str] = None
    requested_info: Optional[str] = None
    provided_info: Optional[str] = None

class ExpertApplication(BaseModel):
    id: str = Field(default_factory=lambda: f"app_{str(uuid.uuid4())[:8]}")
    user_id: str
    user_email: str
    full_name: str
    headline: str
    current_experience: str
    years_of_experience: float = 5.0
    technical_expertise: List[str] = []
    supported_interview_categories: List[str] = []
    industry_specialization: str = "Distributed Systems / Backend Architecture"
    portfolio_url: Optional[str] = None
    credential_documents: List[ExpertCredentialDocument] = []
    conflict_of_interest_declaration: str = "I declare that I have disclosed all active commercial, employment, and consulting advisory relationships. I agree to recuse myself from any interview evaluations involving current employers or close associates."
    conflict_declared: bool = True
    status: Literal["PENDING", "APPROVED", "REJECTED", "INFO_REQUESTED"] = "PENDING"
    admin_notes: Optional[str] = None
    requested_info_details: Optional[str] = None
    applicant_response: Optional[str] = None
    status_history: List[ExpertAuditLogEntry] = []
    applied_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None

class ExpertApplicationSubmitRequest(BaseModel):
    full_name: str
    headline: str
    current_experience: str
    years_of_experience: float
    technical_expertise: List[str]
    supported_interview_categories: List[str]
    industry_specialization: str
    portfolio_url: Optional[str] = None
    conflict_of_interest_declaration: str
    credential_documents: Optional[List[ExpertCredentialDocument]] = []

class ExpertRespondInfoRequest(BaseModel):
    application_id: str
    response_text: str
    additional_documents: Optional[List[ExpertCredentialDocument]] = []

class AdminReviewDecisionRequest(BaseModel):
    action: Literal["APPROVE", "REJECT", "REQUEST_INFO"]
    admin_notes: Optional[str] = None
    requested_info: Optional[str] = None

class ExpertProfileUpdateRequest(BaseModel):
    headline: Optional[str] = None
    current_experience: Optional[str] = None
    technical_expertise: Optional[List[str]] = None
    supported_interview_categories: Optional[List[str]] = None
    industry_specialization: Optional[str] = None
    portfolio_url: Optional[str] = None
    bio: Optional[str] = None


# ==========================================
# 11. ASSIGNMENT & NOTIFICATION SCHEMAS
# ==========================================

class AssignExpertRequest(BaseModel):
    """Admin assigns a verified expert to an interview assessment."""
    interview_id: str
    expert_id: str                  # user id of the target expert
    reason: Optional[str] = None

class ReassignExpertRequest(BaseModel):
    """Admin reassigns an interview to a different expert; reason is mandatory."""
    interview_id: str
    expert_id: str
    reason: str                     # mandatory for reassignment

class CancelAssignmentRequest(BaseModel):
    interview_id: str
    reason: str

class NotificationMarkReadRequest(BaseModel):
    notification_ids: Optional[List[str]] = None  # None means mark ALL read

class ExpertDashboardMetrics(BaseModel):
    total_assigned: int = 0
    pending_review: int = 0
    in_progress: int = 0
    completed: int = 0
    unread_notifications: int = 0

