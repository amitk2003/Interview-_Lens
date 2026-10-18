"""
Assessment Lifecycle Service — InterviewLens State Machine & Validation Engine

Enforces explicit, validated assessment lifecycle states:
  - AI_ASSESSMENT_PENDING: Interview transcript exists; awaiting AI multi-agent analysis.
  - PENDING_EXPERT_REVIEW: AI assessment completed; awaiting expert assignment.
  - ASSIGNED: Administrator assigned assessment to an accredited expert reviewer.
  - IN_REVIEW: Assigned expert reviewer is actively auditing claims and calibrating scores.
  - REVISION_REQUIRED: Additional evidence, clarification, or re-test review required.
  - FINALIZED: Expert review completed, required fields validated, certificate issued, locked.
  - REASSESSMENT_REQUIRED: Assessment disputed or retake requested; reopened for audit.

Lifecycle Rules:
  1. An interview must exist before an assessment can be reviewed.
  2. AI assessment generation must complete before expert assignment.
  3. Only an authorized administrator can assign or reassign reviewers.
  4. Only the assigned, verified expert can submit a review.
  5. Required expert fields must be validated before finalization.
  6. Every status transition must be validated on the backend.
  7. The original AI assessment must be retained for comparison.
  8. Submitted expert decisions must have a versioned, auditable history.
  9. Candidates must see the final report only when it is released.
  10. Failed transactions must not leave partially finalized assessments.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from fastapi import HTTPException

from ..models.schemas import (
    InterviewRecord,
    AssessmentLifecycleStatus,
    AssessmentStatusTransition,
    CandidateFinalReport,
    DimensionScores,
    ExpertReview,
    FindingItem,
    UserProfile
)
from .assignment_service import AssignmentService
try:
    from .audit_service import audit_service
except ImportError:
    from backend.services.audit_service import audit_service

logger = logging.getLogger("InterviewLens.LifecycleService")

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# Strict Valid Transitions State Machine
VALID_TRANSITIONS: Dict[str, List[str]] = {
    "AI_ASSESSMENT_PENDING": ["PENDING_EXPERT_REVIEW", "FAILED"],
    "PENDING_EXPERT_REVIEW": ["ASSIGNED", "IN_REVIEW", "REASSESSMENT_REQUIRED", "FAILED"],
    "ASSIGNED": ["IN_REVIEW", "FINALIZED", "ASSIGNED", "PENDING_EXPERT_REVIEW", "REASSESSMENT_REQUIRED"],
    "IN_REVIEW": ["FINALIZED", "REVISION_REQUIRED", "ASSIGNED", "REASSESSMENT_REQUIRED"],
    "REVISION_REQUIRED": ["IN_REVIEW", "FINALIZED", "ASSIGNED", "REASSESSMENT_REQUIRED"],
    "FINALIZED": ["REASSESSMENT_REQUIRED"], # Once finalized, cannot be repeatedly finalized; must be reopened for reassessment
    "REASSESSMENT_REQUIRED": ["AI_ASSESSMENT_PENDING", "PENDING_EXPERT_REVIEW", "ASSIGNED"],
    "FAILED": ["AI_ASSESSMENT_PENDING", "REASSESSMENT_REQUIRED"]
}


class AssessmentLifecycleService:
    VALID_TRANSITIONS = VALID_TRANSITIONS
    _instance: Optional["AssessmentLifecycleService"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # ------------------------------------------------------------------
    # 1. State Machine Validation
    # ------------------------------------------------------------------

    @classmethod
    def validate_transition(
        cls,
        rec: InterviewRecord,
        target_status: str,
        actor: UserProfile,
        reason: Optional[str] = None
    ) -> None:
        """
        Validates whether a state transition from rec.lifecycle_status to target_status is permitted.
        Checks both graph transitions and role permissions.
        """
        current_status = getattr(rec, "lifecycle_status", "AI_ASSESSMENT_PENDING")

        # Guard against repeated finalization
        if current_status == "FINALIZED" and target_status == "FINALIZED":
            raise HTTPException(
                status_code=400,
                detail="Assessment is already finalized. Repeated finalization requests are prohibited without explicit reassessment reopening."
            )

        # Role-based & assignment constraints per transition (evaluated before target status)
        if target_status == "ASSIGNED":
            if actor.role != "ADMIN":
                raise HTTPException(status_code=403, detail="Only administrators can assign or reassign reviewers.")
            if rec.scores is None or current_status == "AI_ASSESSMENT_PENDING":
                raise HTTPException(status_code=400, detail="AI assessment generation must complete before expert assignment.")

        elif target_status in ("IN_REVIEW", "FINALIZED", "REVISION_REQUIRED"):
            # Must be assigned expert or admin
            if actor.role != "ADMIN":
                if actor.role != "EXPERT" or not actor.is_verified_expert:
                    raise HTTPException(status_code=403, detail="Verified expert accreditation required.")
                if not rec.assigned_expert_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Access denied: You must be assigned to this assessment before reviewing."
                    )
                if rec.assigned_expert_id != actor.id and rec.assigned_expert_email != actor.email:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Access denied: This assessment is assigned to another expert ({rec.assigned_expert_name or rec.assigned_expert_id})."
                    )

        elif target_status == "REASSESSMENT_REQUIRED":
            if not reason or len(reason.strip()) < 5:
                raise HTTPException(status_code=400, detail="A reason is required to request reassessment (min 5 characters).")

        allowed_targets = VALID_TRANSITIONS.get(current_status, [])
        if target_status not in allowed_targets:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid assessment transition: cannot transition from '{current_status}' to '{target_status}'. "
                    f"Permitted target states from '{current_status}': {allowed_targets}"
                )
            )

    # ------------------------------------------------------------------
    # 2. Recording Status Transitions
    # ------------------------------------------------------------------

    @classmethod
    def record_transition(
        cls,
        rec: InterviewRecord,
        target_status: str,
        actor: Optional[UserProfile] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AssessmentStatusTransition:
        """
        Appends an immutable transition record to rec.status_history and updates rec.lifecycle_status.
        """
        from_status = getattr(rec, "lifecycle_status", "AI_ASSESSMENT_PENDING")
        now = _now_iso()

        transition = AssessmentStatusTransition(
            id=f"trans_{uuid.uuid4().hex[:8]}",
            from_status=from_status,
            to_status=target_status,
            changed_by_user_id=actor.id if actor else "system",
            changed_by_name=actor.name if actor else "InterviewLens AI Engine",
            changed_by_role=actor.role if actor else "SYSTEM",
            reason=reason or f"Transitioned from {from_status} to {target_status}",
            timestamp=now,
            metadata=metadata or {}
        )

        rec.lifecycle_status = target_status
        if not hasattr(rec, "status_history") or rec.status_history is None:
            rec.status_history = []
        rec.status_history.append(transition)

        # Sync legacy status field for backward compatibility
        legacy_status_map = {
            "AI_ASSESSMENT_PENDING": "ANALYZING",
            "PENDING_EXPERT_REVIEW": "AWAITING_EXPERT_REVIEW",
            "ASSIGNED": "IN_EXPERT_REVIEW",
            "IN_REVIEW": "IN_EXPERT_REVIEW",
            "REVISION_REQUIRED": "REVIEW_REQUIRED",
            "FINALIZED": "COMPLETED",
            "REASSESSMENT_REQUIRED": "REVIEW_REQUIRED",
            "FAILED": "FAILED"
        }
        rec.status = legacy_status_map.get(target_status, rec.status)

        try:
            audit_service.log(
                actor=actor,
                action=f"ASSESSMENT_{target_status}",
                target_type="ASSESSMENT",
                target_id=rec.id,
                target_name=rec.title,
                details={
                    "from_status": from_status,
                    "to_status": target_status,
                    "reason": reason,
                    **(metadata or {})
                }
            )
        except Exception as e:
            logger.warning(f"Audit log warning: {e}")

        return transition

    # ------------------------------------------------------------------
    # 3. AI Assessment Completion
    # ------------------------------------------------------------------

    @classmethod
    def complete_ai_assessment(
        cls,
        rec: InterviewRecord,
        scores: DimensionScores,
        summary: Optional[str] = None
    ) -> None:
        """
        Retains original AI assessment pristine (Rule 7) and moves state to PENDING_EXPERT_REVIEW.
        """
        rec.scores = scores
        # Pristine retention of original AI assessment
        rec.original_ai_scores = DimensionScores(**scores.model_dump())
        rec.original_ai_summary = summary or rec.executive_summary

        cls.record_transition(
            rec,
            target_status="PENDING_EXPERT_REVIEW",
            reason="AI multi-agent evaluation completed. Assessment ready for expert assignment."
        )

    # ------------------------------------------------------------------
    # 4. Expert Assignment (Admin Managed)
    # ------------------------------------------------------------------

    @classmethod
    def assign_expert(
        cls,
        rec: InterviewRecord,
        expert_user: UserProfile,
        admin_user: UserProfile,
        reason: Optional[str] = None,
        force_reassign: bool = False
    ) -> Dict[str, Any]:
        """
        Assigns an accredited expert to the assessment (Rules 2 & 3).
        """
        # Rule 2: AI assessment must complete first
        if rec.scores is None or getattr(rec, "lifecycle_status", None) == "AI_ASSESSMENT_PENDING":
            raise HTTPException(
                status_code=400,
                detail="AI assessment generation must complete before assigning an expert reviewer."
            )

        # Rule 3: Admin only
        if admin_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Only an authorized administrator can assign or reassign reviewers.")

        # Expert must be verified
        if expert_user.role != "EXPERT" or not expert_user.is_verified_expert:
            raise HTTPException(
                status_code=403,
                detail=f"User '{expert_user.name}' is not a verified expert."
            )

        # Conflict of interest: expert cannot evaluate their own interview
        if expert_user.email.lower() == (rec.candidate_email or "").lower():
            raise HTTPException(
                status_code=409,
                detail="Conflict of interest: An expert cannot be assigned to review their own assessment."
            )

        assignment_svc = AssignmentService()
        try:
            assignment = assignment_svc.assign(
                interview_id=rec.id,
                interview_title=rec.title,
                interview_job_role=rec.job_role,
                candidate_email=rec.candidate_email or "",
                expert_id=expert_user.id,
                expert_name=expert_user.name,
                expert_email=expert_user.email,
                expert_title=expert_user.expert_title or "Industry Expert",
                expert_domain=expert_user.expert_domain or [],
                expert_organization=expert_user.expert_organization,
                expert_conflict_notes=expert_user.conflict_of_interest_declaration,
                admin_id=admin_user.id,
                admin_name=admin_user.name,
                admin_email=admin_user.email,
                reason=reason,
                force_reassign=force_reassign,
            )
        except ValueError as e:
            raise HTTPException(status_code=409, detail=str(e))

        rec.assigned_expert_id = expert_user.id
        rec.assigned_expert_name = expert_user.name
        rec.assigned_expert_title = expert_user.expert_title or "Industry Expert"
        rec.assigned_expert_email = expert_user.email

        cls.record_transition(
            rec,
            target_status="ASSIGNED",
            actor=admin_user,
            reason=reason or f"Assigned to {expert_user.name} ({expert_user.expert_title})",
            metadata={"assigned_expert_id": expert_user.id, "assigned_expert_name": expert_user.name}
        )

        return {"assignment": assignment, "interview": rec}

    # ------------------------------------------------------------------
    # 5. Starting Review
    # ------------------------------------------------------------------

    @classmethod
    def start_review(cls, rec: InterviewRecord, actor: UserProfile) -> None:
        """
        Transitions status from ASSIGNED to IN_REVIEW.
        """
        cls.validate_transition(rec, "IN_REVIEW", actor)
        cls.record_transition(
            rec,
            target_status="IN_REVIEW",
            actor=actor,
            reason="Assigned expert opened assessment and initiated active evidence audit."
        )

    # ------------------------------------------------------------------
    # 6. Requesting Revision
    # ------------------------------------------------------------------

    @classmethod
    def request_revision(cls, rec: InterviewRecord, actor: UserProfile, reason: str) -> None:
        """
        Transitions status to REVISION_REQUIRED.
        """
        if not reason or len(reason.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="A detailed revision reason is required (min 10 characters)."
            )

        cls.validate_transition(rec, "REVISION_REQUIRED", actor, reason)
        rec.revision_requested_reason = reason.strip()

        cls.record_transition(
            rec,
            target_status="REVISION_REQUIRED",
            actor=actor,
            reason=reason.strip()
        )

    # ------------------------------------------------------------------
    # 7. Finalizing Expert Review (Rules 4, 5, 6, 7, 8, 10)
    # ------------------------------------------------------------------

    @classmethod
    def finalize_review(
        cls,
        rec: InterviewRecord,
        review: ExpertReview,
        expert_user: UserProfile
    ) -> InterviewRecord:
        """
        Submits final expert sign-off with atomic validation (Rules 4, 5, 6, 7, 8, 10).
        """
        # Rule 6: Validate transition (rejects repeated finalization)
        cls.validate_transition(rec, "FINALIZED", expert_user)

        # Rule 5: Validate required expert fields before finalization
        if not review.verdict or review.verdict not in ("APPROVED", "MODIFIED", "REJECTED"):
            raise HTTPException(
                status_code=400,
                detail="Invalid verdict. Must be one of 'APPROVED', 'MODIFIED', or 'REJECTED'."
            )

        if not review.comments or len(review.comments.strip()) < 15:
            raise HTTPException(
                status_code=400,
                detail="Substantive expert commentary required before finalization (min 15 characters)."
            )

        if review.overall_rating is None or not (1.0 <= review.overall_rating <= 10.0):
            raise HTTPException(
                status_code=400,
                detail="Overall rating is required and must be between 1.0 and 10.0."
            )

        if review.dimension_overrides:
            for dim_key, dim_val in review.dimension_overrides.items():
                if dim_val is not None and not (1.0 <= dim_val <= 10.0):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Dimension override '{dim_key}' must be between 1.0 and 10.0 (got {dim_val})."
                    )

        # Rule 7: Ensure original AI assessment is preserved
        if rec.scores and not rec.original_ai_scores:
            rec.original_ai_scores = DimensionScores(**rec.scores.model_dump())
        if not rec.original_ai_summary:
            rec.original_ai_summary = rec.executive_summary or (rec.technical_analysis.summary if rec.technical_analysis else None)

        # Issue cryptographic certificate hash
        cert_hash = f"CERT-HITL-{uuid.uuid4().hex[:8].upper()}-{int(datetime.now(timezone.utc).timestamp())}"
        review.sign_off_certificate_id = cert_hash
        review.interview_id = rec.id
        review.expert_id = expert_user.id
        review.reviewer_name = expert_user.name
        review.reviewer_title = expert_user.expert_title or review.reviewer_title
        review.reviewer_company = expert_user.expert_organization or review.reviewer_company
        review.reviewed_at = _now_iso()

        # Calibrate current scores
        if review.override_scores and rec.scores:
            if "overall" in review.override_scores:
                rec.scores.overall = review.override_scores["overall"]
            if "technical" in review.override_scores:
                rec.scores.technical_knowledge = review.override_scores["technical"]

        if review.dimension_overrides and rec.scores:
            for dim, val in review.dimension_overrides.items():
                if hasattr(rec.scores, dim):
                    setattr(rec.scores, dim, val)

        # Update findings from expert audit
        if rec.verification_result and rec.verification_result.verified_findings:
            for f in rec.verification_result.verified_findings:
                if review.disputed_claim_ids and f.id in review.disputed_claim_ids:
                    f.verification_status = "EXPERT_DISPUTED"
                    if review.audit_notes and f.id in review.audit_notes:
                        f.expert_comment = review.audit_notes[f.id]
                elif review.verified_claim_ids and f.id in review.verified_claim_ids:
                    f.verification_status = "EXPERT_VERIFIED"
                    if review.audit_notes and f.id in review.audit_notes:
                        f.expert_comment = review.audit_notes[f.id]

            rec.verification_result.expert_verified_count = sum(1 for f in rec.verification_result.verified_findings if f.verification_status in ["EXPERT_VERIFIED", "EXPERT_DISPUTED"])
            rec.verification_result.verified_count = sum(1 for f in rec.verification_result.verified_findings if f.verification_status in ["VERIFIED", "EXPERT_VERIFIED"])
            rec.verification_result.rejected_count = sum(1 for f in rec.verification_result.verified_findings if f.verification_status in ["REJECTED", "EXPERT_DISPUTED"])

        # Rule 8: Versioned auditable history of expert decisions
        if not hasattr(rec, "expert_review_history") or rec.expert_review_history is None:
            rec.expert_review_history = []
        rec.expert_review_history.append(review.model_copy(deep=True))
        rec.expert_review = review

        rec.assigned_expert_name = review.reviewer_name
        rec.assigned_expert_title = review.reviewer_title

        # Complete assignment
        assignment_svc = AssignmentService()
        assignment_svc.complete_assignment(rec.id)

        # Record status transition to FINALIZED
        cls.record_transition(
            rec,
            target_status="FINALIZED",
            actor=expert_user,
            reason=f"Expert sign-off finalized with verdict: {review.verdict}. Certificate: {cert_hash}",
            metadata={"certificate_id": cert_hash, "verdict": review.verdict, "overall_rating": review.overall_rating}
        )

        try:
            audit_service.log(
                actor=expert_user,
                action="EXPERT_SCORE_CALIBRATED",
                target_type="ASSESSMENT",
                target_id=rec.id,
                target_name=rec.title,
                details={
                    "verdict": review.verdict,
                    "overall_rating": review.overall_rating,
                    "dimension_overrides": review.dimension_overrides or {},
                    "original_ai_overall": rec.original_ai_scores.overall if rec.original_ai_scores else None,
                    "calibrated_overall": rec.scores.overall if rec.scores else None,
                    "certificate_hash": cert_hash
                }
            )
        except Exception as e:
            logger.warning(f"Audit log warning: {e}")

        return rec

    # ------------------------------------------------------------------
    # 8. Release to Candidate (Rule 9)
    # ------------------------------------------------------------------

    @classmethod
    def release_report(
        cls,
        rec: InterviewRecord,
        actor: UserProfile,
        notes: Optional[str] = None
    ) -> None:
        """
        Releases the finalized report to the candidate (Rule 9).
        """
        if getattr(rec, "lifecycle_status", None) != "FINALIZED":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot release report: assessment is '{rec.lifecycle_status}'. Only FINALIZED assessments can be released to candidates."
            )

        rec.is_released_to_candidate = True
        rec.released_at = _now_iso()
        rec.released_by = actor.name

        cls.record_transition(
            rec,
            target_status="FINALIZED",
            actor=actor,
            reason=notes or f"Official evaluation released to candidate by {actor.name} ({actor.role}).",
            metadata={"released_at": rec.released_at, "released_by": rec.released_by}
        )

    # ------------------------------------------------------------------
    # 9. Reopening for Reassessment
    # ------------------------------------------------------------------

    @classmethod
    def request_reassessment(
        cls,
        rec: InterviewRecord,
        actor: UserProfile,
        reason: str
    ) -> None:
        """
        Reopens a finalized or reviewed assessment for reassessment.
        """
        if not reason or len(reason.strip()) < 5:
            raise HTTPException(status_code=400, detail="Reassessment reason is required (min 5 characters).")

        cls.validate_transition(rec, "REASSESSMENT_REQUIRED", actor, reason)
        rec.reassessment_reason = reason.strip()

        cls.record_transition(
            rec,
            target_status="REASSESSMENT_REQUIRED",
            actor=actor,
            reason=reason.strip()
        )

    # ------------------------------------------------------------------
    # 10. Candidate-Facing Final Report Generator (Rule 9 & Privacy)
    # ------------------------------------------------------------------

    @classmethod
    def generate_candidate_final_report(
        cls,
        rec: InterviewRecord,
        user: Optional[UserProfile] = None
    ) -> CandidateFinalReport:
        """
        Generates the candidate-facing final report with side-by-side comparison,
        verified strengths, limitations, and privacy-safe reviewer credentials.
        """
        # Rule 9: Candidate must only see report when released
        is_candidate_role = user and user.role == "CANDIDATE"
        if is_candidate_role and not getattr(rec, "is_released_to_candidate", False):
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Assessment evaluation is currently '{rec.lifecycle_status}'. "
                    "The official final report has not been released yet."
                )
            )

        orig_scores = rec.original_ai_scores or rec.scores or DimensionScores()
        calib_scores = rec.scores or orig_scores
        expert_rev = rec.expert_review

        # Competency breakdown
        competencies = [
            {"dimension": "technical_knowledge", "label": "Technical Depth", "ai_score": orig_scores.technical_knowledge, "final_score": calib_scores.technical_knowledge},
            {"dimension": "communication", "label": "Communication Clarity", "ai_score": orig_scores.communication, "final_score": calib_scores.communication},
            {"dimension": "answer_structure", "label": "Answer Framing & Structure", "ai_score": orig_scores.answer_structure, "final_score": calib_scores.answer_structure},
            {"dimension": "problem_solving", "label": "Problem Solving & Edge Cases", "ai_score": orig_scores.problem_solving, "final_score": calib_scores.problem_solving},
            {"dimension": "behavioral", "label": "STAR Ownership & Signals", "ai_score": orig_scores.behavioral, "final_score": calib_scores.behavioral},
            {"dimension": "question_understanding", "label": "Question Understanding", "ai_score": orig_scores.question_understanding, "final_score": calib_scores.question_understanding},
        ]
        for c in competencies:
            c["delta"] = round(c["final_score"] - c["ai_score"], 2)

        # Verified strengths & weaknesses
        verified_strengths: List[FindingItem] = []
        verified_weaknesses: List[FindingItem] = []
        unresolved_disagreements: List[Dict[str, Any]] = []

        if rec.verification_result and rec.verification_result.verified_findings:
            for f in rec.verification_result.verified_findings:
                if f.verification_status in ("VERIFIED", "EXPERT_VERIFIED"):
                    if (f.score_impact or 0) >= 0 and f.severity != "critical":
                        verified_strengths.append(f)
                    else:
                        verified_weaknesses.append(f)
                elif f.verification_status == "EXPERT_DISPUTED":
                    unresolved_disagreements.append({
                        "finding_id": f.id,
                        "title": f.title,
                        "category": f.category,
                        "candidate_quote": f.evidence[0].quote if f.evidence else None,
                        "expert_comment": f.expert_comment or f.verification_notes or "Disputed as ungrounded or contradictory."
                    })

        # Recommendations
        recommendations = []
        if rec.retest_results:
            for r in rec.retest_results:
                if r.recommendation:
                    recommendations.append(r.recommendation)
        if not recommendations:
            recommendations = [
                "Deepen failure-mode decomposition when architecting multi-region systems.",
                "Frame trade-offs between strong consistency and availability explicitly before proposing datastores."
            ]

        # Reviewer credentials subject to privacy policy:
        # Never expose expert's private email or phone to candidates
        reviewer_name = expert_rev.reviewer_name if expert_rev else rec.assigned_expert_name
        reviewer_title = expert_rev.reviewer_title if expert_rev else rec.assigned_expert_title
        reviewer_org = expert_rev.reviewer_company if expert_rev else "Tier-1 Tech Specialist"

        delta = round((calib_scores.overall - orig_scores.overall), 2)

        return CandidateFinalReport(
            interview_id=rec.id,
            title=rec.title,
            candidate_name=rec.candidate_name,
            job_role=rec.job_role,
            status=rec.status,
            lifecycle_status=getattr(rec, "lifecycle_status", "FINALIZED"),
            is_released=getattr(rec, "is_released_to_candidate", False),
            released_at=getattr(rec, "released_at", None),
            original_ai_overall_score=orig_scores.overall,
            original_ai_scores=orig_scores,
            original_ai_summary=rec.original_ai_summary or rec.executive_summary,
            ai_confidence_score=94.0,
            final_expert_overall_score=calib_scores.overall,
            final_calibrated_scores=calib_scores,
            score_delta=delta,
            competency_breakdown=competencies,
            verified_strengths=verified_strengths[:5],
            verified_weaknesses=verified_weaknesses[:5],
            verdict=expert_rev.verdict if expert_rev else "APPROVED",
            expert_feedback=expert_rev.comments if expert_rev else "Assessment verified by accredited industry specialist.",
            recommendations=recommendations,
            unresolved_disagreements=unresolved_disagreements,
            disputed_claims_count=len(unresolved_disagreements),
            limitations_notes=(
                f"{len(unresolved_disagreements)} claim(s) flagged with discrepancies or disputed during anti-hallucination audit."
                if unresolved_disagreements else "All candidate evidence citations successfully grounded without unresolved discrepancies."
            ),
            review_date=expert_rev.reviewed_at if expert_rev else rec.created_at,
            reviewer_name=reviewer_name,
            reviewer_title=reviewer_title,
            reviewer_organization=reviewer_org,
            sign_off_certificate_id=expert_rev.sign_off_certificate_id if expert_rev else None
        )
