import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import DashboardView from './components/DashboardView.jsx';
import InterviewReportView from './components/InterviewReportView.jsx';
import CreateInterviewModal from './components/CreateInterviewModal.jsx';
import CrossInterviewView from './components/CrossInterviewView.jsx';
import BenchmarkView from './components/BenchmarkView.jsx';
import ArchitectureView from './components/ArchitectureView.jsx';
import UserProfileModal from './components/UserProfileModal.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [interviews, setInterviews] = useState([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('GROQ_API_KEY') || '');
  const [loading, setLoading] = useState(true);

  const fetchInterviews = async () => {
    try {
      const res = await fetch('/api/interviews');
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
      const res = await fetch('/api/user/profile');
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
  }, []);

  const handleSelectInterview = (id) => {
    setSelectedInterviewId(id);
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
        onOpenCreate={() => setShowCreateModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
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
                onOpenCreate={() => setShowCreateModal(true)}
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

      {/* Workspace Integration Wizard Modal */}
      {showCreateModal && (
        <CreateInterviewModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreatedInterview}
          apiKey={apiKey}
          userProfile={userProfile}
        />
      )}

      {/* User Profile & Auth Modal */}
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
