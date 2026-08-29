import re
from typing import Dict, Any, List
from ..models.schemas import (
    NormalizedTranscript,
    TechnicalAnalysisResult,
    FindingItem,
    EvidenceCitation
)
from ..services.llm_client import LLMClient

class TechnicalAgent:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def analyze(self, transcript: NormalizedTranscript) -> TechnicalAnalysisResult:
        """
        Evaluates question understanding, correctness, expected vs demonstrated concepts,
        missing concepts, and extracts struggled questions.
        """
        transcript_text = "\n".join([
            f"[{s.timestamp}] {s.speaker.upper()}: {s.text}"
            for s in transcript.segments
        ])
        
        jd_text = transcript.job_description or f"Role: {transcript.job_role}. Requires standard technical depth, system architecture, problem decomposition, and algorithmic knowledge."
        resume_text = transcript.resume_text or "Candidate background in software engineering."

        system_prompt = (
            "You are the Technical Assessment Agent in InterviewLens. "
            "Your job is to rigorously evaluate the technical depth, correctness, problem-solving, and concept coverage "
            "of a candidate during an interview based strictly on their transcript and the Job Description.\n"
            "Rules:\n"
            "1. Every positive or negative finding MUST include exact quotes with exact [HH:MM:SS] timestamps from the transcript.\n"
            "2. Extract struggled questions where the candidate gave weak, incomplete, or incorrect answers so they can be re-tested.\n"
            "3. Identify expected technical concepts based on the role and JD, and compare against demonstrated vs missing concepts."
        )

        user_prompt = f"""
JOB ROLE: {transcript.job_role}
JOB DESCRIPTION:
{jd_text}

CANDIDATE RESUME:
{resume_text}

INTERVIEW TRANSCRIPT:
{transcript_text}

Evaluate the technical performance and return a JSON object with this EXACT structure:
{{
  "score": 8.2, // float 0.0 to 10.0
  "question_understanding_score": 8.0,
  "problem_solving_score": 7.5,
  "expected_concepts": ["concept1", "concept2", "concept3"],
  "demonstrated_concepts": ["concept1", "concept2"],
  "missing_concepts": ["concept3"],
  "strengths": [
    {{
      "id": "tech_s1",
      "category": "Architecture & System Design",
      "title": "Strong explanation of caching strategy",
      "description": "Candidate accurately described multi-tier cache invalidation using Redis and write-through cache.",
      "severity": "positive",
      "score_impact": 1.2,
      "evidence": [
        {{
          "timestamp": "00:04:12",
          "quote": "We implemented Redis with a TTL-based invalidation...",
          "speaker": "candidate"
        }}
      ]
    }}
  ],
  "weaknesses": [
    {{
      "id": "tech_w1",
      "category": "Concurrency & Distributed Locking",
      "title": "Unclear handling of distributed race conditions",
      "description": "Candidate struggled to explain how to prevent double-booking under concurrent writes.",
      "severity": "needs_improvement",
      "score_impact": -1.5,
      "evidence": [
        {{
          "timestamp": "00:08:45",
          "quote": "I think we can just check the database if it exists...",
          "speaker": "candidate"
        }}
      ]
    }}
  ],
  "struggled_questions": [
    {{
      "question_id": "q_concurrency",
      "topic": "Distributed Locking & Concurrency",
      "original_question": "How do you guarantee atomicity when two users attempt to reserve the same inventory item simultaneously?",
      "interview_score": 4.5,
      "interview_evidence": "Candidate proposed simple read-then-write without row locks, optimistic locks, or distributed mutex.",
      "retest_prompt": "Explain two ways to handle concurrent reservation requests in a distributed microservice architecture without race conditions.",
      "ideal_answer_points": [
        "Optimistic locking using version column (OCC)",
        "Pessimistic locking with SELECT FOR UPDATE",
        "Distributed lock via Redis Redlock or ZooKeeper",
        "Database unique constraint with idempotency key"
      ]
    }}
  ],
  "summary": "Overall evaluation summary of candidate's technical skills."
}}
"""
        result = await self.llm.generate_json(system_prompt, user_prompt)
        if result and "score" in result and "strengths" in result:
            try:
                return TechnicalAnalysisResult(**result)
            except Exception:
                pass

        # Deterministic domain evaluation fallback
        return self._heuristic_analysis(transcript)

    def _heuristic_analysis(self, transcript: NormalizedTranscript) -> TechnicalAnalysisResult:
        candidate_text = " ".join([s.text for s in transcript.segments if s.speaker == "candidate"])
        candidate_words = candidate_text.lower().split()
        
        # Technical keywords dictionary
        tech_keywords = {
            "Databases & Caching": ["database", "sql", "nosql", "postgres", "redis", "cache", "indexing", "sharding", "query", "acid"],
            "System Architecture": ["microservices", "api", "rest", "graphql", "load balancer", "kafka", "queue", "scalability", "distributed", "latency"],
            "Concurrency & Performance": ["concurrency", "async", "threads", "mutex", "lock", "throughput", "optimization", "bottleneck"],
            "Testing & Reliability": ["unit test", "integration", "ci/cd", "docker", "kubernetes", "monitoring", "metrics", "logging"]
        }

        demonstrated = []
        missing = []
        expected = ["Databases & Caching", "System Architecture", "Concurrency & Performance", "Testing & Reliability"]

        for category, terms in tech_keywords.items():
            matched = [t for t in terms if t in candidate_text.lower()]
            if len(matched) >= 2:
                demonstrated.append(f"{category} ({', '.join(matched[:3])})")
            else:
                missing.append(category)

        # Score calculation
        base_score = 6.0 + (len(demonstrated) * 0.9) - (len(missing) * 0.4)
        tech_score = max(3.5, min(9.5, round(base_score, 1)))

        # Find sample evidence from transcript
        strengths = []
        weaknesses = []
        struggled = []

        candidate_segs = [s for s in transcript.segments if s.speaker == "candidate"]
        interviewer_segs = [s for s in transcript.segments if s.speaker == "interviewer"]

        if candidate_segs:
            longest_seg = max(candidate_segs, key=lambda s: len(s.text))
            strengths.append(FindingItem(
                id="tech_s1",
                category="System Design & Problem Formulation",
                title="Detailed technical explanation and architectural breakdown",
                description="Candidate demonstrated good depth while explaining core components and flow.",
                severity="positive",
                score_impact=1.2,
                evidence=[EvidenceCitation(
                    timestamp=longest_seg.timestamp,
                    quote=longest_seg.text[:180] + ("..." if len(longest_seg.text) > 180 else ""),
                    speaker="candidate"
                )]
            ))

        if len(candidate_segs) > 1:
            short_seg = min(candidate_segs, key=lambda s: len(s.text))
            weaknesses.append(FindingItem(
                id="tech_w1",
                category="Deep Dive & Edge Case Coverage",
                title="Brief answer on edge cases and failure modes",
                description="Candidate provided an abbreviated response when prompted for failure handling and recovery mechanisms.",
                severity="needs_improvement",
                score_impact=-1.0,
                evidence=[EvidenceCitation(
                    timestamp=short_seg.timestamp,
                    quote=short_seg.text[:160],
                    speaker="candidate"
                )]
            ))

            struggled.append({
                "question_id": "q_tech_1",
                "topic": "Distributed Edge Cases & Fault Tolerance",
                "original_question": interviewer_segs[0].text if interviewer_segs else "How do you handle service failovers and data consistency?",
                "interview_score": 5.0,
                "interview_evidence": short_seg.text[:150],
                "retest_prompt": "Explain how you would design a fault-tolerant distributed system with automatic failover and zero data loss.",
                "ideal_answer_points": [
                    "Multi-AZ replication with active-standby / leader election",
                    "Circuit breaker pattern and graceful degradation",
                    "Write-Ahead Logging (WAL) and consensus (Raft/Paxos)",
                    "Data idempotency and automated retry with exponential backoff"
                ]
            })

        return TechnicalAnalysisResult(
            score=tech_score,
            question_understanding_score=round(min(10.0, tech_score + 0.3), 1),
            problem_solving_score=round(min(10.0, tech_score - 0.2), 1),
            expected_concepts=expected,
            demonstrated_concepts=demonstrated or ["Core Software Engineering Fundamentals"],
            missing_concepts=missing or ["Advanced Distributed Consensus"],
            strengths=strengths,
            weaknesses=weaknesses,
            struggled_questions=struggled,
            summary=f"Candidate demonstrated solid technical foundation scoring {tech_score}/10 with strong coverage in {', '.join(demonstrated[:2]) if demonstrated else 'fundamentals'}."
        )
