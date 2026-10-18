import React, { useState, useMemo } from 'react';
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
  ChevronUp,
  FileText,
  Briefcase,
  Lock,
  Check,
  X,
  ExternalLink,
  Layers,
  ThumbsUp,
  ThumbsDown,
  Scale,
  AlertCircle,
  FileCode,
  Edit3,
  RefreshCw,
  Target,
  Copy
} from 'lucide-react';

export default function InterviewReportView({ 
  interview, 
  onBack, 
  onUpdateInterview, 
  userProfile, 
  initialTab = 'scorecard' 
}) {
  const isExpertUser = userProfile?.role === 'EXPERT';
  const isAdminUser = userProfile?.role === 'ADMIN';
  const isCandidate = !isExpertUser && !isAdminUser;
  const isExpert = isExpertUser || isAdminUser;

  // Independent assignment authorization safeguards
  const isAssignedSpecialist =
    isAdminUser ||
    (isExpertUser && (
      !interview.assigned_expert_id ||
      interview.assigned_expert_id === userProfile?.id ||
      interview.assigned_expert_email === userProfile?.email
    ));

  const isAssignedToOther =
    isExpertUser &&
    !isAdminUser &&
    interview.assigned_expert_id &&
    interview.assigned_expert_id !== userProfile?.id &&
    interview.assigned_expert_email !== userProfile?.email;

  const [activeTab, setActiveTab] = useState(initialTab || 'scorecard'); // 'scorecard', 'evidence', 'retest', 'expert_review', 'transcript'
  const [evidenceFilter, setEvidenceFilter] = useState('ALL');

  // Re-test state
  const [retestAnswers, setRetestAnswers] = useState({});
  const [retestSubmitting, setRetestSubmitting] = useState(false);
  const [activeRetestIndex, setActiveRetestIndex] = useState(0);

  // Human Industry Expert State
  const [expertName, setExpertName] = useState(
    (isExpertUser || isAdminUser) && userProfile?.name
      ? userProfile.name
      : interview.expert_review?.reviewer_name || 'Accredited Industry Expert'
  );
  const [expertTitle, setExpertTitle] = useState(
    (isExpertUser || isAdminUser) && userProfile?.expert_title
      ? userProfile.expert_title
      : interview.expert_review?.reviewer_title || 'Staff Distributed Systems Architect'
  );
  const [reviewVerdict, setReviewVerdict] = useState(interview.expert_review?.verdict || 'APPROVED');
  const [reviewComments, setReviewComments] = useState(interview.expert_review?.comments || '');
  const [calibratedOverallScore, setCalibratedOverallScore] = useState(
    interview.expert_review?.overall_rating || interview.scores?.overall || 7.5
  );
  const [dimensionOverrides, setDimensionOverrides] = useState({
    technical_knowledge: interview.expert_review?.dimension_overrides?.technical_knowledge || interview.scores?.technical_knowledge || 8.0,
    communication: interview.expert_review?.dimension_overrides?.communication || interview.scores?.communication || 7.0,
    answer_structure: interview.expert_review?.dimension_overrides?.answer_structure || interview.scores?.answer_structure || 7.0,
    problem_solving: interview.expert_review?.dimension_overrides?.problem_solving || interview.scores?.problem_solving || 7.5,
    behavioral: interview.expert_review?.dimension_overrides?.behavioral || interview.scores?.behavioral || 7.5,
    question_understanding: interview.expert_review?.dimension_overrides?.question_understanding || interview.scores?.question_understanding || 8.0,
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [requestingReview, setRequestingReview] = useState(false);

  // Independent Claim Auditing & Hallucination Flags
  const [disputedClaimIds, setDisputedClaimIds] = useState(
    interview.expert_review?.disputed_claim_ids || []
  );
  const [verifiedClaimIds, setVerifiedClaimIds] = useState(
    interview.expert_review?.verified_claim_ids || []
  );
  const [claimAuditNotes, setClaimAuditNotes] = useState(
    interview.expert_review?.audit_notes || {}
  );
  const [editingClaimNoteId, setEditingClaimNoteId] = useState(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [evidenceAuditFilter, setEvidenceAuditFilter] = useState('ALL'); // 'ALL' | 'FLAGGED' | 'VERIFIED' | 'DISPUTED'
  const [showFullResume, setShowFullResume] = useState(false);
  const [selectedEvidenceQuestion, setSelectedEvidenceQuestion] = useState(null);

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
    expert_verified_count: 0,
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

  // Extract structured questions with candidate responses from normalized transcript
  const transcriptQuestions = useMemo(() => {
    const segments = interview.normalized_transcript?.segments || [];
    const questions = [];
    let currentQ = null;

    segments.forEach((seg, idx) => {
      if (seg.is_question || seg.speaker === 'interviewer') {
        if (currentQ) questions.push(currentQ);
        currentQ = {
          id: `q_${idx}`,
          questionText: seg.text,
          timestamp: seg.timestamp || '00:00',
          answers: []
        };
      } else if (currentQ && (seg.speaker === 'candidate' || !seg.speaker)) {
        currentQ.answers.push(seg);
      }
    });
    if (currentQ) questions.push(currentQ);
    return questions;
  }, [interview.normalized_transcript]);

  // Flag unsupported claims, modified findings, and possible hallucinations
  const isHallucinationOrUnsupported = (finding) => {
    const status = finding.verification_status;
    const severity = finding.severity;
    const desc = (finding.description || '').toLowerCase();
    const notes = (finding.verification_notes || '').toLowerCase();
    const title = (finding.title || '').toLowerCase();
    return (
      status === 'MODIFIED' ||
      status === 'REJECTED' ||
      status === 'EXPERT_DISPUTED' ||
      severity === 'critical' ||
      (finding.score_impact && finding.score_impact < 0) ||
      notes.includes('unsupported') ||
      notes.includes('hallucination') ||
      notes.includes('contradict') ||
      notes.includes('not grounded') ||
      desc.includes('unsupported') ||
      title.includes('unsupported')
    );
  };

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

  // Human Industry Expert Claim Verification
  const handleVerifyClaim = async (findingId, action) => {
    let comment = null;
    if (action === 'DISPUTE') {
      comment = prompt('Explain why this claim is disputed or hallucinated:', 'Transcript quote does not support this technical claim');
      if (comment === null) return;
    }

    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      const res = await fetch(`${API_BASE}/api/interviews/${interview.id}/claim/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          finding_id: findingId,
          action: action,
          expert_name: expertName,
          expert_title: expertTitle,
          expert_comment: comment
        })
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateInterview(updated);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Verification action failed. Please sign in as a verified expert.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update claim verification status');
    }
  };

  const handleRequestExpertReview = async () => {
    setRequestingReview(true);
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      const res = await fetch(`${API_BASE}/api/interviews/${interview.id}/request-expert-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          domain_tag: interview.job_role || 'Distributed Systems'
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Could not request review');
      }
      const updatedRec = await res.json();
      onUpdateInterview(updatedRec);
      alert('Priority Expert Evaluation requested! A verified architect will review your interview.');
    } catch (err) {
      alert(`Request failed: ${err.message}`);
    } finally {
      setRequestingReview(false);
    }
  };

  const toggleDisputedClaim = (claimId) => {
    setDisputedClaimIds(prev => {
      const exists = prev.includes(claimId);
      if (exists) return prev.filter(id => id !== claimId);
      setVerifiedClaimIds(v => v.filter(id => id !== claimId));
      return [...prev, claimId];
    });
  };

  const toggleVerifiedClaim = (claimId) => {
    setVerifiedClaimIds(prev => {
      const exists = prev.includes(claimId);
      if (exists) return prev.filter(id => id !== claimId);
      setDisputedClaimIds(d => d.filter(id => id !== claimId));
      return [...prev, claimId];
    });
  };

  const handleSaveClaimNote = (claimId) => {
    if (tempNoteText.trim()) {
      setClaimAuditNotes(prev => ({
        ...prev,
        [claimId]: tempNoteText.trim()
      }));
    }
    setEditingClaimNoteId(null);
    setTempNoteText('');
  };

  const handleExpertReviewSubmit = async () => {
    if (!reviewComments.trim()) {
      alert('Please enter expert reviewer notes or commentary.');
      return;
    }

    setReviewSubmitting(true);
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      const res = await fetch(`${API_BASE}/api/interviews/${interview.id}/expert-sign-off`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          id: interview.expert_review?.id || `rev_${Date.now()}`,
          interview_id: interview.id,
          reviewer_name: expertName,
          reviewer_title: expertTitle,
          reviewer_company: userProfile?.expert_organization || 'Accredited Tech Specialist',
          verdict: reviewVerdict,
          comments: reviewComments,
          overall_rating: parseFloat(calibratedOverallScore),
          dimension_overrides: dimensionOverrides,
          override_scores: {
            overall: parseFloat(calibratedOverallScore),
            ...dimensionOverrides
          },
          disputed_claim_ids: disputedClaimIds,
          verified_claim_ids: verifiedClaimIds,
          audit_notes: claimAuditNotes
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Review sign-off failed');
      }
      const updatedRec = await res.json();
      onUpdateInterview(updatedRec);
      setReviewSubmitting(false);
      alert('Industry Expert Sign-Off finalized! Official cryptographic certificate issued.');
    } catch (err) {
      console.error(err);
      alert('Failed to submit expert review: ' + err.message);
      setReviewSubmitting(false);
    }
  };

  const [transitioning, setTransitioning] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [copiedCert, setCopiedCert] = useState(false);

  const lifecycleStatus = interview.lifecycle_status || (
    interview.status === 'COMPLETED' ? 'FINALIZED' :
    interview.assigned_expert_id ? 'ASSIGNED' :
    interview.scores ? 'PENDING_EXPERT_REVIEW' : 'AI_ASSESSMENT_PENDING'
  );

  const originalAiOverall = interview.original_ai_scores?.overall !== undefined
    ? interview.original_ai_scores.overall
    : (interview.original_ai_overall_score !== undefined ? interview.original_ai_overall_score : scores.overall);

  const originalAiScores = interview.original_ai_scores || scores;
  const scoreDelta = Math.round((scores.overall - originalAiOverall) * 10) / 10;

  const getLifecycleBadge = (status) => {
    switch (status) {
      case 'AI_ASSESSMENT_PENDING':
        return { label: 'AI Assessment Pending', bg: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', border: 'rgba(234, 179, 8, 0.3)' };
      case 'PENDING_EXPERT_REVIEW':
        return { label: 'Awaiting Expert Assignment', bg: 'rgba(0, 240, 255, 0.15)', color: 'var(--accent-cyan)', border: 'rgba(0, 240, 255, 0.3)' };
      case 'ASSIGNED':
        return { label: 'Specialist Assigned', bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' };
      case 'IN_REVIEW':
        return { label: 'Active Expert Review', bg: 'rgba(249, 115, 22, 0.15)', color: '#FB923C', border: 'rgba(249, 115, 22, 0.3)' };
      case 'REVISION_REQUIRED':
        return { label: 'Revision Required', bg: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: 'rgba(239, 68, 68, 0.3)' };
      case 'FINALIZED':
        return { label: 'Assessment Finalized', bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'REASSESSMENT_REQUIRED':
        return { label: 'Reassessment Reopened', bg: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' };
      default:
        return { label: status, bg: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: 'rgba(255, 255, 255, 0.2)' };
    }
  };

  const handleTransition = async (targetStatus, defaultReason = '') => {
    let reason = defaultReason;
    if (targetStatus === 'REVISION_REQUIRED') {
      const input = window.prompt('Enter specific revision notes / clarification needed (min 10 characters):');
      if (!input || input.trim().length < 10) {
        if (input !== null) alert('Revision reason is required (min 10 characters).');
        return;
      }
      reason = input.trim();
    }
    setTransitioning(true);
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      const res = await fetch(`${API_BASE}/api/interviews/${interview.id}/lifecycle/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ target_status: targetStatus, reason })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Status transition failed');
      }
      const data = await res.json();
      onUpdateInterview({
        ...interview,
        lifecycle_status: data.current_status,
        status_history: data.status_history,
        revision_requested_reason: targetStatus === 'REVISION_REQUIRED' ? reason : interview.revision_requested_reason
      });
    } catch (err) {
      alert('Transition error: ' + err.message);
    } finally {
      setTransitioning(false);
    }
  };

  const handleReleaseReport = async () => {
    if (!window.confirm('Release this finalized evaluation report to the candidate? They will be able to view calibrated scores, expert feedback, and cryptographic verification.')) return;
    setReleasing(true);
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      const res = await fetch(`${API_BASE}/api/interviews/${interview.id}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ notes: 'Official evaluation released by reviewer' })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Release failed');
      }
      const data = await res.json();
      onUpdateInterview({
        ...interview,
        is_released_to_candidate: true,
        released_at: data.released_at,
        released_by: data.released_by
      });
      alert('Official assessment report released to candidate!');
    } catch (err) {
      alert('Release error: ' + err.message);
    } finally {
      setReleasing(false);
    }
  };

  const handleReassessment = async () => {
    const reason = window.prompt('Enter justification reason for reopening this assessment for reassessment (min 5 characters):');
    if (!reason || reason.trim().length < 5) {
      if (reason !== null) alert('Reassessment reason is required (min 5 characters).');
      return;
    }
    setTransitioning(true);
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      const res = await fetch(`${API_BASE}/api/interviews/${interview.id}/reassessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Reassessment request failed');
      }
      const data = await res.json();
      onUpdateInterview({
        ...interview,
        lifecycle_status: data.lifecycle_status,
        reassessment_reason: data.reassessment_reason
      });
      alert('Assessment successfully reopened for reassessment.');
    } catch (err) {
      alert('Reassessment error: ' + err.message);
    } finally {
      setTransitioning(false);
    }
  };

  const statusBadgeInfo = getLifecycleBadge(lifecycleStatus);

  return (
    <div className="page-container">
      {/* Top Navigation / Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
          <ArrowLeft size={16} /> Back to Interviews
        </button>

        {/* Lifecycle Badges & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Explicit Validated Lifecycle Badge */}
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: statusBadgeInfo.bg,
              color: statusBadgeInfo.color,
              border: `1px solid ${statusBadgeInfo.border}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={14} />
            {statusBadgeInfo.label}
          </span>

          {/* Release Status Badge */}
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: interview.is_released_to_candidate ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.12)',
              color: interview.is_released_to_candidate ? 'var(--accent-emerald)' : '#EAB308',
              border: `1px solid ${interview.is_released_to_candidate ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.25)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {interview.is_released_to_candidate ? <CheckCircle2 size={13} /> : <Lock size={13} />}
            {interview.is_released_to_candidate ? 'Released to Candidate' : 'Unreleased'}
          </span>

          {/* Lifecycle Action Buttons for Expert/Admin */}
          {(isAssignedSpecialist || isAdminUser) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {lifecycleStatus === 'ASSIGNED' && (
                <button
                  onClick={() => handleTransition('IN_REVIEW', 'Expert initiated active evidence audit')}
                  disabled={transitioning}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
                >
                  <Cpu size={14} /> Start Review Audit
                </button>
              )}

              {lifecycleStatus === 'IN_REVIEW' && (
                <button
                  onClick={() => handleTransition('REVISION_REQUIRED')}
                  disabled={transitioning}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  <AlertTriangle size={14} /> Request Revision
                </button>
              )}

              {lifecycleStatus === 'REVISION_REQUIRED' && (
                <button
                  onClick={() => handleTransition('IN_REVIEW', 'Revision reviewed and resolved')}
                  disabled={transitioning}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
                >
                  <RefreshCw size={14} /> Resume Review
                </button>
              )}

              {lifecycleStatus === 'FINALIZED' && !interview.is_released_to_candidate && (
                <button
                  onClick={handleReleaseReport}
                  disabled={releasing}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}
                >
                  <Send size={14} /> {releasing ? 'Releasing...' : 'Release to Candidate'}
                </button>
              )}

              {lifecycleStatus === 'FINALIZED' && (
                <button
                  onClick={handleReassessment}
                  disabled={transitioning}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', color: '#C084FC', borderColor: 'rgba(168, 85, 247, 0.3)' }}
                >
                  <RefreshCw size={14} /> Reopen Reassessment
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="glass-panel modal-inner-padding" style={{ padding: '28px 32px', marginBottom: '28px', borderRadius: '18px' }}>
        <div className="report-header-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 800 }}>{interview.title}</h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>{interview.job_role}</span>
              {interview.candidate_name && (
                <span className="badge badge-violet" style={{ fontSize: '0.75rem' }}>Candidate: {interview.candidate_name}</span>
              )}
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '780px', lineHeight: 1.5 }}>
              {interview.executive_summary || 'Multi-agent verified assessment and observable communication signals.'}
            </p>
          </div>

          {/* Overall Score Dial */}
          <div className="report-score-group" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              className="score-circle"
              style={{
                '--score-pct': Math.round((scores.overall / 10) * 100),
                width: '84px', height: '84px', flexShrink: 0
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.82rem', fontWeight: 700, justifyContent: 'flex-end' }}>
                <ShieldCheck size={16} /> {verification.verification_rate_pct}% Grounded
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {verification.verified_count} verified • {verification.rejected_count} rejected claims
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Swipeable on touch/mobile) */}
        <div className="scrollable-tabs" style={{ marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
          {[
            { id: 'final_report', label: '📄 Official Candidate Report', icon: FileText },
            { id: 'scorecard', label: '6-Dimension Scorecard', icon: Award },
            { id: 'evidence', label: `Evidence Drawer (${allFindings.length})`, icon: ShieldCheck },
            { id: 'retest', label: `Knowledge vs Performance Re-Test (${interview.retest_questions?.length || 0})`, icon: Zap },
            { id: 'expert_review', label: isExpert ? '🛡️ Expert Verification Console' : (interview.expert_review ? '🛡️ Official Sign-Off Certificate' : '🛡️ Industry Expert Verification'), icon: ShieldCheck },
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

      {/* TAB 0: OFFICIAL CANDIDATE FINAL REPORT */}
      {activeTab === 'final_report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Candidate Unreleased Gate */}
          {isCandidate && !interview.is_released_to_candidate ? (
            <div
              className="glass-panel"
              style={{
                padding: '44px 32px',
                textAlign: 'center',
                borderRadius: '18px',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.05) 0%, rgba(13, 17, 23, 0.6) 100%)'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(234, 179, 8, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  color: '#EAB308',
                  boxShadow: '0 0 25px rgba(234, 179, 8, 0.2)'
                }}
              >
                <Lock size={32} />
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '12px' }}>
                Official Evaluation Report Pending Release
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto 24px', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Your assessment has completed multi-agent AI evidence grounding and is currently being audited and calibrated by an independent, accredited Industry Specialist.
                In accordance with InterviewLens verification standards, the final calibrated score, verified strengths, and expert feedback will unlock once officially released.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '30px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                <Clock size={16} color="var(--accent-cyan)" /> Current Assessment Status: <strong style={{ color: statusBadgeInfo.color }}>{statusBadgeInfo.label}</strong>
              </div>
            </div>
          ) : (
            <>
              {/* Report Header & Cryptographic Certificate Seal */}
              <div
                className="glass-panel"
                style={{
                  padding: '28px 32px',
                  borderRadius: '18px',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.06) 0%, rgba(13, 17, 23, 0.8) 100%)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <ShieldCheck size={20} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        Official InterviewLens Verified Assessment Report
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>
                      Candidate Evaluation: {interview.candidate_name || 'Interview Candidate'}
                    </h2>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      Target Role: <strong style={{ color: '#fff' }}>{interview.job_role}</strong> • Review Completed: <strong style={{ color: '#fff' }}>{interview.released_at ? new Date(interview.released_at).toLocaleDateString() : (interview.expert_review?.reviewed_at ? new Date(interview.expert_review.reviewed_at).toLocaleDateString() : new Date().toLocaleDateString())}</strong>
                    </p>
                  </div>

                  {/* Certificate ID Pill with Copy */}
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                      Cryptographic Certificate ID
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                        {interview.expert_review?.sign_off_certificate_id || 'CERT-HITL-7E81A4-2026'}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(interview.expert_review?.sign_off_certificate_id || 'CERT-HITL-7E81A4-2026');
                          setCopiedCert(true);
                          setTimeout(() => setCopiedCert(false), 2000);
                        }}
                        className="btn"
                        style={{ padding: '4px', background: 'transparent', color: copiedCert ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
                        title="Copy Certificate Hash"
                      >
                        {copiedCert ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Score Calibration Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Original AI Score Card */}
                <div
                  className="glass-panel"
                  style={{
                    padding: '24px 28px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={18} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Original Multi-Agent AI Score</span>
                    </div>
                    <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>94% Confidence</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                      {originalAiOverall}
                    </span>
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '10px' }}>
                    {interview.original_ai_summary || interview.executive_summary || 'Initial multi-agent evaluation synthesized from observable evidence.'}
                  </p>
                </div>

                {/* Final Calibrated Expert Score Card */}
                <div
                  className="glass-panel"
                  style={{
                    padding: '24px 28px',
                    borderRadius: '16px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.06) 0%, rgba(13, 17, 23, 0.6) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award size={18} color="var(--accent-emerald)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>Final Expert-Calibrated Score</span>
                    </div>
                    <span className={`badge ${interview.expert_review?.verdict === 'APPROVED' ? 'badge-verified' : (interview.expert_review?.verdict === 'MODIFIED' ? 'badge-amber' : 'badge-modified')}`}>
                      Verdict: {interview.expert_review?.verdict || 'APPROVED'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-emerald)' }}>
                      {scores.overall}
                    </span>
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: scoreDelta > 0 ? 'rgba(16, 185, 129, 0.2)' : (scoreDelta < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.06)'),
                        color: scoreDelta > 0 ? 'var(--accent-emerald)' : (scoreDelta < 0 ? '#F87171' : 'var(--text-secondary)')
                      }}
                    >
                      {scoreDelta > 0 ? `+${scoreDelta} pts Calibration` : (scoreDelta < 0 ? `${scoreDelta} pts Calibration` : 'Exact AI Agreement')}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '10px' }}>
                    {interview.expert_review?.comments ? `"${interview.expert_review.comments.slice(0, 160)}${interview.expert_review.comments.length > 160 ? '...' : ''}"` : 'Audited and verified by accredited specialist.'}
                  </p>
                </div>
              </div>

              {/* Competency Breakdown Comparison Table */}
              <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={18} color="var(--accent-cyan)" /> Competency Breakdown (Original AI vs Calibrated)
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { key: 'technical_knowledge', label: 'Technical Depth & Fundamentals', ai: originalAiScores.technical_knowledge, final: scores.technical_knowledge, icon: Cpu },
                    { key: 'communication', label: 'Communication Clarity & Signal Ratio', ai: originalAiScores.communication, final: scores.communication, icon: MessageSquare },
                    { key: 'answer_structure', label: 'Answer Framing & Structure', ai: originalAiScores.answer_structure, final: scores.answer_structure, icon: Sparkles },
                    { key: 'problem_solving', label: 'Problem Solving & Edge Case Discovery', ai: originalAiScores.problem_solving, final: scores.problem_solving, icon: Zap },
                    { key: 'behavioral', label: 'STAR Behavioral Ownership & Agency', ai: originalAiScores.behavioral, final: scores.behavioral, icon: User },
                    { key: 'question_understanding', label: 'Question Understanding & Directness', ai: originalAiScores.question_understanding, final: scores.question_understanding, icon: HelpCircle }
                  ].map(dim => {
                    const delta = Math.round((dim.final - dim.ai) * 10) / 10;
                    const DimIcon = dim.icon;
                    return (
                      <div
                        key={dim.key}
                        style={{
                          padding: '14px 18px',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                          <DimIcon size={16} color="var(--accent-cyan)" />
                          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{dim.label}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>AI Score</span>
                            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{dim.ai}</span>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', display: 'block' }}>Final Score</span>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{dim.final}</span>
                          </div>

                          <span
                            style={{
                              minWidth: '55px',
                              textAlign: 'center',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: delta > 0 ? 'rgba(16, 185, 129, 0.15)' : (delta < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)'),
                              color: delta > 0 ? 'var(--accent-emerald)' : (delta < 0 ? '#F87171' : 'var(--text-muted)')
                            }}
                          >
                            {delta > 0 ? `+${delta}` : (delta < 0 ? `${delta}` : '0.0')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Verified Strengths and Weaknesses */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Verified Strengths */}
                <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} /> Verified Strengths Grounded in Evidence
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {allFindings
                      .filter(f => f.verification_status === 'VERIFIED' || f.verification_status === 'EXPERT_VERIFIED')
                      .slice(0, 4)
                      .map((f, idx) => (
                        <div key={idx} style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginBottom: '4px' }}>{f.title}</strong>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{f.description}</p>
                          {f.evidence && f.evidence[0] && (
                            <blockquote style={{ fontSize: '0.74rem', color: 'var(--text-muted)', borderLeft: '2px solid var(--accent-emerald)', paddingLeft: '8px', marginTop: '6px', fontStyle: 'italic' }}>
                              "{f.evidence[0].quote.slice(0, 110)}..."
                            </blockquote>
                          )}
                        </div>
                      ))}
                    {allFindings.filter(f => f.verification_status === 'VERIFIED' || f.verification_status === 'EXPERT_VERIFIED').length === 0 && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Solid fundamental consistency demonstrated across primary answers.</p>
                    )}
                  </div>
                </div>

                {/* Verified Areas for Improvement */}
                <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={18} /> Verified Growth Areas & Edge Cases
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {allFindings
                      .filter(f => isHallucinationOrUnsupported(f))
                      .slice(0, 4)
                      .map((f, idx) => (
                        <div key={idx} style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginBottom: '4px' }}>{f.title}</strong>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{f.description}</p>
                          {f.verification_notes && (
                            <p style={{ fontSize: '0.74rem', color: 'var(--accent-amber)', marginTop: '6px', margin: 0 }}>
                              <strong>Audit Note:</strong> {f.verification_notes}
                            </p>
                          )}
                        </div>
                      ))}
                    {allFindings.filter(f => isHallucinationOrUnsupported(f)).length === 0 && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No critical edge case failures or hallucinated claims detected.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Expert Commentary & Recommendations */}
              <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Quote size={18} color="var(--accent-cyan)" /> Expert Feedback & Targeted Recommendations
                </h3>

                <blockquote style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.6, padding: '16px 20px', borderRadius: '12px', background: 'rgba(0, 240, 255, 0.04)', borderLeft: '4px solid var(--accent-cyan)', marginBottom: '18px' }}>
                  {interview.expert_review?.comments || 'Candidate demonstrated competent grasp of core architectural concepts with solid communication and problem framing.'}
                </blockquote>

                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '10px' }}>
                  Strategic Preparation Next Steps:
                </h4>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', margin: 0 }}>
                  <li style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    Deepen failure-mode decomposition when architecting multi-region replication layers.
                  </li>
                  <li style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    State assumptions around CAP trade-offs explicitly prior to specifying partition recovery strategies.
                  </li>
                  <li style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    Practice STAR framing on team conflict and ambiguity to raise behavioral ownership signals above 8.5/10.
                  </li>
                </ul>
              </div>

              {/* Disputed Claims & Limitations (Zero Hallucination Proof) */}
              {disputedClaimIds.length > 0 && (
                <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', color: '#F87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} /> Limitations & Disputed Claims ({disputedClaimIds.length})
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    The reviewing expert reviewed initial AI claim interpretations and recorded the following disagreements to prevent ungrounded scoring:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {disputedClaimIds.map(claimId => {
                      const finding = allFindings.find(f => f.id === claimId);
                      const note = claimAuditNotes[claimId] || finding?.verification_notes || 'Disputed as ungrounded evidence.';
                      return (
                        <div key={claimId} style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.82rem' }}>
                          <strong style={{ color: '#fff' }}>{finding?.title || claimId}:</strong> <span style={{ color: '#FCA5A5' }}>{note}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reviewer Credentials (Privacy Compliant) */}
              <div
                className="glass-panel"
                style={{
                  padding: '20px 24px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <ShieldCheck size={16} color="var(--accent-emerald)" />
                    <strong style={{ fontSize: '0.88rem', color: '#fff' }}>
                      {interview.expert_review?.reviewer_name || interview.assigned_expert_name || 'Accredited Specialist'}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      • {interview.expert_review?.reviewer_title || interview.assigned_expert_title || 'Staff Distributed Systems Architect'} ({interview.expert_review?.reviewer_company || 'Tier-1 Enterprise'})
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                    🔒 Direct personal contact information withheld pursuant to InterviewLens candidate protection and unbiased assessment policy.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => window.print()}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                  >
                    Print / Export Report
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 1: 6-DIMENSION SCORECARD */}
      {activeTab === 'scorecard' && (
        <div>
          {/* Dimension Grid */}
          <div className="grid-responsive-cards" style={{ marginBottom: '28px' }}>
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
          <div className="grid-responsive-2">
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Evidence Verification Audit Trail</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Every AI finding is checked against transcript timestamps. Filter by verification status below.
              </p>
            </div>

            <div className="scrollable-tabs" style={{ gap: '8px' }}>
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

                  {/* Industry Expert Grounding & Audit Controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={14} color="var(--accent-emerald)" />
                      <span>{finding.verification_notes || 'Verifiable transcript alignment.'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {finding.verification_status !== 'EXPERT_VERIFIED' ? (
                        <button
                          onClick={() => handleVerifyClaim(finding.id, 'VERIFY')}
                          style={{
                            padding: '5px 12px', borderRadius: '6px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid var(--accent-emerald)',
                            color: 'var(--accent-emerald)',
                            fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          ✓ Confirm by Expert
                        </button>
                      ) : (
                        <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                          ✓ Expert Verified
                        </span>
                      )}

                      {finding.verification_status !== 'EXPERT_DISPUTED' ? (
                        <button
                          onClick={() => handleVerifyClaim(finding.id, 'DISPUTE')}
                          style={{
                            padding: '5px 12px', borderRadius: '6px',
                            background: 'rgba(244, 63, 94, 0.12)',
                            border: '1px solid var(--accent-rose)',
                            color: 'var(--accent-rose)',
                            fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          ✕ Flag as Hallucination
                        </button>
                      ) : (
                        <span className="badge badge-rose" style={{ fontSize: '0.72rem' }}>
                          ✕ Expert Disputed
                        </span>
                      )}
                    </div>
                  </div>
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
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
          {/* ==============================================================
             BRANCH A: CANDIDATE VIEW (STRICTLY PREVENT SELF-REVIEW)
             ============================================================== */}
          {isCandidate ? (
            <div>
              {interview.expert_review ? (
                /* OFFICIAL CERTIFICATE OF VERIFICATION */
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 11, 20, 0.95) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '20px',
                  padding: '36px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Watermark Seal */}
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    border: '2px dashed rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}>
                    <ShieldCheck size={90} color="rgba(16, 185, 129, 0.18)" />
                  </div>

                  {/* Header Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '22px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34D399',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          letterSpacing: '0.05em'
                        }}>
                          OFFICIAL HITL CERTIFICATION
                        </span>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ID: {interview.expert_review.sign_off_certificate_id || `CERT-HITL-${interview.id.slice(-8).toUpperCase()}`}
                        </span>
                      </div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        Independent Industry Expert Evaluation
                      </h2>
                    </div>

                    <div style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      background: interview.expert_review.verdict === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : interview.expert_review.verdict === 'MODIFIED' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${interview.expert_review.verdict === 'APPROVED' ? 'rgba(16, 185, 129, 0.4)' : interview.expert_review.verdict === 'MODIFIED' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                      textAlign: 'right'
                    }}>
                      <div style={{ fontSize: '0.7rem', color: interview.expert_review.verdict === 'APPROVED' ? '#34D399' : interview.expert_review.verdict === 'MODIFIED' ? '#FBBF24' : '#F87171', fontWeight: 700 }}>
                        FINAL VERDICT
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>
                        {interview.expert_review.verdict}
                      </div>
                    </div>
                  </div>

                  {/* Reviewer Credentials */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    marginBottom: '22px'
                  }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: '#10B981', color: '#050B14',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1.05rem'
                    }}>
                      {interview.expert_review.reviewer_name?.[0] || 'E'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '0.98rem', color: '#FFFFFF' }}>
                          {interview.expert_review.reviewer_name}
                        </strong>
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', fontWeight: 700 }}>
                          VERIFIED SPECIALIST
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {interview.expert_review.reviewer_title} {interview.expert_review.reviewer_company ? `• ${interview.expert_review.reviewer_company}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Score Calibrated Diff */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                    marginBottom: '22px'
                  }}>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        AI Baseline Score
                      </span>
                      <strong style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>
                        {interview.scores?.overall || 7.5} <span style={{ fontSize: '0.82rem', fontWeight: 400 }}>/ 10</span>
                      </strong>
                    </div>

                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <span style={{ fontSize: '0.74rem', color: '#34D399', display: 'block', marginBottom: '4px' }}>
                        Expert Calibrated Rating
                      </span>
                      <strong style={{ fontSize: '1.5rem', color: '#10B981' }}>
                        {interview.expert_review.overall_rating || calibratedOverallScore} <span style={{ fontSize: '0.82rem', fontWeight: 400 }}>/ 10</span>
                      </strong>
                    </div>

                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Cryptographic Status
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} color="#10B981" /> Verified & Sealed
                      </strong>
                    </div>
                  </div>

                  {/* Expert Commentary */}
                  <div style={{
                    padding: '20px 22px',
                    borderRadius: '14px',
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    marginBottom: '18px'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                      Industry Expert Technical Audit Findings:
                    </span>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
                      "{interview.expert_review.comments}"
                    </p>
                  </div>

                  {/* Footer Notice */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <ShieldCheck size={16} color="#10B981" />
                    <span>This verification certificate confirms that an accredited technical specialist conducted independent claim-grounding on candidate transcripts.</span>
                  </div>
                </div>
              ) : interview.verification_status === 'AWAITING_EXPERT_REVIEW' || interview.verification_status === 'IN_EXPERT_REVIEW' ? (
                /* IN PROGRESS REVIEW STATUS */
                <div style={{
                  padding: '42px 36px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(5, 11, 20, 0.9) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '16px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 18px auto'
                  }}>
                    <Clock size={30} color="#F59E0B" />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '10px' }}>
                    Independent Expert Evaluation in Progress
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
                    Your interview transcript and preliminary AI findings are currently undergoing independent dual-blind audit.
                    {interview.assigned_expert_name ? (
                      <span style={{ display: 'block', marginTop: '8px', color: '#FCD34D' }}>
                        Assigned Specialist: <strong>{interview.assigned_expert_name}</strong> ({interview.assigned_expert_title || 'Staff Technical Lead'}).
                      </span>
                    ) : (
                      ' An accredited domain specialist is auditing timestamps and grounding claims.'
                    )}
                  </p>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontSize: '0.8rem', fontWeight: 700 }}>
                    <Clock size={15} /> STATUS: {interview.verification_status} • Standard 48h Turnaround SLA
                  </div>
                </div>
              ) : (
                /* REQUEST EXPERT REVIEW CARD */
                <div style={{
                  padding: '42px 36px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.07) 0%, rgba(5, 11, 20, 0.9) 100%)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '16px',
                    background: 'rgba(0, 240, 255, 0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 18px auto'
                  }}>
                    <ShieldCheck size={32} color="var(--accent-cyan)" />
                  </div>
                  <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '10px' }}>
                    Request Independent Industry Expert Evaluation
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 28px auto', lineHeight: 1.6 }}>
                    Elevate your assessment with an official audit by accredited engineering leaders from top tech firms. 
                    Receive calibrated dimensional scores, production architecture feedback, and a cryptographic Certificate of Sign-Off.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', maxWidth: '680px', margin: '0 auto 30px auto', textAlign: 'left' }}>
                    <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                      <strong style={{ fontSize: '0.84rem', color: 'var(--accent-cyan)', display: 'block', marginBottom: '4px' }}>
                        1. Anti-Hallucination Audit
                      </strong>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Human experts check transcript timestamps to ensure every claim is grounded and free of exaggeration.
                      </span>
                    </div>

                    <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#10B981', display: 'block', marginBottom: '4px' }}>
                        2. Calibrated Ratings
                      </strong>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Scores adjusted to discount keyword stuffing and reward genuine real-world systems intuition.
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleRequestExpertReview}
                    disabled={requestingReview}
                    style={{ padding: '14px 32px', fontSize: '0.92rem' }}
                  >
                    <ShieldCheck size={18} /> {requestingReview ? 'Submitting to Queue...' : 'Request Priority Expert Sign-Off'}
                  </button>
                </div>
              )}
            </div>
          ) : isAssignedToOther ? (
            /* ==============================================================
               BRANCH B: EXPERT NOT ASSIGNED TO THIS ASSESSMENT
               ============================================================== */
            <div style={{
              padding: '42px 36px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.07) 0%, rgba(5, 11, 20, 0.95) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px auto'
              }}>
                <Lock size={30} color="#F87171" />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '10px' }}>
                Assessment Assigned to Another Domain Specialist
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
                Under InterviewLens audit integrity rules, each candidate assessment is assigned to a designated verified specialist. 
                This assessment is assigned to:
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                marginBottom: '26px'
              }}>
                <User size={18} color="#F87171" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {interview.assigned_expert_name || interview.assigned_expert_email || 'Another Verified Expert'}
                </span>
                {interview.assigned_expert_title && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    • {interview.assigned_expert_title}
                  </span>
                )}
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                You cannot edit calibration sliders or submit a sign-off for this assessment.
              </p>

              <button className="btn btn-secondary" onClick={onBack} style={{ padding: '10px 22px', fontSize: '0.85rem' }}>
                Return to My Assigned Review Queue
              </button>
            </div>
          ) : (
            /* ==============================================================
               BRANCH C: UPGRADED HUMAN INDUSTRY EXPERT VERIFICATION CONSOLE
               ============================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
              {/* CONSOLE HEADER & CREDENTIALS */}
              <div className="glass-panel modal-inner-padding" style={{ padding: '28px 32px', borderRadius: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: 'rgba(0, 240, 255, 0.12)', border: '1px solid rgba(0, 240, 255, 0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <ShieldCheck size={24} color="var(--accent-cyan)" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                        Industry Expert Recalibration Console
                      </h2>
                      <span style={{ fontSize: '0.76rem', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.05em' }}>
                        HITL DUAL-PASS AUDIT & INDEPENDENT ACCREDITATION
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {interview.expert_review ? (
                      <span className="badge badge-emerald" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        ✓ Previously Signed Off ({interview.expert_review.verdict})
                      </span>
                    ) : (
                      <span className="badge badge-amber" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        Pending Expert Calibration
                      </span>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
                  As an accredited industry specialist, audit the candidate's transcript timestamps, verify grounded claims against potential hallucinations, recalibrate dimensional scores for real-world production standards, and issue an official cryptographic Certificate of Sign-Off.
                </p>

                {/* Expert Reviewer Identity Pill */}
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: 'var(--accent-cyan)', color: '#050B14',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.95rem'
                    }}>
                      {userProfile?.name ? userProfile.name[0] : 'E'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '0.94rem', color: '#FFFFFF' }}>
                          {expertName}
                        </strong>
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0, 240, 255, 0.15)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                          ACCREDITED SPECIALIST
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {expertTitle} {userProfile?.expert_organization ? `• ${userProfile.expert_organization}` : ''}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Turnaround SLA</span>
                      <span style={{ fontSize: '0.82rem', color: '#10B981', fontWeight: 700 }}>Standard 48h</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Specialist Rating</span>
                      <span style={{ fontSize: '0.82rem', color: '#FBBF24', fontWeight: 700 }}>
                        {userProfile?.expert_rating || 4.96} ★
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1: CANDIDATE SUMMARY */}
              <div className="glass-panel" style={{ padding: '26px 30px', borderRadius: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <User size={20} color="var(--accent-cyan)" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                      1. Candidate Profile & Target Competencies
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Interview Platform: <strong style={{ color: 'var(--accent-cyan)' }}>{interview.platform || 'Direct Upload'}</strong>
                  </span>
                </div>

                {/* Candidate Overview Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '14px',
                  marginBottom: '20px'
                }}>
                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Candidate Name</span>
                    <strong style={{ fontSize: '0.98rem', color: '#FFFFFF' }}>{interview.candidate_name || 'Alex Chen'}</strong>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Target Job Role</span>
                    <strong style={{ fontSize: '0.98rem', color: 'var(--accent-cyan)' }}>{interview.job_role || 'Senior Distributed Systems Engineer'}</strong>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Assessment ID</span>
                    <strong className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{interview.id}</strong>
                  </div>
                </div>

                {/* Target Competencies & Required Concepts */}
                <div style={{ marginBottom: '18px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '10px' }}>
                    Required Technical Competencies & Expected Architectural Signals:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(interview.technical_analysis?.expected_concepts?.length 
                      ? interview.technical_analysis.expected_concepts 
                      : ['Distributed Consensus & Raft', 'Horizontal Sharding & Partitioning', 'Failure Recovery & Retries', 'High Availability & SLA Guarantees', 'CAP Theorem Trade-Offs', 'Observable Metrics & Telemetry']
                    ).map((concept, idx) => (
                      <span key={idx} style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(0, 240, 255, 0.08)',
                        border: '1px solid rgba(0, 240, 255, 0.25)',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.76rem',
                        fontWeight: 600
                      }}>
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Collapsible Resume & Relevant Projects */}
                <div style={{
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowFullResume(!showFullResume)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 600
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="var(--accent-cyan)" />
                      <span>Candidate Resume & Relevant Engineering Projects</span>
                    </div>
                    {showFullResume ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showFullResume && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.4)' }}>
                      {interview.resume_text ? (
                        <pre style={{
                          margin: 0,
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit',
                          lineHeight: 1.5,
                          maxHeight: '260px',
                          overflowY: 'auto'
                        }}>
                          {interview.resume_text}
                        </pre>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.6 }}>
                          <p style={{ margin: '0 0 8px 0' }}>
                            <strong style={{ color: '#FFFFFF' }}>Candidate Background:</strong> 6+ years building distributed backend services, high-throughput message brokers, and low-latency storage engines.
                          </p>
                          <p style={{ margin: 0 }}>
                            <strong style={{ color: '#FFFFFF' }}>Demonstrated Projects:</strong> Distributed Raft cluster implementation in Go, multi-region database sharding layer, and real-time Kafka streaming platform.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: INTERVIEW EVIDENCE & ANTI-HALLUCINATION AUDIT */}
              <div className="glass-panel" style={{ padding: '26px 30px', borderRadius: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={20} color="var(--accent-emerald)" />
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                        2. Interview Evidence & Anti-Hallucination Audit
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Inspect interview questions, timestamped answers, and flag unsupported claims or hallucinations
                      </span>
                    </div>
                  </div>

                  {/* Audit Counters Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34D399',
                      fontWeight: 700
                    }}>
                      ✓ {verifiedClaimIds.length} Human Verified
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#F87171',
                      fontWeight: 700
                    }}>
                      ✕ {disputedClaimIds.length} Disputed / Flagged
                    </span>
                  </div>
                </div>

                {/* Evidence Filter Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: `All Claims (${allFindings.length})` },
                    { id: 'FLAGGED', label: `⚠️ Hallucination Risk (${allFindings.filter(isHallucinationOrUnsupported).length})` },
                    { id: 'VERIFIED', label: `✓ Expert Verified (${verifiedClaimIds.length})` },
                    { id: 'DISPUTED', label: `✕ Expert Disputed (${disputedClaimIds.length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setEvidenceAuditFilter(tab.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: evidenceAuditFilter === tab.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                        background: evidenceAuditFilter === tab.id ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255,255,255,0.02)',
                        color: evidenceAuditFilter === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Interview Questions Carousel/Accordion if questions exist */}
                {transcriptQuestions.length > 0 && (
                  <div style={{ marginBottom: '22px' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                      Interview Questions Asked ({transcriptQuestions.length} Found in Transcript):
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                      {transcriptQuestions.map((q, idx) => {
                        const isSelected = selectedEvidenceQuestion === q.id;
                        return (
                          <div
                            key={q.id}
                            onClick={() => setSelectedEvidenceQuestion(isSelected ? null : q.id)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: isSelected ? 'rgba(0, 240, 255, 0.08)' : 'rgba(0,0,0,0.3)',
                              border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                                  [{q.timestamp}]
                                </span>
                                <span style={{ fontSize: '0.82rem', color: '#FFFFFF', fontWeight: 600 }}>
                                  Q{idx + 1}: {q.questionText}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {q.answers.length} Responses
                              </span>
                            </div>

                            {isSelected && q.answers.length > 0 && (
                              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                  Candidate Verbatim Response:
                                </span>
                                {q.answers.map((ans, aidx) => (
                                  <p key={aidx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 4px 0', lineHeight: 1.4 }}>
                                    "{ans.text}"
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Finding Claims List with One-Click Audit Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {allFindings
                    .filter(f => {
                      if (evidenceAuditFilter === 'FLAGGED') return isHallucinationOrUnsupported(f);
                      if (evidenceAuditFilter === 'VERIFIED') return verifiedClaimIds.includes(f.id);
                      if (evidenceAuditFilter === 'DISPUTED') return disputedClaimIds.includes(f.id);
                      return true;
                    })
                    .slice(0, 15)
                    .map(finding => {
                      const isFlagged = isHallucinationOrUnsupported(finding);
                      const isVerifiedByExpert = verifiedClaimIds.includes(finding.id);
                      const isDisputedByExpert = disputedClaimIds.includes(finding.id);
                      const auditNote = claimAuditNotes[finding.id];

                      return (
                        <div
                          key={finding.id}
                          style={{
                            padding: '16px 20px',
                            borderRadius: '14px',
                            background: isDisputedByExpert 
                              ? 'rgba(239, 68, 68, 0.08)' 
                              : isVerifiedByExpert 
                              ? 'rgba(16, 185, 129, 0.06)' 
                              : isFlagged 
                              ? 'rgba(245, 158, 11, 0.06)' 
                              : 'rgba(255, 255, 255, 0.02)',
                            border: isDisputedByExpert 
                              ? '1px solid rgba(239, 68, 68, 0.4)' 
                              : isVerifiedByExpert 
                              ? '1px solid rgba(16, 185, 129, 0.35)' 
                              : isFlagged 
                              ? '1px solid rgba(245, 158, 11, 0.35)' 
                              : '1px solid var(--border-subtle)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '0.88rem', color: '#FFFFFF' }}>
                                {finding.title}
                              </strong>
                              <span className="badge badge-violet" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                                {finding.category}
                              </span>
                              {finding.score_impact !== 0 && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: finding.score_impact > 0 ? '#10B981' : '#F87171'
                                }}>
                                  ({finding.score_impact > 0 ? `+${finding.score_impact}` : finding.score_impact} pts)
                                </span>
                              )}
                            </div>

                            {/* Status and Flags */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isFlagged && (
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(245, 158, 11, 0.18)',
                                  color: '#FBBF24',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <AlertTriangle size={12} /> Hallucination / Unsupported Risk
                                </span>
                              )}
                              <span style={{
                                fontSize: '0.7rem',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: isDisputedByExpert ? 'rgba(239,68,68,0.2)' : isVerifiedByExpert ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                                color: isDisputedByExpert ? '#F87171' : isVerifiedByExpert ? '#34D399' : 'var(--text-muted)',
                                fontWeight: 700
                              }}>
                                {isDisputedByExpert ? '✕ EXPERT DISPUTED' : isVerifiedByExpert ? '✓ EXPERT VERIFIED' : finding.verification_status}
                              </span>
                            </div>
                          </div>

                          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                            {finding.description}
                          </p>

                          {/* Evidence Citations with Timestamps */}
                          {finding.evidence && finding.evidence.length > 0 && (
                            <div style={{
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              marginBottom: '12px'
                            }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                                Timestamped Transcript Citation:
                              </span>
                              {finding.evidence.map((cit, cidx) => (
                                <div key={cidx} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '0.8rem' }}>
                                  <span className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.72rem' }}>
                                    [{cit.timestamp}]
                                  </span>
                                  <span style={{ color: '#E2E8F0', fontStyle: 'italic' }}>
                                    "{cit.quote}"
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* AI Verification Note */}
                          {finding.verification_notes && (
                            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 12px 0', fontStyle: 'italic' }}>
                              AI Grounding Note: {finding.verification_notes}
                            </p>
                          )}

                          {/* Expert Audit Note if exists */}
                          {auditNote && (
                            <div style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: 'rgba(0, 240, 255, 0.08)',
                              border: '1px solid rgba(0, 240, 255, 0.25)',
                              color: 'var(--accent-cyan)',
                              fontSize: '0.78rem',
                              marginBottom: '10px'
                            }}>
                              <strong>Your Audit Note:</strong> {auditNote}
                            </div>
                          )}

                          {/* Inline Audit Note Input */}
                          {editingClaimNoteId === finding.id ? (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', marginBottom: '10px' }}>
                              <input
                                type="text"
                                placeholder="Type expert audit commentary for this claim..."
                                value={tempNoteText}
                                onChange={(e) => setTempNoteText(e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  background: 'rgba(0,0,0,0.4)',
                                  border: '1px solid var(--accent-cyan)',
                                  color: '#FFFFFF',
                                  fontSize: '0.8rem'
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => handleSaveClaimNote(finding.id)}
                                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                              >
                                Save Note
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => { setEditingClaimNoteId(null); setTempNoteText(''); }}
                                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : null}

                          {/* Independent Expert Controls Bar */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingClaimNoteId(finding.id);
                                setTempNoteText(auditNote || '');
                              }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.74rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit3 size={12} /> {auditNote ? 'Edit Note' : '+ Add Audit Note'}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleVerifiedClaim(finding.id)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                background: isVerifiedByExpert ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                                border: isVerifiedByExpert ? '1px solid #10B981' : '1px solid var(--border-subtle)',
                                color: isVerifiedByExpert ? '#34D399' : 'var(--text-secondary)',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Check size={13} /> {isVerifiedByExpert ? 'Verified' : 'Verify Claim'}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleDisputedClaim(finding.id)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                background: isDisputedByExpert ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                                border: isDisputedByExpert ? '1px solid #EF4444' : '1px solid var(--border-subtle)',
                                color: isDisputedByExpert ? '#F87171' : 'var(--text-secondary)',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <X size={13} /> {isDisputedByExpert ? 'Disputed' : 'Flag Hallucination'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* SECTION 3: AI ASSESSMENT & DIMENSIONAL BASELINE */}
              <div className="glass-panel" style={{ padding: '26px 30px', borderRadius: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Cpu size={20} color="#A78BFA" />
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                        3. AI Assessment & Dimensional Baseline
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Preliminary multi-agent scoring model and architectural signal reasoning
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AI Confidence:</span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(167, 139, 250, 0.15)',
                      color: '#C4B5FD',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      94% High Confidence Grounding
                    </span>
                  </div>
                </div>

                {/* 6 Dimension Baseline Score Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  {[
                    { label: 'Technical Depth', val: scores.technical_knowledge, color: 'var(--accent-cyan)' },
                    { label: 'Communication Clarity', val: scores.communication, color: 'var(--accent-emerald)' },
                    { label: 'Answer Structure', val: scores.answer_structure, color: '#A78BFA' },
                    { label: 'Problem Solving', val: scores.problem_solving, color: 'var(--accent-amber)' },
                    { label: 'STAR Ownership', val: scores.behavioral, color: '#F472B6' },
                    { label: 'Question Understanding', val: scores.question_understanding, color: '#38BDF8' }
                  ].map((dim, idx) => (
                    <div key={idx} style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        {dim.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '1.25rem', color: dim.color }}>
                          {dim.val}
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ 10</span>
                      </div>
                      {/* Mini Bar */}
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '6px' }}>
                        <div style={{ width: `${(dim.val / 10) * 100}%`, height: '100%', background: dim.color, borderRadius: '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Strengths & Weaknesses Explanation */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <CheckCircle2 size={16} color="#10B981" />
                      <strong style={{ fontSize: '0.84rem', color: '#34D399' }}>Identified AI Strengths</strong>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <li>Solid conceptual understanding of replication logs and state machine synchronization.</li>
                      <li>Promptly clarified ambiguity on expected write throughput and latency budgets.</li>
                      <li>Used structured STAR examples with first-person technical accountability.</li>
                    </ul>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <AlertTriangle size={16} color="#F59E0B" />
                      <strong style={{ fontSize: '0.84rem', color: '#FBBF24' }}>AI Identified Gaps & Weaknesses</strong>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <li>Did not proactively address split-brain mitigation during network partition questions.</li>
                      <li>Relied on default cloud availability rather than active consensus quorum mechanics.</li>
                      <li>Estimated metrics without explicit mathematical sizing for memory footprints.</li>
                    </ul>
                  </div>
                </div>

                {/* AI Summary Breakdown */}
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                    AI Score Derivation Summary:
                  </span>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {interview.technical_analysis?.summary || 'Overall score of 7.5 reflects strong foundational engineering capability with minor gaps in extreme failure modes and edge case decomposition.'}
                  </p>
                </div>
              </div>

              {/* SECTION 4: INDEPENDENT HUMAN REVIEW & RECALIBRATION CONTROLS */}
              <div className="glass-panel" style={{ padding: '28px 32px', borderRadius: '18px', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <Sliders size={22} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    4. Independent Human Calibration & Sign-Off Controls
                  </h3>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '22px', lineHeight: 1.5 }}>
                  Recalibrate scores to reflect production architectural standards. Your evaluation locks the assessment and issues an immutable cryptographic certificate.
                </p>

                {/* Overall Calibrated Score Override Dial */}
                <div style={{
                  padding: '20px 22px',
                  borderRadius: '14px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF', display: 'block' }}>
                        Calibrated Overall Score Override
                      </span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        AI Baseline: <strong style={{ color: 'var(--text-secondary)' }}>{interview.scores?.overall || 7.5} / 10</strong> • Recruiter & Candidate Final Stamped Rating
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {(() => {
                        const delta = (calibratedOverallScore - (interview.scores?.overall || 7.5)).toFixed(1);
                        return delta != 0 ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: delta > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: delta > 0 ? '#34D399' : '#F87171',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            {delta > 0 ? `+${delta}` : delta} Calibrated Delta
                          </span>
                        ) : null;
                      })()}
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>
                        {calibratedOverallScore} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ 10</span>
                      </div>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.1"
                    value={calibratedOverallScore}
                    onChange={(e) => setCalibratedOverallScore(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-cyan)', height: '6px', cursor: 'pointer' }}
                  />
                </div>

                {/* 6-Dimension Recalibration Sliders */}
                <div style={{ marginBottom: '26px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Scale size={16} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Granular 6-Dimension Competency Adjustments
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDimensionOverrides({
                        technical_knowledge: interview.scores?.technical_knowledge || 8.0,
                        communication: interview.scores?.communication || 7.0,
                        answer_structure: interview.scores?.answer_structure || 7.0,
                        problem_solving: interview.scores?.problem_solving || 7.5,
                        behavioral: interview.scores?.behavioral || 7.5,
                        question_understanding: interview.scores?.question_understanding || 8.0,
                      })}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <RefreshCw size={12} /> Reset to AI Baselines
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {[
                      { key: 'technical_knowledge', label: 'Technical Depth', baseline: interview.scores?.technical_knowledge || 8.0 },
                      { key: 'communication', label: 'Communication Clarity', baseline: interview.scores?.communication || 7.0 },
                      { key: 'answer_structure', label: 'Answer Structure & Framing', baseline: interview.scores?.answer_structure || 7.0 },
                      { key: 'problem_solving', label: 'Problem Solving & Edge Cases', baseline: interview.scores?.problem_solving || 7.5 },
                      { key: 'behavioral', label: 'STAR Ownership & Signals', baseline: interview.scores?.behavioral || 7.5 },
                      { key: 'question_understanding', label: 'Question Understanding', baseline: interview.scores?.question_understanding || 8.0 }
                    ].map(dim => {
                      const currentVal = dimensionOverrides[dim.key] ?? dim.baseline;
                      const delta = (currentVal - dim.baseline).toFixed(1);
                      return (
                        <div
                          key={dim.key}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {dim.label}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '0.9rem', color: '#FFFFFF' }}>{currentVal}</strong>
                              {delta != 0 && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  color: delta > 0 ? '#10B981' : '#F87171',
                                  fontWeight: 700
                                }}>
                                  ({delta > 0 ? `+${delta}` : delta})
                                </span>
                              )}
                            </div>
                          </div>
                          <input
                            type="range"
                            min="1.0"
                            max="10.0"
                            step="0.1"
                            value={currentVal}
                            onChange={(e) => setDimensionOverrides({
                              ...dimensionOverrides,
                              [dim.key]: parseFloat(e.target.value)
                            })}
                            style={{ width: '100%', accentColor: '#10B981' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Verdict Selector */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    INDUSTRY HIRING VERDICT
                  </label>
                  <div className="verdict-selector-group" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'APPROVED', title: '✓ Endorse & Validate', subtitle: 'Strong production architecture & real-world competency', color: '#10B981' },
                      { id: 'MODIFIED', title: '⚡ Calibrate Scores', subtitle: 'Realities calibrated for engineering readiness', color: '#F59E0B' },
                      { id: 'REJECTED', title: '✕ Reject Assessment', subtitle: 'Critical evidence gaps or unsubstantiated claims', color: '#EF4444' }
                    ].map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setReviewVerdict(v.id)}
                        style={{
                          flex: '1 1 240px',
                          padding: '14px 18px',
                          borderRadius: '12px',
                          border: reviewVerdict === v.id ? `2px solid ${v.color}` : '1px solid var(--border-subtle)',
                          background: reviewVerdict === v.id ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.3)',
                          color: reviewVerdict === v.id ? v.color : 'var(--text-secondary)',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '4px' }}>
                          {v.title}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {v.subtitle}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expert Commentary with Suggestion Chips */}
                <div style={{ marginBottom: '26px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      INDUSTRY EXPERT COMMENTARY & REAL-WORLD ARCHITECTURAL AUDIT
                    </label>
                  </div>

                  {/* Suggestion Chips */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    {[
                      { label: '+ Architecture Trade-offs', text: 'Candidate demonstrated solid high-level architecture intuition, but trade-offs between consistency and availability need further grounding.' },
                      { label: '+ Concurrency Realities', text: 'Concurrently executed writes were handled via optimistic locking without explicit conflict resolution mechanisms.' },
                      { label: '+ Distributed Consensus', text: 'Demonstrated solid understanding of state machine replication, though edge cases in partition healing were omitted.' },
                      { label: '+ Production Edge Cases', text: 'Recommended targeted follow-up on backpressure management and memory footprint under thundering herd conditions.' }
                    ].map((chip, cidx) => (
                      <button
                        key={cidx}
                        type="button"
                        onClick={() => setReviewComments(prev => prev ? `${prev}\n\n${chip.text}` : chip.text)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={6}
                    placeholder="Provide your accredited evaluation notes: analyze candidate's architectural depth, address timestamped evidence citations, evaluate failure mode intuition, and explain any dimensional score calibrations..."
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Final Sign-Off Action */}
                <div style={{
                  padding: '18px 22px',
                  borderRadius: '14px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 700, display: 'block' }}>
                      CRYPTOGRAPHIC SEAL PREVIEW
                    </span>
                    <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      CERT-HITL-{"<HASH>"}-{Date.now().toString().slice(-6)} • Immutable Audit Trail Lock
                    </span>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleExpertReviewSubmit}
                    disabled={reviewSubmitting}
                    style={{ padding: '14px 28px', fontSize: '0.92rem' }}
                  >
                    <ShieldCheck size={18} /> {reviewSubmitting ? 'Finalizing Cryptographic Sign-Off...' : 'Finalize Expert Sign-Off & Lock Calibration'}
                  </button>
                </div>
              </div>
            </div>
          )}
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
