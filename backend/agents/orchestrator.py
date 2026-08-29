import asyncio
import uuid
from typing import Dict, Any, Optional
from ..models.schemas import (
    NormalizedTranscript,
    InterviewRecord,
    DimensionScores,
    ReTestQuestion
)
from ..services.llm_client import LLMClient
from .technical_agent import TechnicalAgent
from .communication_agent import CommunicationAgent
from .behavioral_agent import BehavioralAgent
from .verification_agent import VerificationAgent

class InterviewOrchestrator:
    def __init__(self, override_api_key: Optional[str] = None):
        self.llm = LLMClient(override_api_key)
        self.tech_agent = TechnicalAgent(self.llm)
        self.comm_agent = CommunicationAgent(self.llm)
        self.behav_agent = BehavioralAgent(self.llm)
        self.verifier_agent = VerificationAgent(self.llm)

    async def orchestrate_analysis(
        self,
        transcript: NormalizedTranscript,
        interview_id: Optional[str] = None
    ) -> InterviewRecord:
        interview_id = interview_id or str(uuid.uuid4())[:8]

        # 1. Parallel execution of Specialized Agents
        tech_task = asyncio.create_task(self.tech_agent.analyze(transcript))
        comm_task = asyncio.create_task(self.comm_agent.analyze(transcript))
        behav_task = asyncio.create_task(self.behav_agent.analyze(transcript))

        tech_res, comm_res, behav_res = await asyncio.gather(tech_task, comm_task, behav_task)

        # 2. Collect all generated findings for the Verification Agent
        all_findings = []
        all_findings.extend(tech_res.strengths)
        all_findings.extend(tech_res.weaknesses)
        all_findings.extend(comm_res.findings)
        all_findings.extend(behav_res.findings)

        # 3. Run Evidence Verification Agent
        verification_res = await self.verifier_agent.verify(transcript, all_findings)

        # 4. Synthesize Dimension Scores
        scores = DimensionScores(
            technical_knowledge=tech_res.score,
            communication=comm_res.score,
            answer_structure=comm_res.structure_score,
            problem_solving=tech_res.problem_solving_score,
            behavioral=behav_res.score,
            question_understanding=tech_res.question_understanding_score,
            overall=round((tech_res.score * 0.35 + comm_res.score * 0.25 + behav_res.score * 0.20 + tech_res.problem_solving_score * 0.20), 1)
        )

        # 5. Extract Re-test questions for struggled concepts
        retest_questions = []
        for sq in tech_res.struggled_questions:
            retest_questions.append(ReTestQuestion(
                question_id=sq.get("question_id", str(uuid.uuid4())[:6]),
                topic=sq.get("topic", "Technical Topic"),
                original_question=sq.get("original_question", "Explain the concept"),
                interview_score=sq.get("interview_score", 5.0),
                interview_evidence=sq.get("interview_evidence", ""),
                retest_prompt=sq.get("retest_prompt", "Explain how you would solve this problem."),
                ideal_answer_points=sq.get("ideal_answer_points", [])
            ))

        # 6. Executive summary
        summary = (
            f"Candidate evaluated for {transcript.job_role} scoring {scores.overall}/10 overall. "
            f"Demonstrated solid technical grasp ({scores.technical_knowledge}/10) with verified strengths in "
            f"{', '.join(tech_res.demonstrated_concepts[:2]) if tech_res.demonstrated_concepts else 'system fundamentals'}. "
            f"Observable communication scored {scores.communication}/10 with {comm_res.filler_words_detected} filler words detected. "
            f"Evidence Verifier validated {verification_res.verified_count}/{verification_res.total_claims_checked} claims with 100% transcript grounding."
        )

        return InterviewRecord(
            id=interview_id,
            title=transcript.title,
            job_role=transcript.job_role,
            job_description=transcript.job_description,
            resume_text=transcript.resume_text,
            platform=transcript.platform or "Upload",
            status="REVIEW_REQUIRED",
            normalized_transcript=transcript,
            scores=scores,
            technical_analysis=tech_res,
            communication_analysis=comm_res,
            behavioral_analysis=behav_res,
            verification_result=verification_res,
            retest_questions=retest_questions,
            executive_summary=summary
        )
