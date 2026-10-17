import re
import json
from typing import List, Dict, Any, Optional
from ..models.schemas import TranscriptSegment, NormalizedTranscript

class TranscriptNormalizer:
    """
    Normalizes diverse interview transcript formats (VTT, SRT, JSON, conversational TXT, Zoom/Teams exports)
    into a unified internal representation: [{"speaker": "...", "timestamp": "...", "text": "..."}]
    """

    @staticmethod
    def normalize(
        raw_content: str,
        title: str = "Technical Interview",
        job_role: str = "Software Engineer",
        job_description: Optional[str] = None,
        resume_text: Optional[str] = None,
        platform: Optional[str] = "Uploaded Transcript"
    ) -> NormalizedTranscript:
        raw = raw_content.strip()
        segments: List[TranscriptSegment] = []

        # 1. Try parsing as JSON first
        if (raw.startswith("{") and raw.endswith("}")) or (raw.startswith("[") and raw.endswith("]")):
            try:
                data = json.loads(raw)
                if isinstance(data, dict):
                    if "segments" in data and isinstance(data["segments"], list):
                        for item in data["segments"]:
                            segments.append(TranscriptSegment(
                                speaker=TranscriptNormalizer._normalize_speaker(item.get("speaker", "speaker")),
                                timestamp=TranscriptNormalizer._normalize_timestamp(item.get("timestamp", "00:00:00")),
                                text=item.get("text", "").strip(),
                                is_question=item.get("is_question")
                            ))
                    elif "transcript" in data and isinstance(data["transcript"], list):
                        for item in data["transcript"]:
                            segments.append(TranscriptSegment(
                                speaker=TranscriptNormalizer._normalize_speaker(item.get("speaker", "speaker")),
                                timestamp=TranscriptNormalizer._normalize_timestamp(item.get("timestamp", item.get("time", "00:00:00"))),
                                text=item.get("text", item.get("content", "")).strip()
                            ))
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            segments.append(TranscriptSegment(
                                speaker=TranscriptNormalizer._normalize_speaker(item.get("speaker", "speaker")),
                                timestamp=TranscriptNormalizer._normalize_timestamp(item.get("timestamp", item.get("time", "00:00:00"))),
                                text=item.get("text", item.get("content", "")).strip()
                            ))
                if segments:
                    return NormalizedTranscript(
                        title=title,
                        job_role=job_role,
                        job_description=job_description,
                        resume_text=resume_text,
                        platform=platform,
                        segments=TranscriptNormalizer._post_process(segments)
                    )
            except Exception:
                pass

        # 2. Check for VTT format
        if "WEBVTT" in raw or "-->" in raw:
            segments = TranscriptNormalizer._parse_vtt_srt(raw)
            if segments:
                return NormalizedTranscript(
                    title=title,
                    job_role=job_role,
                    job_description=job_description,
                    resume_text=resume_text,
                    platform=platform or "WebVTT / SRT",
                    segments=TranscriptNormalizer._post_process(segments)
                )

        # 3. Parse formatted conversational text
        segments = TranscriptNormalizer._parse_conversational_text(raw)
        
        # If still empty or single block, fall back to line chunking
        if not segments:
            segments = TranscriptNormalizer._fallback_chunk(raw)

        return NormalizedTranscript(
            title=title,
            job_role=job_role,
            job_description=job_description,
            resume_text=resume_text,
            platform=platform,
            segments=TranscriptNormalizer._post_process(segments)
        )

    @staticmethod
    def _normalize_speaker(name: str) -> str:
        name_lower = name.lower().strip()
        if any(w in name_lower for w in ["interviewer", "hiring manager", "evaluator", "recruiter", "lead", "host"]):
            return "interviewer"
        if any(w in name_lower for w in ["candidate", "applicant", "interviewee", "student", "user"]):
            return "candidate"
        return name.strip() or "speaker"

    @staticmethod
    def _normalize_timestamp(ts: Any) -> str:
        if not ts:
            return "00:00:00"
        ts_str = str(ts).strip()
        # Remove milliseconds if present (e.g. 00:01:23.456 -> 00:01:23)
        ts_clean = re.sub(r'[\.,]\d+$', '', ts_str)
        parts = ts_clean.split(":")
        if len(parts) == 2: # MM:SS -> 00:MM:SS
            return f"00:{parts[0].zfill(2)}:{parts[1].zfill(2)}"
        if len(parts) == 3:
            return f"{parts[0].zfill(2)}:{parts[1].zfill(2)}:{parts[2].zfill(2)}"
        return ts_clean

    @staticmethod
    def _parse_vtt_srt(text: str) -> List[TranscriptSegment]:
        segments: List[TranscriptSegment] = []
        blocks = re.split(r'\n\s*\n', text.strip())
        
        for block in blocks:
            lines = [l.strip() for l in block.split('\n') if l.strip()]
            if not lines or lines[0] == "WEBVTT":
                continue
            
            time_line_idx = -1
            time_match = None
            for idx, line in enumerate(lines):
                m = re.search(r'(\d{1,2}:\d{2}(?::\d{2})?(?:[\.,]\d+)?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?)', line)
                if m:
                    time_line_idx = idx
                    time_match = m
                    break
            
            if time_match and time_line_idx < len(lines) - 1:
                timestamp = TranscriptNormalizer._normalize_timestamp(time_match.group(1))
                content_lines = lines[time_line_idx + 1:]
                full_text = " ".join(content_lines)
                
                # Check for <v Speaker> or Speaker: tag
                speaker = "interviewer" if len(segments) % 2 == 0 else "candidate"
                speaker_tag_match = re.match(r'<v\s+([^>]+)>(.*)', full_text)
                if speaker_tag_match:
                    speaker = TranscriptNormalizer._normalize_speaker(speaker_tag_match.group(1))
                    full_text = speaker_tag_match.group(2).replace("</v>", "").strip()
                else:
                    colon_match = re.match(r'^([^:\n]{2,30}):\s*(.*)', full_text)
                    if colon_match:
                        speaker = TranscriptNormalizer._normalize_speaker(colon_match.group(1))
                        full_text = colon_match.group(2).strip()

                if full_text:
                    segments.append(TranscriptSegment(
                        speaker=speaker,
                        timestamp=timestamp,
                        text=full_text
                    ))
        return segments

    @staticmethod
    def _parse_conversational_text(text: str) -> List[TranscriptSegment]:
        segments: List[TranscriptSegment] = []
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        current_speaker = "interviewer"
        current_time = "00:00:00"
        current_text = []

        # Patterns for timestamped conversational lines:
        # [00:02:15] Interviewer: Explain your project
        # 02:15 - Candidate: I built a system...
        # Interviewer (00:05): Hello!
        # Interviewer: Hello
        # Otter.ai format: Speaker Name  00:15
        ts_speaker_pattern = re.compile(
            r'^(?:\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–]?\s*)?([A-Za-z0-9\s_\-\.]{2,30}?)(?:\s*\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?)?:\s*(.*)$'
        )
        otter_header_pattern = re.compile(
            r'^([A-Za-z0-9\s_\-\.]{2,30}?)\s{2,}(\d{1,2}:\d{2}(?::\d{2})?)$'
        )

        simulated_seconds = 0

        for line in lines:
            otter_match = otter_header_pattern.match(line)
            if otter_match:
                if current_text:
                    segments.append(TranscriptSegment(
                        speaker=TranscriptNormalizer._normalize_speaker(current_speaker),
                        timestamp=current_time,
                        text=" ".join(current_text)
                    ))
                    current_text = []
                current_speaker = otter_match.group(1).strip()
                current_time = TranscriptNormalizer._normalize_timestamp(otter_match.group(2).strip())
                continue
            match = ts_speaker_pattern.match(line)
            if match:
                # Flush previous segment
                if current_text:
                    segments.append(TranscriptSegment(
                        speaker=TranscriptNormalizer._normalize_speaker(current_speaker),
                        timestamp=current_time,
                        text=" ".join(current_text)
                    ))
                    current_text = []

                ts1, speaker_name, ts2, content = match.groups()
                detected_ts = ts1 or ts2
                if detected_ts:
                    current_time = TranscriptNormalizer._normalize_timestamp(detected_ts)
                else:
                    simulated_seconds += 15
                    mins, secs = divmod(simulated_seconds, 60)
                    hrs, mins = divmod(mins, 60)
                    current_time = f"{hrs:02d}:{mins:02d}:{secs:02d}"

                current_speaker = speaker_name.strip()
                if content:
                    current_text.append(content.strip())
            else:
                if current_text:
                    current_text.append(line)
                else:
                    current_text.append(line)

        if current_text:
            segments.append(TranscriptSegment(
                speaker=TranscriptNormalizer._normalize_speaker(current_speaker),
                timestamp=current_time,
                text=" ".join(current_text)
            ))

        return segments

    @staticmethod
    def _fallback_chunk(text: str) -> List[TranscriptSegment]:
        segments: List[TranscriptSegment] = []
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        sec = 0
        for idx, p in enumerate(paragraphs):
            speaker = "interviewer" if idx % 2 == 0 else "candidate"
            mins, s = divmod(sec, 60)
            hrs, mins = divmod(mins, 60)
            segments.append(TranscriptSegment(
                speaker=speaker,
                timestamp=f"{hrs:02d}:{mins:02d}:{s:02d}",
                text=p
            ))
            sec += 25
        return segments

    @staticmethod
    def _post_process(segments: List[TranscriptSegment]) -> List[TranscriptSegment]:
        # Merge adjacent same-speaker segments if needed and detect question flags
        merged: List[TranscriptSegment] = []
        for seg in segments:
            if not seg.text.strip():
                continue
            is_q = seg.text.strip().endswith("?") or any(seg.text.strip().lower().startswith(w) for w in [
                "can you", "could you", "how would", "why did", "explain", "what is", "tell me", "describe", "how do"
            ])
            seg.is_question = is_q if seg.speaker == "interviewer" else False
            
            if merged and merged[-1].speaker == seg.speaker and merged[-1].timestamp == seg.timestamp:
                merged[-1].text += " " + seg.text
            else:
                merged.append(seg)
        return merged
