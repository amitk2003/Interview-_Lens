import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Filter, 
  Sparkles, 
  Award, 
  Layers, 
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileCheck,
  Calendar,
  AlertTriangle,
  History,
  Tag
} from 'lucide-react';
import { API_BASE } from '../config.js';

export default function ExpertQueueView({ 
  userProfile, 
  onSelectInterview,
  onOpenReportTab
}) {
  const token = localStorage.getItem('AUTH_TOKEN');

  // Sub-tabs: 'MY_ASSIGNMENTS' | 'REVIEW_HISTORY' | 'OPEN_QUEUE'
  const [activeTab, setActiveTab] = useState('MY_ASSIGNMENTS');

  // Metrics from /api/expert/dashboard/metrics
  const [metrics, setMetrics] = useState({
    total_assigned: 0,
    pending_review: 0,
    in_progress: 0,
    completed: 0,
    unread_notifications: 0
  });

  // Enriched Assigned Assessments from /api/expert/dashboard/assignments
  const [assignedItems, setAssignedItems] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);

  // Platform Open Queue
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState(null);

  // Filters & State
  const [claimingId, setClaimingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDomain, setFilterDomain] = useState('ALL');

  // Fetch Dashboard Metrics
  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/expert/dashboard/metrics?token=${encodeURIComponent(token || '')}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.warn('Could not load expert metrics:', err);
    }
  };

  // Fetch Expert Assigned Assessments
  const fetchAssigned = async () => {
    setLoadingAssigned(true);
    try {
      const res = await fetch(`${API_BASE}/api/expert/dashboard/assignments?token=${encodeURIComponent(token || '')}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        const data = await res.json();
        setAssignedItems(data);
      }
    } catch (err) {
      console.warn('Could not load expert assigned assessments:', err);
    } finally {
      setLoadingAssigned(false);
    }
  };

  // Fetch Platform Open Queue
  const fetchQueue = async () => {
    setLoadingQueue(true);
    setQueueError(null);
    try {
      const res = await fetch(`${API_BASE}/api/expert/queue?token=${encodeURIComponent(token || '')}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch expert queue (${res.status})`);
      }
      const data = await res.json();
      setQueue(data);
    } catch (err) {
      console.error('Error fetching expert queue:', err);
      setQueueError(err.message);
    } finally {
      setLoadingQueue(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchMetrics(), fetchAssigned(), fetchQueue()]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleClaim = async (interviewId, e) => {
    e?.stopPropagation();
    setClaimingId(interviewId);
    try {
      const res = await fetch(`${API_BASE}/api/expert/claim/${interviewId}?token=${encodeURIComponent(token || '')}`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Could not claim interview');
      }
      await refreshAll();
    } catch (err) {
      alert(`Claim failed: ${err.message}`);
    } finally {
      setClaimingId(null);
    }
  };

  const handleReviewLaunch = (interviewId) => {
    if (onSelectInterview) {
      onSelectInterview(interviewId, 'expert');
    }
  };

  // Active Assigned Items (ACTIVE status)
  const activeAssigned = assignedItems.filter(item => item.assignment?.status === 'ACTIVE');
  // Completed History Items (COMPLETED status)
  const completedHistory = assignedItems.filter(item => item.assignment?.status === 'COMPLETED');

  // Filtered Open Queue
  const filteredQueue = queue.filter(item => {
    if (filterDomain !== 'ALL' && item.expert_domain_tag && item.expert_domain_tag !== filterDomain) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.candidate_name || '').toLowerCase().includes(q);
      const matchRole = (item.job_role || item.role || '').toLowerCase().includes(q);
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchTitle) return false;
    }
    return true;
  });

  // Calculate deadline urgency helper
  const getDeadlineBadge = (deadlineAt) => {
    if (!deadlineAt) {
      return (
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} /> Standard 48h SLA
        </span>
      );
    }
    const deadline = new Date(deadlineAt);
    const now = new Date();
    const diffMs = deadline - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffMs < 0) {
      return (
        <span style={{
          padding: '2px 8px', borderRadius: '4px',
          background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#F87171', fontSize: '0.72rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          <AlertTriangle size={12} /> Overdue by {Math.abs(diffHours)}h
        </span>
      );
    }
    if (diffHours <= 24) {
      return (
        <span style={{
          padding: '2px 8px', borderRadius: '4px',
          background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)',
          color: '#FBBF24', fontSize: '0.72rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          <Clock size={12} /> Due soon ({diffHours}h left)
        </span>
      );
    }
    return (
      <span style={{
        padding: '2px 8px', borderRadius: '4px',
        background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.25)',
        color: 'var(--accent-cyan)', fontSize: '0.72rem', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: '4px'
      }}>
        <Calendar size={12} /> Due: {deadline.toLocaleDateString()}
      </span>
    );
  };

  return (
    <div className="container responsive-container" style={{ padding: '32px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner / Header */}
      <div className="glass-panel" style={{
        padding: '28px',
        borderRadius: '20px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 11, 20, 0.8) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34D399',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.05em'
              }}>
                <ShieldCheck size={14} /> HITL INDUSTRY EXPERT DASHBOARD
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Logged in as: <strong style={{ color: '#FFFFFF' }}>{userProfile?.name || 'Verified Expert'}</strong> ({userProfile?.expert_title || 'Staff Evaluator'})
              </span>
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
              Industry Expert Review Console &amp; Assignments
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '720px', margin: 0, lineHeight: 1.5 }}>
              Review candidate transcripts dispatched by platform administrators, verify AI evidence quotes, calibrate dimensional scores, and generate cryptographically verifiable sign-offs.
            </p>
          </div>

          <button
            onClick={refreshAll}
            disabled={loadingAssigned || loadingQueue}
            className="btn"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <RefreshCw size={15} className={loadingAssigned || loadingQueue ? 'spin' : ''} />
            Refresh Dashboard
          </button>
        </div>

        {/* Dashboard Metrics Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginTop: '24px'
        }}>
          {/* Card 1: Assigned Assessments */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '14px 18px',
            borderRadius: '14px',
            border: '1px solid rgba(0, 240, 255, 0.25)'
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              Assigned Assessments
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>
              {metrics.total_assigned || activeAssigned.length}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Active in your queue
            </div>
          </div>

          {/* Card 2: Pending Reviews */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '14px 18px',
            borderRadius: '14px',
            border: '1px solid rgba(245, 158, 11, 0.25)'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#FBBF24', fontWeight: 700, textTransform: 'uppercase' }}>
              Pending Reviews
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#F59E0B', marginTop: '2px' }}>
              {metrics.pending_review || activeAssigned.filter(a => a.interview?.status !== 'IN_EXPERT_REVIEW').length}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Awaiting your action
            </div>
          </div>

          {/* Card 3: In Progress */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '14px 18px',
            borderRadius: '14px',
            border: '1px solid rgba(168, 85, 247, 0.25)'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#C084FC', fontWeight: 700, textTransform: 'uppercase' }}>
              Reviews In Progress
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#C084FC', marginTop: '2px' }}>
              {metrics.in_progress || activeAssigned.filter(a => a.interview?.status === 'IN_EXPERT_REVIEW').length}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Draft calibration open
            </div>
          </div>

          {/* Card 4: Completed Reviews */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '14px 18px',
            borderRadius: '14px',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700, textTransform: 'uppercase' }}>
              Completed Reviews
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#10B981', marginTop: '2px' }}>
              {metrics.completed || completedHistory.length || userProfile?.reviews_completed_count || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Certified sign-offs issued
            </div>
          </div>

          {/* Card 5: Expert Rating */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '14px 18px',
            borderRadius: '14px',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700, textTransform: 'uppercase' }}>
              Expert Quality Rating
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#FFFFFF', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {userProfile?.expert_rating || 4.96} <span style={{ fontSize: '1rem', color: '#F59E0B' }}>★</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Accuracy &amp; calibration SLA
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD NAVIGATION TABS */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('MY_ASSIGNMENTS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'MY_ASSIGNMENTS' ? 'rgba(0, 240, 255, 0.14)' : 'transparent',
            color: activeTab === 'MY_ASSIGNMENTS' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'MY_ASSIGNMENTS' ? '2px solid var(--accent-cyan)' : '2px solid transparent'
          }}
        >
          <UserCheck size={16} />
          <span>My Assigned Assessments</span>
          {activeAssigned.length > 0 && (
            <span style={{
              background: 'var(--accent-cyan)', color: '#050B14', fontSize: '0.68rem', fontWeight: 800,
              padding: '1px 6px', borderRadius: '9999px'
            }}>
              {activeAssigned.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('REVIEW_HISTORY')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'REVIEW_HISTORY' ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
            color: activeTab === 'REVIEW_HISTORY' ? '#34D399' : 'var(--text-secondary)',
            borderBottom: activeTab === 'REVIEW_HISTORY' ? '2px solid #34D399' : '2px solid transparent'
          }}
        >
          <History size={16} />
          <span>Review History &amp; Sign-Off Certificates</span>
          {completedHistory.length > 0 && (
            <span style={{
              background: '#10B981', color: '#050B14', fontSize: '0.68rem', fontWeight: 800,
              padding: '1px 6px', borderRadius: '9999px'
            }}>
              {completedHistory.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('OPEN_QUEUE')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'OPEN_QUEUE' ? 'rgba(168, 85, 247, 0.14)' : 'transparent',
            color: activeTab === 'OPEN_QUEUE' ? '#C084FC' : 'var(--text-secondary)',
            borderBottom: activeTab === 'OPEN_QUEUE' ? '2px solid #C084FC' : '2px solid transparent'
          }}
        >
          <Layers size={16} />
          <span>Platform Calibration Queue</span>
          {queue.length > 0 && (
            <span style={{
              background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', fontSize: '0.68rem', fontWeight: 800,
              padding: '1px 6px', borderRadius: '9999px'
            }}>
              {queue.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MY ASSIGNED ASSESSMENTS */}
      {activeTab === 'MY_ASSIGNMENTS' && (
        <div>
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} color="var(--accent-cyan)" />
              Assigned Assessments Awaiting Your Review ({activeAssigned.length})
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Assessments dispatched directly to you by platform administrators. Complete calibration before the SLA deadline.
            </p>
          </div>

          {loadingAssigned ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <RefreshCw size={26} className="spin" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ fontSize: '0.86rem' }}>Loading assigned assessments...</p>
            </div>
          ) : activeAssigned.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px 24px', borderRadius: '18px', textAlign: 'center' }}>
              <CheckCircle2 size={42} color="var(--accent-emerald)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF', marginBottom: '6px' }}>No Active Assignments</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '460px', margin: '0 auto 18px auto' }}>
                You have no active assessments currently assigned to you by administrators. You can browse the Platform Calibration Queue to inspect or claim open interviews.
              </p>
              <button className="btn btn-secondary" onClick={() => setActiveTab('OPEN_QUEUE')}>
                Browse Platform Open Queue
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeAssigned.map((item) => {
                const a = item.assignment || {};
                const interview = item.interview || {};
                const targetRole = interview.job_role || a.interview_job_role || 'Software Engineer';
                const candidateName = interview.candidate_name || 'Candidate';
                const scores = interview.scores || {};

                // Skill categories
                const skillCategories = [
                  targetRole,
                  ...(interview.expert_domain_tag ? [interview.expert_domain_tag] : []),
                  'System Design',
                  'Concurrency'
                ].filter(Boolean);

                return (
                  <div
                    key={a.assignment_id || interview.id}
                    className="glass-panel"
                    style={{
                      padding: '24px',
                      borderRadius: '16px',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                      {/* Left Side: Candidate & Target Role */}
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(0, 240, 255, 0.12)', border: '1px solid rgba(0, 240, 255, 0.3)',
                            color: 'var(--accent-cyan)', fontSize: '0.68rem', fontWeight: 800
                          }}>
                            ADMIN-ASSIGNED EVALUATION
                          </span>
                          {getDeadlineBadge(a.deadline_at)}
                        </div>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                          {candidateName}
                        </h3>

                        <div style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '10px' }}>
                          Target Role: {targetRole}
                        </div>

                        {/* Skill Categories Tags */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                          {skillCategories.map((skill, sIdx) => (
                            <span key={sIdx} style={{
                              padding: '2px 8px', borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)',
                              fontSize: '0.72rem', color: 'var(--text-secondary)'
                            }}>
                              <Tag size={10} style={{ display: 'inline', marginRight: '4px' }} />
                              {skill}
                            </span>
                          ))}
                        </div>

                        {/* Assignment Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>Assigned on: {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : 'Recent'}</span>
                          {a.assigned_by_admin_name && <span>Assigned by: {a.assigned_by_admin_name}</span>}
                          {interview.finding_count > 0 && <span>Verified Findings: {interview.finding_count}</span>}
                        </div>

                        {/* Reassignment / Instructions Alert if present */}
                        {a.reassignment_reason && (
                          <div style={{
                            marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
                            background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)',
                            fontSize: '0.76rem', color: '#E9D5FF'
                          }}>
                            <strong>Reassignment Context:</strong> {a.reassignment_reason}
                          </div>
                        )}
                      </div>

                      {/* Middle: AI Score Card */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '14px 22px',
                        borderRadius: '14px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        minWidth: '150px'
                      }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                          AI Baseline Score
                        </span>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>
                          {scores.overall ? Math.round(scores.overall) : 78}
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/100</span>
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34D399', marginTop: '2px' }}>
                          RECOMMENDED
                        </span>
                      </div>

                      {/* Right: Action Button */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '10px' }}>
                        <button
                          onClick={() => handleReviewLaunch(interview.id || a.interview_id)}
                          className="btn btn-primary"
                          style={{
                            padding: '10px 18px',
                            fontSize: '0.84rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#00F0FF',
                            color: '#050B14'
                          }}
                        >
                          <ShieldCheck size={16} /> Open Review Console <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REVIEW HISTORY & SIGN-OFF CERTIFICATES */}
      {activeTab === 'REVIEW_HISTORY' && (
        <div>
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="#10B981" />
              Completed Evaluations &amp; Cryptographic Sign-Offs ({completedHistory.length})
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Permanent record of assessments certified, calibrated, and signed off by your verified credential.
            </p>
          </div>

          {completedHistory.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px 24px', borderRadius: '18px', textAlign: 'center' }}>
              <FileCheck size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', marginBottom: '6px' }}>No Completed Sign-Offs Yet</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', maxWidth: '420px', margin: '0 auto' }}>
                When you complete human calibration reviews and submit cryptographically signed certificates, they will be archived here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {completedHistory.map((item, idx) => {
                const a = item.assignment || {};
                const interview = item.interview || {};
                return (
                  <div
                    key={idx}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      borderRadius: '14px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF' }}>
                          {interview.candidate_name || 'Candidate'}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.15)', color: '#34D399',
                          fontSize: '0.7rem', fontWeight: 700
                        }}>
                          CERTIFIED &amp; SIGNED
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                        Role: {interview.job_role || a.interview_job_role} • {interview.title || a.interview_title}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        <span>Completed on: {new Date(a.assigned_at || Date.now()).toLocaleDateString()}</span>
                        <span>Candidate Released: YES</span>
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => handleReviewLaunch(interview.id || a.interview_id)}
                        className="btn"
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#34D399',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '8px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FileCheck size={14} /> View Certificate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PLATFORM OPEN CALIBRATION QUEUE */}
      {activeTab === 'OPEN_QUEUE' && (
        <div>
          {/* Subheader & Search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#C084FC" />
                Platform Calibration Queue ({filteredQueue.length})
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                Open candidate assessment pool. You can claim unassigned interviews for calibration.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search candidate, role..."
                  style={{
                    padding: '7px 12px 7px 30px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                    width: '180px'
                  }}
                />
              </div>

              <select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Domains</option>
                <option value="Distributed Systems">Distributed Systems</option>
                <option value="Full Stack">Full Stack</option>
                <option value="AI / ML Systems">AI / ML Systems</option>
                <option value="Cloud Architecture">Cloud Architecture</option>
              </select>
            </div>
          </div>

          {loadingQueue ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <RefreshCw size={26} className="spin" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ fontSize: '0.86rem' }}>Loading platform queue...</p>
            </div>
          ) : queueError ? (
            <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
              {queueError}
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px 24px', borderRadius: '18px', textAlign: 'center' }}>
              <CheckCircle2 size={40} color="var(--accent-emerald)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF', marginBottom: '6px' }}>All Caught Up</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No open interviews in the queue matching your filters.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredQueue.map(item => {
                const isAwaiting = item.verification_status === 'AWAITING_EXPERT_REVIEW';
                const isClaimedByMe = item.assigned_expert_id === userProfile?.id;

                return (
                  <div
                    key={item.id}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      borderRadius: '14px',
                      border: isAwaiting ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(0, 240, 255, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>
                          {item.candidate_name || 'Candidate'}
                        </span>
                        {item.expert_domain_tag && (
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.05)', fontSize: '0.7rem', color: 'var(--text-secondary)'
                          }}>
                            {item.expert_domain_tag}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.84rem', color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                        {item.role || item.job_role || 'Software Engineer'} • {item.title}
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Status: <strong style={{ color: isAwaiting ? '#F59E0B' : 'var(--accent-cyan)' }}>{item.verification_status || item.status}</strong>
                        {item.assigned_expert_name && ` • Assigned to: ${item.assigned_expert_name}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isAwaiting ? (
                        <button
                          onClick={(e) => handleClaim(item.id, e)}
                          disabled={claimingId === item.id}
                          className="btn btn-primary"
                          style={{ fontSize: '0.78rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {claimingId === item.id ? 'Claiming...' : (
                            <>
                              <UserCheck size={14} /> Claim Evaluation
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReviewLaunch(item.id)}
                          className="btn"
                          style={{
                            background: 'rgba(0, 240, 255, 0.12)',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            color: 'var(--accent-cyan)',
                            fontSize: '0.78rem',
                            padding: '8px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <ShieldCheck size={14} /> Review Console <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
