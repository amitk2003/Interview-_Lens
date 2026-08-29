from typing import List, Dict, Any
from ..models.schemas import (
    ReTestQuestion,
    ReTestSubmission,
    ReTestEvaluation
)
from .llm_client import LLMClient

class KnowledgeGapAnalyzer:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def evaluate_retest(
        self,
        question: ReTestQuestion,
        submission: ReTestSubmission
    ) -> ReTestEvaluation:
        """
        Scores candidate's post-interview re-test response and determines whether
        the original interview struggle was a Knowledge Gap or a Performance/Retrieval Gap.
        """
        system_prompt = (
            "You are the Knowledge vs Performance Diagnostic Agent in InterviewLens.\n"
            "Evaluate the candidate's calm, post-interview written response against the original question "
            "and ideal answer points. Provide a score from 0.0 to 10.0 and diagnostic assessment."
        )

        user_prompt = f"""
TOPIC: {question.topic}
ORIGINAL QUESTION: {question.original_question}
ORIGINAL INTERVIEW SCORE: {question.interview_score}/10
ORIGINAL INTERVIEW EVIDENCE: {question.interview_evidence}

IDEAL ANSWER POINTS:
{question.ideal_answer_points}

CANDIDATE RE-TEST ANSWER:
{submission.candidate_answer}

Evaluate and return JSON:
{{
  "retest_score": 8.5, // float 0.0 to 10.0
  "feedback": "Candidate clearly understands optimistic locking and Redis Redlock when given time to write it down without interview time pressure."
}}
"""
        result = await self.llm.generate_json(system_prompt, user_prompt)
        retest_score = float(result.get("retest_score", 8.0)) if result and "retest_score" in result else None

        # Fallback scoring if LLM key absent
        if retest_score is None:
            answer_text = submission.candidate_answer.lower()
            matched_points = sum(1 for pt in question.ideal_answer_points if any(w.lower() in answer_text for w in pt.split()[:3]))
            retest_score = round(min(10.0, max(4.0, 5.0 + (matched_points * 1.5))), 1)

        delta = round(retest_score - question.interview_score, 1)

        # Gap classification
        if delta >= 2.5:
            gap_type = "PERFORMANCE_GAP"
            diagnosis = (
                f"Significant retrieval delta (+{delta} pts). The candidate possesses the theoretical knowledge "
                f"(re-test score: {retest_score}/10) but experienced cognitive load, retrieval friction, "
                f"or verbal pressure during the live interview (original score: {question.interview_score}/10)."
            )
            recommendation = (
                "Action: Practice 2-minute timed verbal articulation drills with mock partners rather than re-studying theory."
            )
        elif delta <= 1.0 and retest_score < 6.5:
            gap_type = "KNOWLEDGE_GAP"
            diagnosis = (
                f"Persistent conceptual gap (re-test: {retest_score}/10 vs interview: {question.interview_score}/10). "
                f"The candidate has a foundational knowledge deficiency in {question.topic} regardless of interview conditions."
            )
            recommendation = (
                f"Action: Dedicated concept study required. Read documentation and build a hands-on proof-of-concept for {question.topic}."
            )
        else:
            gap_type = "CONSISTENT_STRENGTH" if retest_score >= 7.5 else "PERFORMANCE_GAP"
            diagnosis = f"Candidate scored {retest_score}/10 on re-test (delta: {delta > 0 and '+' or ''}{delta})."
            recommendation = "Action: Review edge cases and maintain current preparation routine."

        return ReTestEvaluation(
            question_id=question.question_id,
            topic=question.topic,
            interview_score=question.interview_score,
            retest_score=retest_score,
            score_delta=delta,
            gap_type=gap_type,
            diagnosis=diagnosis,
            recommendation=recommendation
        )
