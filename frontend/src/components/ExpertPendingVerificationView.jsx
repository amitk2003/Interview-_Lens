import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  UploadCloud,
  Send,
  ExternalLink,
  Briefcase,
  Award,
  Sparkles,
  ChevronRight,
  RefreshCw,
  X,
  User,
  ArrowRight
} from 'lucide-react';
import { API_BASE } from '../config.js';

export default function ExpertPendingVerificationView({
  userProfile,
  onGoToQueue,
  onGoToProfile,
  onReapply
}) {
  const token = localStorage.getItem('AUTH_TOKEN');

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Info response state
  const [responseText, setResponseText] = useState('');
  const [additionalDocs, setAdditionalDocs] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchApplication = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/expert/application?token=${encodeURIComponent(token || '')}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) {
        if (res.status === 404) {
          setApplication(null);
          return;
        }
        throw new Error(`Failed to load application status (${res.status})`);
      }
      const data = await res.json();
      setApplication(data);
    } catch (err) {
      console.error('Fetch expert application error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, []);

  // Upload additional doc for responding to info requests
  const handleUploadAdditionalDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File exceeds 5MB size limit.');
      return;
    }

    setUploadingDoc(true);
    const data = new FormData();
    data.append('file', file);
    data.append('doc_type', 'CLARIFICATION_PROOF');

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
        throw new Error(errJson.detail || 'Failed to upload document');
      }

      const docRecord = await res.json();
      setAdditionalDocs(prev => [...prev, docRecord]);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  // Submit response to admin info request
  const handleRespondToInfoRequest = async (e) => {
    e.preventDefault();
    if (!responseText.trim()) {
      alert('Please provide your response or clarification notes.');
      return;
    }

    setSubmittingResponse(true);
    try {
      const payload = {
        application_id: application.id,
        response_text: responseText.trim(),
        additional_documents: additionalDocs
      };

      const res = await fetch(`${API_BASE}/api/expert/respond-info?token=${encodeURIComponent(token || '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to submit response');
      }

      const updated = await res.json();
      setApplication(updated);
      setResponseText('');
      setAdditionalDocs([]);
      setActionSuccess('Your clarification has been submitted! Application returned to Pending Review.');
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingResponse(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '960px', margin: '40px auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px auto' }} className="spin-slow" />
        <p style={{ color: 'var(--text-muted)' }}>Retrieving Expert Verification and Audit Ledger...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '48px 30px', borderRadius: '20px' }}>
          <Award size={48} color="var(--accent-cyan)" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
            No Active Expert Application Found
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
            You have not yet applied to become an accredited Industry Expert on InterviewLens.
          </p>
          <button className="btn btn-primary" onClick={onReapply} style={{ padding: '10px 24px' }}>
            Apply to Become an Industry Expert
          </button>
        </div>
      </div>
    );
  }

  const isPending = application.status === 'PENDING';
  const isInfoRequested = application.status === 'INFO_REQUESTED';
  const isApproved = application.status === 'APPROVED';
  const isRejected = application.status === 'REJECTED';

  return (
    <div style={{ maxWidth: '1080px', margin: '32px auto', padding: '0 20px', minHeight: '85vh' }}>
      {/* Toast Alert */}
      {actionSuccess && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 9999,
          background: 'rgba(16, 185, 129, 0.95)', color: '#050B14',
          padding: '12px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '0.86rem',
          display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
        }}>
          <CheckCircle2 size={18} /> {actionSuccess}
        </div>
      )}

      {/* TOP STATUS HERO BANNER */}
      {isPending && (
        <div className="glass-panel" style={{
          padding: '28px 32px', borderRadius: '20px', marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(8, 11, 17, 0.95) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)'
              }}>
                <Clock size={28} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Application Pending Administrative Verification
                  </h1>
                  <span style={{
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 800,
                    background: 'rgba(245, 158, 11, 0.25)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.5)'
                  }}>
                    IN REVIEW
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                  Submitted on {new Date(application.created_at).toLocaleDateString()} • In queue for platform administrator credential review.
                </p>
              </div>
            </div>

            <button
              onClick={fetchApplication}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} /> Refresh Status
            </button>
          </div>
        </div>
      )}

      {isInfoRequested && (
        <div className="glass-panel" style={{
          padding: '28px 32px', borderRadius: '20px', marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(8, 11, 17, 0.95) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.2)', color: '#F87171',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
              }}>
                <AlertTriangle size={28} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Action Required: Additional Information Requested
                  </h1>
                  <span style={{
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 800,
                    background: 'rgba(239, 68, 68, 0.25)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.5)'
                  }}>
                    CLARIFICATION NEEDED
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                  A Platform Administrator has requested clarification or supplementary proof before accrediting your account.
                </p>
              </div>
            </div>

            <button
              onClick={fetchApplication}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="glass-panel" style={{
          padding: '28px 32px', borderRadius: '20px', marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(8, 11, 17, 0.95) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.2)', color: '#34D399',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
              }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Verified Industry Expert Accreditation Granted
                  </h1>
                  <span style={{
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 800,
                    background: 'rgba(16, 185, 129, 0.25)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.5)'
                  }}>
                    VERIFIED &amp; ACTIVE
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                  Verified by {application.reviewed_by || 'Platform Administration'} • Authorized for Candidate Assessment Calibration.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {onGoToProfile && (
                <button className="btn btn-secondary" onClick={onGoToProfile} style={{ fontSize: '0.82rem' }}>
                  View Expert Profile
                </button>
              )}
              {onGoToQueue && (
                <button className="btn btn-primary" onClick={onGoToQueue} style={{ fontSize: '0.82rem' }}>
                  Open Candidate Review Queue <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="glass-panel" style={{
          padding: '28px 32px', borderRadius: '20px', marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(8, 11, 17, 0.95) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.15)', color: '#F87171',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <XCircle size={28} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Application Not Approved
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                  {application.admin_notes || 'Your application did not satisfy verification criteria for evaluator accreditation.'}
                </p>
              </div>
            </div>

            {onReapply && (
              <button className="btn btn-primary" onClick={onReapply} style={{ fontSize: '0.82rem' }}>
                Submit New Application
              </button>
            )}
          </div>
        </div>
      )}

      {/* ACTION REQUIRED SECTION: RESPOND TO INFO REQUEST */}
      {isInfoRequested && (
        <div className="glass-panel" style={{
          padding: '26px', borderRadius: '18px', marginBottom: '28px',
          background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(239, 68, 68, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <AlertTriangle size={20} color="#F87171" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Administrator's Inquiry / Document Request
            </h3>
          </div>

          <div style={{
            padding: '16px 20px', borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#FCA5A5', fontSize: '0.9rem', lineHeight: 1.55, marginBottom: '20px',
            fontWeight: 500
          }}>
            {application.requested_info || application.admin_notes || 'Please provide verification of your relevant engineering credentials.'}
          </div>

          <form onSubmit={handleRespondToInfoRequest}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                YOUR CLARIFICATION RESPONSE <span style={{ color: 'var(--accent-cyan)' }}>*</span>
              </label>
              <textarea
                rows={4}
                required
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Provide detailed explanation, credential registry numbers, or context answering the reviewer's inquiry..."
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF', fontSize: '0.85rem', lineHeight: 1.5, resize: 'vertical'
                }}
              />
            </div>

            {/* Additional Credential Document Uploader */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                ATTACH SUPPLEMENTARY PROOF OR CERTIFICATE (OPTIONAL)
              </label>
              <div style={{
                border: '1px dashed var(--border-subtle)', borderRadius: '10px',
                padding: '16px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)',
                position: 'relative'
              }}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleUploadAdditionalDoc}
                  disabled={uploadingDoc}
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: uploadingDoc ? 'not-allowed' : 'pointer'
                  }}
                />
                <UploadCloud size={24} color="var(--accent-cyan)" style={{ margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '0.82rem', color: '#FFFFFF', fontWeight: 600 }}>
                  {uploadingDoc ? 'Uploading...' : 'Click to attach PDF / Certification Document (<5MB)'}
                </div>
              </div>

              {/* Uploaded supplementary docs list */}
              {additionalDocs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  {additionalDocs.map((doc, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#FFFFFF' }}>
                        <FileText size={15} color="var(--accent-cyan)" />
                        <span>{doc.original_filename}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({(doc.file_size_bytes / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdditionalDocs(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submittingResponse}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {submittingResponse ? (
                <>
                  <div style={{ width: '15px', height: '15px', border: '2px solid #050B14', borderTopColor: 'transparent', borderRadius: '50%' }} className="spin-slow" />
                  Submitting Clarification...
                </>
              ) : (
                <>
                  <Send size={15} /> Submit Clarification &amp; Return to Review Queue
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TWO-COLUMN LAYOUT: APPLICATION SUMMARY & AUDIT TRAIL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* COLUMN 1: SUBMITTED PROFILE DATA */}
        <div className="glass-panel" style={{ padding: '26px', borderRadius: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Award size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Submitted Application Dossier
            </h3>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Professional Headline
            </div>
            <div style={{ fontSize: '0.92rem', color: '#FFFFFF', fontWeight: 600, marginTop: '2px' }}>
              {application.headline}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Role &amp; Organization
              </div>
              <div style={{ fontSize: '0.84rem', color: '#FFFFFF', fontWeight: 600, marginTop: '2px' }}>
                {application.current_title} @ {application.current_company}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Experience &amp; Industry
              </div>
              <div style={{ fontSize: '0.84rem', color: '#FFFFFF', fontWeight: 600, marginTop: '2px' }}>
                {application.years_of_experience} Years • {application.industry_specialization}
              </div>
            </div>
          </div>

          {application.portfolio_url && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Portfolio / LinkedIn URL
              </div>
              <a
                href={application.portfolio_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.82rem', color: 'var(--accent-cyan)', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '3px'
                }}
              >
                {application.portfolio_url} <ExternalLink size={12} />
              </a>
            </div>
          )}

          {application.supported_categories && application.supported_categories.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                Supported Calibration Categories
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {application.supported_categories.map((cat, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px',
                      background: 'rgba(0, 240, 255, 0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 240, 255, 0.2)'
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Credential Documents */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
              Evidence &amp; Credential Documents ({application.credential_documents?.length || 0})
            </div>
            {(!application.credential_documents || application.credential_documents.length === 0) ? (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No attached credentials on record.</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {application.credential_documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={`${API_BASE}/api/expert/credential/${doc.filename}?token=${encodeURIComponent(token || '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)',
                      textDecoration: 'none', color: '#FFFFFF', fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={14} color="var(--accent-cyan)" />
                      <span>{doc.original_filename}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      View / Download <ExternalLink size={11} />
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Conflict of interest indicator */}
          <div style={{
            padding: '12px 14px', borderRadius: '10px',
            background: application.conflict_declaration_confirmed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: application.conflict_declaration_confirmed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex', alignItems: 'flex-start', gap: '10px'
          }}>
            <ShieldCheck size={18} color={application.conflict_declaration_confirmed ? '#34D399' : '#F87171'} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: application.conflict_declaration_confirmed ? '#34D399' : '#F87171' }}>
                Conflict of Interest Policy: {application.conflict_declaration_confirmed ? 'Signed & Declared' : 'Unconfirmed'}
              </strong>
              {application.conflict_notes && (
                <div style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                  Disclosed: "{application.conflict_notes}"
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 2: REVIEWER STATUS HISTORY & AUDIT LOG */}
        <div className="glass-panel" style={{ padding: '26px', borderRadius: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Clock size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Reviewer Audit Trail &amp; History
            </h3>
          </div>

          {(!application.status_history || application.status_history.length === 0) ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', textAlign: 'center', padding: '20px' }}>
              No status log entries recorded yet.
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '20px' }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute', top: '10px', bottom: '10px', left: '6px',
                width: '2px', background: 'var(--border-subtle)'
              }} />

              {application.status_history.map((entry, idx) => {
                const getActionColor = () => {
                  switch (entry.action) {
                    case 'APPROVED': return '#34D399';
                    case 'REJECTED': return '#F87171';
                    case 'INFO_REQUESTED': return '#FBBF24';
                    case 'INFO_PROVIDED': return 'var(--accent-cyan)';
                    default: return '#3B82F6';
                  }
                };

                return (
                  <div key={idx} style={{ position: 'relative', marginBottom: '22px' }}>
                    {/* Dot on line */}
                    <div style={{
                      position: 'absolute', left: '-20px', top: '4px',
                      width: '12px', height: '12px', borderRadius: '50%',
                      background: getActionColor(),
                      boxShadow: `0 0 8px ${getActionColor()}`
                    }} />

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                          background: `${getActionColor()}22`, color: getActionColor(), border: `1px solid ${getActionColor()}55`
                        }}>
                          {entry.action}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#FFFFFF', fontWeight: 600, marginTop: '4px' }}>
                        Actor: {entry.actor_name} ({entry.actor_role})
                      </div>

                      {entry.notes && (
                        <p style={{
                          fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0 0',
                          lineHeight: 1.45, background: 'rgba(255, 255, 255, 0.02)', padding: '8px 10px', borderRadius: '6px'
                        }}>
                          {entry.notes}
                        </p>
                      )}

                      {entry.requested_info && (
                        <div style={{
                          fontSize: '0.76rem', color: '#FCA5A5', marginTop: '6px',
                          padding: '6px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                          <strong>Inquiry:</strong> {entry.requested_info}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
