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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [interviews, setInterviews] = useState([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('AUTH_TOKEN'));
  
  // Modals & Sub-views
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeLiveRoom, setActiveLiveRoom] = useState(null); // { plan, context }

  const [apiKey, setApiKey] = useState(localStorage.getItem('GROQ_API_KEY') || '');
  const [loading, setLoading] = useState(true);

  const fetchInterviews = async () => {
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      const url = token ? `/api/interviews?token=${token}` : '/api/interviews';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInterviews(data);
      }
    } catch (err) {
      console.error('Failed to fetch interviews:', err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      const url = token ? `/api/auth/me?token=${token}` : '/api/user/profile';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchInterviews(), fetchHealth(), fetchUserProfile()]).finally(() => {
      setLoading(false);
    });
  }, [isAuthenticated]);

  const handleSelectInterview = (id) => {
    setSelectedInterviewId(id);
    setActiveTab('report');
  };

  const handleOpenCreate = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleAuthenticated = (user) => {
    setUserProfile(user);
    setIsAuthenticated(true);
    setShowAuthModal(false);
    fetchInterviews();
  };

  const handleLogout = () => {
    localStorage.removeItem('AUTH_TOKEN');
    setIsAuthenticated(false);
    setUserProfile(null);
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
    setActiveTab('report');
  };

  const handleCreatedInterview = (newRecord) => {
    setInterviews([newRecord, ...interviews]);
    setShowCreateModal(false);
    setSelectedInterviewId(newRecord.id);
    setActiveTab('report');
  };

  const handleUpdateInterview = (updatedRecord) => {
    setInterviews(interviews.map(i => i.id === updatedRecord.id ? updatedRecord : i));
  };

  const currentInterview = interviews.find(i => i.id === selectedInterviewId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'report') setSelectedInterviewId(null);
        }}
        healthData={healthData}
        userProfile={userProfile}
        isAuthenticated={isAuthenticated}
        onOpenCreate={handleOpenCreate}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />

      <main style={{ flex: 1, paddingBottom: '60px' }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px auto' }} className="spin-slow" />
            <p style={{ color: 'var(--text-muted)' }}>Initializing InterviewLens AI Engine & Ingestion Adapters...</p>
          </div>
        ) : (
          <>
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
                onBack={() => {
                  setActiveTab('dashboard');
                  setSelectedInterviewId(null);
                }}
                onUpdateInterview={handleUpdateInterview}
              />
            )}

            {activeTab === 'insights' && (
              <CrossInterviewView />
            )}

            {activeTab === 'benchmark' && (
              <BenchmarkView interviews={interviews} />
            )}

            {activeTab === 'architecture' && (
              <ArchitectureView />
            )}
          </>
        )}
      </main>

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthenticated={handleAuthenticated}
        />
      )}

      {/* Workspace Setup & Ingestion Wizard Modal */}
      {showCreateModal && (
        <CreateInterviewModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreatedInterview}
          onStartLiveRoom={handleStartLiveRoom}
          apiKey={apiKey}
          userProfile={userProfile}
        />
      )}

      {/* Live Interactive AI Interview Room */}
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

      {/* User Profile & Resume Summary Modal */}
      {showProfileModal && (
        <UserProfileModal
          user={userProfile}
          onClose={() => setShowProfileModal(false)}
          onSave={(u) => setUserProfile(u)}
        />
      )}
    </div>
  );
}
