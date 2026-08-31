import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Mail, 
  User, 
  Briefcase 
} from 'lucide-react';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

export default function AuthModal({ isOpen, onClose, onAuthenticated }) {
  if (!isOpen) return null;

  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup' | 'demo'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetRole, setTargetRole] = useState('Senior Distributed Systems Engineer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (!name.trim() || !email.trim() || !password.trim()) {
          throw new Error('Please fill in all required fields.');
        }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, target_role: targetRole })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');
        localStorage.setItem('AUTH_TOKEN', data.token);
        onAuthenticated(data.user);
        onClose();
      } else if (authMode === 'signin') {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please provide email and password.');
        }
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        localStorage.setItem('AUTH_TOKEN', data.token);
        onAuthenticated(data.user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    setError('');
    try {
      // Simulate OAuth by prompting for name/email or using defaults
      const oauthName = name.trim() || 'Interview Candidate';
      const oauthEmail = email.trim() || `user.${Date.now()}@${provider.toLowerCase()}.com`;
      const res = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          name: oauthName,
          email: oauthEmail
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `${provider} login failed`);
      localStorage.setItem('AUTH_TOKEN', data.token);
      onAuthenticated(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (preset) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: preset.provider || 'Demo',
          name: preset.name,
          email: preset.email
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Demo login failed');
      localStorage.setItem('AUTH_TOKEN', data.token);
      onAuthenticated(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const oauthButtonStyle = {
    width: '100%',
    padding: '11px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#FFFFFF',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s ease',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 8, 14, 0.88)',
      backdropFilter: 'blur(18px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '32px',
        position: 'relative',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px', right: '20px',
            background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--accent-cyan), #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px auto',
            boxShadow: '0 0 25px rgba(0, 240, 255, 0.4)'
          }}>
            <Sparkles size={26} color="#050B14" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
            {authMode === 'signin' ? 'Sign in to InterviewLens' : authMode === 'signup' ? 'Create Candidate Account' : 'Quick Demo Access'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Authenticate to take live interviews, upload custom JDs & Resumes, and access agentic evaluations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '20px',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            type="button"
            onClick={() => { setAuthMode('signin'); setError(''); }}
            style={{
              flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
              background: authMode === 'signin' ? 'var(--accent-cyan)' : 'transparent',
              color: authMode === 'signin' ? '#050B14' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('signup'); setError(''); }}
            style={{
              flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
              background: authMode === 'signup' ? 'var(--accent-cyan)' : 'transparent',
              color: authMode === 'signup' ? '#050B14' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
            }}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('demo'); setError(''); }}
            style={{
              flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
              background: authMode === 'demo' ? 'var(--accent-cyan)' : 'transparent',
              color: authMode === 'demo' ? '#050B14' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
            }}
          >
            1-Click Demo
          </button>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#F87171', fontSize: '0.82rem', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {/* Demo Fast Logins */}
        {authMode === 'demo' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Select a pre-configured candidate profile:
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoLogin({
                name: 'Alex Chen',
                email: 'alex.chen@example.com',
                provider: 'Google'
              })}
              style={{
                padding: '12px 16px', borderRadius: '12px',
                background: 'rgba(0, 240, 255, 0.08)', border: '1px solid var(--accent-cyan)',
                color: '#FFFFFF', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}
            >
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--accent-cyan)', display: 'block' }}>Alex Chen (Senior Backend Engineer)</strong>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>alex.chen@example.com • Google OAuth Verified</span>
              </div>
              <ArrowRight size={16} color="var(--accent-cyan)" />
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoLogin({
                name: 'Sarah Miller',
                email: 'candidate.demo@interviewlens.ai',
                provider: 'GitHub'
              })}
              style={{
                padding: '12px 16px', borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)',
                color: '#FFFFFF', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}
            >
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#FFFFFF', display: 'block' }}>Sarah Miller (Full Stack / AI Lead)</strong>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>candidate.demo@interviewlens.ai • GitHub OAuth Verified</span>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </button>
          </div>
        ) : (
          <>
            {/* Google & GitHub OAuth Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleOAuthLogin('Google')}
                style={{
                  ...oauthButtonStyle,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(66, 133, 244, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(66, 133, 244, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }}
              >
                <GoogleIcon />
                {authMode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleOAuthLogin('GitHub')}
                style={{
                  ...oauthButtonStyle,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }}
              >
                <GitHubIcon />
                {authMode === 'signin' ? 'Continue with GitHub' : 'Sign up with GitHub'}
              </button>
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              marginBottom: '18px'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                or continue with email
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {authMode === 'signup' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      FULL NAME
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Chen"
                        style={{
                          width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px',
                          background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                          color: '#FFFFFF', fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      TARGET ROLE / SPECIALTY
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Briefcase size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                      <input
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Senior Distributed Systems Engineer"
                        style={{
                          width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px',
                          background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                          color: '#FFFFFF', fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  EMAIL ADDRESS
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    style={{
                      width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px',
                      background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px',
                      background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '6px', justifyContent: 'center', padding: '12px' }}
              >
                {loading ? (
                  'Authenticating...'
                ) : authMode === 'signin' ? (
                  <>
                    <LogIn size={16} /> Sign In to Dashboard
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Create Account & Start
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Guest Permission Notice */}
        <div style={{
          marginTop: '20px', padding: '10px 14px', borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--text-muted)'
        }}>
          <ShieldCheck size={14} color="var(--accent-emerald)" />
          <span>Visitors can read sample reports; login unlocks interactive interviews & custom JD/resume analysis.</span>
        </div>
      </div>
    </div>
  );
}

