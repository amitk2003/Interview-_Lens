import React, { useState } from 'react';
import { X, User, CheckCircle2, ShieldCheck, Award, FileText } from 'lucide-react';

export default function UserProfileModal({ user, onClose, onSave }) {
  const [profile, setProfile] = useState(user || {
    name: "Alex Chen",
    email: "alex.chen@example.com",
    auth_provider: "Google",
    target_role: "Senior Distributed Systems Engineer",
    skills: ["Python", "FastAPI", "Kafka", "Redis", "Distributed Systems", "PostgreSQL"],
    resume_summary: "5+ years backend engineering, distributed event streams, microservices architecture, and caching strategies."
  });
  const [skillInput, setSkillInput] = useState('');

  const handleAddSkill = () => {
    if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill) => {
    setProfile({ ...profile, skills: profile.skills.filter(s => s !== skill) });
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        const updated = await res.json();
        onSave(updated);
        onClose();
      }
    } catch (err) {
      console.error(err);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 8, 14, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '560px',
        padding: '32px',
        position: 'relative',
        borderRadius: '20px'
      }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#050B14', fontWeight: 800, fontSize: '1.2rem'
          }}>
            {profile.name[0]}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{profile.name}</h3>
              <span className="badge badge-verified" style={{ fontSize: '0.65rem' }}>
                <ShieldCheck size={12} /> {profile.auth_provider} OAuth Verified
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{profile.email}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              TARGET JOB ROLE
            </label>
            <input
              type="text"
              value={profile.target_role}
              onChange={(e) => setProfile({ ...profile, target_role: e.target.value })}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                color: '#FFFFFF', fontSize: '0.85rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              RESUME SUMMARY / KEY HIGHLIGHTS
            </label>
            <textarea
              rows={3}
              value={profile.resume_summary}
              onChange={(e) => setProfile({ ...profile, resume_summary: e.target.value })}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                color: '#FFFFFF', fontSize: '0.85rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              CORE TECHNICAL SKILLS
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {profile.skills?.map(s => (
                <span key={s} className="badge badge-cyan" style={{ fontSize: '0.72rem', cursor: 'pointer' }} onClick={() => handleRemoveSkill(s)}>
                  {s} ✕
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                placeholder="Add skill (e.g. Docker, Redlock)..."
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.82rem'
                }}
              />
              <button className="btn btn-secondary" onClick={handleAddSkill} style={{ padding: '8px 14px', fontSize: '0.78rem' }}>
                Add
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <CheckCircle2 size={16} /> Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
