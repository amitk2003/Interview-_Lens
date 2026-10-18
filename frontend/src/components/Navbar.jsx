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
  LogOut,
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSaveKey = () => {
    setApiKey(tempKey);
    localStorage.setItem('GROQ_API_KEY', tempKey);
    setShowKeyModal(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Interviews', icon: Compass },
    { id: 'insights', label: 'Interview Memory', icon: BarChart3 },
    { id: 'benchmark', label: 'Baseline vs Multi-Agent', icon: Zap },
    { id: 'architecture', label: 'Architecture Blueprint', icon: Layers }
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(8, 11, 17, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Brand */}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} 
          onClick={() => handleNavClick('dashboard')}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00F0FF 0%, #3B82F6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(0, 240, 255, 0.4)',
            flexShrink: 0
          }}>
            <Sparkles size={20} color="#050B14" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="brand-font" style={{ fontSize: '1.18rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Interview<span style={{ color: 'var(--accent-cyan)' }}>Lens</span>
              </span>
              <span className="badge badge-cyan desktop-only" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>micro1 Hackathon</span>
            </div>
            <p className="desktop-only" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Real Interview Capture + Agentic Intelligence</p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="desktop-only" style={{ alignItems: 'center', gap: '6px' }}>
          {navItems.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleNavClick(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                  borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent'
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Desktop Actions & Status */}
        <div className="desktop-only" style={{ alignItems: 'center', gap: '12px' }}>
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
              Sign In
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
                : 'Deterministic'}
            </span>
            <Key size={13} style={{ opacity: 0.6 }} />
          </div>

          {/* Ingestion Wizard CTA */}
          <button className="btn btn-primary" onClick={onOpenCreate} style={{ padding: '8px 16px', fontSize: '0.84rem' }}>
            <PlusCircle size={15} />
            Capture / Ingest
          </button>
        </div>

        {/* Mobile Header Controls */}
        <div className="mobile-only" style={{ alignItems: 'center', gap: '8px' }}>
          <button 
            className="btn btn-primary" 
            onClick={onOpenCreate}
            style={{ padding: '7px 12px', fontSize: '0.78rem', borderRadius: '10px' }}
          >
            <PlusCircle size={15} />
            <span>Ingest</span>
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              color: '#FFFFFF',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="mobile-nav-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="mobile-nav-drawer">
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #00F0FF 0%, #3B82F6 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Sparkles size={16} color="#050B14" />
                </div>
                <span className="brand-font" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Interview<span style={{ color: 'var(--accent-cyan)' }}>Lens</span>
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* User Profile / Auth Section in Drawer */}
            <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              {isAuthenticated ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div 
                    onClick={() => { setIsMobileMenuOpen(false); onOpenProfile(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'var(--accent-cyan)', color: '#050B14',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.82rem'
                    }}>
                      {userProfile?.name ? userProfile.name[0] : 'A'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>{userProfile?.name || 'Alex Chen'}</div>
                      <span className="badge badge-verified" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                        {userProfile?.auth_provider || 'Google'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onLogout(); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
                    title="Sign Out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => { setIsMobileMenuOpen(false); onOpenAuth(); }}
                  style={{ width: '100%', fontSize: '0.85rem', padding: '10px' }}
                >
                  <LogIn size={16} /> Sign In / Register
                </button>
              )}
            </div>

            {/* Mobile Navigation Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Navigation
              </span>
              {navItems.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleNavClick(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: isActive ? 'rgba(0, 240, 255, 0.14)' : 'transparent',
                      color: isActive ? 'var(--accent-cyan)' : 'var(--text-primary)',
                      borderLeft: isActive ? '3px solid var(--accent-cyan)' : '3px solid transparent'
                    }}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Engine Config Pill */}
            <div 
              onClick={() => { setIsMobileMenuOpen(false); setShowKeyModal(true); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                marginTop: 'auto',
                color: 'var(--text-secondary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: healthData?.llm_engine === 'groq' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                  boxShadow: healthData?.llm_engine === 'groq' ? '0 0 10px var(--accent-emerald)' : '0 0 8px var(--accent-amber)'
                }} />
                <span>Engine: <strong>{healthData?.llm_engine === 'groq' ? 'Groq LLaMA' : 'Deterministic'}</strong></span>
              </div>
              <Key size={14} color="var(--accent-cyan)" />
            </div>

            {/* Primary Action Button */}
            <button 
              className="btn btn-primary" 
              onClick={() => { setIsMobileMenuOpen(false); onOpenCreate(); }}
              style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
            >
              <PlusCircle size={18} /> Ingest / Setup Interview
            </button>
          </div>
        </>
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-inner-padding" style={{ width: '100%', maxWidth: '480px', padding: '28px', position: 'relative' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={20} color="var(--accent-cyan)" /> Configure Groq API Key
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
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
