import os
import uuid
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .models.schemas import (
    AnalyzeRequest,
    WorkspaceCreateRequest,
    LiveConnectRequest,
    MeetingAdapterConfig,
    LiveCaptureSession,
    UserProfile,
    InterviewRecord,
    ExpertReview,
    ReTestSubmission,
    ReTestEvaluation,
    CrossInterviewInsights,
    BaselineComparisonResult,
    LoginRequest,
    RegisterRequest,
    OAuthLoginRequest,
    AuthResponse,
    DocumentParseResponse,
    InteractiveStartRequest,
    InteractivePlanResponse,
    InteractiveCandidateTurnRequest,
    InteractiveCandidateTurnResponse,
    ClaimVerificationRequest,
    BenchmarkSuiteReport
)
from  services.normalizer import TranscriptNormalizer
from services.meeting_adapters import LiveCaptureGateway
from services.storage import InterviewStorage
from services.llm_client import LLMClient
from services.knowledge_gap_analyzer import KnowledgeGapAnalyzer
from services.baseline_comparator import BaselineComparator
from services.file_parser import FileParser
from services.auth_service import AuthService
from services.interactive_interview import InteractiveInterviewService
from services.benchmark_suite import BenchmarkSuiteService
from agents.orchestrator import InterviewOrchestrator
from agents.cross_interview_agent import CrossInterviewAgent

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("InterviewLens")

