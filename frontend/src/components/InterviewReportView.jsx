import React, { useState } from 'react';
import { API_BASE } from '../config';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Cpu,
  MessageSquare,
  Award,
  HelpCircle,
  Sparkles,
  Zap,
  Quote,
  Send,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function InterviewReportView({ interview, onBack, onUpdateInterview }) {
  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard', 'evidence', 'retest', 'expert_review', 'transcript'
  const [evidenceFilter, setEvidenceFilter] = useState('ALL');

  // Re-test state
  const [retestAnswers, setRetestAnswers] = useState({});
  const [retestSubmitting, setRetestSubmitting] = useState(false);
  const [activeRetestIndex, setActiveRetestIndex] = useState(0);

  // Expert review state
  const [reviewVerdict, setReviewVerdict] = useState(interview.expert_review?.verdict || 'APPROVED');
  const [reviewComments, setReviewComments] = useState(interview.expert_review?.comments || '');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const scores = interview.scores || {
    technical_knowledge: 8.0,
    communication: 7.0,
    answer_structure: 7.0,
    problem_solving: 7.5,
    behavioral: 7.5,
    question_understanding: 8.0,
    overall: 7.5
  };

  const verification = interview.verification_result || {
    total_claims_checked: 0,
    verified_count: 0,
    modified_count: 0,
    rejected_count: 0,
    verification_rate_pct: 100,
    verified_findings: [],
    audit_trail: []
  };

  // Filter evidence claims
  const allFindings = verification.verified_findings || [];
  const filteredFindings = allFindings.filter(f => {
    if (evidenceFilter === 'ALL') return true;
    return f.verification_status === evidenceFilter;
  });

  const handleRetestSubmit = async (questionId) => {
    const answer = retestAnswers[questionId];
    if (!answer || !answer.trim()) {
      alert('Please type your calm re-test answer first.');
      return;
    }

    setRetestSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/interviews/${interview.id}/retest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          candidate_answer: answer
        })
      });

      if (!res.ok) throw new Error('Re-test submission failed');
      const evalResult = await res.json();

      // Refresh interview data locally
      const updated = { ...interview };
      if (!updated.retest_results) updated.retest_results = [];
      updated.retest_results = updated.retest_results.filter(r => r.question_id !== questionId);
      updated.retest_results.push(evalResult);
      onUpdateInterview(updated);
      setRetestSubmitting(false);

    } catch (err) {
      console.error(err);
      alert('Failed to submit re-test');
      setRetestSubmitting(false);
    }
  };

  const handleExpertReviewSubmit = async () => {
    if (!reviewComments.trim()) {
      alert('Please enter reviewer notes or commentary.');
      return;
    }

    setReviewSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/interviews/${interview.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `rev_${Date.now()}`,
          interview_id: interview.id,
          reviewer_name: 'Senior Interview Reviewer',
          verdict: reviewVerdict,
          comments: reviewComments,
          overall_rating: scores.overall
        })
      });

      if (!res.ok) throw new Error('Review submission failed');
      const updatedRec = await res.json();
      onUpdateInterview(updatedRec);
      setReviewSubmitting(false);
      alert('Expert review finalized! Interview status updated to COMPLETED.');
    } catch (err) {
      console.error(err);
      alert('Failed to submit expert review');
      setReviewSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '32px 28px', maxWidth: '1380px', margin: '0 auto' }}>
      {/* Top Navigation / Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
          <ArrowLeft size={16} /> Back to Interviews
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-violet">{interview.platform || 'Upload'}</span>
          <span className={`badge ${interview.status === 'COMPLETED' ? 'badge-verified' : 'badge-modified'}`}>
            {interview.status === 'COMPLETED' ? 'Expert Verified' : 'Review Required'}
          </span>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="glass-panel" style={{ padding: '28px 32px', marginBottom: '28px', borderRadius: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{interview.title}</h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>{interview.job_role}</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '780px', lineHeight: 1.5 }}>
              {interview.executive_summary || 'Multi-agent verified assessment and observable communication signals.'}
            </p>
          </div>

          {/* Overall Score Dial */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              className="score-circle"
              style={{
                '--score-pct': Math.round((scores.overall / 10) * 100),
                width: '84px', height: '84px'
              }}
            >
              <div className="score-circle-inner" style={{ width: '70px', height: '70px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {scores.overall}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.82rem', fontWeight: 700 }}>
                <ShieldCheck size={16} /> {verification.verification_rate_pct}% Grounded
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {verification.verified_count} verified • {verification.rejected_count} rejected claims
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px', flexWrap: 'wrap' }}>
          {[
            { id: 'scorecard', label: '6-Dimension Scorecard', icon: Award },
            { id: 'evidence', label: `Evidence Drawer (${allFindings.length})`, icon: ShieldCheck },
            { id: 'retest', label: `Knowledge vs Performance Re-Test (${interview.retest_questions?.length || 0})`, icon: Zap },
            { id: 'expert_review', label: 'Human / Expert Review', icon: User },
            { id: 'transcript', label: 'Normalized Transcript', icon: MessageSquare }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="btn"
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  fontSize: '0.82rem'
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: 6-DIMENSION SCORECARD */}
      {activeTab === 'scorecard' && (
        <div>
          {/* Dimension Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {[
              { label: 'Technical Knowledge', score: scores.technical_knowledge, icon: Cpu, color: 'var(--accent-cyan)', desc: 'Correctness, system depth, and expected concept coverage against JD' },
              { label: 'Observable Communication', score: scores.communication, icon: MessageSquare, color: 'var(--accent-emerald)', desc: `${interview.communication_analysis?.filler_words_detected || 0} filler words, ${interview.communication_analysis?.clarification_requests_count || 0} clarifications asked` },
              { label: 'Answer Structure & Framing', score: scores.answer_structure, icon: Sparkles, color: '#A78BFA', desc: 'Logical explanation hierarchy and top-down summaries' },
              { label: 'Problem Solving & Decomposition', score: scores.problem_solving, icon: Zap, color: 'var(--accent-amber)', desc: 'Edge case discovery, fault recovery, and architectural trade-offs' },
              { label: 'STAR Behavioral Ownership', score: scores.behavioral, icon: User, color: '#F472B6', desc: `Ownership score: ${interview.behavioral_analysis?.ownership_score || 8.0}/10 ('I' vs 'We' agency)` },
              { label: 'Question Understanding', score: scores.question_understanding, icon: HelpCircle, color: '#38BDF8', desc: 'Directness of address and answering exact interviewer prompts' }
            ].map((d, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <d.icon size={18} color={d.color} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{d.label}</h3>
                  </div>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: d.color }}>{d.score} / 10</span>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ width: `${(d.score / 10) * 100}%`, height: '100%', background: d.color, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{d.desc}</p>
              </div>
            ))}
          </div>

          {/* Detailed Specialized Agent Breakdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Technical Agent Findings */}
            <div className="glass-panel" style={{ padding: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Cpu size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Technical Agent Deep Dive</h3>
              </div>

              {interview.technical_analysis && (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Demonstrated Concepts
                    </span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {interview.technical_analysis.demonstrated_concepts.map((c, i) => (
                        <span key={i} className="badge badge-verified" style={{ fontSize: '0.72rem' }}>✓ {c}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Missing / Struggled Concepts
                    </span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {interview.technical_analysis.missing_concepts.map((c, i) => (
                        <span key={i} className="badge badge-rejected" style={{ fontSize: '0.72rem' }}>✗ {c}</span>
                      ))}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px' }}>
                    {interview.technical_analysis.summary}
                  </p>
                </div>
              )}
            </div>

            {/* Communication & Observable Signals */}
            <div className="glass-panel" style={{ padding: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <MessageSquare size={20} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Observable Communication Signals</h3>
              </div>

              {interview.communication_analysis && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Total Filler Words</span>
                      <strong style={{ fontSize: '1.3rem', color: 'var(--accent-amber)' }}>{interview.communication_analysis.filler_words_detected}</strong>
                    </div>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Clarifications Asked</span>
                      <strong style={{ fontSize: '1.3rem', color: 'var(--accent-emerald)' }}>{interview.communication_analysis.clarification_requests_count}</strong>
                    </div>
                  </div>

                  {interview.communication_analysis.filler_word_breakdown && (
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        Filler Words Breakdown
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {Object.entries(interview.communication_analysis.filler_word_breakdown).map(([k, v], i) => (
                          <span key={i} className="badge badge-violet" style={{ fontSize: '0.72rem' }}>
                            "{k}": {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px' }}>
                    {interview.communication_analysis.summary}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EVIDENCE DRAWER */}
      {activeTab === 'evidence' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Evidence Verification Audit Trail</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Every AI finding is checked against transcript timestamps. Filter by verification status below.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {['ALL', 'VERIFIED', 'MODIFIED', 'REJECTED'].map(f => (
                <button
                  key={f}
                  onClick={() => setEvidenceFilter(f)}
                  className={`badge ${evidenceFilter === f ? 'badge-cyan' : 'btn-secondary'}`}
                  style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.75rem' }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredFindings.map((finding, idx) => {
              const isVer = finding.verification_status === 'VERIFIED';
              const isMod = finding.verification_status === 'MODIFIED';
              return (
                <div key={idx} className="glass-panel" style={{ padding: '20px 24px', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className={`badge ${isVer ? 'badge-verified' : isMod ? 'badge-modified' : 'badge-rejected'}`}>
                          {finding.verification_status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{finding.category}</span>
                      </div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>{finding.title}</h4>
                    </div>

                    {finding.score_impact !== 0 && (
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: finding.score_impact > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                        {finding.score_impact > 0 ? `+${finding.score_impact}` : finding.score_impact} pts
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    {finding.description}
                  </p>

                  {/* Evidence Citations */}
                  {finding.evidence && finding.evidence.map((ev, eIdx) => (
                    <div key={eIdx} style={{
                      padding: '12px 16px',
                      background: 'rgba(0,0,0,0.35)',
                      borderLeft: '3px solid var(--accent-cyan)',
                      borderRadius: '0 8px 8px 0',
                      marginBottom: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Clock size={13} color="var(--accent-cyan)" />
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          [{ev.timestamp}] {ev.speaker?.toUpperCase()}:
                        </span>
                      </div>
                      <p className="mono" style={{ fontSize: '0.82rem', color: '#E0F2FE', fontStyle: 'italic' }}>
                        "{ev.quote}"
                      </p>
                    </div>
                  ))}

                  {finding.verification_notes && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <ShieldCheck size={14} color="var(--accent-emerald)" />
                      <span>{finding.verification_notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: KNOWLEDGE VS PERFORMANCE RE-TEST */}
      {activeTab === 'retest' && (
        <div>
          <div className="glass-panel glass-panel-glow" style={{ padding: '24px 28px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Zap size={22} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Knowledge Gap vs Performance Gap Diagnostic Console</h3>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Did the candidate struggle due to an <strong>actual knowledge deficiency</strong>, or did they experience <strong>retrieval / communication freeze under interview pressure</strong>?
              Answer the re-test below without time constraints. The system calculates the score delta and generates a personalized coaching action!
            </p>
          </div>

          {(!interview.retest_questions || interview.retest_questions.length === 0) ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
              <CheckCircle2 size={36} color="var(--accent-emerald)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '1.1rem' }}>No major technical gaps detected</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>The candidate answered all core technical prompts without significant struggle.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {interview.retest_questions.map((q, idx) => {
                const evalRes = interview.retest_results?.find(r => r.question_id === q.question_id);
                return (
                  <div key={q.question_id} className="glass-panel" style={{ padding: '28px', borderRadius: '16px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <span className="badge badge-cyan" style={{ marginBottom: '6px' }}>{q.topic}</span>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{q.original_question}</h4>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Live Interview Score</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{q.interview_score} / 10</span>
                      </div>
                    </div>

                    {/* Interview Evidence */}
                    <div style={{ padding: '12px 14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', marginBottom: '18px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                        Observed Interview Struggle:
                      </span>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{q.interview_evidence}</p>
                    </div>

                    {/* Retest Prompt */}
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                        ✍️ Calm Re-Test Challenge:
                      </label>
                      <p style={{ fontSize: '0.88rem', color: '#FFFFFF', marginBottom: '10px' }}>{q.retest_prompt}</p>

                      <textarea
                        rows={4}
                        placeholder="Type your detailed, calm answer here..."
                        value={retestAnswers[q.question_id] || ''}
                        onChange={(e) => setRetestAnswers({ ...retestAnswers, [q.question_id]: e.target.value })}
                        disabled={retestSubmitting}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid var(--border-subtle)',
                          color: '#FFFFFF',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>

                    {/* Action Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: evalRes ? '20px' : '0' }}>
                      <button
                        className="btn btn-emerald"
                        onClick={() => handleRetestSubmit(q.question_id)}
                        disabled={retestSubmitting}
                      >
                        <Send size={15} /> {evalRes ? 'Re-Evaluate Answer' : 'Submit for Diagnostic Evaluation'}
                      </button>
                    </div>

                    {/* Evaluation Result Card */}
                    {evalRes && (
                      <div className="glass-panel" style={{
                        padding: '20px 24px',
                        background: evalRes.gap_type === 'PERFORMANCE_GAP' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        border: `1px solid ${evalRes.gap_type === 'PERFORMANCE_GAP' ? 'var(--border-emerald)' : 'rgba(245, 158, 11, 0.3)'}`,
                        borderRadius: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className={`badge ${evalRes.gap_type === 'PERFORMANCE_GAP' ? 'badge-verified' : 'badge-modified'}`}>
                              {evalRes.gap_type === 'PERFORMANCE_GAP' ? '🎯 PERFORMANCE / RETRIEVAL GAP' : '📚 KNOWLEDGE GAP'}
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                              Re-Test Score: {evalRes.retest_score} / 10 ({evalRes.score_delta > 0 ? `+${evalRes.score_delta}` : evalRes.score_delta} delta)
                            </span>
                          </div>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
                          <strong>Diagnosis:</strong> {evalRes.diagnosis}
                        </p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>
                          <strong>{evalRes.recommendation}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HUMAN / EXPERT REVIEW */}
      {activeTab === 'expert_review' && (
        <div className="glass-panel" style={{ padding: '32px', borderRadius: '18px', maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <User size={22} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Human / Expert Reviewer Calibration</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            InterviewLens positions AI as an intelligence accelerator rather than an automated black-box hiring decider. Experienced interviewers review findings, adjust scores, and add qualified comments.
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              EXPERT VERDICT
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { id: 'APPROVED', label: 'Approve AI Findings', color: 'var(--accent-emerald)' },
                { id: 'MODIFIED', label: 'Modify Scores / Findings', color: 'var(--accent-amber)' },
                { id: 'REJECTED', label: 'Reject Assessment', color: 'var(--accent-rose)' }
              ].map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setReviewVerdict(v.id)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: reviewVerdict === v.id ? `2px solid ${v.color}` : '1px solid var(--border-subtle)',
                    background: reviewVerdict === v.id ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.2)',
                    color: reviewVerdict === v.id ? v.color : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              EXPERT COMMENTARY & COACHING NOTES
            </label>
            <textarea
              rows={5}
              placeholder="e.g. Candidate exhibited strong architecture instincts. Concur with AI verifier that concurrency answer requires targeted practice..."
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-subtle)',
                color: '#FFFFFF',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={handleExpertReviewSubmit}
              disabled={reviewSubmitting}
            >
              <CheckCircle2 size={16} /> Finalize Expert Review & Mark Completed
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: NORMALIZED TRANSCRIPT */}
      {activeTab === 'transcript' && (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Normalized Conversational Stream</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {interview.normalized_transcript?.segments?.map((seg, idx) => {
              const isInterviewer = seg.speaker === 'interviewer';
              return (
                <div key={idx} style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: isInterviewer ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255,255,255,0.03)',
                  borderLeft: isInterviewer ? '3px solid var(--accent-cyan)' : '3px solid var(--accent-violet)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>[{seg.timestamp}]</span>
                    <strong style={{ fontSize: '0.82rem', color: isInterviewer ? 'var(--accent-cyan)' : '#C4B5FD', textTransform: 'capitalize' }}>
                      {seg.speaker}
                    </strong>
                    {seg.is_question && <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>Question</span>}
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {seg.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
