import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  Briefcase,
  Layers,
  Sparkles,
  ExternalLink,
  Edit3,
  Save,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Lock
} from 'lucide-react';
import { API_BASE } from '../config.js';

const PREDEFINED_CATEGORIES = [
  'System Design & Architecture',
  'Coding & Algorithms',
  'Behavioral & Engineering Leadership',
  'DevOps & Cloud Engineering',
  'Machine Learning & AI Systems',
  'Full-Stack & Frontend Architecture',
  'Distributed Databases & Storage',
  'Cybersecurity & Infrastructure'
];

export default function ExpertProfileView({ userProfile, onGoToQueue, onOpenAuth }) {
  const token = localStorage.getItem('AUTH_TOKEN');

  const [expertProfile, setExpertProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editFormData, setEditFormData] = useState({
    headline: '',
    current_title: '',
    current_company: '',
    experience_summary: '',
    years_of_experience: 5,
    industry_specialization: '',
    supported_categories: [],
    technical_expertise: [],
    portfolio_url: ''
  });

  const [newSkill, setNewSkill] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/expert/profile?token=${encodeURIComponent(token || '')}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to load expert profile (${res.status})`);
      }
      const data = await res.json();
      setExpertProfile(data);
      setEditFormData({
        headline: data.headline || '',
        current_title: data.current_title || '',
        current_company: data.current_company || '',
        experience_summary: data.experience_summary || '',
        years_of_experience: data.years_of_experience || 5,
        industry_specialization: data.industry_specialization || '',
        supported_categories: data.supported_categories || [],
        technical_expertise: data.technical_expertise || [],
        portfolio_url: data.portfolio_url || ''
      });
    } catch (err) {
      console.error('Expert profile fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/expert/profile?token=${encodeURIComponent(token || '')}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(editFormData)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to update profile');
      }
      const updated = await res.json();
      setExpertProfile(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat) => {
    setEditFormData(prev => {
      const exists = prev.supported_categories.includes(cat);
      if (exists) {
        return { ...prev, supported_categories: prev.supported_categories.filter(c => c !== cat) };
      } else {
        return { ...prev, supported_categories: [...prev.supported_categories, cat] };
      }
    });
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!editFormData.technical_expertise.includes(newSkill.trim())) {
      setEditFormData(prev => ({
        ...prev,
        technical_expertise: [...prev.technical_expertise, newSkill.trim()]
      }));
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setEditFormData(prev => ({
      ...prev,
      technical_expertise: prev.technical_expertise.filter(s => s !== skillToRemove)
    }));
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '960px', margin: '40px auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px auto' }} className="spin-slow" />
        <p style={{ color: 'var(--text-muted)' }}>Retrieving Accredited Industry Expert Profile...</p>
      </div>
    );
  }

  const p = expertProfile || userProfile;

  return (
    <div style={{ maxWidth: '1080px', margin: '32px auto', padding: '0 20px', minHeight: '85vh' }}>
      {saveSuccess && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 9999,
          background: 'rgba(16, 185, 129, 0.95)', color: '#050B14',
          padding: '12px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '0.86rem',
          display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
        }}>
          <CheckCircle2 size={18} /> Profile successfully updated and synced with evaluation rubrics!
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="glass-panel" style={{
        padding: '30px 34px',
        borderRadius: '24px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(8, 11, 17, 0.95) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)',
            color: '#FFFFFF', fontWeight: 800, fontSize: '1.6rem'
          }}>
            {p?.name ? p.name[0] : 'E'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                {p?.name}
              </h1>
              <span style={{
                fontSize: '0.72rem', padding: '3px 9px', borderRadius: '6px', fontWeight: 800,
                background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}>
                <ShieldCheck size={13} /> VERIFIED INDUSTRY EXPERT
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
              {p?.headline || `${p?.expert_title || 'Senior Evaluator'} at ${p?.expert_organization || 'Industry Partner'}`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
            >
              <Edit3 size={15} /> Edit Profile
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
            >
              <X size={15} /> Cancel Editing
            </button>
          )}

          {onGoToQueue && (
            <button
              onClick={onGoToQueue}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
            >
              <Award size={15} /> Review Queue <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* IMMUTABILITY NOTICE */}
      <div className="glass-panel" style={{
        padding: '14px 20px',
        borderRadius: '14px',
        marginBottom: '26px',
        background: 'rgba(0, 240, 255, 0.04)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.82rem',
        color: 'var(--text-secondary)'
      }}>
        <Lock size={16} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Cryptographic and Role Governance:</strong> Expert verified accreditation, administrative approval logs, and evaluation authority cannot be self-modified. Role assignments are strictly governed by Platform Administrators.
        </span>
      </div>

      {/* PROFILE CONTENT OR EDIT FORM */}
      {!isEditing ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {/* Card 1: Experience & Track Record */}
          <div className="glass-panel" style={{ padding: '26px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <Briefcase size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                Experience &amp; Track Record
              </h3>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Current Role
              </div>
              <div style={{ fontSize: '0.92rem', color: '#FFFFFF', fontWeight: 600, marginTop: '2px' }}>
                {p?.current_title || p?.expert_title || 'Senior Evaluator'} @ {p?.current_company || p?.expert_organization || 'Industry Partner'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Years of Experience
                </div>
                <div style={{ fontSize: '0.88rem', color: '#FFFFFF', fontWeight: 600, marginTop: '2px' }}>
                  {p?.years_of_experience || 7}+ Years
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Industry Focus
                </div>
                <div style={{ fontSize: '0.88rem', color: '#FFFFFF', fontWeight: 600, marginTop: '2px' }}>
                  {p?.industry_specialization || 'Enterprise SaaS & Cloud'}
                </div>
              </div>
            </div>

            {p?.experience_summary && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Summary
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '4px' }}>
                  {p.experience_summary}
                </p>
              </div>
            )}

            {p?.portfolio_url && (
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Verified Portfolio / LinkedIn
                </div>
                <a
                  href={p.portfolio_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '0.82rem', color: 'var(--accent-cyan)', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '4px'
                  }}
                >
                  {p.portfolio_url} <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {/* Card 2: Domains & Supported Rubrics */}
          <div className="glass-panel" style={{ padding: '26px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <Layers size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                Calibration Domains &amp; Competencies
              </h3>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                Supported Evaluation Tracks
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(p?.supported_categories && p.supported_categories.length > 0 ? p.supported_categories : ['System Design', 'Coding & Algorithms']).map((cat, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.76rem', padding: '4px 10px', borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                Technical Specialties
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(p?.technical_expertise && p.technical_expertise.length > 0 ? p.technical_expertise : ['Distributed Systems', 'Cloud', 'Microservices']).map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px',
                      background: 'rgba(0, 240, 255, 0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 240, 255, 0.2)'
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              padding: '14px', borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600 }}>
                <ShieldCheck size={16} color="#34D399" /> Conflict of Interest Neutrality
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                Active pledge on file: Evaluator recuses from assessing candidates from affiliated organizations or direct reporting lines.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* EDIT FORM */
        <form onSubmit={handleSaveProfile} className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Edit3 size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Edit Expert Profile Details
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                PROFESSIONAL HEADLINE
              </label>
              <input
                type="text"
                required
                value={editFormData.headline}
                onChange={(e) => setEditFormData({ ...editFormData, headline: e.target.value })}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                PORTFOLIO / LINKEDIN URL
              </label>
              <input
                type="url"
                value={editFormData.portfolio_url}
                onChange={(e) => setEditFormData({ ...editFormData, portfolio_url: e.target.value })}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                CURRENT TITLE
              </label>
              <input
                type="text"
                required
                value={editFormData.current_title}
                onChange={(e) => setEditFormData({ ...editFormData, current_title: e.target.value })}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                CURRENT COMPANY / INSTITUTION
              </label>
              <input
                type="text"
                required
                value={editFormData.current_company}
                onChange={(e) => setEditFormData({ ...editFormData, current_company: e.target.value })}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              BACKGROUND SUMMARY
            </label>
            <textarea
              rows={3}
              value={editFormData.experience_summary}
              onChange={(e) => setEditFormData({ ...editFormData, experience_summary: e.target.value })}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                color: '#FFFFFF', fontSize: '0.85rem', lineHeight: 1.5, resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              SUPPORTED INTERVIEW CATEGORIES
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
              {PREDEFINED_CATEGORIES.map(cat => {
                const isSelected = editFormData.supported_categories.includes(cat);
                return (
                  <div
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    style={{
                      padding: '8px 12px', borderRadius: '8px',
                      background: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem',
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)'
                    }}
                  >
                    <CheckCircle2 size={14} color={isSelected ? 'var(--accent-cyan)' : 'transparent'} />
                    {cat}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              TECHNICAL EXPERTISE TAGS
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {editFormData.technical_expertise.map(skill => (
                <span
                  key={skill}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 8px', borderRadius: '6px', background: 'rgba(0, 240, 255, 0.08)',
                    border: '1px solid rgba(0, 240, 255, 0.3)', color: 'var(--accent-cyan)', fontSize: '0.76rem'
                  }}
                >
                  {skill}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveSkill(skill)} />
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', maxWidth: '360px' }}>
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                placeholder="Add specialty tag..."
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.8rem'
                }}
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="btn btn-secondary"
                style={{ padding: '7px 12px', fontSize: '0.8rem' }}
              >
                Add
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 24px' }}
            >
              <Save size={15} /> {saving ? 'Saving...' : 'Save Profile Updates'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
