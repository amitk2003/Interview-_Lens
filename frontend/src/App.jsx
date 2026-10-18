import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import DashboardView from './components/DashboardView.jsx';
import InterviewReportView from './components/InterviewReportView.jsx';
import CreateInterviewModal from './components/CreateInterviewModal.jsx';
import CrossInterviewView from './components/CrossInterviewView.jsx';
import BenchmarkView from './components/BenchmarkView.jsx';
import ArchitectureView from './components/ArchitectureView.jsx';
import UserProfileModal from './components/UserProfileModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import LiveInterviewRoom from './components/LiveInterviewRoom.jsx';
import ExpertQueueView from './components/ExpertQueueView.jsx';
import AdminView from './components/AdminView.jsx';
import CandidateProfileView from './components/CandidateProfileView.jsx';
import ExpertApplyView from './components/ExpertApplyView.jsx';
import ExpertPendingVerificationView from './components/ExpertPendingVerificationView.jsx';
import ExpertProfileView from './components/ExpertProfileView.jsx';
import { API_BASE } from './config.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [interviews, setInterviews] = useState([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  const [reportInitialTab, setReportInitialTab] = useState('scorecard');
  const [healthData, setHealthData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('AUTH_TOKEN'));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeLiveRoom, setActiveLiveRoom] = useState(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem('GROQ_API_KEY') || '');
  const [loading, setLoading] = useState(true);

  const fetchInterviews = async () => {
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      const url = token ? `${API_BASE}/api/interviews?token=${token}` : `${API_BASE}/api/interviews`;
      const res = await fetch(url);
      if (res.ok) { const data = await res.json(); setInterviews(data); }
    } catch (err) { console.error('Failed to fetch interviews:', err); }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) { const data = await res.json(); setHealthData(data); }
    } catch (err) { console.error('Failed to fetch health:', err); }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      const url = token ? `${API_BASE}/api/auth/me?token=${token}` : `${API_BASE}/api/user/profile`;
      const res = await fetch(url);
      if (res.ok) { const data = await res.json(); setUserProfile(data); return data; }
    } catch (err) { console.error('Failed to fetch user profile:', err); }
    return null;
  };

  useEffect(() => {
    Promise.all([fetchInterviews(), fetchHealth(), fetchUserProfile()]).finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleSelectInterview = (id, jumpToTab = null) => {
    setSelectedInterviewId(id);
    setReportInitialTab(jumpToTab || 'scorecard');
    setActiveTab('report');
  };

  const handleOpenCreate = () => {
    if (!isAuthenticated) { setShowAuthModal(true); } else { setShowCreateModal(true); }
  };

  const handleAuthenticated = async (user) => {
    setUserProfile(user);
    setIsAuthenticated(true);
    setShowAuthModal(false);
    if (user?.role === 'ADMIN') {
      setActiveTab('admin_console');
    } else if (user?.role === 'EXPERT') {
      setActiveTab('expert_queue');
    } else {
      setActiveTab('dashboard');
    }
    await fetchInterviews();
  };

  const handleLogout = () => {
    localStorage.removeItem('AUTH_TOKEN');
    setIsAuthenticated(false);
    setUserProfile(null);
    setActiveTab('dashboard');
    fetchInterviews();
  };

  const handleStartLiveRoom = (planData, context) => {
    setShowCreateModal(false);
    setActiveLiveRoom({ plan: planData, context });
  };

  const handleLiveRoomComplete = (newRecord) => {
    setInterviews([newRecord, ...interviews]);
    setActiveLiveRoom(null);
    setSelectedInterviewId(newRecord.id);
    setReportInitialTab('scorecard');
    setActiveTab('report');
  };

  const handleCreatedInterview = (newRecord) => {
    setInterviews([newRecord, ...interviews]);
    setShowCreateModal(false);
    setSelectedInterviewId(newRecord.id);
    setReportInitialTab('scorecard');
    setActiveTab('report');
  };

  const handleUpdateInterview = (updatedRecord) => {
    setInterviews(interviews.map(i => (i.id === updatedRecord.id ? updatedRecord : i)));
  };

  const currentInterview = interviews.find(i => i.id === selectedInterviewId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab); if (tab !== 'report') setSelectedInterviewId(null); }}
        healthData={healthData}
        userProfile={userProfile}
        isAuthenticated={isAuthenticated}
        onOpenCreate={handleOpenCreate}
        onOpenProfile={() => { setActiveTab('profile'); setSelectedInterviewId(null); }}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
      <main style={{ flex: 1, paddingBottom: '60px' }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px auto' }} className="spin-slow" />
            <p style={{ color: 'var(--text-muted)' }}>Initializing InterviewLens AI Engine &amp; Ingestion Adapters...</p>
          </div>
        ) : (
          <>
            {activeTab === 'profile' && (
              <CandidateProfileView
                userProfile={userProfile}
                token={localStorage.getItem('AUTH_TOKEN')}
                onSelectInterview={handleSelectInterview}
                onOpenCreateInterview={handleOpenCreate}
              />
            )}
            {activeTab === 'admin_console' && (
              <AdminView
                userProfile={userProfile}
                onOpenAuth={() => setShowAuthModal(true)}
              />
            )}
            {activeTab === 'expert_queue' && (
              userProfile?.role === 'EXPERT' || userProfile?.role === 'ADMIN' ? (
                <ExpertQueueView
                  userProfile={userProfile}
                  onSelectInterview={(id) => handleSelectInterview(id, 'expert_review')}
                />
              ) : (
                <div style={{ padding: '80px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#F87171', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px auto'
                  }}>
                    <ShieldCheck size={26} />
                  </div>
                  <h3 style={{ color: '#FFFFFF', fontWeight: 800, marginBottom: '8px', fontSize: '1.25rem' }}>
                    Verified Industry Expert Access Required
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.5, marginBottom: '20px' }}>
                    {userProfile?.role === 'PENDING_EXPERT'
                      ? 'Your expert application has been submitted and is currently pending verification from a Platform Administrator. You will be accredited once an admin reviews your credentials.'
                      : 'The HITL Calibration & Review Queue is restricted to accredited Verified Industry Experts. Candidates can take interviews and view their own evaluations.'}
                  </p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('dashboard')}>
                    Return to Candidate Dashboard
                  </button>
                </div>
              )
            )}
            {activeTab === 'dashboard' && (
              <DashboardView
                interviews={interviews}
                userProfile={userProfile}
                onSelectInterview={handleSelectInterview}
                onOpenCreate={handleOpenCreate}
              />
            )}
            {activeTab === 'report' && currentInterview && (
              <InterviewReportView
                interview={currentInterview}
                userProfile={userProfile}
                initialTab={reportInitialTab}
                onBack={() => {
                  setActiveTab(userProfile?.role === 'EXPERT' ? 'expert_queue' : 'dashboard');
                  setSelectedInterviewId(null);
                }}
                onUpdateInterview={handleUpdateInterview}
              />
            )}
            {activeTab === 'expert_apply' && (
              <ExpertApplyView
                userProfile={userProfile}
                onApplicationSubmitted={async () => {
                  await fetchUserProfile();
                  setActiveTab('expert_pending');
                }}
                onCancel={() => setActiveTab('dashboard')}
              />
            )}
            {activeTab === 'expert_pending' && (
              <ExpertPendingVerificationView
                userProfile={userProfile}
                onGoToQueue={() => setActiveTab('expert_queue')}
                onGoToProfile={() => setActiveTab('expert_profile')}
                onReapply={() => setActiveTab('expert_apply')}
              />
            )}
            {activeTab === 'expert_profile' && (
              <ExpertProfileView
                userProfile={userProfile}
                onGoToQueue={() => setActiveTab('expert_queue')}
                onOpenAuth={() => setShowAuthModal(true)}
              />
            )}
            {activeTab === 'insights' && <CrossInterviewView />}
            {activeTab === 'benchmark' && <BenchmarkView interviews={interviews} />}
            {activeTab === 'architecture' && <ArchitectureView />}
          </>
        )}
      </main>
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onAuthenticated={handleAuthenticated} />
      )}
      {showCreateModal && (
        <CreateInterviewModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreatedInterview}
          onStartLiveRoom={handleStartLiveRoom}
          apiKey={apiKey}
          userProfile={userProfile}
        />
      )}
      {activeLiveRoom && (
        <LiveInterviewRoom
          interviewPlan={activeLiveRoom.plan}
          jobRole={activeLiveRoom.context.jobRole}
          jobDescription={activeLiveRoom.context.jobDescription}
          resumeText={activeLiveRoom.context.resumeText}
          apiKey={apiKey}
          onClose={() => setActiveLiveRoom(null)}
          onComplete={handleLiveRoomComplete}
        />
      )}
      {showProfileModal && (
        <UserProfileModal user={userProfile} onClose={() => setShowProfileModal(false)} onSave={(u) => setUserProfile(u)} />
      )}
    </div>
  );
}
