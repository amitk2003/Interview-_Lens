import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  UploadCloud, 
  FileText, 
  Video, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  Zap,
  ArrowRight,
  ShieldCheck,
  Activity,
  Mic,
  Volume2,
  Clock,
  Play,
  RotateCcw
} from 'lucide-react';

const ADAPTERS = [
  {
    id: 'GOOGLE_MEET',
    name: 'Google Meet Adapter',
    icon: Video,
    color: '#00F0FF',
    defaultUrl: 'https://meet.google.com/abc-defg-hij',
    badge: 'Authorized API / Stream'
  },
  {
    id: 'MS_TEAMS',
    name: 'Microsoft Teams Adapter',
    icon: Video,
    color: '#818CF8',
    defaultUrl: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz',
    badge: 'Graph API Connector'
  },
  {
    id: 'ZOOM',
    name: 'Zoom Adapter',
    icon: Video,
    color: '#38BDF8',
    defaultUrl: 'https://zoom.us/j/9876543210',
    badge: 'Webhook / Bot Stream'
  },
  {
    id: 'UPLOAD_RECORDING',
    name: 'Authorized Recording / Audio Upload',
    icon: UploadCloud,
    color: '#A78BFA',
    defaultUrl: 'interview_session_audio.mp4',
    badge: 'Audio / Video Stream'
  },
  {
    id: 'UPLOAD_TRANSCRIPT',
    name: 'Transcript File Upload (.vtt, .srt, .json, .txt)',
    icon: FileText,
    color: '#10B981',
    defaultUrl: 'transcript_diarized.vtt',
    badge: 'Direct Normalizer'
  }
];

const PRESETS = [
  {
    id: 'fintech_distributed',
    name: 'Fintech Distributed Systems (Redis & Concurrency)',
    role: 'Senior Distributed Systems Engineer',
    jd: 'Architecting high-throughput low-latency microservices with Kafka, Redis, PostgreSQL, and distributed concurrency controls.',
    resume: '5+ years backend systems, Redis caching, event streaming.',
    meetingUrl: 'https://meet.google.com/fintech-eng-interview'
  },
  {
    id: 'frontend_staff',
    name: 'Staff React & Design Systems Lead',
    role: 'Staff Frontend Engineer',
    jd: 'Deep React performance optimization, React Server Components (RSC), Next.js App Router, accessibility, and large-scale micro-frontends.',
    resume: '8 years frontend architecture, React core, design tokens.',
    meetingUrl: 'https://teams.microsoft.com/l/meetup-join/staff-react'
  },
  {
    id: 'ml_systems',
    name: 'AI & Inference Infrastructure Architect',
    role: 'Lead ML Systems Engineer',
    jd: 'High-throughput LLM serving, Triton Inference Server, vLLM continuous batching, GPU memory management.',
    resume: 'MLOps, CUDA optimization, model quantization.',
    meetingUrl: 'https://zoom.us/j/ml-infra-round3'
  }
];

