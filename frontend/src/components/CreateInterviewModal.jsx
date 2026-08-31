import React, { useState, useRef } from 'react';
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
  MicOff,
  Volume2,
  Clock,
  Play,
  RotateCcw,
  ExternalLink,
  Upload
} from 'lucide-react';
import { API_BASE } from '../config.js';

const ADAPTERS = [
  {
    id: 'LIVE_AI',
    name: 'Interactive AI Interviewer Room',
    icon: Sparkles,
    color: '#00F0FF',
    badge: 'Real-time Voice & Q&A',
    description: 'Dynamic interview tailored directly to your uploaded JD & Resume with speech AI'
  },
  {
    id: 'GOOGLE_MEET',
    name: 'Google Meet Meeting Gateway',
    icon: Video,
    color: '#34D399',
    defaultUrl: 'https://meet.google.com/abc-defg-hij',
    badge: 'Live Launch + Audio Ingestion',
    description: 'Launch real Google Meet call and record or ingest transcript live'
  },
  {
    id: 'ZOOM',
    name: 'Zoom Meeting Gateway',
    icon: Video,
    color: '#38BDF8',
    defaultUrl: 'https://zoom.us/j/9876543210',
    badge: 'Live Launch + Audio Ingestion',
    description: 'Launch real Zoom call and ingest audio or live transcript'
  },
  {
    id: 'MS_TEAMS',
    name: 'Microsoft Teams Gateway',
    icon: Video,
    color: '#818CF8',
    defaultUrl: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz',
    badge: 'Live Launch + Audio Ingestion',
    description: 'Launch real Teams call with synchronized assessment'
  },
  {
    id: 'UPLOAD_TRANSCRIPT',
    name: 'Recorded Audio / Transcript Upload',
    icon: FileText,
    color: '#A78BFA',
    badge: 'File Ingest (.vtt, .srt, .txt, .mp3, .wav)',
    description: 'Upload an existing recording file or transcript from an interview'
  }
];

