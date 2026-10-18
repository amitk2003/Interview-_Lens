import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Briefcase,
  Award,
  Layers,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Lock,
  FileText,
  Mail,
  HelpCircle,
  MessageSquare,
  Send,
  Eye,
  X,
  UserPlus,
  ArrowRightLeft,
  Ban,
  History,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { API_BASE } from '../config.js';

export default function AdminView({ userProfile, onOpenAuth }) {
  const token = localStorage.getItem('AUTH_TOKEN');

  // Active Admin Tab: 'APPLICATIONS' | 'USERS' | 'ASSIGNMENTS'
  const [activeAdminTab, setActiveAdminTab] = useState('ASSIGNMENTS');

  // Users Directory state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Expert Applications state
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [appError, setAppError] = useState(null);
  const [appStatusFilter, setAppStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'INFO_REQUESTED' | 'APPROVED' | 'REJECTED'
  const [selectedAppForAudit, setSelectedAppForAudit] = useState(null);

  // Decision Modals state
  const [decisionModal, setDecisionModal] = useState({
    isOpen: false,
    action: null, // 'APPROVE' | 'REJECT' | 'REQUEST_INFO'
    application: null,
    adminNotes: '',
    requestedInfo: ''
  });
  const [processingDecision, setProcessingDecision] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Assessment Assignment Queue State
  const [assignmentQueue, setAssignmentQueue] = useState({
    unassigned_interviews: [],
    assignments: [],
    summary: { unassigned_count: 0, active_assignments: 0, completed_assignments: 0, total_assignments: 0 }
  });
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [assignmentError, setAssignmentError] = useState(null);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

  // Assignment Modals
  const [assignModal, setAssignModal] = useState({
    isOpen: false,
    interview: null,
    selectedExpertId: '',
    deadlineHours: 48,
    reason: ''
  });
  const [reassignModal, setReassignModal] = useState({
    isOpen: false,
    assignment: null,
    selectedExpertId: '',
    reason: ''
  });
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    assignment: null,
    reason: ''
  });
  const [assignmentAuditModal, setAssignmentAuditModal] = useState({
    isOpen: false,
    assignment: null
  });
  const [processingAssignment, setProcessingAssignment] = useState(false);

  // Fetch Assignment Queue
  const fetchAssignmentQueue = async () => {
    setLoadingAssignments(true);
    setAssignmentError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/assignment-queue?token=${encodeURIComponent(token || '')}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch assignment queue (${res.status})`);
      }
      const data = await res.json();
      setAssignmentQueue(data);
    } catch (err) {
      console.error('Error fetching assignment queue:', err);
      setAssignmentError(err.message);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Handle Assign Expert
  const handleConfirmAssign = async () => {
    if (!assignModal.interview || !assignModal.selectedExpertId) {
      alert('Please select an accredited industry expert to assign.');
      return;
    }
    setProcessingAssignment(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/assign-expert?token=${encodeURIComponent(token || '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          interview_id: assignModal.interview.id,
          expert_id: assignModal.selectedExpertId,
          reason: assignModal.reason.trim() || undefined,
          deadline_hours: Number(assignModal.deadlineHours) || 48
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to assign expert');
      }
      setSuccessToast(`Successfully assigned expert to assessment: ${assignModal.interview.title}`);
      setAssignModal({ isOpen: false, interview: null, selectedExpertId: '', deadlineHours: 48, reason: '' });
      await fetchAssignmentQueue();
      await fetchApplications();
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setProcessingAssignment(false);
    }
  };

  // Handle Reassign Expert
  const handleConfirmReassign = async () => {
    if (!reassignModal.assignment || !reassignModal.selectedExpertId) {
      alert('Please select a replacement industry expert.');
      return;
    }
    if (!reassignModal.reason.trim() || reassignModal.reason.trim().length < 5) {
      alert('A recorded reassignment reason is required (minimum 5 characters).');
      return;
    }
    setProcessingAssignment(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/reassign-expert?token=${encodeURIComponent(token || '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          interview_id: reassignModal.assignment.interview_id,
          expert_id: reassignModal.selectedExpertId,
          reason: reassignModal.reason.trim()
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to reassign expert');
      }
      setSuccessToast(`Assessment successfully reassigned to new industry expert.`);
      setReassignModal({ isOpen: false, assignment: null, selectedExpertId: '', reason: '' });
      await fetchAssignmentQueue();
    } catch (err) {
      alert(`Reassignment failed: ${err.message}`);
    } finally {
      setProcessingAssignment(false);
    }
  };

  // Handle Cancel Assignment
  const handleConfirmCancel = async () => {
    if (!cancelModal.assignment) return;
    if (!cancelModal.reason.trim() || cancelModal.reason.trim().length < 5) {
      alert('A recorded reason for cancellation is required (minimum 5 characters).');
      return;
    }
    setProcessingAssignment(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/cancel-assignment?token=${encodeURIComponent(token || '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          interview_id: cancelModal.assignment.interview_id,
          reason: cancelModal.reason.trim()
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to cancel assignment');
      }
      setSuccessToast(`Assignment cancelled. Assessment returned to unassigned queue.`);
      setCancelModal({ isOpen: false, assignment: null, reason: '' });
      await fetchAssignmentQueue();
    } catch (err) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setProcessingAssignment(false);
    }
  };

  // Fetch Users Directory
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUserError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users?token=${encodeURIComponent(token || '')}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Unauthorized: Platform Administrator privileges are required.');
        }
        throw new Error(`Failed to fetch user directory (${res.status})`);
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching admin users:', err);
      setUserError(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Expert Applications
  const fetchApplications = async () => {
    setLoadingApps(true);
    setAppError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/expert-applications?token=${encodeURIComponent(token || '')}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Unauthorized: Platform Administrator privileges are required.');
        }
        throw new Error(`Failed to fetch expert applications (${res.status})`);
      }
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      console.error('Error fetching expert applications:', err);
      setAppError(err.message);
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchApplications();
    fetchAssignmentQueue();
  }, []);

  const verifiedExperts = users.filter(u => u.role === 'EXPERT' && (u.is_verified_expert || u.expert_approval_status === 'APPROVED'));

  const isExpertDomainMatch = (expert, interview) => {
    if (!expert || !interview) return false;
    const targets = [
      (interview.job_role || '').toLowerCase(),
      (interview.expert_domain_tag || '').toLowerCase(),
      (interview.title || '').toLowerCase()
    ];
    const expertSkills = [
      ...(expert.supported_interview_categories || []),
      ...(expert.technical_expertise || []),
      expert.headline || '',
      expert.current_experience || ''
    ].map(s => (s || '').toLowerCase());

    return targets.some(target => 
      target && expertSkills.some(skill => skill && (target.includes(skill) || skill.includes(target)))
    );
  };

  const checkExpertConflict = (expert, interview) => {
    if (!expert || !interview) return null;
    if (expert.email && interview.candidate_email && expert.email.toLowerCase() === interview.candidate_email.toLowerCase()) {
      return 'CRITICAL CONFLICT: Expert email matches candidate email!';
    }
    if (expert.conflict_of_interest_declaration && expert.conflict_of_interest_declaration.trim()) {
      return `Declared Note: ${expert.conflict_of_interest_declaration}`;
    }
    return null;
  };

  // Handle Decision Submit (APPROVE, REJECT, REQUEST_INFO)
  const handleSubmitDecision = async () => {
    const { action, application, adminNotes, requestedInfo } = decisionModal;
    if (!application) return;

    if (action === 'REQUEST_INFO' && !requestedInfo.trim()) {
      alert('Please specify what additional information or documents are requested.');
      return;
    }

    setProcessingDecision(true);
    try {
      const payload = {
        action: action,
        admin_notes: adminNotes.trim() || `Administrative ${action} executed by platform governance`,
        requested_info: action === 'REQUEST_INFO' ? requestedInfo.trim() : null
      };

      const res = await fetch(`${API_BASE}/api/admin/expert-applications/${application.id}/decision?token=${encodeURIComponent(token || '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Failed to execute ${action} decision`);
      }

      const updatedApp = await res.json();

      let actionDesc = 'processed';
      if (action === 'APPROVE') actionDesc = 'accredited as Verified Industry Expert';
      else if (action === 'REJECT') actionDesc = 'application rejected';
      else if (action === 'REQUEST_INFO') actionDesc = 'clarification and documents requested';

      setSuccessToast(`Application for ${updatedApp.user_name} successfully ${actionDesc}!`);
      setTimeout(() => setSuccessToast(null), 5000);

      // Close modal
      setDecisionModal({ isOpen: false, action: null, application: null, adminNotes: '', requestedInfo: '' });

      // Refresh applications and users
      await Promise.all([fetchApplications(), fetchUsers()]);
    } catch (err) {
      alert(`Action error: ${err.message}`);
    } finally {
      setProcessingDecision(false);
    }
  };

  // Metrics
  const totalUsers = users.length;
  const candidateCount = users.filter(u => u.role === 'CANDIDATE').length;
  const expertCount = users.filter(u => u.role === 'EXPERT').length;
  const pendingExpertCount = applications.filter(a => a.status === 'PENDING').length;
  const infoRequestedCount = applications.filter(a => a.status === 'INFO_REQUESTED').length;

  // Filtered applications
  const filteredApps = applications.filter(app => {
    if (appStatusFilter !== 'ALL' && app.status !== appStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (app.user_name || '').toLowerCase().includes(q);
      const matchEmail = (app.user_email || '').toLowerCase().includes(q);
      const matchCompany = (app.current_company || '').toLowerCase().includes(q);
      const matchTitle = (app.current_title || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchCompany || matchTitle;
    }
    return true;
  });

  // Filtered users
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchOrg = (u.expert_organization || '').toLowerCase().includes(q);
      const matchTitle = (u.expert_title || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchOrg || matchTitle;
    }
    return true;
  });

  const getRoleBadge = (role, status) => {
    if (role === 'ADMIN') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: '1px solid rgba(168, 85, 247, 0.4)'
        }}>
          <ShieldAlert size={12} /> Platform Admin
        </span>
      );
    }
    if (role === 'EXPERT') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)'
        }}>
          <ShieldCheck size={12} /> Verified Expert
        </span>
      );
    }
    if (role === 'PENDING_EXPERT' || status === 'PENDING') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.4)'
        }}>
          <Clock size={12} /> Pending Expert
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
        background: 'rgba(0, 240, 255, 0.12)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 240, 255, 0.3)'
      }}>
        <UserCheck size={12} /> Candidate
      </span>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span style={{
            fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 800,
            background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            <ShieldCheck size={12} /> APPROVED &amp; VERIFIED
          </span>
        );
      case 'PENDING':
        return (
          <span style={{
            fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 800,
            background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            <Clock size={12} /> PENDING REVIEW
          </span>
        );
      case 'INFO_REQUESTED':
        return (
          <span style={{
            fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 800,
            background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            <AlertTriangle size={12} /> INFO REQUESTED
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{
            fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 800,
            background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            <XCircle size={12} /> REJECTED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 20px', minHeight: '85vh' }}>
      {/* Toast Notification */}
      {successToast && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 9999,
          background: 'rgba(16, 185, 129, 0.95)',
          color: '#050B14',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 700,
          fontSize: '0.86rem'
        }}>
          <CheckCircle2 size={18} />
          {successToast}
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        borderRadius: '20px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '18px',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(8, 11, 17, 0.9) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #A855F7 0%, #3B82F6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(168, 85, 247, 0.4)'
          }}>
            <ShieldAlert size={28} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
                Admin Security &amp; Role Governance Console
              </h1>
              <span style={{
                background: 'rgba(168, 85, 247, 0.2)', color: '#C084FC',
                fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid rgba(168, 85, 247, 0.4)'
              }}>
                LEVEL 4 RBAC
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
              Industry expert credential verification, multi-stage accreditation decisions, and cryptographic role enforcement.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => { fetchUsers(); fetchApplications(); }}
            disabled={loadingUsers || loadingApps}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 14px' }}
          >
            <RefreshCw size={14} className={(loadingUsers || loadingApps) ? 'spin-slow' : ''} />
            Refresh All
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '16px', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} /> Pending Verification
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: pendingExpertCount > 0 ? '#FBBF24' : '#FFFFFF', marginTop: '4px' }}>
            {pendingExpertCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {pendingExpertCount > 0 ? 'Awaiting Admin Evidence Review' : 'Queue fully processed'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '16px', borderLeft: '4px solid #EF4444' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#F87171', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={13} /> Info Requested
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: infoRequestedCount > 0 ? '#F87171' : '#FFFFFF', marginTop: '4px' }}>
            {infoRequestedCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Awaiting Applicant Clarifications
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '16px', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#34D399', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={13} /> Verified Experts
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34D399', marginTop: '4px' }}>
            {expertCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Accredited Senior Evaluators
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '16px', borderLeft: '4px solid var(--accent-cyan)' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={13} /> Candidates &amp; Users
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
            {totalUsers}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Active platform accounts
          </div>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveAdminTab('ASSIGNMENTS')}
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
            background: activeAdminTab === 'ASSIGNMENTS' ? 'rgba(0, 240, 255, 0.14)' : 'transparent',
            color: activeAdminTab === 'ASSIGNMENTS' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderBottom: activeAdminTab === 'ASSIGNMENTS' ? '2px solid var(--accent-cyan)' : '2px solid transparent'
          }}
        >
          <Layers size={16} />
          <span>Assessment Assignment Queue</span>
          {assignmentQueue?.unassigned_interviews?.length > 0 && (
            <span style={{
              background: '#F59E0B', color: '#050B14', fontSize: '0.68rem', fontWeight: 800,
              padding: '1px 6px', borderRadius: '9999px'
            }}>
              {assignmentQueue.unassigned_interviews.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('APPLICATIONS')}
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
            background: activeAdminTab === 'APPLICATIONS' ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
            color: activeAdminTab === 'APPLICATIONS' ? '#34D399' : 'var(--text-secondary)',
            borderBottom: activeAdminTab === 'APPLICATIONS' ? '2px solid #34D399' : '2px solid transparent'
          }}
        >
          <Award size={16} />
          <span>Expert Credential Verification Queue</span>
          {pendingExpertCount > 0 && (
            <span style={{
              background: '#F59E0B', color: '#050B14', fontSize: '0.68rem', fontWeight: 800,
              padding: '1px 6px', borderRadius: '9999px'
            }}>
              {pendingExpertCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('USERS')}
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
            background: activeAdminTab === 'USERS' ? 'rgba(168, 85, 247, 0.14)' : 'transparent',
            color: activeAdminTab === 'USERS' ? '#C084FC' : 'var(--text-secondary)',
            borderBottom: activeAdminTab === 'USERS' ? '2px solid #C084FC' : '2px solid transparent'
          }}
        >
          <Users size={16} />
          <span>Platform Users &amp; Role Directory</span>
          <span style={{
            background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', fontSize: '0.68rem', fontWeight: 800,
            padding: '1px 6px', borderRadius: '9999px'
          }}>
            {totalUsers}
          </span>
        </button>
      </div>

      {/* TAB A: EXPERT CREDENTIAL VERIFICATION QUEUE */}
      {activeAdminTab === 'APPLICATIONS' && (
        <div>
          {/* Subheader & Filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Expert Onboarding Applications ({filteredApps.length})
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '2px 0 0 0' }}>
                Inspect work evidence, evaluate conflict declarations, and issue binding accreditation decisions.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search applicant or company..."
                  style={{
                    padding: '7px 12px 7px 30px', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
                    color: '#FFFFFF', fontSize: '0.78rem', width: '220px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'PENDING', label: `Pending (${applications.filter(a => a.status === 'PENDING').length})` },
                  { id: 'INFO_REQUESTED', label: 'Info Req' },
                  { id: 'APPROVED', label: 'Approved' },
                  { id: 'REJECTED', label: 'Rejected' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAppStatusFilter(tab.id)}
                    style={{
                      padding: '5px 10px', borderRadius: '6px', border: 'none',
                      background: appStatusFilter === tab.id ? 'var(--accent-cyan)' : 'transparent',
                      color: appStatusFilter === tab.id ? '#050B14' : 'var(--text-secondary)',
                      fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredApps.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: '16px' }}>
              <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ color: '#FFFFFF', fontWeight: 700, margin: '0 0 6px 0' }}>No Applications in this View</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: 0 }}>
                No expert candidate applications match the chosen filter.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredApps.map(app => (
                <div
                  key={app.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    borderRadius: '18px',
                    border: app.status === 'PENDING'
                      ? '1px solid rgba(245, 158, 11, 0.4)'
                      : (app.status === 'INFO_REQUESTED' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)'),
                    background: app.status === 'PENDING'
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(13, 17, 23, 0.95) 100%)'
                      : 'rgba(13, 17, 23, 0.95)'
                  }}
                >
                  {/* Top Row: Name, Status, Actions */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '50%',
                        background: app.status === 'APPROVED' ? '#10B981' : (app.status === 'PENDING' ? '#F59E0B' : '#6B7280'),
                        color: '#050B14', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '1.1rem'
                      }}>
                        {app.user_name ? app.user_name[0] : 'E'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>{app.user_name}</span>
                          {getStatusBadge(app.status)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <Mail size={12} /> {app.user_email} • Applied {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedAppForAudit(app)}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', padding: '7px 12px' }}
                      >
                        <Eye size={13} /> View Audit History ({app.status_history?.length || 0})
                      </button>

                      {app.status !== 'APPROVED' && (
                        <button
                          onClick={() => setDecisionModal({
                            isOpen: true,
                            action: 'APPROVE',
                            application: app,
                            adminNotes: `Verified engineering track record & credential documents on ${new Date().toLocaleDateString()}`,
                            requestedInfo: ''
                          })}
                          style={{
                            padding: '7px 14px', borderRadius: '8px', border: 'none',
                            background: '#10B981', color: '#050B14', fontWeight: 700,
                            fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                            boxShadow: '0 0 14px rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          <ShieldCheck size={14} /> Approve &amp; Accredit
                        </button>
                      )}

                      <button
                        onClick={() => setDecisionModal({
                          isOpen: true,
                          action: 'REQUEST_INFO',
                          application: app,
                          adminNotes: '',
                          requestedInfo: 'Please provide certificate of employment verification or technical conference speaker credentials.'
                        })}
                        style={{
                          padding: '7px 12px', borderRadius: '8px',
                          background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)',
                          color: '#FBBF24', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                      >
                        <HelpCircle size={13} /> Request Info
                      </button>

                      {app.status !== 'REJECTED' && (
                        <button
                          onClick={() => setDecisionModal({
                            isOpen: true,
                            action: 'REJECT',
                            application: app,
                            adminNotes: 'Candidate does not satisfy minimum senior evaluation track record standards.',
                            requestedInfo: ''
                          })}
                          style={{
                            padding: '7px 12px', borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#F87171', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px'
                          }}
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Headline & Experience */}
                  <div style={{
                    padding: '14px 18px', borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-subtle)',
                    marginBottom: '14px'
                  }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                      "{app.headline}"
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {app.current_title} @ {app.current_company}
                      </span>
                      <span>•</span>
                      <span>{app.years_of_experience} Years Experience</span>
                      <span>•</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>{app.industry_specialization}</span>
                    </div>

                    {app.experience_summary && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '8px 0 0 0', lineHeight: 1.45 }}>
                        {app.experience_summary}
                      </p>
                    )}
                  </div>

                  {/* Categories & Skills */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Supported Tracks
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {(app.supported_categories || []).map((cat, idx) => (
                          <span key={idx} style={{
                            fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px',
                            background: 'rgba(0, 240, 255, 0.08)', color: 'var(--accent-cyan)'
                          }}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Technical Specialties
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {(app.technical_expertise || []).map((skill, idx) => (
                          <span key={idx} style={{
                            fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)'
                          }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Links & Verification Proofs */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.78rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      {app.portfolio_url ? (
                        <a
                          href={app.portfolio_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--accent-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ExternalLink size={12} /> View Portfolio / LinkedIn
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No external link provided</span>
                      )}

                      {/* Documents counter / links */}
                      {app.credential_documents && app.credential_documents.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Credentials:</span>
                          {app.credential_documents.map((doc, idx) => (
                            <a
                              key={idx}
                              href={`${API_BASE}/api/expert/credential/${doc.filename}?token=${encodeURIComponent(token || '')}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: '#FFFFFF', background: 'rgba(255, 255, 255, 0.08)',
                                padding: '2px 8px', borderRadius: '4px', textDecoration: 'none',
                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem'
                              }}
                            >
                              <FileText size={11} color="var(--accent-cyan)" /> {doc.original_filename}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No attached credential files</span>
                      )}
                    </div>

                    {/* Conflict statement badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={14} color={app.conflict_declaration_confirmed ? '#34D399' : '#F87171'} />
                      <span style={{ color: app.conflict_declaration_confirmed ? '#34D399' : '#F87171', fontWeight: 600 }}>
                        {app.conflict_declaration_confirmed ? 'Neutrality Pledge Signed' : 'No Conflict Pledge'}
                      </span>
                      {app.conflict_notes && (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          ({app.conflict_notes})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB B: PLATFORM USERS DIRECTORY */}
      {activeAdminTab === 'USERS' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.2)', color: '#C084FC',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Users size={16} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Platform Users Directory ({filteredUsers.length})
              </h2>
            </div>

            {/* Search & Role Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, company..."
                  style={{
                    padding: '7px 12px 7px 30px', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
                    color: '#FFFFFF', fontSize: '0.78rem', width: '220px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'CANDIDATE', label: 'Candidates' },
                  { id: 'EXPERT', label: 'Experts' },
                  { id: 'PENDING_EXPERT', label: 'Pending' },
                  { id: 'ADMIN', label: 'Admins' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRoleFilter(tab.id)}
                    style={{
                      padding: '5px 10px', borderRadius: '6px', border: 'none',
                      background: roleFilter === tab.id ? 'var(--accent-cyan)' : 'transparent',
                      color: roleFilter === tab.id ? '#050B14' : 'var(--text-secondary)',
                      fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* User Directory Table */}
          <div className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 18px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>User / Identity</th>
                    <th style={{ padding: '12px 18px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Assigned Role</th>
                    <th style={{ padding: '12px 18px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Role Details &amp; Org</th>
                    <th style={{ padding: '12px 18px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Activity Stats</th>
                    <th style={{ padding: '12px 18px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Approval Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No users match the selected search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, i) => (
                      <tr
                        key={u.id || u.email}
                        style={{
                          borderBottom: i === filteredUsers.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                          background: u.role === 'PENDING_EXPERT' ? 'rgba(245, 158, 11, 0.03)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              background: u.role === 'ADMIN' ? '#A855F7' : (u.role === 'EXPERT' ? '#10B981' : (u.role === 'PENDING_EXPERT' ? '#F59E0B' : 'var(--accent-cyan)')),
                              color: '#050B14', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: '0.78rem'
                            }}>
                              {u.name ? u.name[0] : 'U'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{u.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          {getRoleBadge(u.role, u.expert_approval_status)}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ color: '#FFFFFF', fontWeight: 600 }}>
                            {u.expert_title || (u.role === 'ADMIN' ? 'Platform Administrator' : 'Software Engineer Candidate')}
                          </div>
                          {u.expert_organization && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {u.expert_organization}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '0.74rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Interviews: </span>
                              <strong style={{ color: '#FFFFFF' }}>{u.interviews_count || 0}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Reviews: </span>
                              <strong style={{ color: '#10B981' }}>{u.reviews_completed_count || 0}</strong>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px',
                            background: u.expert_approval_status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : (u.expert_approval_status === 'PENDING' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)'),
                            color: u.expert_approval_status === 'APPROVED' ? '#34D399' : (u.expert_approval_status === 'PENDING' ? '#FBBF24' : 'var(--text-muted)'),
                            fontWeight: 700
                          }}>
                            {u.expert_approval_status || 'NOT_APPLIED'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB C: ASSESSMENT ASSIGNMENT QUEUE */}
      {activeAdminTab === 'ASSIGNMENTS' && (
        <div>
          {/* Subheader & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="var(--accent-cyan)" />
                Assessment Assignment &amp; Expert Dispatch Queue
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                Dispatch candidate assessments to accredited industry experts with verified expertise matching, conflict safeguards, and SLA tracking.
              </p>
            </div>

            <button
              onClick={() => {
                fetchAssignmentQueue();
                fetchUsers();
              }}
              disabled={loadingAssignments}
              className="btn"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <RefreshCw size={14} className={loadingAssignments ? 'spin' : ''} />
              Refresh Queue
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '28px'
          }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}>
              <div style={{ fontSize: '0.74rem', color: '#FBBF24', fontWeight: 700, textTransform: 'uppercase' }}>
                Awaiting Expert Assignment
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F59E0B', marginTop: '4px' }}>
                {assignmentQueue?.unassigned_interviews?.length || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Interviews ready for dispatch
              </div>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid rgba(0, 240, 255, 0.25)'
            }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                Active In-Review Assignments
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF', marginTop: '4px' }}>
                {assignmentQueue?.assignments?.filter(a => a.status === 'ACTIVE').length || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Assigned to specialists
              </div>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              <div style={{ fontSize: '0.74rem', color: '#34D399', fontWeight: 700, textTransform: 'uppercase' }}>
                Completed Sign-Offs
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
                {assignmentQueue?.assignments?.filter(a => a.status === 'COMPLETED').length || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Signed and certified
              </div>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid rgba(168, 85, 247, 0.25)'
            }}>
              <div style={{ fontSize: '0.74rem', color: '#C084FC', fontWeight: 700, textTransform: 'uppercase' }}>
                Verified Experts in Pool
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF', marginTop: '4px' }}>
                {verifiedExperts.length}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Accredited &amp; eligible
              </div>
            </div>
          </div>

          {/* SECTION 1: AWAITING ASSIGNMENT */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="#F59E0B" />
                  Candidate Assessments Awaiting Expert Review ({assignmentQueue?.unassigned_interviews?.length || 0})
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '3px 0 0 0' }}>
                  Select an approved expert whose verified domain matches the candidate's target role.
                </p>
              </div>
            </div>

            {loadingAssignments ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px auto' }} />
                <p style={{ fontSize: '0.85rem' }}>Loading assessment assignment queue...</p>
              </div>
            ) : assignmentError ? (
              <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                {assignmentError}
              </div>
            ) : (assignmentQueue?.unassigned_interviews?.length || 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '14px', border: '1px dashed var(--border-subtle)' }}>
                <CheckCircle2 size={36} color="var(--accent-emerald)" style={{ margin: '0 auto 10px auto' }} />
                <h4 style={{ color: '#FFFFFF', margin: '0 0 4px 0', fontSize: '1rem' }}>No Assessments Awaiting Assignment</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '420px', margin: '0 auto' }}>
                  All candidate interviews have been dispatched to verified industry experts or completed.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {assignmentQueue.unassigned_interviews.map(item => {
                  const matchingCount = verifiedExperts.filter(exp => isExpertDomainMatch(exp, item)).length;
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '18px',
                        borderRadius: '14px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '1rem' }}>
                            {item.title || 'Technical Interview Assessment'}
                          </span>
                          {item.expert_domain_tag && (
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px',
                              background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)',
                              color: 'var(--accent-cyan)', fontSize: '0.7rem', fontWeight: 600
                            }}>
                              {item.expert_domain_tag}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          <span>Candidate: <strong style={{ color: '#FFFFFF' }}>{item.candidate_name || 'Interview Candidate'}</strong></span>
                          {item.candidate_email && (
                            <span style={{ color: 'var(--text-muted)' }}>({item.candidate_email})</span>
                          )}
                          <span>Target Role: <strong style={{ color: 'var(--accent-cyan)' }}>{item.job_role || 'Software Engineer'}</strong></span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          <span>Submitted: {new Date(item.created_at).toLocaleDateString()}</span>
                          {matchingCount > 0 ? (
                            <span style={{ color: '#34D399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={13} /> {matchingCount} verified expert{matchingCount > 1 ? 's' : ''} match this domain
                            </span>
                          ) : (
                            <span style={{ color: '#FBBF24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={13} /> General assignment available ({verifiedExperts.length} verified experts)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* AI Score Badge */}
                      <div style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid var(--border-subtle)',
                        textAlign: 'center',
                        minWidth: '100px'
                      }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                          AI Score
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>
                          {item.scores?.overall ? Math.round(item.scores.overall) : '78'}
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>/100</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        <button
                          onClick={() => setAssignModal({
                            isOpen: true,
                            interview: item,
                            selectedExpertId: '',
                            deadlineHours: 48,
                            reason: ''
                          })}
                          className="btn btn-primary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.82rem',
                            padding: '9px 16px',
                            background: '#00F0FF',
                            color: '#050B14',
                            fontWeight: 700
                          }}
                        >
                          <UserPlus size={15} />
                          Assign Expert
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: DISPATCHED ASSIGNMENTS LEDGER */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} color="var(--accent-cyan)" />
                  Dispatched Assessments &amp; Review History ({assignmentQueue?.assignments?.length || 0})
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '3px 0 0 0' }}>
                  Monitor active expert review SLAs, transfer assignments with recorded audit reasons, or cancel assignments.
                </p>
              </div>

              {/* Status Filter Buttons & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type="text"
                    value={assignmentSearch}
                    onChange={(e) => setAssignmentSearch(e.target.value)}
                    placeholder="Search by expert, candidate..."
                    style={{
                      padding: '7px 12px 7px 30px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      width: '200px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'ACTIVE', label: 'Active' },
                    { id: 'COMPLETED', label: 'Completed' },
                    { id: 'CANCELLED', label: 'Cancelled' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAssignmentStatusFilter(tab.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: assignmentStatusFilter === tab.id ? 'var(--accent-cyan)' : 'transparent',
                        color: assignmentStatusFilter === tab.id ? '#050B14' : 'var(--text-secondary)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Assignments Table */}
            {(() => {
              const filteredAssignments = (assignmentQueue?.assignments || []).filter(a => {
                if (assignmentStatusFilter !== 'ALL' && a.status !== assignmentStatusFilter) return false;
                if (assignmentSearch.trim()) {
                  const q = assignmentSearch.toLowerCase();
                  const matchExpert = (a.assigned_expert_name || '').toLowerCase().includes(q);
                  const matchCandidate = (a.candidate_email || '').toLowerCase().includes(q);
                  const matchTitle = (a.interview_title || '').toLowerCase().includes(q);
                  const matchRole = (a.interview_job_role || '').toLowerCase().includes(q);
                  if (!matchExpert && !matchCandidate && !matchTitle && !matchRole) return false;
                }
                return true;
              });

              if (filteredAssignments.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '0.85rem' }}>No assignments match the selected filter criteria.</p>
                  </div>
                );
              }

              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 14px' }}>Interview &amp; Role</th>
                        <th style={{ padding: '10px 14px' }}>Candidate</th>
                        <th style={{ padding: '10px 14px' }}>Assigned Expert</th>
                        <th style={{ padding: '10px 14px' }}>Assigned Date</th>
                        <th style={{ padding: '10px 14px' }}>SLA Deadline</th>
                        <th style={{ padding: '10px 14px' }}>Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignments.map(a => {
                        const isActive = a.status === 'ACTIVE';
                        const isCompleted = a.status === 'COMPLETED';
                        const isCancelled = a.status === 'CANCELLED';

                        return (
                          <tr key={a.assignment_id || a.interview_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{a.interview_title || 'Assessment'}</div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)' }}>{a.interview_job_role || 'Engineering'}</div>
                            </td>

                            <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                              <div>{a.candidate_email || 'Candidate'}</div>
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ShieldCheck size={14} color="#10B981" />
                                {a.assigned_expert_name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {a.assigned_expert_title} {a.assigned_expert_organization ? `• ${a.assigned_expert_organization}` : ''}
                              </div>
                            </td>

                            <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                              {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : 'N/A'}
                            </td>

                            <td style={{ padding: '12px 14px', fontSize: '0.76rem' }}>
                              {a.deadline_at ? (
                                <span style={{
                                  color: isActive && new Date(a.deadline_at) < new Date() ? '#EF4444' : 'var(--text-secondary)',
                                  fontWeight: 600
                                }}>
                                  {new Date(a.deadline_at).toLocaleDateString()}
                                  {isActive && new Date(a.deadline_at) < new Date() && ' (Overdue)'}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>48h SLA</span>
                              )}
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: isActive ? 'rgba(0, 240, 255, 0.15)' : (isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                                color: isActive ? 'var(--accent-cyan)' : (isCompleted ? '#34D399' : '#F87171')
                              }}>
                                {a.status}
                              </span>
                            </td>

                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                {isActive && (
                                  <>
                                    <button
                                      onClick={() => setReassignModal({
                                        isOpen: true,
                                        assignment: a,
                                        selectedExpertId: '',
                                        reason: ''
                                      })}
                                      className="btn"
                                      title="Reassign to another expert"
                                      style={{
                                        padding: '5px 8px',
                                        fontSize: '0.72rem',
                                        background: 'rgba(168, 85, 247, 0.15)',
                                        border: '1px solid rgba(168, 85, 247, 0.3)',
                                        color: '#C084FC',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <ArrowRightLeft size={12} />
                                      Reassign
                                    </button>

                                    <button
                                      onClick={() => setCancelModal({
                                        isOpen: true,
                                        assignment: a,
                                        reason: ''
                                      })}
                                      className="btn"
                                      title="Cancel assignment and return to queue"
                                      style={{
                                        padding: '5px 8px',
                                        fontSize: '0.72rem',
                                        background: 'rgba(239, 68, 68, 0.12)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#F87171',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <Ban size={12} />
                                      Cancel
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => setAssignmentAuditModal({
                                    isOpen: true,
                                    assignment: a
                                  })}
                                  className="btn"
                                  title="View assignment audit history"
                                  style={{
                                    padding: '5px 8px',
                                    fontSize: '0.72rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--border-subtle)',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <History size={12} />
                                  Audit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {decisionModal.isOpen && decisionModal.application && (
        <div className="modal-overlay">
          <div className="glass-panel modal-inner-padding" style={{ width: '100%', maxWidth: '540px', padding: '28px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {decisionModal.action === 'APPROVE' && <ShieldCheck size={24} color="#10B981" />}
                {decisionModal.action === 'REQUEST_INFO' && <HelpCircle size={24} color="#F59E0B" />}
                {decisionModal.action === 'REJECT' && <XCircle size={24} color="#EF4444" />}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  {decisionModal.action === 'APPROVE' && 'Accredit Verified Industry Expert'}
                  {decisionModal.action === 'REQUEST_INFO' && 'Request Additional Information'}
                  {decisionModal.action === 'REJECT' && 'Decline Expert Application'}
                </h3>
              </div>
              <button
                onClick={() => setDecisionModal({ isOpen: false, action: null, application: null, adminNotes: '', requestedInfo: '' })}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.5 }}>
              Applicant: <strong>{decisionModal.application.user_name}</strong> ({decisionModal.application.user_email})
              <br />
              Headline: <em>{decisionModal.application.headline}</em>
            </p>

            {decisionModal.action === 'REQUEST_INFO' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#FBBF24', marginBottom: '6px' }}>
                  SPECIFIC CLARIFICATION OR DOCUMENTS REQUESTED <span style={{ color: 'var(--accent-cyan)' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={decisionModal.requestedInfo}
                  onChange={(e) => setDecisionModal({ ...decisionModal, requestedInfo: e.target.value })}
                  placeholder="e.g. Please provide cloud architect certification ID, proof of senior employment, or thesis link..."
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                    color: '#FFFFFF', fontSize: '0.84rem', lineHeight: 1.5, resize: 'vertical'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                ADMIN AUDIT LEDGER NOTES
              </label>
              <textarea
                rows={3}
                value={decisionModal.adminNotes}
                onChange={(e) => setDecisionModal({ ...decisionModal, adminNotes: e.target.value })}
                placeholder="Reasoning, verification sources checked, internal review comments..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.84rem', lineHeight: 1.5, resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDecisionModal({ isOpen: false, action: null, application: null, adminNotes: '', requestedInfo: '' })}
                disabled={processingDecision}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitDecision}
                disabled={processingDecision}
                style={{
                  background: decisionModal.action === 'APPROVE' ? '#10B981' : (decisionModal.action === 'REJECT' ? '#EF4444' : '#F59E0B'),
                  color: decisionModal.action === 'APPROVE' ? '#050B14' : '#FFFFFF',
                  fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {processingDecision ? 'Executing...' : (
                  <>
                    <Send size={14} /> Confirm {decisionModal.action}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT HISTORY VIEWER DRAWER / MODAL */}
      {selectedAppForAudit && (
        <div className="modal-overlay">
          <div className="glass-panel modal-inner-padding" style={{ width: '100%', maxWidth: '640px', padding: '28px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={22} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Audit History: {selectedAppForAudit.user_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAppForAudit(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ position: 'relative', paddingLeft: '20px' }}>
              <div style={{
                position: 'absolute', top: '10px', bottom: '10px', left: '6px',
                width: '2px', background: 'var(--border-subtle)'
              }} />

              {(selectedAppForAudit.status_history || []).map((entry, idx) => (
                <div key={idx} style={{ position: 'relative', marginBottom: '20px' }}>
                  <div style={{
                    position: 'absolute', left: '-20px', top: '4px',
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: entry.action === 'APPROVED' ? '#34D399' : (entry.action === 'REJECTED' ? '#F87171' : (entry.action === 'INFO_REQUESTED' ? '#FBBF24' : 'var(--accent-cyan)')),
                    boxShadow: '0 0 8px rgba(0, 240, 255, 0.4)'
                  }} />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)', color: '#FFFFFF'
                      }}>
                        {entry.action}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#FFFFFF', fontWeight: 600, marginTop: '4px' }}>
                      {entry.actor_name} ({entry.actor_role})
                    </div>

                    {entry.notes && (
                      <p style={{
                        fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0 0',
                        background: 'rgba(255, 255, 255, 0.02)', padding: '6px 10px', borderRadius: '6px'
                      }}>
                        {entry.notes}
                      </p>
                    )}

                    {entry.requested_info && (
                      <div style={{
                        fontSize: '0.76rem', color: '#FCA5A5', marginTop: '6px',
                        padding: '6px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)'
                      }}>
                        <strong>Requested Info:</strong> {entry.requested_info}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedAppForAudit(null)}>
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ASSIGN EXPERT MODAL */}
      {assignModal.isOpen && assignModal.interview && (
        <div className="modal-overlay">
          <div className="glass-panel modal-inner-padding" style={{ width: '100%', maxWidth: '580px', padding: '28px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={22} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Assign Industry Expert
                </h3>
              </div>
              <button
                onClick={() => setAssignModal({ isOpen: false, interview: null, selectedExpertId: '', deadlineHours: 48, reason: '' })}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Assessment Target Role Summary */}
            <div style={{
              padding: '14px 16px', borderRadius: '12px',
              background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                Assessment Selected
              </div>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                {assignModal.interview.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span>Candidate: <strong style={{ color: '#FFFFFF' }}>{assignModal.interview.candidate_name || 'Candidate'}</strong></span>
                <span>Role: <strong style={{ color: 'var(--accent-cyan)' }}>{assignModal.interview.job_role}</strong></span>
              </div>
            </div>

            {/* Select Verified Expert */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                SELECT ACCREDITED INDUSTRY EXPERT <span style={{ color: 'var(--accent-cyan)' }}>*</span>
              </label>

              {verifiedExperts.length === 0 ? (
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#F87171', fontSize: '0.8rem' }}>
                  No verified experts available in the platform. Please approve expert applications in the Credential Verification Queue first.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {verifiedExperts.map(exp => {
                    const isMatch = isExpertDomainMatch(exp, assignModal.interview);
                    const conflictWarning = checkExpertConflict(exp, assignModal.interview);
                    const isSelected = assignModal.selectedExpertId === exp.id;

                    return (
                      <div
                        key={exp.id}
                        onClick={() => setAssignModal({ ...assignModal, selectedExpertId: exp.id })}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '16px', height: '16px', borderRadius: '50%',
                              border: isSelected ? '4px solid var(--accent-cyan)' : '2px solid var(--text-muted)',
                              background: isSelected ? '#050B14' : 'transparent'
                            }} />
                            <strong style={{ color: '#FFFFFF', fontSize: '0.85rem' }}>{exp.name}</strong>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              ({exp.expert_title || 'Expert'}{exp.expert_organization ? ` @ ${exp.expert_organization}` : ''})
                            </span>
                          </div>

                          {isMatch && (
                            <span style={{
                              fontSize: '0.66rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.2)', color: '#34D399',
                              display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                              <ShieldCheck size={11} /> Verified Match
                            </span>
                          )}
                        </div>

                        {conflictWarning && (
                          <div style={{
                            marginTop: '6px', fontSize: '0.72rem', color: '#FBBF24',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            <AlertTriangle size={12} /> {conflictWarning}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SLA Deadline Selector */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                REVIEW DEADLINE SLA
              </label>
              <select
                value={assignModal.deadlineHours}
                onChange={(e) => setAssignModal({ ...assignModal, deadlineHours: Number(e.target.value) })}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.84rem'
                }}
              >
                <option value={24}>24 Hours (Urgent Priority)</option>
                <option value={48}>48 Hours (Standard SLA Benchmark)</option>
                <option value={72}>72 Hours (In-Depth Technical Evaluation)</option>
                <option value={168}>7 Days (Executive Assessment Window)</option>
              </select>
            </div>

            {/* Optional Instructions */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                DISPATCH NOTES &amp; FOCUS AREAS (OPTIONAL)
              </label>
              <textarea
                rows={2}
                value={assignModal.reason}
                onChange={(e) => setAssignModal({ ...assignModal, reason: e.target.value })}
                placeholder="Specific focus areas for the expert, e.g. verify system design depth, validate database concurrency evidence..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.82rem', lineHeight: 1.5, resize: 'vertical'
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setAssignModal({ isOpen: false, interview: null, selectedExpertId: '', deadlineHours: 48, reason: '' })}
                disabled={processingAssignment}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmAssign}
                disabled={processingAssignment || !assignModal.selectedExpertId}
                style={{
                  background: '#00F0FF', color: '#050B14', fontWeight: 800,
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {processingAssignment ? 'Dispatching...' : (
                  <>
                    <Send size={14} /> Confirm Assignment &amp; Dispatch Notification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REASSIGN EXPERT MODAL */}
      {reassignModal.isOpen && reassignModal.assignment && (
        <div className="modal-overlay">
          <div className="glass-panel modal-inner-padding" style={{ width: '100%', maxWidth: '560px', padding: '28px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ArrowRightLeft size={22} color="#C084FC" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Reassign Assessment to Different Expert
                </h3>
              </div>
              <button
                onClick={() => setReassignModal({ isOpen: false, assignment: null, selectedExpertId: '', reason: '' })}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              padding: '12px 14px', borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)',
              marginBottom: '16px', fontSize: '0.8rem'
            }}>
              <div>Currently Assigned: <strong style={{ color: '#FFFFFF' }}>{reassignModal.assignment.assigned_expert_name}</strong></div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                Assessment: {reassignModal.assignment.interview_title} ({reassignModal.assignment.interview_job_role})
              </div>
            </div>

            {/* Select New Expert */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                SELECT REPLACEMENT ACCREDITED EXPERT <span style={{ color: 'var(--accent-cyan)' }}>*</span>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {verifiedExperts
                  .filter(exp => exp.id !== reassignModal.assignment.assigned_expert_id)
                  .map(exp => {
                    const isSelected = reassignModal.selectedExpertId === exp.id;
                    return (
                      <div
                        key={exp.id}
                        onClick={() => setReassignModal({ ...reassignModal, selectedExpertId: exp.id })}
                        style={{
                          padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                          background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected ? '1px solid #C084FC' : '1px solid var(--border-subtle)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '14px', height: '14px', borderRadius: '50%',
                            border: isSelected ? '4px solid #C084FC' : '2px solid var(--text-muted)'
                          }} />
                          <strong style={{ color: '#FFFFFF', fontSize: '0.82rem' }}>{exp.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({exp.expert_title || 'Expert'})</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Mandatory Reassignment Reason */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FBBF24', marginBottom: '6px' }}>
                MANDATORY REASSIGNMENT AUDIT REASON <span style={{ color: 'var(--accent-cyan)' }}>*</span>
              </label>
              <textarea
                rows={3}
                required
                value={reassignModal.reason}
                onChange={(e) => setReassignModal({ ...reassignModal, reason: e.target.value })}
                placeholder="Why is this assessment being transferred? (e.g., Expert unavailable, domain mismatch, deadline missed, candidate request)..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.82rem', lineHeight: 1.5, resize: 'vertical'
                }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                This reason is permanently preserved in the cryptographically logged audit ledger.
              </span>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setReassignModal({ isOpen: false, assignment: null, selectedExpertId: '', reason: '' })}
                disabled={processingAssignment}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmReassign}
                disabled={processingAssignment || !reassignModal.selectedExpertId || reassignModal.reason.trim().length < 5}
                style={{
                  background: '#A855F7', color: '#FFFFFF', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {processingAssignment ? 'Transferring...' : 'Execute Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCEL ASSIGNMENT MODAL */}
      {cancelModal.isOpen && cancelModal.assignment && (
        <div className="modal-overlay">
          <div className="glass-panel modal-inner-padding" style={{ width: '100%', maxWidth: '520px', padding: '28px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Ban size={22} color="#EF4444" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Cancel Expert Assignment
                </h3>
              </div>
              <button
                onClick={() => setCancelModal({ isOpen: false, assignment: null, reason: '' })}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              padding: '12px 14px', borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
              marginBottom: '16px', fontSize: '0.8rem', color: '#FCA5A5'
            }}>
              Cancelling will revoke this assessment from <strong>{cancelModal.assignment.assigned_expert_name}</strong> and return the interview to the unassigned queue for redistribution.
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                CANCELLATION REASON <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                rows={3}
                required
                value={cancelModal.reason}
                onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                placeholder="Reason for assignment cancellation (e.g., duplicate submission, expert withdrew, candidate request)..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.82rem', lineHeight: 1.5, resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCancelModal({ isOpen: false, assignment: null, reason: '' })}
                disabled={processingAssignment}
              >
                Keep Assignment
              </button>
              <button
                className="btn"
                onClick={handleConfirmCancel}
                disabled={processingAssignment || cancelModal.reason.trim().length < 5}
                style={{
                  background: '#EF4444', color: '#FFFFFF', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {processingAssignment ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ASSIGNMENT AUDIT TRAIL MODAL */}
      {assignmentAuditModal.isOpen && assignmentAuditModal.assignment && (
        <div className="modal-overlay">
          <div className="glass-panel modal-inner-padding" style={{ width: '100%', maxWidth: '600px', padding: '28px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={22} color="var(--accent-cyan)" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Assignment Audit Ledger
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Interview: {assignmentAuditModal.assignment.interview_title}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setAssignmentAuditModal({ isOpen: false, assignment: null })}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ position: 'relative', paddingLeft: '20px' }}>
              <div style={{
                position: 'absolute', top: '10px', bottom: '10px', left: '6px',
                width: '2px', background: 'var(--border-subtle)'
              }} />

              {((assignmentAuditModal.assignment.audit_trail && assignmentAuditModal.assignment.audit_trail.length > 0)
                ? assignmentAuditModal.assignment.audit_trail
                : [
                    {
                      action: 'ASSIGNED',
                      performed_by: assignmentAuditModal.assignment.assigned_by_admin_name || 'Admin',
                      timestamp: assignmentAuditModal.assignment.assigned_at,
                      details: `Assigned to ${assignmentAuditModal.assignment.assigned_expert_name}`,
                      reason: assignmentAuditModal.assignment.assignment_reason || 'Initial dispatch'
                    }
                  ]
              ).map((entry, idx) => (
                <div key={idx} style={{ position: 'relative', marginBottom: '20px' }}>
                  <div style={{
                    position: 'absolute', left: '-20px', top: '4px',
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: entry.action === 'COMPLETED' ? '#34D399' : (entry.action === 'CANCELLED' ? '#F87171' : (entry.action === 'REASSIGNED' ? '#C084FC' : 'var(--accent-cyan)')),
                    boxShadow: '0 0 8px rgba(0, 240, 255, 0.4)'
                  }} />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)', color: '#FFFFFF'
                      }}>
                        {entry.action}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#FFFFFF', fontWeight: 600, marginTop: '4px' }}>
                      By: {entry.performed_by}
                    </div>

                    {entry.details && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {entry.details}
                      </div>
                    )}

                    {entry.reason && (
                      <p style={{
                        fontSize: '0.76rem', color: 'var(--accent-cyan)', margin: '4px 0 0 0',
                        background: 'rgba(255, 255, 255, 0.02)', padding: '6px 10px', borderRadius: '6px'
                      }}>
                        <strong>Reason:</strong> {entry.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setAssignmentAuditModal({ isOpen: false, assignment: null })}>
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
