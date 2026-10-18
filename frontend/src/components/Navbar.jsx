import React, { useState, useEffect } from 'react';
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
  ShieldAlert, 
  Clock, 
  LogIn, 
  LogOut, 
  Menu, 
  X, 
  Award,
  Bell
} from 'lucide-react';
import { API_BASE } from '../config.js';

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

  // In-App Notifications State
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const fetchUnreadCount = async () => {
    const token = localStorage.getItem('AUTH_TOKEN');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/unread-count?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {}
  };

  const fetchNotifications = async () => {
    const token = localStorage.getItem('AUTH_TOKEN');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {}
  };

  const handleToggleNotif = async () => {
    const next = !showNotifDropdown;
    setShowNotifDropdown(next);
    if (next) {
      await fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem('AUTH_TOKEN');
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/notifications/mark-read?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: null })
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {}
  };

  const handleNotificationClick = async (notif) => {
    const token = localStorage.getItem('AUTH_TOKEN');
    if (token && !notif.read) {
      try {
        await fetch(`${API_BASE}/api/notifications/mark-read?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_ids: [notif.id] })
        });
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      } catch (e) {}
    }
    setShowNotifDropdown(false);

    if (notif.type?.includes('ASSIGNMENT') || notif.type?.includes('EXPERT')) {
      setActiveTab('expert_queue');
    } else if (notif.type?.includes('APPLICATION')) {
      if (userProfile?.role === 'ADMIN') {
        setActiveTab('admin_console');
      } else {
        setActiveTab('expert_pending');
      }
    } else if (notif.interview_id) {
      setActiveTab('dashboard');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const isAdmin = userProfile?.role === 'ADMIN';
  const isExpert = userProfile?.role === 'EXPERT' && userProfile?.is_verified_expert;
  const isPendingExpert = userProfile?.role === 'PENDING_EXPERT' || userProfile?.expert_approval_status === 'PENDING' || userProfile?.expert_approval_status === 'INFO_REQUESTED';

  let navItems = [];
  if (isAdmin) {
    navItems = [
      { id: 'admin_console', label: 'Admin Console', icon: ShieldAlert },
      { id: 'profile', label: 'Candidate Profile & History', icon: User },
      { id: 'dashboard', label: 'All Assessments', icon: Compass },
      { id: 'expert_queue', label: 'Review Queue', icon: ShieldCheck },
      { id: 'benchmark', label: 'Baseline vs Multi-Agent', icon: Zap },
      { id: 'architecture', label: 'Architecture Blueprint', icon: Layers }
    ];
  } else if (isExpert) {
    navItems = [
      { id: 'expert_queue', label: 'Review Queue', icon: ShieldCheck },
      { id: 'expert_profile', label: 'Expert Profile', icon: Award },
      { id: 'dashboard', label: 'Candidate Assessments', icon: Compass },
      { id: 'benchmark', label: 'Baseline vs Multi-Agent', icon: Zap },
      { id: 'architecture', label: 'Architecture Blueprint', icon: Layers }
    ];
  } else if (isPendingExpert) {
    navItems = [
      { id: 'expert_pending', label: 'Verification Status', icon: Clock },
      { id: 'profile', label: 'Profile & History', icon: User },
      { id: 'dashboard', label: 'My Interviews', icon: Compass },
      { id: 'insights', label: 'Interview Memory', icon: BarChart3 },
      { id: 'architecture', label: 'Architecture Blueprint', icon: Layers }
    ];
  } else {
    navItems = [
      { id: 'profile', label: 'Profile & History', icon: User },
      { id: 'dashboard', label: 'My Interviews', icon: Compass },
      { id: 'expert_apply', label: 'Become an Expert', icon: Award },
      { id: 'insights', label: 'Interview Memory', icon: BarChart3 },
      { id: 'benchmark', label: 'Baseline vs Multi-Agent', icon: Zap },
      { id: 'architecture', label: 'Architecture Blueprint', icon: Layers }
    ];
  }

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
                  background: isAdmin ? '#A855F7' : (isExpert ? '#10B981' : (isPendingExpert ? '#F59E0B' : 'var(--accent-cyan)')), 
                  color: '#050B14',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.68rem'
                }}>
                  {userProfile?.name ? userProfile.name[0] : (isAdmin ? 'A' : (isExpert ? 'E' : 'C'))}
                </div>
                <span>{userProfile?.name || (isAdmin ? 'Admin Officer' : (isExpert ? 'Dr. Marcus Vance' : 'Alex Chen'))}</span>
                {isAdmin ? (
                  <span style={{
                    fontSize: '0.62rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(168, 85, 247, 0.2)',
                    color: '#C084FC',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <ShieldAlert size={10} /> Platform Admin
                  </span>
                ) : isExpert ? (
                  <span style={{
                    fontSize: '0.62rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34D399',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <ShieldCheck size={10} /> Verified Expert
                  </span>
                ) : isPendingExpert ? (
                  <span style={{
                    fontSize: '0.62rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#FBBF24',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <Clock size={10} /> Pending Approval
                  </span>
                ) : (
                  <span className="badge badge-verified" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                    {userProfile?.auth_provider || 'Google'}
                  </span>
                )}
              </div>

              {/* In-App Notifications Bell */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={handleToggleNotif}
                  style={{
                    background: showNotifDropdown ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    color: showNotifDropdown ? 'var(--accent-cyan)' : '#FFFFFF',
                    cursor: 'pointer',
                    padding: '7px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                  title="Notifications"
                >
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      background: '#F59E0B',
                      color: '#050B14',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popover Dropdown */}
                {showNotifDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '42px',
                    right: '0',
                    width: '340px',
                    maxHeight: '420px',
                    background: 'rgba(10, 15, 24, 0.98)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
                    zIndex: 100,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: 'rgba(255, 255, 255, 0.02)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bell size={14} color="var(--accent-cyan)" />
                        <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#FFFFFF' }}>Notifications</span>
                        {unreadCount > 0 && (
                          <span style={{ fontSize: '0.68rem', background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          style={{
                            background: 'none', border: 'none',
                            color: 'var(--accent-cyan)', fontSize: '0.72rem',
                            fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {/* Notification items list */}
                    <div style={{ overflowY: 'auto', maxHeight: '340px', padding: '6px' }}>
                      {notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <CheckCircle2 size={24} color="var(--accent-emerald)" style={{ margin: '0 auto 8px auto' }} />
                          <div>No new notifications</div>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '10px',
                              marginBottom: '4px',
                              cursor: 'pointer',
                              background: n.read ? 'transparent' : 'rgba(0, 240, 255, 0.06)',
                              border: n.read ? '1px solid transparent' : '1px solid rgba(0, 240, 255, 0.2)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: n.read ? '#FFFFFF' : 'var(--accent-cyan)' }}>
                                {n.title}
                              </div>
                              {!n.read && (
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)', flexShrink: 0, marginTop: '4px' }} />
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                              {n.body}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
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
                      background: isAdmin ? '#A855F7' : (isExpert ? '#10B981' : (isPendingExpert ? '#F59E0B' : 'var(--accent-cyan)')), 
                      color: '#050B14',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.82rem'
                    }}>
                      {userProfile?.name ? userProfile.name[0] : (isAdmin ? 'A' : (isExpert ? 'E' : 'C'))}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>
                        {userProfile?.name || (isAdmin ? 'Admin Officer' : (isExpert ? 'Dr. Marcus Vance' : 'Alex Chen'))}
                      </div>
                      {isAdmin ? (
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(168, 85, 247, 0.2)',
                          color: '#C084FC',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <ShieldAlert size={11} /> Platform Admin
                        </span>
                      ) : isExpert ? (
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34D399',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <ShieldCheck size={11} /> Verified Expert
                        </span>
                      ) : isPendingExpert ? (
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#FBBF24',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Clock size={11} /> Pending Approval
                        </span>
                      ) : (
                        <span className="badge badge-verified" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                          {userProfile?.auth_provider || 'Google'}
                        </span>
                      )}
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
