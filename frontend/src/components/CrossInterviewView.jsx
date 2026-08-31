import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Target,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function CrossInterviewView() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/insights/cross-interview`)
      .then(res => res.json())
      .then(data => {
        setInsights(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px auto' }} className="spin-slow" />
        <p style={{ color: 'var(--text-muted)' }}>Synthesizing cross-interview longitudinal memory...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: '1380px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-panel glass-panel-glow" style={{ padding: '32px', borderRadius: '18px', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span className="badge badge-cyan">Longitudinal Intelligence</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Cross-Interview Learning Loop</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
          Interview Memory & Recurring Pattern Analytics
        </h1>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: '820px', lineHeight: 1.6 }}>
          InterviewLens stores structured dimension insights across multiple interviews. The Cross-Interview Agent identifies recurring technical bottlenecks, tracks improving dimensions over time, and generates an adaptive preparation roadmap.
        </p>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Analyzed Sessions</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: 'var(--accent-cyan)' }}>
            {insights?.total_interviews_analyzed || 0} Interviews
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Aggregated across all ingested platform transcripts</p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Detected Recurring Weaknesses</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: 'var(--accent-amber)' }}>
            {insights?.recurring_weaknesses?.length || 0} Patterns
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Cross-cutting technical and communication gaps</p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Consistent Mastered Areas</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: 'var(--accent-emerald)' }}>
            {insights?.top_strengths?.length || 0} Strengths
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>High-scoring competencies across roles</p>
        </div>
      </div>

      {/* Main Breakdown: Recurring Weaknesses & Prep Roadmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Recurring Weaknesses */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <AlertTriangle size={20} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Recurring Weaknesses</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {insights?.recurring_weaknesses?.map((w, idx) => (
              <div key={idx} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '0.92rem', color: '#FFFFFF' }}>{w.title}</strong>
                  <span className="badge badge-modified" style={{ fontSize: '0.68rem' }}>
                    {w.occurrence_count} Sessions
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>{w.description}</p>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px' }}>
                  🎯 <strong>{w.suggested_drill}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Prep Roadmap */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Target size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Prioritized Preparation Roadmap</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {insights?.actionable_prep_roadmap?.map((item, idx) => (
              <div key={idx} style={{ padding: '16px 18px', borderRadius: '12px', background: 'rgba(0, 240, 255, 0.05)', border: '1px solid var(--border-glow)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--accent-cyan)', color: '#050B14',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 800, flexShrink: 0
                }}>
                  {idx + 1}
                </span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
