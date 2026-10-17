import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  CheckCircle2,
  Cpu,
  Sparkles,
  Clock,
  Play,
  Pause,
  ArrowRight,
  ShieldCheck,
  Award,
  AlertCircle
} from 'lucide-react';
import { API_BASE } from '../config';

export default function LiveInterviewRoom({
  interviewPlan,
  onClose,
  onComplete,
  jobRole,
  jobDescription,
  resumeText,
  apiKey
}) {
  const questions = interviewPlan?.questions || [
    {
      index: 1,
      category: "Experience & Architecture",
      question: "Can you walk me through the architecture of a major system you built, focusing on how you chose your data storage and messaging layers?"
    }
  ];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [candidateResponse, setCandidateResponse] = useState('');
  const [transcriptLog, setTranscriptLog] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeakingAi, setIsSpeakingAi] = useState(false);
  const [audioLevel, setAudioLevel] = useState(60);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Dynamic Interviewer State
  const [activeQuestionText, setActiveQuestionText] = useState(questions[0]?.question || '');
  const [activeCategory, setActiveCategory] = useState(questions[0]?.category || 'Experience & Architecture');
  const [isEvaluatingTurn, setIsEvaluatingTurn] = useState(false);
  const [lastInterviewerTurn, setLastInterviewerTurn] = useState(null);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  const currentQ = questions[currentIdx] || questions[0];

  // Live Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Text-to-Speech: AI reads question aloud
  const speakQuestion = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
    if (englishVoice) utterance.voice = englishVoice;

    utterance.onstart = () => setIsSpeakingAi(true);
    utterance.onend = () => setIsSpeakingAi(false);
    utterance.onerror = () => setIsSpeakingAi(false);

    window.speechSynthesis.speak(utterance);
  };

  // Speak first question on load
  useEffect(() => {
    if (activeQuestionText) {
      speakQuestion(activeQuestionText);
    }
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [activeQuestionText]);

  // Speech Recognition (Mic)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setCandidateResponse(prev => (prev ? prev + ' ' : '') + finalTranscript.trim());
        }
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Submit Answer & Dynamically Evaluate via AI Interviewer
  const handleAnswerSubmit = async () => {
    if (!candidateResponse.trim()) {
      alert("Please provide an answer before submitting.");
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const timestamp = formatTime(secondsElapsed);
    const answerText = candidateResponse.trim();

    // Log the turn
    const newCandidateEntry = {
      speaker: 'Candidate',
      timestamp: `00:${timestamp}`,
      text: answerText,
      is_question: false
    };
    const updatedLog = [...transcriptLog, newCandidateEntry];
    setTranscriptLog(updatedLog);
    setCandidateResponse('');
    setIsEvaluatingTurn(true);

    try {
      const res = await fetch(`${API_BASE}/api/interview/interactive/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_role: jobRole,
          job_description: jobDescription,
          resume_text: resumeText,
          current_question: activeQuestionText,
          candidate_answer: answerText,
          conversation_history: updatedLog.map(e => ({ speaker: e.speaker, text: e.text })),
          current_question_index: currentIdx,
          total_questions: questions.length,
          plan_questions: questions,
          api_key: apiKey
        })
      });

      if (!res.ok) throw new Error('Dynamic interview evaluation failed');
      const turnData = await res.json();
      setLastInterviewerTurn(turnData);

      // Append Interviewer response to conversation
      const interviewerEntry = {
        speaker: 'Interviewer',
        timestamp: `00:${formatTime(secondsElapsed + 5)}`,
        text: turnData.interviewer_speech,
        is_question: true
      };
      const finalLog = [...updatedLog, interviewerEntry];
      setTranscriptLog(finalLog);

      // Update question text and topic
      setActiveQuestionText(turnData.interviewer_speech);
      if (turnData.current_topic) setActiveCategory(turnData.current_topic);
      setCurrentIdx(turnData.next_question_index);

      if (turnData.is_interview_complete) {
        setIsInterviewComplete(true);
      }
    } catch (err) {
      console.error(err);
      // Graceful fallback
      if (currentIdx < questions.length - 1) {
        const nextQ = questions[currentIdx + 1];
        setCurrentIdx(currentIdx + 1);
        setActiveQuestionText(nextQ.question);
        setActiveCategory(nextQ.category);
      } else {
        setIsInterviewComplete(true);
      }
    } finally {
      setIsEvaluatingTurn(false);
    }
  };

  // Compile full transcript and pipe into Orchestrator
  const finishAndEvaluate = async () => {
    setIsSubmitting(true);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    try {
      const transcriptFormatted = transcriptLog.map(e => `[${e.timestamp}] ${e.speaker.toUpperCase()}: ${e.text}`).join('\n\n');

      const formData = new FormData();
      formData.append('title', `${jobRole} Live Technical Assessment`);
      formData.append('job_role', jobRole);
      if (jobDescription) formData.append('job_description', jobDescription);
      if (resumeText) formData.append('resume_text', resumeText);
      formData.append('raw_transcript', transcriptFormatted);

      const sessionId = interviewPlan?.session_id || `live_${Date.now()}`;
      const res = await fetch(`${API_BASE}/api/meetings/${sessionId}/finish`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Live interview analysis failed');
      const record = await res.json();
      onComplete(record);
    } catch (err) {
      console.error(err);
      alert('Analysis error: ' + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 8, 14, 0.94)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 150,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '960px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '30px',
        position: 'relative',
        borderRadius: '24px'
      }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge badge-cyan">
              <span className="pulse-glow" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block' }} />
              Live Interactive Room
            </span>
            <span className="badge badge-violet">{jobRole}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
              <Clock size={16} />
              <span className="mono" style={{ fontSize: '1rem' }}>{formatTime(secondsElapsed)}</span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Progress Tracker */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {questions.map((q, idx) => {
            const isDone = idx < currentIdx;
            const isCurr = idx === currentIdx;
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  background: isDone ? 'var(--accent-emerald)' : isCurr ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease'
                }}
              />
            );
          })}
        </div>

        {/* AI Interviewer Question Box */}
        <div style={{
          padding: '24px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '20px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--accent-cyan)', color: '#050B14',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.85rem'
              }}>
                AI
              </div>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#FFFFFF' }}>AI Technical Interviewer (Live Adaptive)</strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                  Topic {Math.min(currentIdx + 1, questions.length)} of {questions.length} • {activeCategory}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {lastInterviewerTurn?.is_followup && (
                <span className="badge badge-cyan" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                  🎯 Deep-Dive Follow-up Probe
                </span>
              )}
              {isInterviewComplete && (
                <span className="badge badge-emerald" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                  ✓ Topics Covered
                </span>
              )}
              <button
                onClick={() => speakQuestion(activeQuestionText)}
                style={{
                  background: isSpeakingAi ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px', padding: '6px 10px',
                  color: isSpeakingAi ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem'
                }}
              >
                <Volume2 size={15} />
                {isSpeakingAi ? 'Speaking...' : 'Replay Voice'}
              </button>
            </div>
          </div>

          <p style={{
            fontSize: '1.12rem',
            fontWeight: 600,
            color: '#FFFFFF',
            lineHeight: 1.5,
            marginTop: '12px'
          }}>
            "{activeQuestionText}"
          </p>

          {/* Real-time Signals from Last Candidate Turn */}
          {lastInterviewerTurn?.detected_signals && lastInterviewerTurn.detected_signals.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Interviewer Signals Detected:</span>
              {lastInterviewerTurn.detected_signals.map((sig, i) => (
                <span
                  key={i}
                  className={`badge ${sig.type === 'strength' ? 'badge-emerald' : 'badge-amber'}`}
                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                >
                  {sig.tag}: {sig.detail}
                </span>
              ))}
            </div>
          )}

          {currentQ.focus_skills && currentQ.focus_skills.length > 0 && !lastInterviewerTurn && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Target Concept:</span>
              {currentQ.focus_skills.map((skill, i) => (
                <span key={i} className="badge badge-violet" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Candidate Audio & Speech Response Input */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              YOUR ANSWER / REASONING
              {isRecording && <span style={{ color: 'var(--accent-emerald)', fontSize: '0.72rem' }}>● Recording from Microphone</span>}
              {isEvaluatingTurn && <span style={{ color: 'var(--accent-cyan)', fontSize: '0.72rem' }}>⚡ Interviewer is actively analyzing your response...</span>}
            </label>

            {speechSupported && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={isEvaluatingTurn || isSubmitting}
                style={{
                  padding: '6px 14px', borderRadius: '10px',
                  background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 240, 255, 0.12)',
                  border: isRecording ? '1px solid #EF4444' : '1px solid var(--accent-cyan)',
                  color: isRecording ? '#EF4444' : 'var(--accent-cyan)',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                {isRecording ? 'Stop Mic' : 'Speak into Mic'}
              </button>
            )}
          </div>

          <textarea
            rows={5}
            value={candidateResponse}
            onChange={(e) => setCandidateResponse(e.target.value)}
            disabled={isEvaluatingTurn || isSubmitting}
            placeholder={speechSupported ? "Speak through your microphone or type your detailed response here..." : "Type your detailed technical response here..."}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: isRecording ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              color: '#FFFFFF',
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}
          />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {transcriptLog.length > 0 ? (
              <span>Exchanges: {transcriptLog.length} turns recorded • Live dynamic follow-ups active</span>
            ) : (
              <span>Turn 1 • The interviewer adapts based specifically on your technical claims.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting || isEvaluatingTurn}>
              Exit Room
            </button>

            {!isInterviewComplete ? (
              <>
                <button
                  className="btn btn-primary"
                  onClick={handleAnswerSubmit}
                  disabled={isSubmitting || isEvaluatingTurn || !candidateResponse.trim()}
                >
                  {isEvaluatingTurn ? (
                    <>
                      <div className="spin-slow" style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', marginRight: '6px' }} />
                      Interviewer Evaluating...
                    </>
                  ) : (
                    <>
                      Submit Answer <ArrowRight size={16} />
                    </>
                  )}
                </button>
                {transcriptLog.length >= 2 && (
                  <button
                    className="btn btn-secondary"
                    onClick={finishAndEvaluate}
                    disabled={isSubmitting || isEvaluatingTurn}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Finish Now
                  </button>
                )}
              </>
            ) : (
              <button
                className="btn btn-primary"
                onClick={finishAndEvaluate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'Generating Multi-Agent Evaluation...'
                ) : (
                  <>
                    <Sparkles size={16} /> Finish & View Evaluation Report
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
