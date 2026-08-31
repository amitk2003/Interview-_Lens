import uuid
import logging
from typing import List, Dict, Any, Optional
from ..models.schemas import LiveCaptureChunk, ParticipantEvent, NormalizedTranscript, TranscriptSegment
from ..services.llm_client import LLMClient

logger = logging.getLogger("InterviewLens.Interactive")

class InteractiveInterviewService:
    """
    Generates tailored, progressive interview questions based specifically on the candidate's
    uploaded resume and job description, adapting dynamically as the candidate responds.
    """

    @classmethod
    async def generate_interview_plan(
        cls,
        llm: LLMClient,
        job_role: str,
        job_description: Optional[str],
        resume_text: Optional[str],
        question_count: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Generates 4-5 focused, real interview questions based on the candidate's actual background and JD.
        """
        jd_context = job_description or f"Role: {job_role}. Requires standard technical problem solving, domain depth, and architecture design."
        resume_context = resume_text or "Candidate with software engineering experience."

        system_prompt = (
            "You are an expert technical and behavioral hiring manager. "
            "Your goal is to formulate a structured, highly realistic 4-question interview tailored specifically "
            "to the provided Job Description and the Candidate's Resume."
        )

        user_prompt = f"""
TARGET ROLE: {job_role}

JOB DESCRIPTION:
{jd_context}

CANDIDATE RESUME / BACKGROUND:
{resume_context}

Generate an array of {question_count} interview questions in sequential order:
1. Warm-up / Project Deep Dive (referencing specific projects or skills in candidate resume)
2. Core Technical Architecture & Design (testing a key requirement in the JD)
3. Hard Edge Case / Concurrency / Failure Recovery / Optimization (pushing candidate to their limit)
4. STAR Behavioral / Team Collaboration / Conflict / Ownership question

Return a JSON object with this EXACT structure:
{{
  "questions": [
    {{
      "index": 1,
      "category": "Experience & Architecture",
      "question": "Can you walk me through the architecture of a major system you built, focusing on how you chose your data storage and messaging layers?",
      "focus_skills": ["Architecture", "System Design"],
      "expected_criteria": ["Clear architectural trade-offs", "Component boundaries"]
    }},
    {{
      "index": 2,
      "category": "Core Technical Depth",
      "question": "How do you handle data consistency and caching when operating at high write throughput?",
      "focus_skills": ["Caching", "Data Consistency"],
      "expected_criteria": ["Cache invalidation strategy", "Race condition mitigation"]
    }},
    {{
      "index": 3,
      "category": "Edge Cases & Fault Tolerance",
      "question": "Suppose your primary service begins experiencing cascading timeouts. How would you diagnose, isolate, and recover the system under load?",
      "focus_skills": ["Reliability", "Fault Recovery"],
      "expected_criteria": ["Circuit breakers", "Telemetry/observability", "Graceful degradation"]
    }},
    {{
      "index": 4,
      "category": "STAR Behavioral Ownership",
      "question": "Tell me about a time you strongly disagreed with an architectural decision made by a teammate or lead. How did you handle it and what was the outcome?",
      "focus_skills": ["Ownership", "Communication", "Leadership"],
      "expected_criteria": ["Situation-Task-Action-Result structure", "Constructive resolution", "Focus on 'I' actions"]
    }}
  ]
}}
"""
        result = await llm.generate_json(system_prompt, user_prompt)
        if result and "questions" in result and isinstance(result["questions"], list) and len(result["questions"]) > 0:
            return result["questions"]

        # Heuristic fallback questions customized to role
        return [
            {
                "index": 1,
                "category": "Experience & Project Deep Dive",
                "question": f"Welcome! To start off, could you introduce yourself and walk me through a key system or feature you built for {job_role}?",
                "focus_skills": ["Communication", "Domain Knowledge"],
                "expected_criteria": ["Clear technical overview", "Personal ownership"]
            },
            {
                "index": 2,
                "category": "Technical Architecture & Design",
                "question": f"When designing for {job_role}, how do you approach scalability, latency, and component decomposition?",
                "focus_skills": ["System Design", "Scalability"],
                "expected_criteria": ["Trade-off analysis", "Storage & caching choices"]
            },
            {
                "index": 3,
                "category": "Edge Cases & Concurrency",
                "question": "How do you handle race conditions, sudden traffic spikes, or distributed node failures in your architecture?",
                "focus_skills": ["Fault Tolerance", "Concurrency"],
                "expected_criteria": ["Idempotency", "Locking/isolation", "Circuit breaking"]
            },
            {
                "index": 4,
                "category": "Behavioral & Delivery",
                "question": "Tell me about a high-stakes engineering challenge you owned from conception to deployment. What obstacles arose and what was the quantifiable impact?",
                "focus_skills": ["STAR Framing", "Impact"],
                "expected_criteria": ["Clear Situation, Action, Result", "Quantified business metrics"]
            }
        ]

    @classmethod
    async def generate_followup_or_evaluation(
        cls,
        llm: LLMClient,
        current_question: str,
        candidate_answer: str,
        job_role: str
    ) -> Dict[str, Any]:
        """
        Generates real-time feedback & dynamic follow-up prompt if the candidate's answer was brief or needs clarification.
        """
        if len(candidate_answer.strip().split()) < 15:
            return {
                "needs_followup": True,
                "followup_question": "Could you elaborate a bit more on the specific implementation details and trade-offs you considered?"
            }

        system_prompt = "You are an interviewer evaluating an in-flight interview response. Decide if you should ask a clarifying follow-up or proceed to the next question."
        user_prompt = f"""
ROLE: {job_role}
QUESTION ASKED: {current_question}
CANDIDATE ANSWER: {candidate_answer}

Respond with JSON:
{{
  "needs_followup": false,
  "followup_question": ""
}}
"""
        res = await llm.generate_json(system_prompt, user_prompt)
        if res and isinstance(res, dict):
            return res
        return {"needs_followup": False, "followup_question": ""}
