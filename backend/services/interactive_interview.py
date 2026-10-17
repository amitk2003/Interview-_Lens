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
    async def evaluate_candidate_turn(
        cls,
        llm: LLMClient,
        job_role: str,
        job_description: Optional[str],
        resume_text: Optional[str],
        current_question: str,
        candidate_answer: str,
        conversation_history: List[Dict[str, str]],
        current_question_index: int,
        total_questions: int,
        plan_questions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Acts as a real, senior technical interviewer:
        1. Analyzes the candidate's actual response (depth, clarity, concrete facts vs buzzwords).
        2. Dynamically decides whether to:
           - Probe deeper with a tailored follow-up question directly quoting the candidate's words.
           - Challenge a shallow answer or provide a hint if the candidate is stuck.
           - Smoothly transition to the next topic in the interview plan.
        """
        clean_answer = candidate_answer.strip()
        history_snippet = "\n".join([
            f"{turn.get('speaker', 'Unknown')}: {turn.get('text', '')}"
            for turn in conversation_history[-4:]
        ])

        # Next question from plan if advancing
        next_planned_idx = current_question_index + 1
        has_next_plan = next_planned_idx < len(plan_questions)
        next_planned_q = plan_questions[next_planned_idx]["question"] if has_next_plan else None
        next_planned_topic = plan_questions[next_planned_idx].get("category", "Deep Dive") if has_next_plan else "Wrap-up"

        system_prompt = (
            "You are a Principal Software Engineer and hiring manager conducting a live, interactive technical interview. "
            "You DO NOT act like an automated chatbot. You listen intently to what the candidate said and respond authentically.\n\n"
            "INTERVIEWING PRINCIPLES:\n"
            "1. NEVER ask a random, disconnected question. Always acknowledge what the candidate specifically stated.\n"
            "2. If the candidate gave a specific technical answer, PROBE DEEPER into their implementation details, failure modes, scale limits, or edge cases.\n"
            "3. If the candidate gave a shallow buzzword answer ('we used microservices and AWS'), call it out respectfully and ask for concrete mechanics.\n"
            "4. If the candidate is stuck or asked for clarification, give a helpful technical nudge/hint.\n"
            "5. If the candidate thoroughly covered the topic (or after 1 follow-up), smoothly bridge to the next planned question.\n"
            "6. Keep your speech spoken-style, engaging, and under 3-4 sentences so the candidate does most of the talking."
        )

        user_prompt = f"""
TARGET ROLE: {job_role}
JOB DESCRIPTION: {job_description or "Senior engineering role requiring architectural depth and production reliability."}
CURRENT QUESTION: {current_question}
CANDIDATE ANSWER: {clean_answer}

RECENT CONVERSATION HISTORY:
{history_snippet or "None"}

NEXT TOPIC IN PLAN (if ready to advance):
Category: {next_planned_topic}
Question: {next_planned_q or "All planned topics complete."}

QUESTION INDEX: {current_question_index} of {total_questions}

Respond with strict JSON matching this schema:
{{
  "decision": "PROBE_FOLLOWUP", // or "ADVANCE_NEXT" or "WRAP_UP"
  "interviewer_speech": "Spoken interviewer response that acknowledges candidate answer and either asks the follow-up or introduces the next question",
  "is_followup": true, // true if probing deeper on current topic, false if advancing
  "current_topic": "Topic Name",
  "detected_signals": [
    {{"type": "strength", "tag": "Concrete metrics", "detail": "Cited 50k req/s"}},
    {{"type": "critique", "tag": "Missing failure recovery", "detail": "Did not specify backpressure"}}
  ],
  "depth_score": 7.8, // 1.0 to 10.0 based on technical depth
  "rubric_feedback": "One concise evaluator note on this turn"
}}
"""
        res = await llm.generate_json(system_prompt, user_prompt)
        if res and "interviewer_speech" in res and res.get("interviewer_speech"):
            is_followup = res.get("is_followup", False)
            if not is_followup:
                new_idx = current_question_index + 1
            else:
                new_idx = current_question_index

            is_complete = (new_idx >= total_questions) and not is_followup
            return {
                "interviewer_speech": res["interviewer_speech"],
                "is_followup": is_followup,
                "next_question_index": new_idx,
                "current_topic": res.get("current_topic", "Technical Assessment"),
                "detected_signals": res.get("detected_signals", []),
                "depth_score": float(res.get("depth_score", 7.5)),
                "rubric_feedback": res.get("rubric_feedback", "Evaluated against role standards."),
                "is_interview_complete": is_complete
            }

        # Context-aware fallback heuristic if LLM is unavailable
        words = clean_answer.lower().split()
        is_short = len(words) < 20
        has_tech_terms = any(term in clean_answer.lower() for term in ["kafka", "redis", "database", "postgres", "cache", "async", "latency", "scale", "docker", "lock"])

        if is_short:
            speech = f"You touched on the concept briefly. Could you drill into the specific implementation mechanics and trade-offs you faced when building that for {job_role}?"
            return {
                "interviewer_speech": speech,
                "is_followup": True,
                "next_question_index": current_question_index,
                "current_topic": "Implementation Depth",
                "detected_signals": [{"type": "critique", "tag": "Brief response", "detail": "Needs elaboration on technical choices"}],
                "depth_score": 5.0,
                "rubric_feedback": "Candidate gave brief overview; prompted for depth.",
                "is_interview_complete": False
            }
        elif has_tech_terms and current_question_index % 2 == 0:
            speech = f"That clarifies your choice of architecture. How did your design behave when network latency spiked or under sudden node failover?"
            return {
                "interviewer_speech": speech,
                "is_followup": True,
                "next_question_index": current_question_index,
                "current_topic": "Fault Tolerance & Edge Cases",
                "detected_signals": [{"type": "strength", "tag": "Tech stack cited", "detail": "Demonstrated technical vocabulary"}],
                "depth_score": 7.5,
                "rubric_feedback": "Followed up on fault tolerance.",
                "is_interview_complete": False
            }
        else:
            new_idx = current_question_index + 1
            if has_next_plan and next_planned_q:
                speech = f"Understood, that makes sense. Moving forward to our next area: {next_planned_q}"
                is_done = False
            else:
                speech = "Excellent. That concludes our planned interview questions. I have enough context to generate your comprehensive technical and behavioral assessment."
                is_done = True

            return {
                "interviewer_speech": speech,
                "is_followup": False,
                "next_question_index": new_idx,
                "current_topic": next_planned_topic,
                "detected_signals": [{"type": "strength", "tag": "Completed topic", "detail": "Sufficient context gathered"}],
                "depth_score": 8.0,
                "rubric_feedback": "Completed topic assessment; advanced.",
                "is_interview_complete": is_done
            }