export default function CreateInterviewModal({ 
  onClose, 
  onCreated, 
  onStartLiveRoom, 
  apiKey, 
  userProfile 
}) {
  // Mode selection
  const [selectedAdapter, setSelectedAdapter] = useState('LIVE_AI');
  const [title, setTitle] = useState(`${userProfile?.target_role || 'Software Engineer'} Interview`);
  const [jobRole, setJobRole] = useState(userProfile?.target_role || 'Senior Distributed Systems Engineer');
  
  // JD State
  const [jdMode, setJdMode] = useState('text'); // 'text' | 'file'
  const [jobDescription, setJobDescription] = useState(
    'Architecting high-throughput low-latency microservices with Kafka, Redis, PostgreSQL, and distributed concurrency controls.'
  );
  const [jdFileName, setJdFileName] = useState('');
  const [jdParsing, setJdParsing] = useState(false);

  // Resume State
  const [resumeMode, setResumeMode] = useState('text'); // 'text' | 'file'
  const [resumeText, setResumeText] = useState(
    userProfile?.resume_summary || '5+ years backend engineering, distributed event streams, microservices architecture, and caching strategies.'
  );
  const [resumeFileName, setResumeFileName] = useState('');
  const [resumeParsing, setResumeParsing] = useState(false);

  // Meeting Gateway State
  const [meetingUrl, setMeetingUrl] = useState('https://meet.google.com/new');
  const [liveTranscriptNotes, setLiveTranscriptNotes] = useState('');
  const [isMeetingLaunched, setIsMeetingLaunched] = useState(false);
  const [recordingFile, setRecordingFile] = useState(null);

  // Execution state
  const [loading, setLoading] = useState(false);

  // File Upload Handlers for JD & Resume
  const handleJdFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJdFileName(file.name);
    setJdParsing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/parse/document`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Failed to parse JD document');
      const data = await res.json();
      setJobDescription(data.extracted_text);
    } catch (err) {
      alert('Error parsing JD file: ' + err.message);
    } finally {
      setJdParsing(false);
    }
  };

  const handleResumeFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFileName(file.name);
    setResumeParsing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/parse/document`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Failed to parse Resume document');
      const data = await res.json();
      setResumeText(data.extracted_text);
    } catch (err) {
      alert('Error parsing resume file: ' + err.message);
    } finally {
      setResumeParsing(false);
    }
  };

  // Launch Live Meeting in new tab
  const handleLaunchMeetingUrl = () => {
    let url = meetingUrl.trim();
    if (!url) {
      alert('Please enter a valid meeting URL.');
      return;
    }
    // Ensure protocol is present so it doesn't open as relative path on localhost
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsMeetingLaunched(true);
  };

  // Primary Action: Start Live AI Room or Submit External/Uploaded Interview
  const handleProceed = async () => {
    const token = localStorage.getItem('AUTH_TOKEN');

    if (selectedAdapter === 'LIVE_AI') {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/interview/interactive/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_role: jobRole,
            job_description: jobDescription,
            resume_text: resumeText,
            question_count: 4,
            api_key: apiKey
          })
        });

        if (!res.ok) throw new Error('Could not generate dynamic interview plan');
        const planData = await res.json();
        setLoading(false);
        onClose();
        onStartLiveRoom(planData, { jobRole, jobDescription, resumeText });
      } catch (err) {
        console.error(err);
        alert('Failed to start Live AI Room: ' + err.message);
        setLoading(false);
      }
      return;
    }

    if (selectedAdapter === 'UPLOAD_TRANSCRIPT' && recordingFile) {
      // Upload raw file
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', recordingFile);
        formData.append('title', title);
        formData.append('job_role', jobRole);
        if (jobDescription) formData.append('job_description', jobDescription);
        if (resumeText) formData.append('resume_text', resumeText);
        formData.append('platform', 'Uploaded Recording File');
        if (token) formData.append('token', token);

        const res = await fetch(`${API_BASE}/api/interviews/upload`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) throw new Error('File analysis failed');
        const record = await res.json();
        setLoading(false);
        onCreated(record);
      } catch (err) {
        console.error(err);
        alert('Upload failed: ' + err.message);
        setLoading(false);
      }
      return;
    }

    // Google Meet / Zoom / Teams Gateway
    setLoading(true);
    try {
      const transcriptContent = liveTranscriptNotes.trim() || `[00:00:15] Interviewer: Welcome to the ${jobRole} technical round.\n[00:00:30] Candidate: Hello, thank you for having me.`;
      const urlWithToken = token ? `${API_BASE}/api/interviews/workspace/create?token=${token}` : `${API_BASE}/api/interviews/workspace/create`;
      const res = await fetch(urlWithToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          job_role: jobRole,
          job_description: jobDescription,
          resume_text: resumeText,
          adapter_type: selectedAdapter,
          meeting_url: meetingUrl,
          transcript_text: transcriptContent,
          api_key: apiKey,
          user_email: userProfile?.email,
          user_name: userProfile?.name
        })
      });

      if (!res.ok) throw new Error('Analysis orchestration failed');
      const record = await res.json();
      setLoading(false);
      onCreated(record);
    } catch (err) {
      console.error(err);
      alert('Orchestrator error: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 8, 14, 0.9)',
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
        borderRadius: '24px'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px', right: '24px',
            background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div style={{ marginBottom: '22px' }}>
          <span className="badge badge-cyan" style={{ marginBottom: '6px' }}>Interview Setup & Ingestion</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>
            Candidate Context & Interview Mode
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Upload your Job Description & Resume (or enter manually), then choose an interview format.
          </p>
        </div>

        {/* Workspace Title & Target Role */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              INTERVIEW TITLE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Distributed Systems Technical Round"
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
              placeholder="e.g. Senior Distributed Systems Engineer"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                color: '#FFFFFF', fontSize: '0.85rem'
              }}
            />
          </div>
        </div>

        {/* 1. Job Description & Skills (Upload or Type) */}
        <div style={{
          padding: '18px', borderRadius: '14px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
          marginBottom: '18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              1. JOB DESCRIPTION & REQUIRED SKILLS
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setJdMode('file')}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                  background: jdMode === 'file' ? 'var(--accent-cyan)' : 'transparent',
                  color: jdMode === 'file' ? '#050B14' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)', cursor: 'pointer'
                }}
              >
                Upload JD File (PDF / DOCX)
              </button>
              <button
                type="button"
                onClick={() => setJdMode('text')}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                  background: jdMode === 'text' ? 'var(--accent-cyan)' : 'transparent',
                  color: jdMode === 'text' ? '#050B14' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)', cursor: 'pointer'
                }}
              >
                Write / Paste Manually
              </button>
            </div>
          </div>

          {jdMode === 'file' ? (
            <div style={{
              border: '2px dashed var(--border-subtle)', borderRadius: '10px',
              padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.2)'
            }}>
              <UploadCloud size={28} color="var(--accent-cyan)" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ fontSize: '0.82rem', color: '#FFFFFF', marginBottom: '6px' }}>
                {jdFileName ? `Uploaded: ${jdFileName}` : 'Select Job Description file (.pdf, .docx, .txt)'}
              </p>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleJdFileUpload}
                style={{ display: 'none' }}
                id="jd-file-input"
              />
              <label htmlFor="jd-file-input" className="btn btn-secondary" style={{ display: 'inline-flex', cursor: 'pointer', padding: '6px 14px', fontSize: '0.78rem' }}>
                {jdParsing ? 'Extracting text...' : 'Browse JD File'}
              </label>
              {jobDescription && (
                <p style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)', marginTop: '8px' }}>
                  ✓ {jobDescription.length} characters extracted and staged.
                </p>
              )}
            </div>
          ) : (
            <textarea
              rows={3}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste or write the Job Description, expected technical requirements, and responsibilities..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                color: '#FFFFFF', fontSize: '0.84rem'
              }}
            />
          )}
        </div>

        {/* 2. Candidate Resume (Upload or Type) */}
        <div style={{
          padding: '18px', borderRadius: '14px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
          marginBottom: '22px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-violet)' }}>
              2. CANDIDATE RESUME & EXPERIENCE
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setResumeMode('file')}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                  background: resumeMode === 'file' ? 'var(--accent-violet)' : 'transparent',
                  color: resumeMode === 'file' ? '#FFFFFF' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)', cursor: 'pointer'
                }}
              >
                Upload Resume (PDF / DOCX)
              </button>
              <button
                type="button"
                onClick={() => setResumeMode('text')}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                  background: resumeMode === 'text' ? 'var(--accent-violet)' : 'transparent',
                  color: resumeMode === 'text' ? '#FFFFFF' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)', cursor: 'pointer'
                }}
              >
                Write / Paste Manually
              </button>
            </div>
          </div>

          {resumeMode === 'file' ? (
            <div style={{
              border: '2px dashed var(--border-subtle)', borderRadius: '10px',
              padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.2)'
            }}>
              <FileText size={28} color="var(--accent-violet)" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ fontSize: '0.82rem', color: '#FFFFFF', marginBottom: '6px' }}>
                {resumeFileName ? `Uploaded: ${resumeFileName}` : 'Select Candidate Resume file (.pdf, .docx, .txt)'}
              </p>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleResumeFileUpload}
                style={{ display: 'none' }}
                id="resume-file-input"
              />
              <label htmlFor="resume-file-input" className="btn btn-secondary" style={{ display: 'inline-flex', cursor: 'pointer', padding: '6px 14px', fontSize: '0.78rem' }}>
                {resumeParsing ? 'Extracting text...' : 'Browse Resume File'}
              </label>
              {resumeText && (
                <p style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)', marginTop: '8px' }}>
                  ✓ {resumeText.length} characters extracted and staged.
                </p>
              )}
            </div>
          ) : (
            <textarea
              rows={3}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste candidate background, previous roles, projects, and technologies..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                color: '#FFFFFF', fontSize: '0.84rem'
              }}
            />
          )}
        </div>

        {/* 3. Choose Interview Execution Mode */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }}>
            3. SELECT INTERVIEW FORMAT & EXECUTION
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {ADAPTERS.map(a => {
              const Icon = a.icon;
              const isSel = selectedAdapter === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAdapter(a.id)}
                  style={{
                    padding: '14px', borderRadius: '12px',
                    background: isSel ? 'rgba(0, 240, 255, 0.09)' : 'rgba(255,255,255,0.02)',
                    border: isSel ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer', textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <Icon size={18} color={a.color} />
                    <strong style={{ fontSize: '0.85rem', color: '#FFFFFF' }}>{a.name}</strong>
                  </div>
                  <span className="badge badge-cyan" style={{ fontSize: '0.66rem', marginBottom: '6px' }}>{a.badge}</span>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{a.description}</p>
                </div>
              );
            })}
          </div>

          {/* External Meeting URL & Live Launcher */}
          {['GOOGLE_MEET', 'ZOOM', 'MS_TEAMS'].includes(selectedAdapter) && (
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  ENTER {selectedAdapter === 'GOOGLE_MEET' ? 'GOOGLE MEET' : selectedAdapter === 'ZOOM' ? 'ZOOM' : 'MS TEAMS'} URL
                </label>
                
                {/* Dynamic 1-Click Instant Meeting Creator */}
                {selectedAdapter === 'GOOGLE_MEET' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingUrl('https://meet.google.com/new');
                      window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');
                      setIsMeetingLaunched(true);
                    }}
                    style={{
                      background: 'none', border: 'none', color: '#34D399',
                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline'
                    }}
                  >
                    + Create Instant Google Meet Call
                  </button>
                )}

                {selectedAdapter === 'ZOOM' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingUrl('https://zoom.us/start/videomeeting');
                      window.open('https://zoom.us/start/videomeeting', '_blank', 'noopener,noreferrer');
                      setIsMeetingLaunched(true);
                    }}
                    style={{
                      background: 'none', border: 'none', color: '#38BDF8',
                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline'
                    }}
                  >
                    + Start Instant Zoom Meeting
                  </button>
                )}

                {selectedAdapter === 'MS_TEAMS' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingUrl('https://teams.live.com/meet/');
                      window.open('https://teams.live.com/meet/', '_blank', 'noopener,noreferrer');
                      setIsMeetingLaunched(true);
                    }}
                    style={{
                      background: 'none', border: 'none', color: '#818CF8',
                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline'
                    }}
                  >
                    + Create Instant MS Teams Call
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder={
                    selectedAdapter === 'GOOGLE_MEET' 
                      ? 'https://meet.google.com/...' 
                      : selectedAdapter === 'ZOOM' 
                        ? 'https://zoom.us/j/...' 
                        : 'https://teams.microsoft.com/l/meetup-join/...'
                  }
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                    color: selectedAdapter === 'GOOGLE_MEET' ? '#34D399' : selectedAdapter === 'ZOOM' ? '#38BDF8' : '#818CF8',
                    fontFamily: 'var(--font-mono)', fontSize: '0.85rem'
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleLaunchMeetingUrl}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                  <ExternalLink size={16} /> Open Meeting in New Tab
                </button>
              </div>

              {/* Guidance Info Box */}
              <div style={{
                padding: '10px 12px', borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)',
                marginBottom: '12px', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', marginBottom: '4px', fontWeight: 600 }}>
                  <ShieldCheck size={14} /> 100% Private Ingestion
                </div>
                Launch your {selectedAdapter === 'GOOGLE_MEET' ? 'Google Meet' : selectedAdapter === 'ZOOM' ? 'Zoom' : 'MS Teams'} meeting, then paste dialogue snippets/captions below or upload the post-meeting recording/transcript. Only your account ({userProfile?.email || 'Logged In User'}) will have access to this data.
              </div>

              {isMeetingLaunched && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
                    ● LIVE INTERVIEW INGEST (PASTE DIALOGUE OR LIVE NOTES)
                  </label>
                  <textarea
                    rows={3}
                    value={liveTranscriptNotes}
                    onChange={(e) => setLiveTranscriptNotes(e.target.value)}
                    placeholder="[00:01:00] Interviewer: Could you explain your caching approach? \n[00:01:20] Candidate: We used write-through Redis caching..."
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '10px',
                      background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF', fontSize: '0.82rem'
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Recording File Upload */}
          {selectedAdapter === 'UPLOAD_TRANSCRIPT' && (
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                SELECT INTERVIEW RECORDING / TRANSCRIPT FILE
              </label>
              <input
                type="file"
                accept=".vtt,.srt,.json,.txt,.mp3,.wav,.mp4"
                onChange={(e) => setRecordingFile(e.target.files?.[0])}
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px',
                  background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.82rem'
                }}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleProceed} disabled={loading || jdParsing || resumeParsing}>
            {loading ? (
              'Initializing AI Engine...'
            ) : selectedAdapter === 'LIVE_AI' ? (
              <>
                <Sparkles size={16} /> Start Live Interactive Room
              </>
            ) : (
              <>
                <Zap size={16} /> Run Multi-Agent Evaluation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
