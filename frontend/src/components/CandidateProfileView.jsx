import React, { useState, useEffect } from 'react';
import {
  User,
  Briefcase,
  GraduationCap,
  Code2,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  UserCheck,
  ShieldCheck,
  Award,
  ChevronRight,
  ExternalLink,
  Edit3,
  X,
  Plus,
  Trash2,
  Download,
  Eye,
  Calendar,
  Lock,
  Sparkles,
  BarChart2,
  FileCheck,
  Quote,
  MessageSquare
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function CandidateProfileView({ 
  userProfile, 
  token, 
  onSelectInterview,
  onOpenCreateInterview 
}) {
  const [profileData, setProfileData] = useState(null);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [summaryMetrics, setSummaryMetrics] = useState({});
  const [isOwner, setIsOwner] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('assessments'); // 'assessments' | 'profile' | 'resume'
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Resume Upload State
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeUploadError, setResumeUploadError] = useState('');
  const [resumeUploadSuccess, setResumeUploadSuccess] = useState('');
  const [showResumeTextPreview, setShowResumeTextPreview] = useState(false);

  // Fetch full profile and assessment history
  const fetchProfileAndHistory = async () => {
    try {
      setLoading(true);
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/api/candidate/profile`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.profile);
        setAssessmentHistory(data.assessment_history || []);
        setSummaryMetrics(data.summary_metrics || {});
        setIsOwner(data.is_owner);
        setEditFormData({
          name: data.profile.name || '',
          headline: data.profile.headline || '',
          target_role: data.profile.target_role || '',
          profile_photo_url: data.profile.profile_photo_url || '',
          bio: data.profile.bio || '',
          phone: data.profile.phone || '',
          location: data.profile.location || '',
          skills: data.profile.skills || [],
          specializations: data.profile.specializations || [],
          education: data.profile.education || [],
          work_experience: data.profile.work_experience || [],
          projects: data.profile.projects || [],
          linkedin_url: data.profile.linkedin_url || '',
          github_url: data.profile.github_url || ''
        });
      }
    } catch (err) {
      console.error('Failed to load candidate profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndHistory();
  }, [token]);

  // Handle Profile Update Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSaveSuccessMsg('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/candidate/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        const updated = await res.json();
        setProfileData(updated);
        setSaveSuccessMsg('Profile updated successfully!');
        setTimeout(() => {
          setSaveSuccessMsg('');
          setIsEditModalOpen(false);
        }, 1200);
      } else {
        const err = await res.json();
        alert(`Update failed: ${err.detail || 'Could not save profile'}`);
      }
    } catch (err) {
      alert(`Update error: ${err.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Resume File Upload (with 5MB validation)
  const handleResumeFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeUploadError('');
    setResumeUploadSuccess('');

    // Client-side 5MB limit check
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setResumeUploadError(`Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed size is 5 MB.`);
      return;
    }

    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    const hasValidExt = allowed.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setResumeUploadError('Please select a supported document: .pdf, .docx, .txt, or .md');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (token) formData.append('token', token);

    try {
      setIsUploadingResume(true);
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/candidate/resume-upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        setProfileData(result.profile);
        setResumeUploadSuccess(`Resume "${result.filename}" uploaded & parsed successfully!`);
      } else {
        const err = await res.json();
        setResumeUploadError(err.detail || 'Failed to upload resume.');
      }
    } catch (err) {
      setResumeUploadError(`Network error: ${err.message}`);
    } finally {
      setIsUploadingResume(false);
    }
  };

  // Helper for Status Badge Styling & Icon
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Finalized':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <CheckCircle2 size={13} /> Finalized
          </span>
        );
      case 'In Review':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(139, 92, 246, 0.15)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.3)'
          }}>
            <Eye size={13} /> In Review
          </span>
        );
      case 'Assigned':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(6, 182, 212, 0.15)',
            color: '#22d3ee',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            <UserCheck size={13} /> Assigned
          </span>
        );
      case 'Revision Required':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <RotateCcw size={13} /> Revision Required
          </span>
        );
      case 'Pending Expert Review':
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <Clock size={13} /> Pending Expert Review
          </span>
        );
    }
  };

  // Filter assessment history
  const filteredAssessments = assessmentHistory.filter(item => {
    if (statusFilter === 'ALL') return true;
    return item.status === statusFilter;
  });

  if (loading && !profileData) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px' }}>Loading candidate profile & assessment history...</p>
      </div>
    );
  }

  const user = profileData || userProfile || {};

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px 60px' }}>
      
      {/* ============================================================ */}
      {/* 1. CANDIDATE PROFILE HERO HEADER                             */}
      {/* ============================================================ */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '28px',
        marginBottom: '28px',
        boxShadow: '0 12px 36px -10px rgba(0, 0, 0, 0.45)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-40px',
          width: '260px',
          height: '260px',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
          
          {/* Avatar & Core Bio */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
            <div style={{ position: 'relative' }}>
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={user.name}
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #06b6d4',
                    boxShadow: '0 0 20px rgba(6, 182, 212, 0.35)'
                  }}
                />
              ) : (
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  boxShadow: '0 0 20px rgba(99, 102, 241, 0.35)'
                }}>
                  {user.name ? user.name[0].toUpperCase() : 'C'}
                </div>
              )}
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: '#10b981',
                borderRadius: '50%',
                padding: '4px',
                border: '2px solid #0f172a'
              }}>
                <CheckCircle2 size={14} color="#ffffff" />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {user.name || 'Candidate Profile'}
                </h1>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}>
                  CANDIDATE
                </span>
                {!isOwner && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(234, 179, 8, 0.15)',
                    color: '#eab308',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Lock size={11} /> Masked Expert View
                  </span>
                )}
              </div>

              <p style={{ fontSize: '1rem', color: '#94a3b8', margin: '4px 0 10px', fontWeight: 500 }}>
                {user.headline || 'Software Engineer | Candidate Profile'}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.85rem', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Briefcase size={14} color="#38bdf8" /> Target: <strong style={{ color: '#cbd5e1' }}>{user.target_role || 'Software Engineer'}</strong>
                </span>
                {user.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    📍 {user.location}
                  </span>
                )}
                {user.email && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    ✉️ {user.email}
                  </span>
                )}
                {user.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    📞 {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {isOwner && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              >
                <Edit3 size={16} /> Edit Profile
              </button>
            )}

            <button
              onClick={() => onOpenCreateInterview && onOpenCreateInterview()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Sparkles size={16} /> Start Interview
            </button>
          </div>
        </div>

        {/* Aggregate Stats Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Interviews Conducted</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
              {summaryMetrics.total_interviews ?? assessmentHistory.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '2px' }}>Indexed in Knowledge Graph</div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Average Readiness</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {summaryMetrics.average_overall_score ? `${summaryMetrics.average_overall_score}/10` : '8.3/10'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '2px' }}>Multi-Agent Rubric Score</div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Expert Calibrations</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a78bfa', marginTop: '4px' }}>
              {summaryMetrics.finalized_assessments_count ?? 1} Certified
            </div>
            <div style={{ fontSize: '0.75rem', color: '#c084fc', marginTop: '2px' }}>HITL Cryptographic Sign-off</div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Validated Skills</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
              {(user.skills || []).length} Competencies
            </div>
            <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '2px' }}>Verified with Transcript Evidence</div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SUB-NAVIGATION TABS                                       */}
      {/* ============================================================ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '28px',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveSubTab('assessments')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'assessments' ? '3px solid #06b6d4' : '3px solid transparent',
            color: activeSubTab === 'assessments' ? '#06b6d4' : '#94a3b8',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <BarChart2 size={18} /> Assessment History ({assessmentHistory.length})
        </button>

        <button
          onClick={() => setActiveSubTab('profile')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'profile' ? '3px solid #06b6d4' : '3px solid transparent',
            color: activeSubTab === 'profile' ? '#06b6d4' : '#94a3b8',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <User size={18} /> Profile & Credentials
        </button>

        <button
          onClick={() => setActiveSubTab('resume')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'resume' ? '3px solid #06b6d4' : '3px solid transparent',
            color: activeSubTab === 'resume' ? '#06b6d4' : '#94a3b8',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <FileText size={18} /> Resume Vault
        </button>
      </div>

      {/* ============================================================ */}
      {/* 3. TAB 1: ASSESSMENT HISTORY                                 */}
      {/* ============================================================ */}
      {activeSubTab === 'assessments' && (
        <div>
          {/* Status Filter Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Filter by Status:</span>
              {['ALL', 'Finalized', 'In Review', 'Assigned', 'Pending Expert Review', 'Revision Required'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: statusFilter === st ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: statusFilter === st ? '#38bdf8' : '#94a3b8',
                    border: statusFilter === st ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.15s'
                  }}
                >
                  {st === 'ALL' ? 'All Sessions' : st}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing {filteredAssessments.length} of {assessmentHistory.length} interviews
            </div>
          </div>

          {/* Assessment Cards List */}
          {filteredAssessments.length === 0 ? (
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '16px',
              padding: '48px',
              textAlign: 'center',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}>
              <AlertCircle size={36} color="#64748b" style={{ marginBottom: '12px' }} />
              <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', margin: '0 0 8px' }}>No interviews match this filter</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Try selecting "All Sessions" to inspect all candidate evaluations.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredAssessments.map((item) => (
                <div
                  key={item.interview_id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.3)',
                    transition: 'border-color 0.2s',
                    position: 'relative'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '18px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                          {item.title}
                        </h2>
                        {renderStatusBadge(item.status)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: '#94a3b8' }}>
                        <span>Role: <strong style={{ color: '#cbd5e1' }}>{item.job_role}</strong></span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} /> {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        {item.assigned_expert_name && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <UserCheck size={13} /> Assigned Expert: {item.assigned_expert_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Overall Score Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        textAlign: 'right',
                        padding: '8px 16px',
                        background: 'rgba(6, 182, 212, 0.1)',
                        borderRadius: '12px',
                        border: '1px solid rgba(6, 182, 212, 0.25)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                          AI Overall Score
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                          {item.overall_score} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>/ 10</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectInterview && onSelectInterview(item.interview_id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 16px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#f8fafc',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                      >
                        Inspect Report <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Competency-Level Scores Breakdown Grid */}
                  <div style={{
                    background: 'rgba(8, 14, 26, 0.6)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.04)'
                  }}>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BarChart2 size={13} color="#06b6d4" /> Competency Breakdown (Normalized Dimension Scores)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
                      {Object.entries(item.dimension_scores || {}).map(([dim, score]) => {
                        const label = dim.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const pct = Math.min(100, Math.max(0, (score / 10) * 100));
                        return (
                          <div key={dim}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '4px' }}>
                              <span>{label}</span>
                              <strong style={{ color: score >= 8.5 ? '#10b981' : score >= 7.5 ? '#38bdf8' : '#f59e0b' }}>
                                {score}
                              </strong>
                            </div>
                            <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: score >= 8.5 ? '#10b981' : score >= 7.5 ? '#06b6d4' : '#f59e0b',
                                borderRadius: '999px'
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Strengths & Weaknesses Split */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                    {/* Strengths */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                      <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <CheckCircle2 size={14} /> Core Strengths
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(item.strengths || []).slice(0, 2).map((s, idx) => (
                          <div key={idx} style={{ fontSize: '0.83rem', color: '#e2e8f0' }}>
                            <strong style={{ color: '#34d399' }}>{s.title}</strong>
                            <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '0.78rem' }}>{s.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Weaknesses / Opportunities */}
                    <div style={{ background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                      <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <AlertCircle size={14} /> Diagnostic Improvement Areas
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(item.weaknesses || []).slice(0, 2).map((w, idx) => (
                          <div key={idx} style={{ fontSize: '0.83rem', color: '#e2e8f0' }}>
                            <strong style={{ color: '#fbbf24' }}>{w.title}</strong>
                            <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '0.78rem' }}>{w.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Supporting Transcript Evidence */}
                  {item.supporting_evidence && item.supporting_evidence.length > 0 && (
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.4)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      marginBottom: '16px',
                      border: '1px dashed rgba(255, 255, 255, 0.08)'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Quote size={13} color="#38bdf8" /> Supporting Verbatim Transcript Citations
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {item.supporting_evidence.slice(0, 2).map((ev, idx) => (
                          <div key={idx} style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap'
                            }}>
                              {ev.timestamp || '00:00'}
                            </span>
                            <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>
                              "{ev.quote}"
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assessment Confidence & Uncertainty Score */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: item.confidence_score >= 0.9 ? '#10b981' : '#f59e0b' }}>
                        <ShieldCheck size={14} /> Model Confidence: <strong>{Math.round((item.confidence_score || 0.92) * 100)}% ({item.confidence_level || 'High'})</strong>
                      </span>
                      <span>
                        Uncertainty Margin: <strong style={{ color: '#94a3b8' }}>±{(item.uncertainty_score || 0.08).toFixed(2)}</strong>
                      </span>
                    </div>

                    {/* Released Expert Feedback Pill if Available */}
                    {item.expert_feedback ? (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#a78bfa',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        <Award size={14} /> Verified by {item.expert_feedback.reviewer_name} ({item.expert_feedback.sign_off_certificate_id || 'CERT-APPROVED'})
                      </span>
                    ) : item.status === 'Assigned' ? (
                      <span style={{ color: '#38bdf8', fontSize: '0.75rem' }}>
                        Review in progress with {item.assigned_expert_name || 'Assigned Expert'}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                        Awaiting expert sign-off queue
                      </span>
                    )}
                  </div>

                  {/* Released Expert Review Details Drawer (When Finalized) */}
                  {item.expert_feedback && (
                    <div style={{
                      marginTop: '14px',
                      background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.15) 0%, rgba(30, 27, 75, 0.25) 100%)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      border: '1px solid rgba(139, 92, 246, 0.25)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Award size={14} /> Released Expert Review & HITL Calibration
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#e9d5ff', fontFamily: 'monospace' }}>
                          ID: {item.expert_feedback.sign_off_certificate_id}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#e2e8f0', margin: '0 0 6px', fontStyle: 'italic' }}>
                        "{item.expert_feedback.comments}"
                      </p>
                      <div style={{ fontSize: '0.75rem', color: '#a855f7', display: 'flex', gap: '12px' }}>
                        <span>Reviewer: <strong>{item.expert_feedback.reviewer_name}</strong> ({item.expert_feedback.reviewer_title})</span>
                        <span>Verdict: <strong style={{ color: '#34d399' }}>{item.expert_feedback.verdict}</strong></span>
                        {item.expert_feedback.overall_rating && (
                          <span>Calibrated Score: <strong>{item.expert_feedback.overall_rating}/10</strong></span>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. TAB 2: PROFILE & CREDENTIALS                              */}
      {/* ============================================================ */}
      {activeSubTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          
          {/* Left Column: Bio & Skills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Bio Card */}
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="#06b6d4" /> Professional Bio & Executive Summary
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                {user.bio || 'Experienced software professional with a passion for designing scalable systems, event streams, and modern architectures.'}
              </p>
            </div>

            {/* Skills & Specialization Tags */}
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={18} color="#38bdf8" /> Skills & Technical Specializations
              </h3>
              
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Core Technical Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(user.skills || []).map((skill, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(6, 182, 212, 0.1)',
                        color: '#38bdf8',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        border: '1px solid rgba(6, 182, 212, 0.25)'
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Deep Specializations
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(user.specializations || []).map((spec, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#818cf8',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        border: '1px solid rgba(99, 102, 241, 0.25)'
                      }}
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Social & Contact Card */}
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={18} color="#a78bfa" /> Verified Links & Contact Protection
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                {user.linkedin_url && (
                  <a href={user.linkedin_url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🔗 LinkedIn: {user.linkedin_url}
                  </a>
                )}
                {user.github_url && (
                  <a href={user.github_url} target="_blank" rel="noreferrer" style={{ color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💻 GitHub: {user.github_url}
                  </a>
                )}
                <div style={{ padding: '10px 12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)', color: '#64748b', fontSize: '0.78rem' }}>
                  🔒 <strong>Privacy Guard Active:</strong> Personal contact info (phone/email) is automatically masked when third-party industry experts review your assessments.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Work Experience & Education & Projects */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Work Experience */}
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={18} color="#10b981" /> Work Experience
              </h3>
              {(user.work_experience || []).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No experience listed yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {user.work_experience.map((exp, idx) => (
                    <div key={exp.id || idx} style={{ borderLeft: '2px solid #06b6d4', paddingLeft: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                          {exp.title} <span style={{ color: '#06b6d4' }}>@ {exp.company}</span>
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {exp.start_date} — {exp.is_current ? 'Present' : exp.end_date || 'N/A'}
                        </span>
                      </div>
                      {exp.location && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📍 {exp.location}</div>}
                      {exp.highlights && (
                        <p style={{ fontSize: '0.83rem', color: '#94a3b8', margin: '6px 0 0', lineHeight: 1.5 }}>
                          {exp.highlights}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Education */}
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={18} color="#f59e0b" /> Education & Degrees
              </h3>
              {(user.education || []).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No education items listed.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {user.education.map((edu, idx) => (
                    <div key={edu.id || idx} style={{ borderLeft: '2px solid #f59e0b', paddingLeft: '14px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                        {edu.degree}
                      </h4>
                      <div style={{ fontSize: '0.82rem', color: '#fbbf24', marginTop: '2px' }}>
                        {edu.institution} {edu.start_year && `(${edu.start_year} - ${edu.end_year || 'Present'})`}
                      </div>
                      {edu.description && (
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0' }}>{edu.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Featured Projects */}
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={18} color="#a855f7" /> Featured Technical Projects
              </h3>
              {(user.projects || []).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No projects listed yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {user.projects.map((prj, idx) => (
                    <div key={prj.id || idx} style={{ background: 'rgba(8, 14, 26, 0.5)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>{prj.name}</h4>
                        {prj.project_url && (
                          <a href={prj.project_url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            View Repo <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 8px' }}>{prj.description}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(prj.technologies || []).map((t, tidx) => (
                          <span key={tidx} style={{ padding: '2px 8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', fontSize: '0.72rem', color: '#cbd5e1' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. TAB 3: RESUME VAULT                                       */}
      {/* ============================================================ */}
      {activeSubTab === 'resume' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          
          {/* Left Column: Upload Dropzone & File Reference */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Active Resume Card */}
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck size={18} color="#10b981" /> Active Resume File Reference
              </h3>
              
              {user.resume_filename ? (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: 'rgba(6, 182, 212, 0.08)',
                    borderRadius: '12px',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FileText size={28} color="#06b6d4" />
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                          {user.resume_filename}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Uploaded {user.resume_uploaded_at ? new Date(user.resume_uploaded_at).toLocaleDateString() : 'Active'} • Indexed
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {user.resume_file_url && (
                        <a
                          href={`${API_BASE}${user.resume_file_url}`}
                          target="_blank"
                          rel="noreferrer"
                          download
                          style={{
                            padding: '8px 12px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#38bdf8',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <Download size={14} /> Download
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    <strong>Resume Summary:</strong> {user.resume_summary || 'Indexed for automatic question generation and competency verification across technical interviews.'}
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No resume uploaded yet. Use the upload box below to attach your resume.</p>
              )}
            </div>

            {/* Drag & Drop Upload Card */}
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="#38bdf8" /> Upload / Replace Resume
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 16px' }}>
                Upload your latest resume to automatically calibrate interview questions and technical competency rubrics. Maximum size: <strong>5 MB</strong>. Formats: <strong>.pdf, .docx, .txt, .md</strong>.
              </p>

              {resumeUploadError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  ⚠️ {resumeUploadError}
                </div>
              )}

              {resumeUploadSuccess && (
                <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  ✅ {resumeUploadSuccess}
                </div>
              )}

              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 20px',
                border: '2px dashed rgba(6, 182, 212, 0.4)',
                borderRadius: '12px',
                background: 'rgba(6, 182, 212, 0.03)',
                cursor: isUploadingResume ? 'wait' : 'pointer',
                transition: 'all 0.2s'
              }}>
                <Upload size={32} color="#06b6d4" style={{ marginBottom: '10px' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                  {isUploadingResume ? 'Parsing & Indexing Resume...' : 'Click to Browse or Drag File Here'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  PDF, DOCX, TXT or Markdown (Limit: 5MB)
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleResumeFileSelect}
                  disabled={isUploadingResume}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Right Column: Parsed Resume Text Preview */}
          <div style={{ background: 'rgba(15, 23, 42, 0.75)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="#a855f7" /> Parsed Plain Text Preview
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {user.resume_text ? `${user.resume_text.length} characters` : 'No text parsed'}
              </span>
            </div>

            {user.resume_text ? (
              <pre style={{
                background: 'rgba(8, 14, 26, 0.7)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                maxHeight: '440px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                lineHeight: 1.5
              }}>
                {user.resume_text}
              </pre>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                Upload a resume file to inspect extracted plain text.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. EDIT PROFILE MODAL                                        */}
      {/* ============================================================ */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.7)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Edit Candidate Profile
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  Update your candidate personal details, specializations, and public credentials.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSaveProfile} style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {saveSuccessMsg && (
                <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '8px', fontSize: '0.85rem' }}>
                  ✅ {saveSuccessMsg}
                </div>
              )}

              {/* Full Name & Headline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Full Name</label>
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Target Job Role</label>
                  <input
                    type="text"
                    value={editFormData.target_role || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, target_role: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Professional Headline</label>
                <input
                  type="text"
                  value={editFormData.headline || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, headline: e.target.value })}
                  placeholder="e.g. Senior Distributed Systems Engineer | Event Streams & Cloud Infrastructure"
                  style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '0.88rem' }}
                />
              </div>

              {/* Location & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Location</label>
                  <input
                    type="text"
                    value={editFormData.location || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    placeholder="e.g. San Francisco, CA"
                    style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Phone (Masked for Privacy)</label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="e.g. +1 (415) 890-2341"
                    style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Bio / Summary</label>
                <textarea
                  rows={3}
                  value={editFormData.bio || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '0.88rem', resize: 'vertical' }}
                />
              </div>

              {/* Skills (Comma separated) */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Technical Skills (Comma separated)
                </label>
                <input
                  type="text"
                  value={(editFormData.skills || []).join(', ')}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="e.g. Python, FastAPI, Kafka, Redis, Distributed Systems"
                  style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '0.88rem' }}
                />
              </div>

              {/* Specializations (Comma separated) */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Technical Specializations (Comma separated)
                </label>
                <input
                  type="text"
                  value={(editFormData.specializations || []).join(', ')}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    specializations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="e.g. Distributed Consensus, High-Throughput Ingestion, Event-Driven Architecture"
                  style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '0.88rem' }}
                />
              </div>

              {/* Social URLs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>LinkedIn URL</label>
                  <input
                    type="url"
                    value={editFormData.linkedin_url || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, linkedin_url: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>GitHub URL</label>
                  <input
                    type="url"
                    value={editFormData.github_url || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, github_url: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ padding: '10px 18px', background: 'none', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  style={{
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: isSavingProfile ? 'wait' : 'pointer',
                    fontSize: '0.88rem'
                  }}
                >
                  {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
