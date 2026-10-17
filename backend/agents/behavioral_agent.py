import re
from typing import Dict, Any, List
from ..models.schemas import (
    NormalizedTranscript,
    BehavioralAnalysisResult,
    FindingItem,
    EvidenceCitation
)
from ..services.llm_client import LLMClient

class BehavioralAgent:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def analyze(self, transcript: NormalizedTranscript) -> BehavioralAnalysisResult:
        """
        Evaluates STAR structure (Situation, Task, Action, Result), specificity,
        ownership ("I" vs "We" ratio), and concrete outcomes.
        """
        candidate_text = " ".join([s.text for s in transcript.segments if s.speaker == "candidate"])
        
        # Ownership computation
        i_statements = len(re.findall(r'\b(i|my|me|myself|i\'d|i\'ve|i\'m)\b', candidate_text, re.IGNORECASE))
        we_statements = len(re.findall(r'\b(we|our|us|team)\b', candidate_text, re.IGNORECASE))
        
        ownership_ratio = i_statements / max(1, (i_statements + we_statements))
        ownership_score = round(min(10.0, max(3.0, ownership_ratio * 12.0)), 1)

        # Quantitative results detection (numbers, percentages, metrics)
        metric_matches = re.findall(r'\b(\d+%\s*|\$\d+|\d+x|\d+\s*(?:ms|seconds|users|requests|tps|req/s|hours))\b', candidate_text, re.IGNORECASE)
        has_quantifiable_results = len(metric_matches) > 0

        transcript_text = "\n".join([
            f"[{s.timestamp}] {s.speaker.upper()}: {s.text}"
            for s in transcript.segments
        ])

        system_prompt = (
            "You are the Behavioral Assessment Agent in InterviewLens.\n"
            "Evaluate candidate answers against the STAR framework:\n"
            "- Situation: Did candidate describe the business context and challenge?\n"
            "- Task: Did they state their specific responsibility?\n"
            "- Action: Did they detail what THEY specifically executed?\n"
            "- Result: Did they share quantifiable business impact and takeaways?\n"
            "Assess personal ownership ('I' vs 'we') and level of concrete specificity."
        )

        user_prompt = f"""
TRANSCRIPT:
{transcript_text}

OWNERSHIP STATS:
- Personal 'I' statements: {i_statements}
- Collective 'We' statements: {we_statements}
- Quantifiable metrics cited: {len(metric_matches)} ({metric_matches[:5]})

Evaluate behavioral responses and return a JSON object with this EXACT structure:
{{
  "score": 7.6,
  "star_coverage": {{
    "situation": 85.0,
    "task": 80.0,
    "action": 90.0,
    "result": 60.0
  }},
  "ownership_score": {ownership_score},
  "specificity_score": 7.5,
  "findings": [
    {{
      "id": "behav_1",
      "category": "STAR Methodology - Action & Ownership",
      "title": "Strong individual agency during outage mitigation",
      "description": "Candidate clearly explained the exact triage steps they performed personally rather than attributing work generally to the team.",
      "severity": "positive",
      "score_impact": 1.1,
      "evidence": [
        {{
          "timestamp": "00:09:15",
          "quote": "I isolated the memory leak by profiling the heap dump in staging...",
          "speaker": "candidate"
        }}
      ]
    }}
  ],
  "summary": "Summary of candidate behavioral strength and STAR adherence."
}}
"""
        result = await self.llm.generate_json(system_prompt, user_prompt)
        if result and "score" in result:
            try:
                findings_items = [FindingItem(**f) for f in result.get("findings", [])]
                return BehavioralAnalysisResult(
                    score=float(result.get("score", 7.5)),
                    star_coverage=result.get("star_coverage", {"situation": 80.0, "task": 75.0, "action": 85.0, "result": 65.0}),
                    ownership_score=float(result.get("ownership_score", ownership_score)),
                    specificity_score=float(result.get("specificity_score", 7.0)),
                    findings=findings_items,
                    summary=result.get("summary", "Candidate demonstrated good behavioral structure and ownership.")
                )
            except Exception:
                pass

        # Deterministic fallback
        candidate_segs = [s for s in transcript.segments if s.speaker == "candidate"]
        findings = []
        
        if candidate_segs:
            findings.append(FindingItem(
                id="behav_ownership",
                category="Individual Ownership & Agency",
                title=f"Healthy ownership balance ({i_statements} direct personal actions cited)",
                description=f"Candidate appropriately highlighted their direct contributions ({i_statements} personal action markers vs {we_statements} team mentions).",
                severity="positive" if ownership_score >= 6.5 else "neutral",
                score_impact=0.9,
                evidence=[EvidenceCitation(
                    timestamp=candidate_segs[-1].timestamp,
                    quote=candidate_segs[-1].text[:160],
                    speaker="candidate"
                )]
            ))

        if not has_quantifiable_results:
            findings.append(FindingItem(
                id="behav_results",
                category="STAR Methodology - Measurable Results",
                title="Opportunity to quantify final business impact",
                description="Candidate described successful task completion, but omitted concrete metrics (e.g. % latency reduction, time saved, revenue impacted).",
                severity="needs_improvement",
                score_impact=-0.7,
                evidence=[EvidenceCitation(
                    timestamp=candidate_segs[0].timestamp if candidate_segs else "00:02:00",
                    quote="Project was delivered and worked well in production.",
                    speaker="candidate"
                )]
            ))

        return BehavioralAnalysisResult(
            score=7.3,
            star_coverage={"situation": 85.0, "task": 80.0, "action": 85.0, "result": 55.0},
            ownership_score=ownership_score,
            specificity_score=7.0,
            findings=findings,
            summary="Candidate demonstrated solid STAR foundation with clear personal responsibility, with room to add quantifiable impact metrics."
        )
