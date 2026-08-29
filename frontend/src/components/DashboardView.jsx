import React, { useState } from 'react';
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

export default function DashboardView({ interviews, onSelectInterview, onOpenCreate }) {
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
    <div style={{ padding: '32px 28px', maxWidth: '1380px', margin: '0 auto' }}>
      {/* Hero Banner */}
      <div className="glass-panel glass-panel-glow" style={{
        padding: '36px 40px',
        marginBottom: '36px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(14, 20, 34, 0.9) 0%, rgba(20, 30, 52, 0.7) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '780px', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="badge badge-cyan">Architected for micro1 Hackathon</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Evidence-First Agentic Loop</span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '14px' }}>
            Transform Real Interview Transcripts into <span style={{ color: 'var(--accent-cyan)' }}>Verified Intelligence</span>
          </h1>
          <p style={{ fontSize: '0.98rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '22px' }}>
            A poor answer is not always a knowledge gap — it is often a retrieval, structure, or communication issue under interview pressure. 
            InterviewLens orchestrates specialized Technical, Communication, and Behavioral agents, fact-checks every claim against verbatim transcript timestamps, and closes the loop with longitudinal memory.
          </p>
          <div style={{ display: 'flex', gap: '14px' }}>
            <button className="btn btn-primary" onClick={onOpenCreate}>
              <Sparkles size={16} /> Analyze New Interview
            </button>
          </div>
        </div>

        {/* Floating Insight Pill */}
        <div className="glass-panel" style={{
          padding: '20px 24px',
          borderRadius: '16px',
          width: '320px',
          background: 'rgba(10, 15, 26, 0.7)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          zIndex: 2
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

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '36px'
      }}>
        {[
          { label: 'Total Interviews Evaluated', value: interviews.length, icon: FileText, color: 'var(--accent-cyan)', note: 'Multi-platform ingestion' },
          { label: 'Average Performance Score', value: `${avgScore} / 10`, icon: Sparkles, color: 'var(--accent-emerald)', note: 'Across 6 evaluation dimensions' },
          { label: 'Fact-Checked Claims', value: `${totalVerifiedClaims} Verified`, icon: ShieldCheck, color: '#A78BFA', note: 'Zero hallucinated feedback' },
          { label: 'Longitudinal Memory', value: 'Active', icon: TrendingUp, color: 'var(--accent-amber)', note: 'Cross-interview pattern tracking' }
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="glass-panel" style={{ padding: '22px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</span>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '6px', marginBottom: '4px', color: '#FFFFFF' }}>{m.value}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.note}</p>
              </div>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: m.color
              }}>
                <Icon size={20} />
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
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Interview Records & Assessments</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Select an interview to view verified agent findings, radar scorecard, and expert review.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
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
                width: '260px'
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
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="REVIEW_REQUIRED">Review Required</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Interview Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
            <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: '14px' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>No interviews found</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Upload a transcript or select a benchmark preset to get started.</p>
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
                className="glass-panel"
                onClick={() => onSelectInterview(item.id)}
                style={{
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderRadius: '16px',
                  gap: '24px'
                }}
              >
                {/* Left info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                  {/* Score Gauge */}
                  <div 
                    className="score-circle" 
                    style={{ 
                      '--score-pct': scorePct,
                      minWidth: '76px', width: '76px', height: '76px' 
                    }}
                  >
                    <div className="score-circle-inner" style={{ width: '64px', height: '64px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: overall >= 8 ? 'var(--accent-emerald)' : overall >= 6.5 ? 'var(--accent-cyan)' : 'var(--accent-amber)' }}>
                        {overall}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>score</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>{item.title}</h3>
                      <span className={`badge ${isCompleted ? 'badge-verified' : 'badge-modified'}`}>
                        {isCompleted ? 'Expert Verified' : 'Review Required'}
                      </span>
                      <span className="badge badge-violet" style={{ fontSize: '0.7rem' }}>
                        {item.platform || 'Upload'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Role: <strong>{item.job_role}</strong> • Candidate: {item.candidate_name || 'Candidate'}
                    </p>

                    {item.executive_summary && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineClamp: 1, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.executive_summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dimension pills & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  {item.scores && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <div style={{ textAlign: 'center', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Technical</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{item.scores.technical_knowledge}</span>
                      </div>
                      <div style={{ textAlign: 'center', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Communication</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{item.scores.communication}</span>
                      </div>
                      <div style={{ textAlign: 'center', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Behavioral</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#C4B5FD' }}>{item.scores.behavioral}</span>
                      </div>
                    </div>
                  )}

                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-cyan)'
                  }}>
                    <ArrowRight size={18} />
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
