import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { learnerProgressApi } from '../lib/api';
import { Spinner, Alert } from '../components/ui';
import MediaBlock from '../components/MediaBlock';

interface MediaItem {
  id: string; media_type: string; title: string | null; url: string;
}
interface ChecklistItem {
  id: string; label: string; item_type: string; is_required: boolean;
  display_order: number; helper_text: string | null;
}
interface ChecklistTemplate {
  id: string; title: string; items: ChecklistItem[];
}
interface ModuleDetail {
  id: string; title: string; objective: string | null;
  why_it_matters: string | null; context_note: string | null;
  what_to_do: string | null; status: string;
  media: MediaItem[]; checklist: ChecklistTemplate | null;
}

export default function LearnerModulePage() {
  const { roadmapModuleId } = useParams<{ roadmapModuleId: string }>();
  const navigate = useNavigate();
  const [mod, setMod] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [responses, setResponses] = useState<Record<string, { bool?: boolean; text?: string; number?: number }>>({});

  useEffect(() => {
    if (!roadmapModuleId) return;
    learnerProgressApi.getModule(roadmapModuleId)
      .then((data) => {
        setMod(data);
        if (data.status === 'completed') setSubmitted(true);
      })
      .catch(() => setError('Could not load module.'))
      .finally(() => setLoading(false));
  }, [roadmapModuleId]);

  const handleCheckbox = (itemId: string, checked: boolean) =>
    setResponses((r) => ({ ...r, [itemId]: { bool: checked } }));

  const handleText = (itemId: string, text: string) =>
    setResponses((r) => ({ ...r, [itemId]: { text } }));

  const handleNumber = (itemId: string, num: number) =>
    setResponses((r) => ({ ...r, [itemId]: { number: num } }));

  const handleSubmit = async () => {
    if (!mod || !roadmapModuleId) return;
    setSubmitting(true);
    setError('');
    try {
      const responseItems = mod.checklist
        ? mod.checklist.items.map((item) => ({
            template_item_id: item.id,
            value_bool: responses[item.id]?.bool ?? null,
            value_text: responses[item.id]?.text ?? null,
            value_number: responses[item.id]?.number ?? null,
          }))
        : [];

      await learnerProgressApi.submitModule(roadmapModuleId, {
        learner_note: note || null,
        checklist_template_id: mod.checklist?.id ?? null,
        responses: responseItems,
      });
      setSubmitted(true);
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 80, display: 'flex', justifyContent: 'center' }}><Spinner size={32} /></div>;
  if (error && !mod) return <Alert type="error">{error}</Alert>;
  if (!mod) return null;

  return (
    <div className="animate-fade-up" style={{ maxWidth: 680 }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/learner')}
        style={{ marginBottom: 24, color: 'var(--text-tertiary)', paddingLeft: 0 }}>
        ← Back to roadmap
      </button>

      {/* Module header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 8 }}>{mod.title}</h2>
        {mod.objective && (
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {mod.objective}
          </p>
        )}
      </div>

      {/* Media */}
      {mod.media.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            Resources
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mod.media.map((item) => (
              <MediaBlock key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Why it matters */}
      {mod.why_it_matters && (
        <section className="card card-padded" style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8,
            color: 'var(--text-primary)' }}>Why it matters</h4>
          <p style={{ fontSize: 14 }}>{mod.why_it_matters}</p>
        </section>
      )}

      {/* Context note — only when present, per spec */}
      {mod.context_note && (
        <section style={{
          marginBottom: 20,
          background: 'var(--accent-light)',
          border: '1px solid var(--accent-mid)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
        }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent-dark)',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            A note for you
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            {mod.context_note}
          </p>
        </section>
      )}

      {/* What to do */}
      {mod.what_to_do && (
        <section className="card card-padded" style={{ marginBottom: 28 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8,
            color: 'var(--text-primary)' }}>What to do</h4>
          <p style={{ fontSize: 14 }}>{mod.what_to_do}</p>
        </section>
      )}

      {/* Checklist */}
      {mod.checklist && !submitted && (
        <section style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            {mod.checklist.title}
          </h4>
          <div className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mod.checklist.items.map((item) => (
              <div key={item.id}>
                {item.item_type === 'checkbox' && (
                  <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={responses[item.id]?.bool ?? false}
                      onChange={(e) => handleCheckbox(item.id, e.target.checked)}
                      style={{ marginTop: 2, accentColor: 'var(--accent)', width: 16, height: 16 }}
                    />
                    <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                      {item.label}
                      {item.is_required && <span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>}
                    </span>
                  </label>
                )}
                {item.item_type === 'text' && (
                  <div className="form-group">
                    <label className="form-label">
                      {item.label}
                      {item.is_required && <span style={{ color: 'var(--accent)' }}> *</span>}
                    </label>
                    {item.helper_text && (
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: -2 }}>{item.helper_text}</p>
                    )}
                    <textarea
                      className="form-textarea"
                      value={responses[item.id]?.text ?? ''}
                      onChange={(e) => handleText(item.id, e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
                {item.item_type === 'number' && (
                  <div className="form-group">
                    <label className="form-label">
                      {item.label}
                      {item.is_required && <span style={{ color: 'var(--accent)' }}> *</span>}
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={responses[item.id]?.number ?? ''}
                      onChange={(e) => handleNumber(item.id, parseFloat(e.target.value))}
                      style={{ maxWidth: 160 }}
                    />
                  </div>
                )}
                {item.item_type === 'rating' && (
                  <div className="form-group">
                    <label className="form-label">
                      {item.label}
                      {item.is_required && <span style={{ color: 'var(--accent)' }}> *</span>}
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[1,2,3,4,5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleNumber(item.id, n)}
                          style={{
                            background: responses[item.id]?.number === n
                              ? 'var(--accent)' : undefined,
                            color: responses[item.id]?.number === n ? 'white' : undefined,
                            borderColor: responses[item.id]?.number === n
                              ? 'var(--accent)' : undefined,
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Learner note */}
      {!submitted && (
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any thoughts, questions, or reflections from this module..."
            rows={3}
          />
        </div>
      )}

      {error && <Alert type="error" >{error}</Alert>}

      {submitted ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: 24, color: 'var(--status-completed)',
          }}>✓</div>
          <h4 style={{ marginBottom: 6 }}>Module complete</h4>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Great work. Your progress has been saved.</p>
          <button className="btn btn-primary" onClick={() => navigate('/learner')}>
            Back to roadmap →
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ width: '100%' }}
        >
          {submitting ? <Spinner size={18} /> : 'Mark complete & submit'}
        </button>
      )}
    </div>
  );
}
