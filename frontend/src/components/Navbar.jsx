import React, { useState } from 'react';
import { 
  Compass, 
  PlusCircle, 
  BarChart3, 
  Layers, 
  Cpu, 
  Key, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  User, 
  ShieldCheck,
  LogIn,
  LogOut
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  healthData, 
  onOpenCreate, 
  apiKey, 
  setApiKey,
  userProfile,
  onOpenProfile,
  isAuthenticated,
  onOpenAuth,
  onLogout
}) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey || '');

  const handleSaveKey = () => {
    setApiKey(tempKey);
    localStorage.setItem('GROQ_API_KEY', tempKey);
    setShowKeyModal(false);
  };

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(8, 11, 17, 0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #00F0FF 0%, #3B82F6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)'
          }}>
            <Sparkles size={22} color="#050B14" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-font" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Interview<span style={{ color: 'var(--accent-cyan)' }}>Lens</span>
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>micro1 Hackathon</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Real Interview Capture + Agentic Intelligence</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'dashboard', label: 'Interviews', icon: Compass },
            { id: 'insights', label: 'Interview Memory', icon: BarChart3 },
            { id: 'benchmark', label: 'Baseline vs Multi-Agent', icon: Zap },
            { id: 'architecture', label: 'Architecture Blueprint', icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                  borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Actions & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* User Profile Pill or Login Button */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                onClick={onOpenProfile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  color: '#FFFFFF'
                }}
                title="Click to view/edit User Profile & Saved Resume"
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: 'var(--accent-cyan)', color: '#050B14',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.68rem'
                }}>
                  {userProfile?.name ? userProfile.name[0] : 'A'}
                </div>
                <span>{userProfile?.name || 'Alex Chen'}</span>
                <span className="badge badge-verified" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                  {userProfile?.auth_provider || 'Google'}
                </span>
              </div>
              <button
                onClick={onLogout}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', padding: '6px'
                }}
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={onOpenAuth}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 14px' }}
            >
              <LogIn size={15} color="var(--accent-cyan)" />
              Sign In / Register
            </button>
          )}

          {/* Engine Status */}
          <div 
            onClick={() => setShowKeyModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
            title="Click to configure Groq API Key"
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: healthData?.llm_engine === 'groq' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
              boxShadow: healthData?.llm_engine === 'groq' ? '0 0 10px var(--accent-emerald)' : '0 0 8px var(--accent-amber)'
            }}></span>
            <span>
              {healthData?.llm_engine === 'groq' 
                ? `Groq (${healthData.groq_model || 'llama-3.3-70b'})` 
                : 'Deterministic Engine'}
            </span>
            <Key size={13} style={{ opacity: 0.6 }} />
          </div>

          {/* Ingestion Wizard CTA */}
          <button className="btn btn-primary" onClick={onOpenCreate}>
            <PlusCircle size={16} />
            Capture / Ingest Interview
          </button>
        </div>
      </header>

      {/* API Key Modal */}
      {showKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 14, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-panel" style={{ width: '480px', padding: '28px', position: 'relative' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={20} color="var(--accent-cyan)" /> Configure Groq API Key
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              InterviewLens runs on <strong>Groq Llama-3.3-70b-versatile</strong> for ultra-fast agentic reasoning. If no key is set, it runs on our built-in deterministic heuristic analysis engine.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                GROQ API KEY (Optional - get free key at console.groq.com)
              </label>
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="gsk_..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowKeyModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveKey}>Save Key</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
