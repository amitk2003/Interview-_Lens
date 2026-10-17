from typing import List, Dict, Any
from ..models.schemas import (
    InterviewRecord,
    CrossInterviewInsights,
    CrossInterviewPattern
)

class CrossInterviewAgent:
    """
    Analyzes longitudinal interview memory across multiple sessions.
    Identifies recurring weaknesses, improving areas, and generates targeted preparation roadmaps.
    """
    @staticmethod
    def analyze_history(interviews: List[InterviewRecord]) -> CrossInterviewInsights:
        if not interviews:
            return CrossInterviewInsights(
                total_interviews_analyzed=0,
                average_score_trend=[],
                recurring_weaknesses=[],
                top_strengths=[],
                dimension_progression={},
                actionable_prep_roadmap=[]
            )

        # Sort chronological
        sorted_interviews = sorted(interviews, key=lambda x: x.created_at)
        total = len(sorted_interviews)

        # Trends
        score_trend = []
        dim_progress: Dict[str, List[float]] = {
            "Technical Knowledge": [],
            "Communication": [],
            "Behavioral / STAR": [],
            "Overall": []
        }

        weakness_counts: Dict[str, List[str]] = {}
        strength_counts: Dict[str, List[str]] = {}

        for item in sorted_interviews:
            scores = item.scores
            if scores:
                score_trend.append({
                    "date": item.created_at[:10],
                    "title": item.title,
                    "overall": scores.overall,
                    "technical": scores.technical_knowledge,
                    "communication": scores.communication,
                    "behavioral": scores.behavioral
                })
                dim_progress["Technical Knowledge"].append(scores.technical_knowledge)
                dim_progress["Communication"].append(scores.communication)
                dim_progress["Behavioral / STAR"].append(scores.behavioral)
                dim_progress["Overall"].append(scores.overall)

            # Gather weaknesses
            if item.technical_analysis:
                for w in item.technical_analysis.weaknesses:
                    weakness_counts.setdefault(w.category, []).append(item.id)
                for s in item.technical_analysis.strengths:
                    strength_counts.setdefault(s.category, []).append(item.id)

            if item.communication_analysis:
                for f in item.communication_analysis.findings:
                    if f.severity in ["needs_improvement", "critical"]:
                        weakness_counts.setdefault(f.category, []).append(item.id)
                    else:
                        strength_counts.setdefault(f.category, []).append(item.id)

            if item.behavioral_analysis:
                for f in item.behavioral_analysis.findings:
                    if f.severity in ["needs_improvement", "critical"]:
                        weakness_counts.setdefault(f.category, []).append(item.id)

        # Build recurring patterns
        recurring_weaknesses: List[CrossInterviewPattern] = []
        for cat, int_ids in sorted(weakness_counts.items(), key=lambda x: len(x[1]), reverse=True):
            trend_str = "worsening" if len(int_ids) > 1 and int_ids[-1] == sorted_interviews[-1].id else "recurring"
            drill = f"Targeted drill: Complete 3 mock scenarios focusing on {cat} under timed 5-minute constraints."
            recurring_weaknesses.append(CrossInterviewPattern(
                pattern_type="RECURRING_WEAKNESS",
                category=cat,
                title=f"Repeated difficulty in {cat}",
                description=f"Appeared in {len(int_ids)} of {total} interviews. Noticeable struggle under rapid follow-up probing.",
                occurrence_count=len(int_ids),
                affected_interview_ids=int_ids,
                trend=trend_str,
                suggested_drill=drill
            ))

        top_strengths: List[CrossInterviewPattern] = []
        for cat, int_ids in sorted(strength_counts.items(), key=lambda x: len(x[1]), reverse=True):
            top_strengths.append(CrossInterviewPattern(
                pattern_type="CONSISTENT_STRENGTH",
                category=cat,
                title=f"Consistent strength in {cat}",
                description=f"Demonstrated high proficiency in {len(int_ids)} interviews.",
                occurrence_count=len(int_ids),
                affected_interview_ids=int_ids,
                trend="improving",
                suggested_drill="Maintain mastery with advanced architecture problem design."
            ))

        # Prep roadmap
        roadmap = []
        if recurring_weaknesses:
            top_w = recurring_weaknesses[0]
            roadmap.append(f"Priority 1: Re-study and practice {top_w.category} (appeared in {top_w.occurrence_count} sessions).")
        roadmap.append("Priority 2: Structure every behavioral answer with quantifiable metrics (e.g. 30% reduction, $50k saved).")
        roadmap.append("Priority 3: Conduct knowledge-gap re-tests within 2 hours of interview completion to solidify memory retention.")

        return CrossInterviewInsights(
            total_interviews_analyzed=total,
            average_score_trend=score_trend,
            recurring_weaknesses=recurring_weaknesses[:5],
            top_strengths=top_strengths[:5],
            dimension_progression=dim_progress,
            actionable_prep_roadmap=roadmap
        )
