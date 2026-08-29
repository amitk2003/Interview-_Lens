import React from 'react';
import { 
  Layers, 
  ShieldCheck, 
  Cpu, 
  MessageSquare, 
  User, 
  Sparkles, 
  Zap, 
  ArrowDown, 
  Database,
  BarChart3,
  Video,
  Key,
  FileText,
  Activity,
  CheckCircle2
} from 'lucide-react';

export default function ArchitectureView() {
  const layers = [
    {
      stage: '01',
      title: 'User & Authentication Layer',
      subtitle: 'Google / Microsoft / GitHub OAuth',
      desc: 'OAuth/OIDC-based verification establishes user identity and explicit per-interview consent for authorized meeting data access.',
      icon: Key,
      color: 'var(--accent-cyan)'
    },
    {
      stage: '02',
      title: 'Interview Workspace',
      subtitle: 'Resume + Job Description + Meeting URL + Metadata',
      desc: 'Context formulation layer holding role expectations, candidate resume background, and meeting identifiers.',
      icon: FileText,
      color: '#38BDF8'
    },
    {
      stage: '03',
      title: 'Meeting Integration Layer (Adapters)',
      subtitle: 'Google Meet Adapter • MS Teams Adapter • Zoom Adapter',
      desc: 'Authorized API connectors with fallback upload adapters. Meeting platforms are treated as data sources.',
      icon: Video,
      color: '#818CF8'
    },
    {
      stage: '04',
      title: 'Live Capture Gateway & Stream Processor',
      subtitle: 'Transcript / Audio • Participant Events • Timestamps',
      desc: 'Ingests real-time or post-session audio/transcript streams with millisecond timestamp markers.',
      icon: Activity,
      color: '#A78BFA'
    },
    {
      stage: '05',
      title: 'Transcript Normalizer',
      subtitle: 'Platform-Agnostic Conversion',
      desc: 'Transforms heterogeneous platform formats (VTT, SRT, JSON, conversational audio) into standard schema: [{speaker, timestamp, text}].',
      icon: Database,
      color: '#C084FC'
    },
    {
      stage: '06',
      title: 'Interview Orchestrator & Specialized Agents',
      subtitle: 'Technical Agent • Communication Agent • Behavioral Agent (STAR)',
      desc: 'Dispatches parallel domain evaluations: technical correctness & JD concept coverage, observable verbal signals (filler words, pauses), and STAR ownership.',
      icon: Cpu,
      color: 'var(--accent-cyan)'
    },
    {
      stage: '07',
      title: 'Evidence Verification Agent',
      subtitle: 'Fact-Checking & Hallucination Elimination',
      desc: 'Cross-references every AI claim against verbatim transcript timestamps. Rejects ungrounded claims and maintains an immutable audit trail.',
      icon: ShieldCheck,
      color: 'var(--accent-emerald)'
    },
    {
      stage: '08',
      title: 'Human Expert Review',
      subtitle: 'AI-Assisted Calibration, Not Black Box Decisions',
      desc: 'Experienced interviewers calibrate scores, agree/modify findings, and add qualified comments.',
      icon: User,
      color: 'var(--accent-amber)'
    },
    {
      stage: '09',
      title: 'Verified Assessment Core',
      subtitle: '6-Dimension Grounded Scorecard',
      desc: 'Synthesizes final verified scorecard with interactive evidence citations.',
      icon: CheckCircle2,
      color: 'var(--accent-emerald)'
    },
    {
      stage: '10',
      title: 'Dual Memory & Diagnostic Branch',
      subtitle: 'Interview Memory Store ⟷ Knowledge vs. Performance Re-Test',
      desc: 'Persists structured session memory while administering calm post-interview re-tests to diagnose retrieval freeze (+delta) vs foundational knowledge gaps.',
      icon: Zap,
      color: 'var(--accent-cyan)'
    },
    {
      stage: '11',
      title: 'Cross-Interview Agent & Candidate Dashboard',
      subtitle: 'Recurring Weaknesses • Improvements • Personalized Roadmap',
      desc: 'Identifies multi-interview trends and generates targeted preparation action items.',
      icon: BarChart3,
      color: '#F472B6'
    }
  ];

  return (
    <div style={{ padding: '32px 28px', maxWidth: '1180px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="glass-panel glass-panel-glow" style={{ padding: '36px', borderRadius: '20px', marginBottom: '36px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span className="badge badge-cyan">Complete Target Architecture</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>micro1 Hackathon Blueprint</span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '10px' }}>
          INTERVIEW<span style={{ color: 'var(--accent-cyan)' }}>LENS</span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '12px' }}>
          Real Interview Capture + Agentic Interview Intelligence
        </p>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: '820px', margin: '0 auto', lineHeight: 1.6 }}>
          An end-to-end verified pipeline: From authorized meeting capture across Google Meet, Microsoft Teams, and Zoom through multi-agent domain evaluation, evidence fact-checking, human expert review, knowledge-vs-performance diagnostic testing, and longitudinal cross-interview memory.
        </p>
      </div>

      {/* Target Flow Diagram */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative' }}>
        {layers.map((layer, idx) => {
          const Icon = layer.icon;
          return (
            <React.Fragment key={layer.stage}>
              <div className="glass-panel" style={{
                padding: '24px 30px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                borderLeft: `4px solid ${layer.color}`,
                background: 'rgba(14, 20, 34, 0.75)'
              }}>
                {/* Stage Badge & Icon */}
                <div style={{
                  width: '56px', height: '56px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: layer.color, flexShrink: 0,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                }}>
                  <Icon size={28} />
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: layer.color, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>
                      STAGE {layer.stage}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>{layer.title}</h3>
                  </div>

                  <strong style={{ fontSize: '0.85rem', color: layer.color, display: 'block', marginBottom: '4px' }}>
                    {layer.subtitle}
                  </strong>

                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {layer.desc}
                  </p>
                </div>
              </div>

              {idx < layers.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0' }}>
                  <ArrowDown size={22} color="var(--border-subtle)" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
