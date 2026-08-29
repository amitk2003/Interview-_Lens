from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

# ==========================================
# 1. USER & WORKSPACE SCHEMAS
# ==========================================
class UserProfile(BaseModel):
    id: str = "usr_001"
    name: str = "Alex Chen"
    email: str = "alex.chen@example.com"
    auth_provider: Literal["Google", "Microsoft", "GitHub"] = "Google"
    target_role: str = "Senior Distributed Systems Engineer"
    skills: List[str] = ["Python", "FastAPI", "Kafka", "Redis", "Distributed Systems", "PostgreSQL", "System Design"]
    resume_summary: str = "5+ years backend engineering, distributed event streams, microservices architecture, and caching strategies."
    interviews_count: int = 3
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

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
    verification_status: Literal["VERIFIED", "MODIFIED", "REJECTED", "PENDING"] = "PENDING"
    verification_notes: Optional[str] = None

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
    verification_rate_pct: float = 100.0
    verified_findings: List[FindingItem] = []
    audit_trail: List[Dict[str, Any]] = []

class ExpertReview(BaseModel):
    id: str
    interview_id: str
    reviewer_name: str = "Expert Reviewer"
    verdict: Literal["APPROVED", "MODIFIED", "REJECTED"] = "APPROVED"
    overall_rating: Optional[float] = None
    comments: str
    override_scores: Optional[Dict[str, float]] = None
    modified_findings: Optional[List[FindingItem]] = None
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

class InterviewRecord(BaseModel):
    id: str
    title: str
    candidate_name: str = "Alex Chen"
    job_role: str = "Senior Distributed Systems Engineer"
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    meeting_url: Optional[str] = None
    adapter_type: str = "GOOGLE_MEET"
    platform: str = "Google Meet Adapter"
    status: Literal["WAITING_FOR_INTERVIEW", "LIVE_CAPTURING", "STREAM_PROCESSING", "TRANSCRIPT_AVAILABLE", "ANALYZING", "REVIEW_REQUIRED", "COMPLETED", "FAILED"] = "TRANSCRIPT_AVAILABLE"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    raw_transcript: Optional[str] = None
    normalized_transcript: Optional[NormalizedTranscript] = None
    scores: Optional[DimensionScores] = None
    technical_analysis: Optional[TechnicalAnalysisResult] = None
    communication_analysis: Optional[CommunicationAnalysisResult] = None
    behavioral_analysis: Optional[BehavioralAnalysisResult] = None
    verification_result: Optional[VerificationResult] = None
    expert_review: Optional[ExpertReview] = None
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

class LiveConnectRequest(BaseModel):
    adapter_type: Literal["GOOGLE_MEET", "MS_TEAMS", "ZOOM", "UPLOAD_RECORDING", "UPLOAD_TRANSCRIPT"] = "GOOGLE_MEET"
    meeting_url: str = "https://meet.google.com/abc-defg-hij"
    candidate_name: str = "Alex Chen"
    job_role: str = "Senior Distributed Systems Engineer"
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    preset_scenario: Optional[str] = "fintech_distributed"

class AnalyzeRequest(BaseModel):
    title: Optional[str] = "Technical Interview"
    job_role: Optional[str] = "Software Engineer"
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    transcript_text: str
    platform: Optional[str] = "Upload"
    api_key: Optional[str] = None

class BaselineComparisonResult(BaseModel):
    eval_case_id: str
    interview_title: str
    baseline_output: Dict[str, Any]
    multi_agent_output: Dict[str, Any]
    metrics_comparison: Dict[str, Any]
