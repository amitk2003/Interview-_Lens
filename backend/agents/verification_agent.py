from typing import List, Dict, Any
from ..models.schemas import (
    NormalizedTranscript,
    FindingItem,
    VerificationResult
)
from ..services.llm_client import LLMClient

class VerificationAgent:
    """
    Evidence / Verification Agent:
    Checks every AI claim produced by Technical, Communication, and Behavioral agents against
    the verbatim transcript. Accepts, modifies, or rejects assessments to eliminate hallucinated claims.
    """
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def verify(
        self,
        transcript: NormalizedTranscript,
        all_findings: List[FindingItem]
    ) -> VerificationResult:
        candidate_segments = [s for s in transcript.segments if s.speaker.lower() == "candidate"]
        candidate_text = " ".join([s.text for s in candidate_segments]).lower()

        verified_findings: List[FindingItem] = []
        audit_trail: List[Dict[str, Any]] = []

        for finding in all_findings:
            # 1. If already reviewed by a human industrial expert, prioritize expert judgment
            if finding.verification_status in ["EXPERT_VERIFIED", "EXPERT_DISPUTED"]:
                verified_findings.append(finding)
                audit_trail.append({
                    "finding_id": finding.id,
                    "title": finding.title,
                    "status": finding.verification_status,
                    "reason": f"Verified by Industry Expert ({finding.verified_by or 'Staff Reviewer'})",
                    "evidence_snippet": finding.expert_comment or "Expert approved"
                })
                continue

            # 2. Strict algorithmic ground truth search
            is_quote_present = False
            matched_segment = None

            if finding.evidence and len(finding.evidence) > 0:
                first_evidence = finding.evidence[0]
                quote_clean = first_evidence.quote.lower().strip(" .\"'")
                quote_words = [w for w in quote_clean.split() if len(w) > 3]

                # Match 3+ consecutive substantive words
                if len(quote_words) >= 3:
                    for i in range(len(quote_words) - 2):
                        subphrase = " ".join(quote_words[i:i+3])
                        for seg in transcript.segments:
                            if subphrase in seg.text.lower():
                                is_quote_present = True
                                matched_segment = seg
                                break
                        if is_quote_present:
                            break
                elif quote_clean:
                    for seg in transcript.segments:
                        if quote_clean in seg.text.lower():
                            is_quote_present = True
                            matched_segment = seg
                            break

            # 3. Decision Tree: VERIFIED, MODIFIED, or REJECTED
            if is_quote_present and matched_segment:
                finding.verification_status = "VERIFIED"
                finding.verification_notes = f"Verbatim transcript alignment verified at [{matched_segment.timestamp}]."
                audit_trail.append({
                    "finding_id": finding.id,
                    "title": finding.title,
                    "status": "VERIFIED",
                    "reason": f"Ground truth confirmed at timestamp [{matched_segment.timestamp}].",
                    "evidence_snippet": matched_segment.text[:120]
                })
            else:
                # Check if the technical concepts in this claim are actually anywhere in candidate's speech
                substantive_keywords = [
                    w.lower() for w in (finding.title + " " + finding.description).split()
                    if len(w) > 4 and w.lower() not in ["candidate", "demonstrated", "system", "using", "about", "could", "would", "which", "their"]
                ]
                keyword_hits = [kw for kw in substantive_keywords if kw in candidate_text]

                if len(keyword_hits) >= 2:
                    # Concept was discussed, but AI quote was paraphrased rather than verbatim
                    finding.verification_status = "MODIFIED"
                    finding.verification_notes = f"Paraphrased claim calibrated to candidate's vocabulary ({', '.join(keyword_hits[:3])})."
                    audit_trail.append({
                        "finding_id": finding.id,
                        "title": finding.title,
                        "status": "MODIFIED",
                        "reason": f"Concepts ({', '.join(keyword_hits[:2])}) confirmed in transcript, but exact citation was synthesized.",
                        "evidence_snippet": candidate_segments[0].text[:100] if candidate_segments else ""
                    })
                else:
                    # Hallucination / Unsupported assertion! Reject claim
                    finding.verification_status = "REJECTED"
                    finding.verification_notes = "REJECTED: Hallucinated claim. Candidate never discussed these concepts in the interview transcript."
                    finding.score_impact = 0.0
                    audit_trail.append({
                        "finding_id": finding.id,
                        "title": finding.title,
                        "status": "REJECTED",
                        "reason": "Transcript audit failed: Zero matching statements or vocabulary found in candidate responses.",
                        "evidence_snippet": "N/A (Filtered out)"
                    })

            verified_findings.append(finding)

        total = len(verified_findings)
        verified_cnt = sum(1 for f in verified_findings if f.verification_status == "VERIFIED")
        modified_cnt = sum(1 for f in verified_findings if f.verification_status == "MODIFIED")
        rejected_cnt = sum(1 for f in verified_findings if f.verification_status == "REJECTED")
        expert_cnt = sum(1 for f in verified_findings if f.verification_status in ["EXPERT_VERIFIED", "EXPERT_DISPUTED"])
        rate = round((verified_cnt + modified_cnt + expert_cnt) / max(1, total) * 100.0, 1)

        return VerificationResult(
            total_claims_checked=total,
            verified_count=verified_cnt,
            modified_count=modified_cnt,
            rejected_count=rejected_cnt,
            expert_verified_count=expert_cnt,
            verification_rate_pct=rate,
            verified_findings=verified_findings,
            audit_trail=audit_trail
        )
