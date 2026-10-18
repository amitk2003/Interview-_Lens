import React, { useState } from 'react';
import {
  Award,
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  X,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  Building,
  UserCheck
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

const PREDEFINED_INDUSTRIES = [
  'Enterprise SaaS & Cloud Infrastructure',
  'Fintech & Payment Systems',
  'AI / Machine Learning & LLM Systems',
  'E-Commerce & High-Volume Marketplaces',
  'Healthcare & Biomedical Tech',
  'Autonomous Vehicles & Robotics',
  'Consumer Internet & Social Platforms',
  'Defense & Aerospace'
];

export default function ExpertApplyView({ userProfile, onApplicationSubmitted, onCancel }) {
  const token = localStorage.getItem('AUTH_TOKEN');

  const [formData, setFormData] = useState({
    headline: userProfile?.headline || '',
    current_title: userProfile?.current_title || userProfile?.expert_title || '',
    current_company: userProfile?.current_company || userProfile?.expert_organization || '',
    experience_summary: userProfile?.experience_summary || userProfile?.resume_summary || '',
    years_of_experience: userProfile?.years_of_experience || 7,
    industry_specialization: userProfile?.industry_specialization || PREDEFINED_INDUSTRIES[0],
    supported_categories: userProfile?.supported_categories?.length ? userProfile.supported_categories : ['System Design & Architecture', 'Coding & Algorithms'],
    technical_expertise: userProfile?.technical_expertise?.length ? userProfile.technical_expertise : ['Distributed Systems', 'Microservices', 'Kubernetes', 'High-Throughput APIs'],
    portfolio_url: userProfile?.portfolio_url || userProfile?.linkedin_url || '',
    conflict_declaration_confirmed: false,
    conflict_notes: ''
  });

  const [newSkill, setNewSkill] = useState('');
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Skill management
  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!formData.technical_expertise.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        technical_expertise: [...prev.technical_expertise, newSkill.trim()]
      }));
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      technical_expertise: prev.technical_expertise.filter(s => s !== skillToRemove)
    }));
  };

  // Category toggle
  const toggleCategory = (cat) => {
    setFormData(prev => {
      const exists = prev.supported_categories.includes(cat);
      if (exists) {
        return { ...prev, supported_categories: prev.supported_categories.filter(c => c !== cat) };
      } else {
        return { ...prev, supported_categories: [...prev.supported_categories, cat] };
      }
    });
  };

  // Document upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File exceeds 5MB size limit. Please upload a smaller credential document.');
      return;
    }

    setUploadingDoc(true);
    setError(null);

    const data = new FormData();
    data.append('file', file);
    data.append('doc_type', 'CREDENTIAL');

    try {
      const res = await fetch(`${API_BASE}/api/expert/upload-credential?token=${encodeURIComponent(token || '')}`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: data
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to upload credential document');
      }

      const docRecord = await res.json();
      setDocuments(prev => [...prev, docRecord]);
    } catch (err) {
      console.error('Credential upload error:', err);
      setError(err.message);
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleRemoveDocument = (indexToRemove) => {
    setDocuments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.headline.trim()) {
      setError('Please provide a professional headline.');
      return;
    }
    if (!formData.current_title.trim() || !formData.current_company.trim()) {
      setError('Please specify your current or most recent job title and company.');
      return;
    }
    if (formData.supported_categories.length === 0) {
      setError('Please select at least one interview category you are qualified to calibrate.');
      return;
    }
    if (!formData.conflict_declaration_confirmed) {
      setError('You must confirm the Conflict of Interest Declaration to submit your application.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        headline: formData.headline.trim(),
        current_title: formData.current_title.trim(),
        current_company: formData.current_company.trim(),
        experience_summary: formData.experience_summary.trim(),
        years_of_experience: parseInt(formData.years_of_experience, 10) || 5,
        industry_specialization: formData.industry_specialization,
        supported_categories: formData.supported_categories,
        technical_expertise: formData.technical_expertise,
        portfolio_url: formData.portfolio_url.trim() || null,
        conflict_declaration_confirmed: formData.conflict_declaration_confirmed,
        conflict_notes: formData.conflict_notes.trim() || null,
        credential_documents: documents
      };

      const res = await fetch(`${API_BASE}/api/expert/apply?token=${encodeURIComponent(token || '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to submit expert application');
      }

      const result = await res.json();
      setSuccess(true);
      if (onApplicationSubmitted) {
        setTimeout(() => {
          onApplicationSubmitted(result);
        }, 1200);
      }
    } catch (err) {
      console.error('Expert apply error:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <div className="glass-panel" style={{
          padding: '48px 36px',
          borderRadius: '24px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(8, 11, 17, 0.95) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.4)'
        }}>
          <div style={{
            width: '68px', height: '68px', borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px auto', boxShadow: '0 0 30px rgba(245, 158, 11, 0.3)'
          }}>
            <Clock size={36} />
          </div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '12px' }}>
            Application Submitted for Verification
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 24px auto' }}>
            Thank you for applying to become a Verified Industry Expert on InterviewLens. Your credentials, professional history, and conflict declaration have entered our <strong>Administrative Verification Queue</strong>.
          </p>
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '14px',
            padding: '16px 20px',
            maxWidth: '540px',
            margin: '0 auto 28px auto',
            textAlign: 'left',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.84rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ color: '#FBBF24', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={15} /> Administrative Integrity Notice
            </div>
            Self-declared claims and URLs are cross-examined against public professional records and provided certificates by human administrators before evaluation permissions are activated.
          </div>
          <button
            className="btn btn-primary"
            onClick={() => onApplicationSubmitted && onApplicationSubmitted()}
            style={{ padding: '12px 28px', fontSize: '0.9rem' }}
          >
            Go to Pending Verification Hub <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '32px auto', padding: '0 20px', minHeight: '85vh' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '28px 32px',
        borderRadius: '20px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(8, 11, 17, 0.95) 100%)',
        border: '1px solid rgba(0, 240, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #00F0FF 0%, #3B82F6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 25px rgba(0, 240, 255, 0.4)',
            flexShrink: 0
          }}>
            <Award size={30} color="#050B14" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
                Industry Expert Accreditation Onboarding
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                HUMAN-IN-THE-LOOP CALIBRATION
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', margin: '4px 0 0 0' }}>
              Calibrate multi-agent AI assessments, provide authoritative engineering rubrics, and mentor top technical talent.
            </p>
          </div>
        </div>

        {onCancel && (
          <button className="btn btn-secondary" onClick={onCancel} style={{ fontSize: '0.82rem' }}>
            Back to Dashboard
          </button>
        )}
      </div>

      {/* Verification Notice Card */}
      <div className="glass-panel" style={{
        padding: '18px 22px',
        borderRadius: '16px',
        marginBottom: '28px',
        background: 'rgba(245, 158, 11, 0.05)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px'
      }}>
        <ShieldAlert size={22} color="#FBBF24" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          <strong style={{ color: '#FBBF24' }}>Rigorous Verification Standard:</strong> In order to preserve the benchmark accuracy of InterviewLens, submitted credentials, portfolio links, and conflict declarations are <strong>actively audited by Platform Administrators</strong>. Registration does not automatically grant Expert privileges until credentials and identity are validated.
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#F87171',
          fontSize: '0.86rem',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Application Form */}
      <form onSubmit={handleSubmit}>
        {/* SECTION 1: IDENTITY & PROFESSIONAL HEADLINE */}
        <div className="glass-panel" style={{ padding: '26px', borderRadius: '18px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <UserCheck size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              1. Professional Identity &amp; Headline
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                FULL NAME
              </label>
              <input
                type="text"
                disabled
                value={userProfile?.name || 'Verified User'}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)', fontSize: '0.85rem'
                }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Bound to authenticated platform account ({userProfile?.email})
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                LINKEDIN OR PORTFOLIO URL <span style={{ color: 'var(--accent-cyan)' }}>*</span>
              </label>
              <input
                type="url"
                required
                value={formData.portfolio_url}
                onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                placeholder="https://linkedin.com/in/username or https://portfolio.dev"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              PROFESSIONAL HEADLINE <span style={{ color: 'var(--accent-cyan)' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              placeholder="e.g. Principal Distributed Systems Architect @ Stripe | Ex-AWS Core Tech"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: '10px',
                background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                color: '#FFFFFF', fontSize: '0.88rem'
              }}
            />
          </div>
        </div>

        {/* SECTION 2: WORK EXPERIENCE & SPECIALIZATION */}
        <div className="glass-panel" style={{ padding: '26px', borderRadius: '18px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Briefcase size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              2. Experience &amp; Industry Track Record
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                CURRENT / RECENT JOB TITLE <span style={{ color: 'var(--accent-cyan)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formData.current_title}
                onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
                placeholder="e.g. Staff Software Engineer"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                CURRENT / RECENT COMPANY OR INSTITUTION <span style={{ color: 'var(--accent-cyan)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formData.current_company}
                onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
                placeholder="e.g. Netflix / Google / Stripe"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                YEARS OF RELEVANT TECHNICAL EXPERIENCE <span style={{ color: 'var(--accent-cyan)' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                max="40"
                required
                value={formData.years_of_experience}
                onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                PRIMARY INDUSTRY SPECIALIZATION <span style={{ color: 'var(--accent-cyan)' }}>*</span>
              </label>
              <select
                value={formData.industry_specialization}
                onChange={(e) => setFormData({ ...formData, industry_specialization: e.target.value })}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: '#0D1117', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.85rem'
                }}
              >
                {PREDEFINED_INDUSTRIES.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              BACKGROUND &amp; EVALUATION CAPABILITY SUMMARY
            </label>
            <textarea
              rows={3}
              value={formData.experience_summary}
              onChange={(e) => setFormData({ ...formData, experience_summary: e.target.value })}
              placeholder="Outline your background conducting technical interviews, mentoring staff engineers, or authoring system architectures..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                color: '#FFFFFF', fontSize: '0.85rem', lineHeight: 1.5, resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* SECTION 3: TECHNICAL EXPERTISE & SUPPORTED CATEGORIES */}
        <div className="glass-panel" style={{ padding: '26px', borderRadius: '18px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Sparkles size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              3. Technical Expertise &amp; Supported Interview Domains
            </h3>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              SUPPORTED INTERVIEW CATEGORIES (SELECT ALL THAT APPLY) <span style={{ color: 'var(--accent-cyan)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
              {PREDEFINED_CATEGORIES.map(cat => {
                const isChecked = formData.supported_categories.includes(cat);
                return (
                  <div
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: isChecked ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: isChecked ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '4px',
                      border: isChecked ? 'none' : '1px solid var(--border-subtle)',
                      background: isChecked ? 'var(--accent-cyan)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isChecked && <CheckCircle2 size={14} color="#050B14" />}
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isChecked ? '#FFFFFF' : 'var(--text-secondary)' }}>
                      {cat}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              CORE TECHNICAL SKILLS &amp; ARCHITECTURAL SPECIALTIES
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {formData.technical_expertise.map(skill => (
                <span
                  key={skill}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    background: 'rgba(0, 240, 255, 0.08)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.78rem',
                    fontWeight: 600
                  }}
                >
                  {skill}
                  <X
                    size={13}
                    style={{ cursor: 'pointer', opacity: 0.7 }}
                    onClick={() => handleRemoveSkill(skill)}
                  />
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', maxWidth: '400px' }}>
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                placeholder="Add skill (e.g. Kafka, Raft, LLM Fine-Tuning)..."
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.82rem'
                }}
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '0.8rem' }}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 4: CREDENTIAL & SUPPORTING DOCUMENTS */}
        <div className="glass-panel" style={{ padding: '26px', borderRadius: '18px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <FileText size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              4. Supporting Credentials &amp; Verification Evidence
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Upload evidence supporting your senior technical standing (e.g. employment verification letter, conference speaker accreditation, patent filings, cloud architect certification, or doctoral dissertation summary). Max 5MB per document.
          </p>

          {/* Upload Button & Dropzone */}
          <div style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: '14px',
            padding: '24px',
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
            marginBottom: '16px',
            position: 'relative'
          }}>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              disabled={uploadingDoc}
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                opacity: 0, cursor: uploadingDoc ? 'not-allowed' : 'pointer'
              }}
            />
            <UploadCloud size={32} color="var(--accent-cyan)" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>
              {uploadingDoc ? 'Uploading and securing credential document...' : 'Click or drop supporting document here'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Supports PDF, DOCX, PNG, JPG (Under 5MB limit strictly enforced)
            </div>
          </div>

          {/* List of uploaded documents */}
          {documents.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Attached Verification Proofs ({documents.length})
              </span>
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} color="var(--accent-cyan)" />
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#FFFFFF' }}>
                        {doc.original_filename}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {(doc.file_size_bytes / 1024).toFixed(1)} KB • {doc.doc_type}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(idx)}
                    style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', padding: '4px' }}
                    title="Remove attachment"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 5: CONFLICT OF INTEREST DECLARATION */}
        <div className="glass-panel" style={{
          padding: '26px',
          borderRadius: '18px',
          marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(8, 11, 17, 0.95) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '12px' }}>
            <ShieldAlert size={20} color="#F87171" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              5. Mandatory Conflict of Interest Declaration
            </h3>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '16px' }}>
            To uphold the legal and technical neutrality of InterviewLens calibrations, all accredited evaluators are required to declare affiliations and agree to mandatory recusal policies.
          </p>

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px',
            borderRadius: '12px',
            background: formData.conflict_declaration_confirmed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.3)',
            border: formData.conflict_declaration_confirmed ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
            cursor: 'pointer',
            marginBottom: '16px'
          }}>
            <input
              type="checkbox"
              required
              checked={formData.conflict_declaration_confirmed}
              onChange={(e) => setFormData({ ...formData, conflict_declaration_confirmed: e.target.checked })}
              style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <div style={{ fontSize: '0.84rem', color: '#FFFFFF', lineHeight: 1.5 }}>
              <strong>I hereby certify and declare:</strong> I do not possess disqualifying financial or personal conflicts of interest with candidates under calibration. I agree to recuse myself from any evaluation involving candidates with whom I have worked, managed, interviewed at my primary employer, or shared financial interests within the past 12 months.
            </div>
          </label>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              SPECIFIC EMPLOYER AFFILIATIONS OR DISCLOSURE NOTES (OPTIONAL)
            </label>
            <input
              type="text"
              value={formData.conflict_notes}
              onChange={(e) => setFormData({ ...formData, conflict_notes: e.target.value })}
              placeholder="e.g. Currently employed at Stripe; will recuse from Stripe candidates or ex-direct reports."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                color: '#FFFFFF', fontSize: '0.85rem'
              }}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px' }}>
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              padding: '12px 30px',
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {submitting ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid #050B14', borderTopColor: 'transparent', borderRadius: '50%' }} className="spin-slow" />
                Submitting Application...
              </>
            ) : (
              <>
                <Award size={18} /> Submit Application for Admin Verification
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
