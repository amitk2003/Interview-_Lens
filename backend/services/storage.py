import json
import os
import logging
from typing import Dict, List, Optional
from ..models.schemas import (
    InterviewRecord,
    ExpertReview,
    ReTestEvaluation,
    NormalizedTranscript,
    TranscriptSegment,
    DimensionScores,
    TechnicalAnalysisResult,
    CommunicationAnalysisResult,
    BehavioralAnalysisResult,
    VerificationResult,
    FindingItem,
    EvidenceCitation,
    ReTestQuestion
)
from .mongodb import mongo_manager

logger = logging.getLogger("InterviewLens.Storage")
STORAGE_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "interviews_store.json")

class InterviewStorage:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InterviewStorage, cls).__new__(cls)
            cls._instance.interviews: Dict[str, InterviewRecord] = {}
            cls._instance._init_default_data()
        return cls._instance

    def _init_default_data(self):
        os.makedirs(os.path.dirname(STORAGE_FILE), exist_ok=True)
        
        # 1. Try loading from MongoDB if connected
        if mongo_manager.is_connected:
            col = mongo_manager.get_collection("interviews")
            if col is not None:
                docs = list(col.find({}, {"_id": 0}))
                if docs:
                    for item in docs:
                        try:
                            rec = InterviewRecord(**item)
                            self.interviews[rec.id] = rec
                        except Exception as e:
                            logger.error(f"Error parsing mongo record: {e}")
                    return

        # 2. Try loading from disk storage
        if os.path.exists(STORAGE_FILE):
            try:
                with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    for item in raw:
                        rec = InterviewRecord(**item)
                        self.interviews[rec.id] = rec
                
                # Sync into MongoDB if MongoDB was empty
                if mongo_manager.is_connected:
                    col = mongo_manager.get_collection("interviews")
                    if col is not None:
                        for rec in self.interviews.values():
                            col.update_one({"id": rec.id}, {"$set": rec.model_dump()}, upsert=True)
                return
            except Exception:
                pass

        # Seed benchmark interview 1: Senior Distributed Systems Engineer
        int_1 = self._create_seed_interview_1()
        self.interviews[int_1.id] = int_1

        # Seed benchmark interview 2: Full-Stack React & Node Engineer
        int_2 = self._create_seed_interview_2()
        self.interviews[int_2.id] = int_2

        # Seed benchmark interview 3: Senior Backend Architect
        int_3 = self._create_seed_interview_3()
        self.interviews[int_3.id] = int_3

        self.save_to_disk()

        if mongo_manager.is_connected:
            col = mongo_manager.get_collection("interviews")
            if col is not None:
                for rec in self.interviews.values():
                    col.update_one({"id": rec.id}, {"$set": rec.model_dump()}, upsert=True)

    def get_all(self, user_email: Optional[str] = None, include_unclaimed: bool = False) -> List[InterviewRecord]:
        if mongo_manager.is_connected:
            col = mongo_manager.get_collection("interviews")
            if col is not None:
                query = {}
                if user_email:
                    conditions = [{"user_email": user_email}, {"candidate_email": user_email}]
                    if include_unclaimed:
                        # Also include interviews with no owner (created before sign-in)
                        conditions.append({"user_email": None})
                        conditions.append({"user_email": ""})
                        conditions.append({"user_email": {"$exists": False}})
                    query = {"$or": conditions}
                docs = list(col.find(query, {"_id": 0}).sort("created_at", -1))
                return [InterviewRecord(**d) for d in docs]
        
        all_recs = sorted(list(self.interviews.values()), key=lambda x: x.created_at, reverse=True)
        if user_email:
            result = []
            for r in all_recs:
                if r.user_email == user_email or r.candidate_email == user_email:
                    result.append(r)
                elif include_unclaimed and (not r.user_email or r.user_email == ""):
                    result.append(r)
            return result
        return all_recs

    def claim_unclaimed_interviews(self, user_email: str, user_name: Optional[str] = None):
        """Assign all interviews with no user_email to the given user (created before sign-in)."""
        claimed_count = 0

        # Claim in MongoDB
        if mongo_manager.is_connected:
            col = mongo_manager.get_collection("interviews")
            if col is not None:
                update_fields = {"user_email": user_email, "candidate_email": user_email}
                if user_name:
                    update_fields["candidate_name"] = user_name
                result = col.update_many(
                    {"$or": [{"user_email": None}, {"user_email": ""}, {"user_email": {"$exists": False}}]},
                    {"$set": update_fields}
                )
                claimed_count = result.modified_count

        # Claim in memory cache
        for rec in self.interviews.values():
            if not rec.user_email or rec.user_email == "":
                rec.user_email = user_email
                rec.candidate_email = user_email
                if user_name:
                    rec.candidate_name = user_name
                claimed_count += 1

        if claimed_count > 0:
            self.save_to_disk()
            logger.info(f"Claimed {claimed_count} unclaimed interview(s) for {user_email}")

    def get_by_id(self, interview_id: str) -> Optional[InterviewRecord]:
        if mongo_manager.is_connected:
            col = mongo_manager.get_collection("interviews")
            if col is not None:
                doc = col.find_one({"id": interview_id}, {"_id": 0})
                if doc:
                    return InterviewRecord(**doc)
        return self.interviews.get(interview_id)

    def save(self, record: InterviewRecord):
        self.interviews[record.id] = record
        if mongo_manager.is_connected:
            col = mongo_manager.get_collection("interviews")
            if col is not None:
                col.update_one({"id": record.id}, {"$set": record.model_dump()}, upsert=True)
        self.save_to_disk()

    def update_expert_review(self, interview_id: str, review: ExpertReview) -> Optional[InterviewRecord]:
        rec = self.get_by_id(interview_id)
        if rec:
            rec.expert_review = review
            rec.status = "COMPLETED"
            self.save(rec)
        return rec

    def add_retest_result(self, interview_id: str, evaluation: ReTestEvaluation) -> Optional[InterviewRecord]:
        rec = self.get_by_id(interview_id)
        if rec:
            if rec.retest_results is None:
                rec.retest_results = []
            rec.retest_results.append(evaluation)
            self.save(rec)
        return rec

    def save_to_disk(self):
        try:
            data = [rec.model_dump() for rec in self.interviews.values()]
            with open(STORAGE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    def _create_seed_interview_1(self) -> InterviewRecord:
        segments = [
            TranscriptSegment(speaker="interviewer", timestamp="00:00:15", text="Welcome Alex. Could you start by introducing yourself and a recent distributed system you architected?", is_question=True),
            TranscriptSegment(speaker="candidate", timestamp="00:00:32", text="Thanks! In my last role at Fintech Corp, I led the redesign of our order processing engine handling 15,000 requests per second. We migrated from a monolithic PostgreSQL setup to an event-driven architecture using Kafka and Redis caching."),
            TranscriptSegment(speaker="interviewer", timestamp="00:02:10", text="Interesting. How did you structure the caching layer with Redis to avoid stale reads?", is_question=True),
            TranscriptSegment(speaker="candidate", timestamp="00:02:25", text="We implemented a write-through cache pattern with explicit TTL invalidation. When updates occurred, we published an event to Kafka, and worker consumers invalidated corresponding Redis cache keys across cluster nodes."),
            TranscriptSegment(speaker="interviewer", timestamp="00:04:40", text="What happens when two concurrent transactions try to reserve the same inventory item at the exact same millisecond?", is_question=True),
            TranscriptSegment(speaker="candidate", timestamp="00:05:00", text="Uh, like, basically we would just check if the stock is greater than zero in the database, and if so, decrement it. Um, you know, we didn't see many collisions in testing."),
            TranscriptSegment(speaker="interviewer", timestamp="00:06:15", text="Can you elaborate on how you would prevent race conditions without row lock contention?", is_question=True),
            TranscriptSegment(speaker="candidate", timestamp="00:06:30", text="Um, maybe we could retry if the write fails or use a queue to serialize all inventory writes.")
        ]
        norm = NormalizedTranscript(
            interview_id="int_seed_1",
            title="Senior Distributed Systems Engineer (Fintech)",
            job_role="Senior Distributed Systems Engineer",
            job_description="Architecting high-throughput low-latency microservices with Kafka, Redis, PostgreSQL, and distributed concurrency controls.",
            resume_text="5+ years backend engineering, distributed caching, event streams.",
            platform="Google Meet Ingestion",
            segments=segments
        )
        scores = DimensionScores(
            technical_knowledge=8.2,
            communication=6.8,
            answer_structure=7.0,
            problem_solving=7.5,
            behavioral=7.8,
            question_understanding=8.0,
            overall=7.6
        )
        tech = TechnicalAnalysisResult(
            score=8.2,
            question_understanding_score=8.0,
            problem_solving_score=7.5,
            expected_concepts=["Write-through caching", "Distributed Concurrency", "Optimistic Locking", "Kafka Event Streams"],
            demonstrated_concepts=["Write-through caching with Redis", "Kafka Event-Driven Architecture"],
            missing_concepts=["Distributed Mutex / Redlock", "Optimistic Concurrency Control (OCC) with version tags"],
            strengths=[FindingItem(
                id="t_s1",
                category="Caching & Event-Driven Architecture",
                title="Strong multi-tier cache invalidation design",
                description="Accurately explained write-through Redis cache invalidation coordinated via Kafka consumers.",
                severity="positive",
                score_impact=1.4,
                evidence=[EvidenceCitation(timestamp="00:02:25", quote="We implemented a write-through cache pattern with explicit TTL invalidation.", speaker="candidate")],
                verification_status="VERIFIED",
                verification_notes="Verbatim quote verified against transcript."
            )],
            weaknesses=[FindingItem(
                id="t_w1",
                category="Distributed Concurrency & Locking",
                title="Superficial concurrency handling under race conditions",
                description="Struggled to provide robust distributed locking mechanism (e.g. OCC, Redlock, DB conditional updates) when probed on simultaneous writes.",
                severity="needs_improvement",
                score_impact=-1.5,
                evidence=[EvidenceCitation(timestamp="00:05:00", quote="basically we would just check if the stock is greater than zero in the database...", speaker="candidate")],
                verification_status="VERIFIED",
                verification_notes="Evidence grounded at [00:05:00]."
            )],
            struggled_questions=[{
                "question_id": "q_concurrency_01",
                "topic": "Distributed Concurrency & Race Condition Prevention",
                "original_question": "What happens when two concurrent transactions try to reserve the same inventory item at the exact same millisecond?",
                "interview_score": 4.5,
                "interview_evidence": "Candidate proposed read-then-write without atomic conditional checks or locks.",
                "retest_prompt": "Explain how you would implement race-condition-free inventory reservation using Optimistic Concurrency Control (OCC) or Redis Redlock.",
                "ideal_answer_points": [
                    "Conditional DB update: UPDATE inventory SET stock = stock - 1 WHERE id = 1 AND stock >= 1",
                    "Optimistic Locking with version column (OCC)",
                    "Distributed lock with Redis Redlock algorithm or ZooKeeper",
                    "Idempotency keys with serialized message queue partitioning"
                ]
            }],
            summary="Demonstrated high proficiency in caching and event streams, but had a noticeable gap on distributed race conditions."
        )
        comm = CommunicationAnalysisResult(
            score=6.8,
            structure_score=7.0,
            filler_words_detected=7,
            filler_word_breakdown={"um / uh": 4, "like": 1, "you know": 1, "basically": 1},
            long_pauses_count=1,
            clarification_requests_count=0,
            interviewer_followup_count=2,
            findings=[FindingItem(
                id="c_f1",
                category="Verbal Fluency",
                title="Clustering of filler words during concurrency question",
                description="Candidate's verbal fluency dropped notably when asked about race conditions, registering 4 filler words in a single answer.",
                severity="needs_improvement",
                score_impact=-0.7,
                evidence=[EvidenceCitation(timestamp="00:05:00", quote="Uh, like, basically we would just check if the stock is greater than zero...", speaker="candidate")],
                verification_status="VERIFIED"
            )],
            summary="Clear technical communication overall, with observable hesitation on difficult edge case questions."
        )
        behav = BehavioralAnalysisResult(
            score=7.8,
            star_coverage={"situation": 90.0, "task": 85.0, "action": 85.0, "result": 60.0},
            ownership_score=8.5,
            specificity_score=8.0,
            findings=[FindingItem(
                id="b_f1",
                category="Individual Ownership",
                title="Clear personal agency ('I led the redesign')",
                description="Candidate claimed direct responsibility for architectural migration with concrete request volume metrics (15,000 req/s).",
                severity="positive",
                score_impact=1.2,
                evidence=[EvidenceCitation(timestamp="00:00:32", quote="I led the redesign of our order processing engine handling 15,000 requests per second.", speaker="candidate")],
                verification_status="VERIFIED"
            )],
            summary="Strong ownership and clear context formulation."
        )
        veri = VerificationResult(
            total_claims_checked=3,
            verified_count=3,
            modified_count=0,
            rejected_count=0,
            verification_rate_pct=100.0,
            verified_findings=tech.strengths + tech.weaknesses + comm.findings,
            audit_trail=[
                {"finding_id": "t_s1", "title": "Strong multi-tier cache invalidation", "status": "VERIFIED", "reason": "Transcript match confirmed at 00:02:25"},
                {"finding_id": "t_w1", "title": "Superficial concurrency handling", "status": "VERIFIED", "reason": "Transcript match confirmed at 00:05:00"},
                {"finding_id": "c_f1", "title": "Clustering of filler words", "status": "VERIFIED", "reason": "Observable audio markers confirmed at 00:05:00"}
            ]
        )
        return InterviewRecord(
            id="int_seed_1",
            title="Senior Distributed Systems Engineer (Fintech)",
            candidate_name="Alex Chen",
            candidate_email="alex.chen@example.com",
            user_email="alex.chen@example.com",
            job_role="Senior Distributed Systems Engineer",
            job_description="Architecting high-throughput low-latency microservices with Kafka, Redis, PostgreSQL.",
            platform="Google Meet Ingestion",
            status="REVIEW_REQUIRED",
            normalized_transcript=norm,
            scores=scores,
            technical_analysis=tech,
            communication_analysis=comm,
            behavioral_analysis=behav,
            verification_result=veri,
            retest_questions=[ReTestQuestion(**tech.struggled_questions[0])],
            executive_summary="Candidate Alex scored 7.6/10 overall with exceptional write-through caching expertise, but exhibited a clear knowledge vs performance diagnostic point on distributed concurrency."
        )

    def _create_seed_interview_2(self) -> InterviewRecord:
        scores = DimensionScores(
            technical_knowledge=7.5,
            communication=8.4,
            answer_structure=8.2,
            problem_solving=7.2,
            behavioral=8.5,
            question_understanding=8.8,
            overall=8.0
        )
        return InterviewRecord(
            id="int_seed_2",
            title="Frontend React & Next.js Staff Engineer",
            candidate_name="Sarah Miller",
            candidate_email="candidate.demo@interviewlens.ai",
            user_email="candidate.demo@interviewlens.ai",
            job_role="Staff Frontend Engineer",
            platform="Zoom Transcript Upload",
            status="COMPLETED",
            scores=scores,
            executive_summary="Outstanding communication (8.4/10) and STAR storytelling with strong React Server Components knowledge."
        )

    def _create_seed_interview_3(self) -> InterviewRecord:
        scores = DimensionScores(
            technical_knowledge=8.9,
            communication=7.9,
            answer_structure=7.8,
            problem_solving=8.8,
            behavioral=8.0,
            question_understanding=9.0,
            overall=8.5
        )
        return InterviewRecord(
            id="int_seed_3",
            title="Principal Cloud Architect (AWS/GCP)",
            candidate_name="Alex Chen",
            candidate_email="alex.chen@example.com",
            user_email="alex.chen@example.com",
            job_role="Principal Cloud Architect",
            platform="Microsoft Teams Graph",
            status="COMPLETED",
            scores=scores,
            executive_summary="Exceptional system architecture and multi-region failover design scoring 8.5/10."
        )
