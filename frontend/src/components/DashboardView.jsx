import React, { useState } from 'react';
import { API_BASE } from '../config';
import { 
  CheckCircle2, 
  Clock, 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  FileText, 
  HelpCircle, 
  Sparkles,
  TrendingUp,
  AlertCircle,
  Video
} from 'lucide-react';

export default function DashboardView({ interviews, userProfile, onSelectInterview, onOpenCreate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filtered = interviews.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.job_role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const avgScore = interviews.length 
    ? (interviews.reduce((acc, curr) => acc + (curr.scores?.overall || 7.0), 0) / interviews.length).toFixed(1)
    : '0.0';

  const totalVerifiedClaims = interviews.reduce((acc, curr) => {
    return acc + (curr.verification_result?.verified_count || 0);
  }, 0);

  return (
    <div className="page-container">
      {/* Privacy Guarantee Pill */}
      <div style={{
        padding: '10px 16px', borderRadius: '12px',
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '8px',
        marginBottom: '20px', fontSize: '0.78rem', color: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px', flex: 1 }}>
          <ShieldCheck size={16} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Private Workspace:</strong> Your transcripts and evaluations are isolated to your account ({userProfile?.email || 'Guest Profile'}).
          </span>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600, flexShrink: 0 }}>
          🔒 End-to-End User Isolation Active
        </span>
      </div>

      {/* Hero Banner */}
      <div className="glass-panel glass-panel-glow hero-card-padding" style={{
        padding: '36px 40px',
        marginBottom: '32px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(14, 20, 34, 0.9) 0%, rgba(20, 30, 52, 0.7) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="hero-flex-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '30px' }}>
          <div style={{ maxWidth: '780px', zIndex: 2 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span className="badge badge-cyan">
                {userProfile ? `Welcome, ${userProfile.name}` : 'Evidence-First Agentic Loop'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                {userProfile?.target_role || 'Target Role Assessment'}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.3rem)', fontWeight: 800, lineHeight: 1.25, marginBottom: '14px' }}>
              Transform Real Interview Transcripts into <span style={{ color: 'var(--accent-cyan)' }}>Verified Intelligence</span>
            </h1>
            <p style={{ fontSize: '0.94rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '22px' }}>
              A poor answer is not always a knowledge gap — it is often a retrieval, structure, or communication issue under interview pressure. 
              InterviewLens orchestrates specialized Technical, Communication, and Behavioral agents, fact-checks every claim against verbatim transcript timestamps, and closes the loop with longitudinal memory.
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={onOpenCreate}>
                <Sparkles size={16} /> Analyze New Interview
              </button>
            </div>
          </div>

          {/* Floating Insight Pill */}
          <div className="glass-panel hero-insight-pill" style={{
            padding: '20px 22px',
            borderRadius: '16px',
            width: '320px',
            background: 'rgba(10, 15, 26, 0.75)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            zIndex: 2,
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-cyan)' }}>
              <TrendingUp size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Key Diagnostic Insight</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--accent-emerald)' }}>Knowledge Gap</strong> vs <strong style={{ color: 'var(--accent-amber)' }}>Performance Gap</strong>: Post-interview re-tests verify if candidates know the answers when calm vs frozen under pressure.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-responsive-cards" style={{ marginBottom: '32px' }}>
        {[
          { label: 'Total Interviews Evaluated', value: interviews.length, icon: FileText, color: 'var(--accent-cyan)', note: 'Multi-platform ingestion' },
          { label: 'Average Performance Score', value: `${avgScore} / 10`, icon: Sparkles, color: 'var(--accent-emerald)', note: 'Across 6 evaluation dimensions' },
          { label: 'Fact-Checked Claims', value: `${totalVerifiedClaims} Verified`, icon: ShieldCheck, color: '#A78BFA', note: 'Zero hallucinated feedback' },
          { label: 'Longitudinal Memory', value: 'Active', icon: TrendingUp, color: 'var(--accent-amber)', note: 'Cross-interview pattern tracking' }
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="glass-panel" style={{ padding: '20px 22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</span>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '4px', marginBottom: '4px', color: '#FFFFFF' }}>{m.value}</h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{m.note}</p>
              </div>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: m.color, flexShrink: 0
              }}>
                <Icon size={19} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Header & Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Interview Records & Assessments</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Select an interview to view verified agent findings, radar scorecard, and expert review.</p>
        </div>

        <div className="search-filter-stack" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by role or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px 14px 10px 38px',
                borderRadius: '10px',
                background: 'rgba(18, 26, 44, 0.6)',
                border: '1px solid var(--border-subtle)',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                minWidth: '220px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(18, 26, 44, 0.6)',
              border: '1px solid var(--border-subtle)',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="REVIEW_REQUIRED">Review Required</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Interview Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ padding: '50px 20px', textAlign: 'center' }}>
            <FileText size={38} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>No interviews found</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>Upload a transcript or select a benchmark preset to get started.</p>
            <button className="btn btn-primary" onClick={onOpenCreate}>Create Interview</button>
          </div>
        ) : (
          filtered.map(item => {
            const overall = item.scores?.overall || 7.0;
            const scorePct = Math.round((overall / 10) * 100);
            const isCompleted = item.status === 'COMPLETED';

            return (
              <div
                key={item.id}
                className="glass-panel interview-card-row"
                onClick={() => onSelectInterview(item.id)}
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderRadius: '16px',
                  gap: '20px'
                }}
              >
                {/* Left info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                  {/* Score Gauge */}
                  <div 
                    className="score-circle" 
                    style={{ 
                      '--score-pct': scorePct,
                      minWidth: '70px', width: '70px', height: '70px',
                      flexShrink: 0
                    }}
                  >
                    <div className="score-circle-inner" style={{ width: '58px', height: '58px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: overall >= 8 ? 'var(--accent-emerald)' : overall >= 6.5 ? 'var(--accent-cyan)' : 'var(--accent-amber)' }}>
                        {overall}
                      </span>
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>score</span>
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#FFFFFF', wordBreak: 'break-word' }}>{item.title}</h3>
                      <span className={`badge ${isCompleted ? 'badge-verified' : 'badge-modified'}`} style={{ fontSize: '0.68rem' }}>
                        {isCompleted ? 'Expert Verified' : 'Review Required'}
                      </span>
                      <span className="badge badge-violet" style={{ fontSize: '0.68rem' }}>
                        {item.platform || 'Upload'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Role: <strong>{item.job_role}</strong> • Candidate: {item.candidate_name || 'Candidate'}
                    </p>

                    {item.executive_summary && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineClamp: 1, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.executive_summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dimension pills & Actions */}
                <div className="interview-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {item.scores && (
                    <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-start' }}>
                      <div style={{ textAlign: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', flex: 1 }}>
                        <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', display: 'block' }}>Tech</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{item.scores.technical_knowledge}</span>
                      </div>
                      <div style={{ textAlign: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', flex: 1 }}>
                        <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', display: 'block' }}>Comm</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{item.scores.communication}</span>
                      </div>
                      <div style={{ textAlign: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', flex: 1 }}>
                        <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', display: 'block' }}>Behavior</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#C4B5FD' }}>{item.scores.behavioral}</span>
                      </div>
                    </div>
                  )}

                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-cyan)',
                    flexShrink: 0
                  }}>
                    <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
