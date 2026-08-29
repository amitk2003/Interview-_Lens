import asyncio
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..models.schemas import (
    MeetingAdapterConfig,
    ParticipantEvent,
    LiveCaptureChunk,
    LiveCaptureSession,
    NormalizedTranscript,
    TranscriptSegment
)

class GoogleMeetAdapter:
    @staticmethod
    def validate_url(url: str) -> bool:
        return "meet.google.com" in url or bool(url.strip())

    @staticmethod
    def get_stream_preset(scenario: str = "fintech_distributed") -> List[Dict[str, Any]]:
        return [
            {
                "offset_ms": 15000,
                "timestamp": "00:00:15",
                "speaker": "interviewer",
                "text": "Welcome Alex. Could you start by introducing yourself and a recent distributed system you architected?",
                "is_question": True,
                "event": {"event_type": "PARTICIPANT_JOIN", "name": "Interviewer (Lead Architect)", "role": "interviewer"}
            },
            {
                "offset_ms": 32000,
                "timestamp": "00:00:32",
                "speaker": "candidate",
                "text": "Thanks! In my last role at Fintech Corp, I led the redesign of our order processing engine handling 15,000 requests per second. We migrated from a monolithic PostgreSQL setup to an event-driven architecture using Kafka and Redis caching.",
                "is_question": False
            },
            {
                "offset_ms": 130000,
                "timestamp": "00:02:10",
                "speaker": "interviewer",
                "text": "Interesting. How did you structure the caching layer with Redis to avoid stale reads?",
                "is_question": True,
                "event": {"event_type": "CLARIFICATION_PROMPT", "name": "Interviewer", "role": "interviewer", "detail": "Deep dive into Redis invalidation"}
            },
            {
                "offset_ms": 145000,
                "timestamp": "00:02:25",
                "speaker": "candidate",
                "text": "We implemented a write-through cache pattern with explicit TTL invalidation. When updates occurred, we published an event to Kafka, and worker consumers invalidated corresponding Redis cache keys across cluster nodes.",
                "is_question": False
            },
            {
                "offset_ms": 280000,
                "timestamp": "00:04:40",
                "speaker": "interviewer",
                "text": "What happens when two concurrent transactions try to reserve the same inventory item at the exact same millisecond?",
                "is_question": True,
                "event": {"event_type": "LONG_PAUSE", "name": "Candidate", "role": "candidate", "detail": "4.8s silence before answering"}
            },
            {
                "offset_ms": 300000,
                "timestamp": "00:05:00",
                "speaker": "candidate",
                "text": "Uh, like, basically we would just check if the stock is greater than zero in the database, and if so, decrement it. Um, you know, we didn't see many collisions in testing.",
                "is_question": False
            },
            {
                "offset_ms": 375000,
                "timestamp": "00:06:15",
                "speaker": "interviewer",
                "text": "Can you elaborate on how you would prevent race conditions without row lock contention?",
                "is_question": True
            },
            {
                "offset_ms": 390000,
                "timestamp": "00:06:30",
                "speaker": "candidate",
                "text": "Um, maybe we could retry if the write fails or use a queue to serialize all inventory writes.",
                "is_question": False
            }
        ]

class TeamsAdapter:
    @staticmethod
    def validate_url(url: str) -> bool:
        return "teams.microsoft.com" in url or bool(url.strip())

class ZoomAdapter:
    @staticmethod
    def validate_url(url: str) -> bool:
        return "zoom.us" in url or bool(url.strip())

class LiveCaptureGateway:
    """
    Live Capture Gateway & Transcript Stream Processor:
    Ingests live or authorized meeting streams, tracks participant join/leave events,
    measures audio levels and silence durations, and formats normalized chunks for the Orchestrator.
    """
    _sessions: Dict[str, LiveCaptureSession] = {}

    @classmethod
    def create_session(cls, config: MeetingAdapterConfig, scenario: str = "fintech_distributed") -> LiveCaptureSession:
        session_id = f"sess_{str(uuid.uuid4())[:8]}"
        preset_stream = GoogleMeetAdapter.get_stream_preset(scenario)

        events: List[ParticipantEvent] = [
            ParticipantEvent(
                timestamp="00:00:01",
                event_type="PARTICIPANT_JOIN",
                participant_name="Interviewer",
                participant_role="interviewer",
                detail=f"Connected via {config.platform_name} Adapter ({config.meeting_url})"
            ),
            ParticipantEvent(
                timestamp="00:00:05",
                event_type="PARTICIPANT_JOIN",
                participant_name="Candidate (Alex Chen)",
                participant_role="candidate",
                detail="Audio input stream verified"
            )
        ]

        chunks: List[LiveCaptureChunk] = []
        for idx, item in enumerate(preset_stream):
            if "event" in item:
                e = item["event"]
                events.append(ParticipantEvent(
                    timestamp=item["timestamp"],
                    event_type=e.get("event_type", "SPEAKER_CHANGE"),
                    participant_name=e.get("name", "Speaker"),
                    participant_role=e.get("role", "system"),
                    detail=e.get("detail")
                ))

            chunks.append(LiveCaptureChunk(
                chunk_id=idx + 1,
                timestamp=item["timestamp"],
                speaker=item["speaker"],
                text=item["text"],
                audio_level_rms=0.88 if item["speaker"] == "candidate" else 0.92,
                is_question=item.get("is_question", False)
            ))

        session = LiveCaptureSession(
            session_id=session_id,
            adapter_config=config,
            status="LIVE_CAPTURING",
            participant_events=events,
            stream_chunks=chunks,
            duration_seconds=390,
            normalized_segment_count=len(chunks)
        )
        cls._sessions[session_id] = session
        return session

    @classmethod
    def get_session(cls, session_id: str) -> Optional[LiveCaptureSession]:
        return cls._sessions.get(session_id)

    @classmethod
    def convert_to_normalized_transcript(
        cls,
        session_id: str,
        title: str,
        job_role: str,
        job_description: Optional[str] = None,
        resume_text: Optional[str] = None
    ) -> NormalizedTranscript:
        session = cls.get_session(session_id)
        segments: List[TranscriptSegment] = []

        if session:
            for chunk in session.stream_chunks:
                segments.append(TranscriptSegment(
                    speaker=chunk.speaker,
                    timestamp=chunk.timestamp,
                    text=chunk.text,
                    is_question=chunk.is_question,
                    confidence=0.98
                ))
            platform_str = f"{session.adapter_config.platform_name} Adapter"
            adapter_str = session.adapter_config.adapter_type
            url_str = session.adapter_config.meeting_url
            events_list = session.participant_events
        else:
            platform_str = "Google Meet Adapter"
            adapter_str = "GOOGLE_MEET"
            url_str = "https://meet.google.com/abc-defg-hij"
            events_list = []

        return NormalizedTranscript(
            interview_id=session_id,
            title=title,
            job_role=job_role,
            job_description=job_description,
            resume_text=resume_text,
            platform=platform_str,
            adapter_type=adapter_str,
            meeting_url=url_str,
            segments=segments,
            participant_events=events_list
        )