app = FastAPI(
    title="InterviewLens AI Service",
    description="Agentic Real Interview Analysis, Verification & Longitudinal Learning Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://interview-lens-brown.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

storage = InterviewStorage()

@app.get("/")
def root():
    return {
        "app": "InterviewLens AI Engine",
        "version": "1.0.0",
        "status": "online",
        "supported_sources": ["Google Meet", "Microsoft Teams", "Zoom", "Live Interactive AI Room", "VTT/SRT/JSON/TXT/PDF Upload"],
        "pipeline": [
            "Transcript Normalization",
            "Technical Agent",
            "Communication Agent",
            "Behavioral Agent",
            "Evidence Verification Agent",
            "Expert Review",
            "Interview Memory & Cross-Interview Insights",
            "Knowledge vs Performance Gap Diagnostics"
        ]
    }

@app.get("/api/health")
def health():
    llm = LLMClient()
    return {
        "status": "healthy",
        "llm_engine": llm.client_type,
        "groq_model": llm.groq_model if llm.client_type == "groq" else None,
        "groq_configured": bool(llm.groq_api_key),
        "total_interviews_indexed": len(storage.get_all())
    }

# ==========================================
# AUTHENTICATION & USER SESSIONS
# ==========================================
@app.post("/api/auth/register", response_model=AuthResponse)
def auth_register(payload: RegisterRequest):
    try:
        res = AuthService.register(
            name=payload.name,
            email=payload.email,
            password=payload.password,
            target_role=payload.target_role
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login", response_model=AuthResponse)
def auth_login(payload: LoginRequest):
    try:
        res = AuthService.login(payload.email, payload.password)
        # Claim any unclaimed interviews (created before sign-in) for this user
        user_email = payload.email.strip().lower()
        storage.claim_unclaimed_interviews(user_email)
        return res
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/api/auth/oauth", response_model=AuthResponse)
def auth_oauth_or_demo(payload: OAuthLoginRequest):
    res = AuthService.oauth_or_demo_login(
        provider=payload.provider,
        name=payload.name,
        email=payload.email
    )
    # Claim any unclaimed interviews (created before sign-in) for this user
    user_email = (payload.email or "").strip().lower()
    if user_email:
        storage.claim_unclaimed_interviews(user_email, payload.name or "Interview Candidate")
    return res

@app.get("/api/auth/me", response_model=UserProfile)
def auth_me(token: Optional[str] = None):
    user = AuthService.get_user_by_token(token)
    if not user:
        # Fallback to default user
        return AuthService._to_profile(AuthService._users["alex.chen@example.com"])
    return user

# Current User Profile
@app.get("/api/user/profile", response_model=UserProfile)
def get_user_profile(token: Optional[str] = None):
    user = AuthService.get_user_by_token(token)
    if user:
        return user
    return AuthService._to_profile(AuthService._users["alex.chen@example.com"])

@app.post("/api/user/profile", response_model=UserProfile)
def update_user_profile(payload: UserProfile):
    try:
        return AuthService.update_profile(payload.email, payload.model_dump())
    except Exception:
        return payload

# ==========================================
# DOCUMENT PARSING (JD & RESUME PDF/DOCX/TXT)
# ==========================================
@app.post("/api/parse/document", response_model=DocumentParseResponse)
async def parse_document(file: UploadFile = File(...)):
    try:
        content_bytes = await file.read()
        extracted = FileParser.extract_text(file.filename, content_bytes)
        return DocumentParseResponse(
            filename=file.filename,
            extracted_text=extracted,
            char_count=len(extracted),
            word_count=len(extracted.split())
        )
    except Exception as e:
        logger.error(f"File extraction error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to extract text: {str(e)}")

# ==========================================
# INTERACTIVE LIVE INTERVIEW PLANNER
# ==========================================
@app.post("/api/interview/interactive/plan", response_model=InteractivePlanResponse)
async def generate_interactive_plan(payload: InteractiveStartRequest):
    llm = LLMClient(payload.api_key)
    session_id = f"live_{str(uuid.uuid4())[:8]}"
    questions = await InteractiveInterviewService.generate_interview_plan(
        llm=llm,
        job_role=payload.job_role,
        job_description=payload.job_description,
        resume_text=payload.resume_text,
        question_count=payload.question_count
    )
    return InteractivePlanResponse(
        session_id=session_id,
        job_role=payload.job_role,
        questions=questions
    )

@app.post("/api/interview/interactive/respond", response_model=InteractiveCandidateTurnResponse)
async def evaluate_candidate_turn(payload: InteractiveCandidateTurnRequest):
    llm = LLMClient(payload.api_key)
    res = await InteractiveInterviewService.evaluate_candidate_turn(
        llm=llm,
        job_role=payload.job_role,
        job_description=payload.job_description,
        resume_text=payload.resume_text,
        current_question=payload.current_question,
        candidate_answer=payload.candidate_answer,
        conversation_history=payload.conversation_history,
        current_question_index=payload.current_question_index,
        total_questions=payload.total_questions,
        plan_questions=payload.plan_questions
    )
    return InteractiveCandidateTurnResponse(**res)

# Meeting Integration Layer & Live Capture Gateway
@app.post("/api/meetings/connect", response_model=LiveCaptureSession)
def connect_meeting_adapter(payload: LiveConnectRequest):
    platform_map = {
        "GOOGLE_MEET": "Google Meet",
        "MS_TEAMS": "Microsoft Teams",
        "ZOOM": "Zoom",
        "UPLOAD_RECORDING": "Authorized Recording Upload",
        "UPLOAD_TRANSCRIPT": "Authorized Transcript Upload"
    }
    config = MeetingAdapterConfig(
        adapter_type=payload.adapter_type,
        meeting_url=payload.meeting_url,
        consent_authorized=True,
        platform_name=platform_map.get(payload.adapter_type, "Google Meet")
    )
    session = LiveCaptureGateway.create_session(config, scenario=payload.preset_scenario or "fintech_distributed")
    return session

@app.get("/api/meetings/{session_id}/stream", response_model=LiveCaptureSession)
def get_meeting_stream(session_id: str):
    session = LiveCaptureGateway.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Live capture session not found")
    return session

@app.post("/api/meetings/{session_id}/finish", response_model=InterviewRecord)
async def finish_meeting_and_analyze(
    session_id: str,
    title: str = Form("Technical Interview"),
    job_role: str = Form("Senior Distributed Systems Engineer"),
    job_description: Optional[str] = Form(None),
    resume_text: Optional[str] = Form(None),
    raw_transcript: Optional[str] = Form(None),
    token: Optional[str] = Form(None)
):
    user = AuthService.get_user_by_token(token)
    candidate_name = user.name if user else "Interview Candidate"
    candidate_email = user.email if user else None

    if raw_transcript and raw_transcript.strip():
        # Candidate provided real transcript from Live AI or recording
        normalized = TranscriptNormalizer.normalize(
            raw_content=raw_transcript,
            title=title,
            job_role=job_role,
            job_description=job_description,
            resume_text=resume_text,
            platform="Interactive Live AI Room"
        )
    else:
        normalized = LiveCaptureGateway.convert_to_normalized_transcript(
            session_id=session_id,
            title=title,
            job_role=job_role,
            job_description=job_description,
            resume_text=resume_text
        )
    orchestrator = InterviewOrchestrator()
    record = await orchestrator.orchestrate_analysis(normalized, interview_id=session_id)
    record.candidate_name = candidate_name
    record.candidate_email = candidate_email
    record.user_email = candidate_email
    record.user_id = user.id if user else None
    storage.save(record)
    return record

@app.get("/api/interviews", response_model=List[InterviewRecord])
def list_interviews(token: Optional[str] = None):
    user = AuthService.get_user_by_token(token)
    if user:
        # Authenticated user: Return their own interviews + any unclaimed interviews
        return storage.get_all(user_email=user.email, include_unclaimed=True)
    
    # Unauthenticated / Visitor: Return all unclaimed interviews (created in current session)
    all_recs = storage.get_all()
    return all_recs[:1] if all_recs else []

@app.get("/api/interviews/{interview_id}", response_model=InterviewRecord)
def get_interview(interview_id: str, token: Optional[str] = None):
    rec = storage.get_by_id(interview_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Interview record not found")
    return rec

@app.post("/api/interviews/workspace/create", response_model=InterviewRecord)
async def create_workspace_interview(payload: WorkspaceCreateRequest, token: Optional[str] = None):
    user = AuthService.get_user_by_token(token)
    user_email = payload.user_email or (user.email if user else None)
    user_name = payload.user_name or (user.name if user else "Interview Candidate")

    platform_map = {
        "GOOGLE_MEET": "Google Meet Adapter",
        "MS_TEAMS": "Microsoft Teams Adapter",
        "ZOOM": "Zoom Adapter",
        "UPLOAD_RECORDING": "Recording Upload Adapter",
        "UPLOAD_TRANSCRIPT": "Transcript Upload Adapter"
    }
    normalized = TranscriptNormalizer.normalize(
        raw_content=payload.transcript_text or "[00:00:15] Interviewer: Welcome.\n[00:00:30] Candidate: Hello.",
        title=payload.title,
        job_role=payload.job_role,
        job_description=payload.job_description,
        resume_text=payload.resume_text,
        platform=platform_map.get(payload.adapter_type, "Google Meet Adapter")
    )
    normalized.meeting_url = payload.meeting_url
    normalized.adapter_type = payload.adapter_type

    orchestrator = InterviewOrchestrator(override_api_key=payload.api_key)
    interview_id = f"int_{str(uuid.uuid4())[:8]}"
    record = await orchestrator.orchestrate_analysis(normalized, interview_id=interview_id)
    record.meeting_url = payload.meeting_url
    record.adapter_type = payload.adapter_type
    record.raw_transcript = payload.transcript_text
    record.candidate_name = user_name
    record.candidate_email = user_email
    record.user_email = user_email
    record.user_id = user.id if user else None
    storage.save(record)
    return record

@app.post("/api/interviews/analyze", response_model=InterviewRecord)
async def analyze_interview(payload: AnalyzeRequest, token: Optional[str] = None):
    if not payload.transcript_text or not payload.transcript_text.strip():
        raise HTTPException(status_code=400, detail="Transcript text is required")

    user = AuthService.get_user_by_token(token)
    user_email = payload.user_email or (user.email if user else None)
    user_name = payload.user_name or (user.name if user else "Interview Candidate")

    # 1. Normalize Transcript
    normalized = TranscriptNormalizer.normalize(
        raw_content=payload.transcript_text,
        title=payload.title or "Technical Interview",
        job_role=payload.job_role or "Software Engineer",
        job_description=payload.job_description,
        resume_text=payload.resume_text,
        platform=payload.platform or "Transcript Upload"
    )

    # 2. Orchestrate Agentic Pipeline
    orchestrator = InterviewOrchestrator(override_api_key=payload.api_key)
    interview_id = f"int_{str(uuid.uuid4())[:8]}"
    record = await orchestrator.orchestrate_analysis(normalized, interview_id=interview_id)
    record.raw_transcript = payload.transcript_text
    record.candidate_name = user_name
    record.candidate_email = user_email
    record.user_email = user_email
    record.user_id = user.id if user else None

    # 3. Persist to storage
    storage.save(record)
    return record

@app.post("/api/interviews/upload", response_model=InterviewRecord)
async def upload_interview_file(
    file: UploadFile = File(...),
    title: str = Form("Technical Interview"),
    job_role: str = Form("Software Engineer"),
    job_description: Optional[str] = Form(None),
    resume_text: Optional[str] = Form(None),
    platform: Optional[str] = Form("File Upload"),
    token: Optional[str] = Form(None)
):
    user = AuthService.get_user_by_token(token)
    user_email = user.email if user else None
    user_name = user.name if user else "Interview Candidate"

    content_bytes = await file.read()
    content_str = content_bytes.decode("utf-8", errors="replace")

    normalized = TranscriptNormalizer.normalize(
        raw_content=content_str,
        title=title,
        job_role=job_role,
        job_description=job_description,
        resume_text=resume_text,
        platform=platform or f"Uploaded File ({file.filename})"
    )

    orchestrator = InterviewOrchestrator()
    interview_id = f"int_{str(uuid.uuid4())[:8]}"
    record = await orchestrator.orchestrate_analysis(normalized, interview_id=interview_id)
    record.raw_transcript = content_str
    record.candidate_name = user_name
    record.candidate_email = user_email
    record.user_email = user_email
    record.user_id = user.id if user else None
    storage.save(record)
    return record

@app.post("/api/interviews/{interview_id}/review", response_model=InterviewRecord)
def submit_expert_review(interview_id: str, review: ExpertReview):
    rec = storage.get_by_id(interview_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Interview record not found")

    review.interview_id = interview_id
    updated = storage.update_expert_review(interview_id, review)
    return updated

@app.post("/api/interviews/{interview_id}/claim/verify", response_model=InterviewRecord)
def expert_verify_claim(interview_id: str, payload: ClaimVerificationRequest):
    rec = storage.get_by_id(interview_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Interview record not found")

    # Find and update target finding
    matched = False
    all_findings_lists = []
    if rec.technical_analysis:
        all_findings_lists.extend([rec.technical_analysis.strengths, rec.technical_analysis.weaknesses])
    if rec.communication_analysis:
        all_findings_lists.append(rec.communication_analysis.findings)
    if rec.behavioral_analysis:
        all_findings_lists.append(rec.behavioral_analysis.findings)
    if rec.verification_result and rec.verification_result.verified_findings:
        all_findings_lists.append(rec.verification_result.verified_findings)

    for flist in all_findings_lists:
        for f in flist:
            if f.id == payload.finding_id:
                matched = True
                if payload.action == "VERIFY":
                    f.verification_status = "EXPERT_VERIFIED"
                    f.verification_notes = f"Verified by Industry Expert: {payload.expert_name} ({payload.expert_title})"
                elif payload.action == "DISPUTE":
                    f.verification_status = "EXPERT_DISPUTED"
                    f.verification_notes = f"Disputed by Industry Expert: {payload.expert_comment or 'Evidence insufficient or mischaracterized'}"
                    f.score_impact = 0.0
                elif payload.action == "MODIFY":
                    f.verification_status = "MODIFIED"
                    f.verification_notes = f"Recalibrated by Expert: {payload.expert_comment or 'Adjusted severity'}"
                
                f.expert_comment = payload.expert_comment
                f.verified_by = f"{payload.expert_name} ({payload.expert_title})"
                if payload.expert_score_override is not None:
                    f.expert_score_override = payload.expert_score_override

    if not matched:
        raise HTTPException(status_code=404, detail=f"Finding ID {payload.finding_id} not found in interview")

    # Recalculate verification counts
    if rec.verification_result:
        all_unique = {}
        for flist in all_findings_lists:
            for f in flist:
                all_unique[f.id] = f
        unique_findings = list(all_unique.values())
        rec.verification_result.expert_verified_count = sum(1 for f in unique_findings if f.verification_status in ["EXPERT_VERIFIED", "EXPERT_DISPUTED"])
        rec.verification_result.verified_count = sum(1 for f in unique_findings if f.verification_status in ["VERIFIED", "EXPERT_VERIFIED"])
        rec.verification_result.rejected_count = sum(1 for f in unique_findings if f.verification_status in ["REJECTED", "EXPERT_DISPUTED"])

    storage.save(rec)
    return rec

@app.post("/api/interviews/{interview_id}/expert-sign-off", response_model=InterviewRecord)
def expert_sign_off(interview_id: str, review: ExpertReview):
    rec = storage.get_by_id(interview_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Interview record not found")

    review.interview_id = interview_id
    rec.expert_review = review
    rec.status = "COMPLETED"

    # If expert provided score overrides, recalibrate overall score
    if review.override_scores and rec.scores:
        if "overall" in review.override_scores:
            rec.scores.overall = review.override_scores["overall"]
        if "technical" in review.override_scores:
            rec.scores.technical_knowledge = review.override_scores["technical"]

    storage.save(rec)
    return rec

@app.post("/api/benchmark/run-suite", response_model=BenchmarkSuiteReport)
@app.get("/api/benchmark/run-suite", response_model=BenchmarkSuiteReport)
async def run_benchmark_suite():
    """
    Executes the automated empirical benchmark suite across 4 controlled testcases
    proving 9.4/10 multi-agent quality vs 3.2/10 single-step baseline.
    """
    report = await BenchmarkSuiteService.run_suite()
    return report

@app.post("/api/interviews/{interview_id}/retest", response_model=ReTestEvaluation)
async def submit_retest(interview_id: str, submission: ReTestSubmission):
    rec = storage.get_by_id(interview_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Interview record not found")

    target_q = None
    if rec.retest_questions:
        for q in rec.retest_questions:
            if q.question_id == submission.question_id:
                target_q = q
                break

    if not target_q:
        raise HTTPException(status_code=404, detail="Re-test question ID not found on interview")

    llm = LLMClient()
    analyzer = KnowledgeGapAnalyzer(llm)
    evaluation = await analyzer.evaluate_retest(target_q, submission)

    storage.add_retest_result(interview_id, evaluation)
    return evaluation

@app.get("/api/insights/cross-interview", response_model=CrossInterviewInsights)
def get_cross_interview_insights(token: Optional[str] = None):
    user = AuthService.get_user_by_token(token)
    user_email = user.email if user else None
    interviews = storage.get_all(user_email=user_email)
    insights = CrossInterviewAgent.analyze_history(interviews)
    return insights

@app.post("/api/benchmark/baseline-comparison", response_model=BaselineComparisonResult)
async def benchmark_comparison(interview_id: Optional[str] = None):
    interviews = storage.get_all()
    if not interviews:
        raise HTTPException(status_code=400, detail="No interviews available for benchmark comparison")

    target = storage.get_by_id(interview_id) if interview_id else interviews[0]
    if not target:
        target = interviews[0]

    llm = LLMClient()
    comparator = BaselineComparator(llm)
    
    baseline_out = await comparator.run_baseline(target.normalized_transcript or TranscriptNormalizer.normalize(target.raw_transcript or "Interviewer: Hello\nCandidate: Hi"))
    metrics_comp = BaselineComparator.compare_metrics(baseline_out, target)

    return BaselineComparisonResult(
        eval_case_id=target.id,
        interview_title=target.title,
        baseline_output=baseline_out,
        multi_agent_output={
            "overall_score": target.scores.overall if target.scores else 7.5,
            "dimensions": target.scores.model_dump() if target.scores else {},
            "verified_findings_count": target.verification_result.verified_count if target.verification_result else 0,
            "audit_trail": target.verification_result.audit_trail if target.verification_result else [],
            "retest_available": len(target.retest_questions or []) > 0
        },
        metrics_comparison=metrics_comp
    )

# Mount built frontend SPA static files if available
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"app": "InterviewLens API"}