export default function CreateInterviewModal({ onClose, onCreated, apiKey, userProfile }) {
  // Wizard steps: 1 = Workspace & Adapter Selection, 2 = Live Capture Gateway & Stream Processor, 3 = Orchestrator Execution
  const [wizardStep, setWizardStep] = useState(1);

  // Form state
  const [title, setTitle] = useState('Senior Distributed Systems Interview');
  const [jobRole, setJobRole] = useState(userProfile?.target_role || 'Senior Distributed Systems Engineer');
  const [jobDescription, setJobDescription] = useState('Architecting high-throughput low-latency microservices with Kafka, Redis, PostgreSQL, and distributed concurrency controls.');
  const [resumeText, setResumeText] = useState(userProfile?.resume_summary || '5+ years backend engineering, distributed event streams, microservices architecture, and caching strategies.');
  const [selectedAdapter, setSelectedAdapter] = useState('GOOGLE_MEET');
  const [meetingUrl, setMeetingUrl] = useState('https://meet.google.com/abc-defg-hij');
  const [consentAuthorized, setConsentAuthorized] = useState(true);
  const [presetScenario, setPresetScenario] = useState('fintech_distributed');

  // Live Gateway state
  const [captureSession, setCaptureSession] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [streamProgress, setStreamProgress] = useState(0);
  const [isSimulatingStream, setIsSimulatingStream] = useState(false);

  // Orchestrator State
  const [orchestratorStep, setOrchestratorStep] = useState(0);

  const applyPreset = (p) => {
    setTitle(p.name);
    setJobRole(p.role);
    setJobDescription(p.jd);
    setResumeText(p.resume);
    setMeetingUrl(p.meetingUrl);
    setPresetScenario(p.id);
  };

  // Step 1 -> Connect Meeting Integration Layer & Gateway
  const handleConnectMeeting = async () => {
    if (!consentAuthorized) {
      alert('Please confirm authorized meeting access and participant consent.');
      return;
    }
    setConnecting(true);

    try {
      const res = await fetch('/api/meetings/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adapter_type: selectedAdapter,
          meeting_url: meetingUrl,
          candidate_name: userProfile?.name || 'Alex Chen',
          job_role: jobRole,
          job_description: jobDescription,
          resume_text: resumeText,
          preset_scenario: presetScenario
        })
      });

      if (!res.ok) throw new Error('Meeting connection failed');
      const sessionData = await res.json();
      setCaptureSession(sessionData);
      setConnecting(false);
      setWizardStep(2); // Move to Live Capture Gateway
      setActiveChunkIndex(sessionData.stream_chunks.length); // All chunks loaded
    } catch (err) {
      console.error(err);
      alert('Failed to connect to Meeting Integration Layer');
      setConnecting(false);
    }
  };

  // Step 2 -> Launch Orchestrator & Specialized Agents
  const handleRunOrchestrator = async () => {
    if (!captureSession) return;
    setWizardStep(3); // Move to Orchestrator animation
    setOrchestratorStep(1);

    try {
      setTimeout(() => setOrchestratorStep(2), 600); // Technical & Communication Agents
      setTimeout(() => setOrchestratorStep(3), 1400); // Behavioral Agent (STAR)
      setTimeout(() => setOrchestratorStep(4), 2200); // Evidence Verification Agent

      const formData = new FormData();
      formData.append('title', title);
      formData.append('job_role', jobRole);
      if (jobDescription) formData.append('job_description', jobDescription);
      if (resumeText) formData.append('resume_text', resumeText);

      const res = await fetch(`/api/meetings/${captureSession.session_id}/finish`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Orchestration failed');
      const record = await res.json();

      setTimeout(() => {
        setOrchestratorStep(5);
        setTimeout(() => {
          onCreated(record);
        }, 500);
      }, 2600);

    } catch (err) {
      console.error(err);
      alert('Orchestrator error. Please retry.');
      setWizardStep(2);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 8, 14, 0.88)',
      backdropFilter: 'blur(18px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '920px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '34px',
        position: 'relative',
        borderRadius: '20px'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={wizardStep === 3}
          style={{
            position: 'absolute',
            top: '24px', right: '24px',
            background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Wizard Progress Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          {[
            { num: 1, label: 'Workspace & Adapter' },
            { num: 2, label: 'Live Capture Gateway' },
            { num: 3, label: 'Agentic Orchestrator' }
          ].map(s => {
            const isDone = wizardStep > s.num;
            const isCurrent = wizardStep === s.num;
            return (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: isCurrent ? 'var(--accent-cyan)' : isDone ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.06)',
                  color: isCurrent ? '#050B14' : '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 800
                }}>
                  {isDone ? '✓' : s.num}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isCurrent ? 'var(--accent-cyan)' : isDone ? '#FFFFFF' : 'var(--text-muted)' }}>
                  {s.label}
                </span>
                {s.num < 3 && <span style={{ color: 'var(--border-subtle)' }}>→</span>}
              </div>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* STAGE 1: WORKSPACE CONTEXT & MEETING ADAPTER SELECTION */}
        {/* ======================================================== */}
        {wizardStep === 1 && (
          <div>
            <div style={{ marginBottom: '22px' }}>
              <span className="badge badge-cyan" style={{ marginBottom: '6px' }}>Target Architecture Stage 02 & 03</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Interview Workspace & Meeting Integration</h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                Set up candidate context and connect the authorized meeting adapter (Google Meet, MS Teams, Zoom).
              </p>
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: '22px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                ⚡ Quick Presets (Click to Auto-Populate)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    style={{
                      padding: '10px 14px', borderRadius: '10px',
                      background: presetScenario === p.id ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255,255,255,0.03)',
                      border: presetScenario === p.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      color: '#FFFFFF', textAlign: 'left', cursor: 'pointer'
                    }}
                  >
                    <strong style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', display: 'block' }}>{p.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.role}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Workspace Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  WORKSPACE TITLE
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                    color: '#FFFFFF', fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  TARGET JOB ROLE
                </label>
                <input
                  type="text"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                    color: '#FFFFFF', fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                JOB DESCRIPTION & EXPECTED SKILLS
              </label>
              <textarea
                rows={2}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Meeting Integration Layer Adapter Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                MEETING INTEGRATION LAYER (SELECT ADAPTER)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                {ADAPTERS.map(a => {
                  const Icon = a.icon;
                  const isSel = selectedAdapter === a.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => {
                        setSelectedAdapter(a.id);
                        setMeetingUrl(a.defaultUrl);
                      }}
                      style={{
                        padding: '12px', borderRadius: '12px',
                        background: isSel ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                        border: isSel ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer', textAlign: 'center'
                      }}
                    >
                      <Icon size={20} color={a.color} style={{ margin: '0 auto 6px auto' }} />
                      <strong style={{ fontSize: '0.8rem', display: 'block', color: '#FFFFFF' }}>{a.name}</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{a.badge}</span>
                    </div>
                  );
                })}
              </div>

              {/* Meeting URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  MEETING URL / IDENTIFIER
                </label>
                <input
                  type="text"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                    color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {/* Authorization & Consent */}
            <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--border-emerald)', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="consent"
                checked={consentAuthorized}
                onChange={(e) => setConsentAuthorized(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }}
              />
              <label htmlFor="consent" style={{ fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <strong>Explicit Platform Authorization:</strong> Only ingest interview data authorized by participants. Compliance with Google Meet / Teams / Zoom OAuth scopes verified.
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConnectMeeting} disabled={connecting}>
                <Zap size={16} /> {connecting ? 'Connecting Adapter...' : 'Connect to Live Capture Gateway'}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STAGE 2: LIVE CAPTURE GATEWAY & TRANSCRIPT STREAM PROCESSOR */}
        {/* ======================================================== */}
        {wizardStep === 2 && captureSession && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="badge badge-verified">
                    <Activity size={13} /> Live Capture Gateway Active
                  </span>
                  <span className="badge badge-violet">{captureSession.adapter_config.platform_name}</span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Transcript Stream Processor</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Ingesting audio stream, tracking participant events, measuring audio levels, and diarizing speaker turns.
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  00:06:30
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Session Duration</span>
              </div>
            </div>

            {/* Audio Waveform Simulator */}
            <div style={{
              padding: '16px 20px', borderRadius: '12px',
              background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)',
              marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mic size={18} color="var(--accent-cyan)" className="pulse-glow" />
                <span style={{ fontSize: '0.82rem', color: '#FFFFFF', fontWeight: 600 }}>
                  Audio Input RMS Level: <strong style={{ color: 'var(--accent-emerald)' }}>-12 dB (Optimal)</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '24px' }}>
                {[30, 60, 90, 45, 80, 100, 70, 40, 65, 85, 95, 50, 75, 90, 35, 60, 80].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: '4px', height: `${h}%`,
                      background: 'linear-gradient(to top, var(--accent-cyan), var(--accent-emerald))',
                      borderRadius: '2px'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Participant Event Stream & Incoming Transcript */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '18px', marginBottom: '24px' }}>
              {/* Participant Events */}
              <div className="glass-panel" style={{ padding: '18px', maxHeight: '280px', overflowY: 'auto' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  Participant Event Log
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {captureSession.participant_events.map((e, idx) => (
                    <div key={idx} style={{ fontSize: '0.78rem', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid var(--accent-cyan)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <strong style={{ color: 'var(--accent-cyan)' }}>{e.event_type}</strong>
                        <span className="mono" style={{ color: 'var(--text-muted)' }}>{e.timestamp}</span>
                      </div>
                      <span style={{ color: 'var(--text-primary)' }}>{e.participant_name}</span>
                      {e.detail && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{e.detail}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Streaming Transcript Ticker */}
              <div className="glass-panel" style={{ padding: '18px', maxHeight: '280px', overflowY: 'auto' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  Live Transcript Stream ({captureSession.stream_chunks.length} Diarized Turns)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {captureSession.stream_chunks.map((c) => {
                    const isInterviewer = c.speaker === 'interviewer';
                    return (
                      <div key={c.chunk_id} style={{
                        padding: '10px 12px', borderRadius: '8px',
                        background: isInterviewer ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255,255,255,0.03)',
                        borderLeft: isInterviewer ? '3px solid var(--accent-cyan)' : '3px solid var(--accent-violet)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>[{c.timestamp}]</span>
                          <strong style={{ fontSize: '0.78rem', color: isInterviewer ? 'var(--accent-cyan)' : '#C4B5FD', textTransform: 'capitalize' }}>
                            {c.speaker}
                          </strong>
                          {c.is_question && <span className="badge badge-cyan" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>Q</span>}
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {c.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setWizardStep(1)}>
                ← Back to Adapters
              </button>
              <button className="btn btn-primary" onClick={handleRunOrchestrator}>
                <Sparkles size={16} /> Pipe into Interview Orchestrator
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STAGE 3: INTERVIEW ORCHESTRATOR & AGENT PIPELINE */}
        {/* ======================================================== */}
        {wizardStep === 3 && (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div style={{
              width: '76px', height: '76px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(0,240,255,0.2), rgba(139,92,246,0.2))',
              border: '2px solid var(--accent-cyan)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px auto',
              boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)'
            }} className="pulse-glow">
              <Cpu size={38} color="var(--accent-cyan)" />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>
              Interview Orchestrator Execution
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>
              Dispatching specialized agents, verifying evidence against timestamps, and generating dual memory branches.
            </p>

            <div style={{ maxWidth: '540px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              {[
                { step: 1, name: 'Transcript Normalizer', desc: 'Standardizing speaker turns and timestamps from Live Capture Gateway' },
                { step: 2, name: 'Technical & Communication Agents', desc: 'Evaluating expected concepts, code correctness, and observable verbal signals' },
                { step: 3, name: 'Behavioral Agent (STAR)', desc: 'Measuring personal ownership, quantifiable metrics, and business outcomes' },
                { step: 4, name: 'Evidence Verification Agent', desc: 'Fact-checking claims against transcript timestamps (Accept / Modify / Reject)' },
                { step: 5, name: 'Verified Assessment & Memory Persistence', desc: 'Synthesizing 6-dimension scorecard & staging Knowledge vs Performance Re-Test' }
              ].map((item) => {
                const isDone = orchestratorStep > item.step;
                const isCurrent = orchestratorStep === item.step;
                return (
                  <div key={item.step} className="glass-panel" style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    border: isCurrent ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: isCurrent ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255,255,255,0.02)'
                  }}>
                    {isDone ? (
                      <CheckCircle2 size={20} color="var(--accent-emerald)" />
                    ) : isCurrent ? (
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--accent-cyan)', borderTopColor: 'transparent' }} className="spin-slow" />
                    ) : (
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1px solid var(--text-muted)' }} />
                    )}
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: isCurrent ? 'var(--accent-cyan)' : isDone ? '#FFFFFF' : 'var(--text-muted)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
