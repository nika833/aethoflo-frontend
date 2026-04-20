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

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hovered || value);
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 32, lineHeight: 1, padding: '2px 3px',
              color: filled ? '#E87A4E' : 'var(--border)',
              transition: 'color 100ms, transform 100ms',
              transform: hovered === n ? 'scale(1.15)' : 'scale(1)',
            }}
          >★</button>
        );
      })}
    </div>
  );
}

const STAR_LABELS: Record<number, string> = {
  1: 'Not helpful',
  2: 'Slightly helpful',
  3: 'Helpful',
  4: 'Very helpful',
  5: 'Extremely helpful',
};

export default function LearnerModulePage() {
  const { roadmapModuleId } = useParams<{ roadmapModuleId: string }>();
  const navigate = useNavigate();
  const [mod, setMod] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'content' | 'feedback'>('content');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [responses, setResponses] = useState<Record<string, { bool?: boolean; text?: string; number?: number }>>({});
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

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

  // Validate required checklist items before advancing to Step 2
  const canAdvance = () => {
    if (!mod?.checklist) return true;
    return mod.checklist.items
      .filter((item) => item.is_required)
      .every((item) => {
        const r = responses[item.id];
        if (item.item_type === 'checkbox') return r?.bool === true;
        if (item.item_type === 'text') return (r?.text ?? '').trim().length > 0;
        if (item.item_type === 'number' || item.item_type === 'rating') return r?.number !== undefined;
        return true;
      });
  };

  const handleSubmit = async () => {
    if (!mod || !roadmapModuleId || feedbackRating === 0) return;
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
        feedback_rating: feedbackRating,
        feedback_comment: feedbackComment.trim() || null,
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

  // ── Completed state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="animate-fade-up" style={{ maxWidth: 680 }}>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 28, color: 'var(--status-completed)',
          }}>✓</div>
          <h3 style={{ marginBottom: 8 }}>Module complete</h3>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 28 }}>
            Great work. Your progress and feedback have been saved.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/learner')}>
            Back to roadmap →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Feedback ────────────────────────────────────────────────────────
  if (phase === 'feedback') {
    return (
      <div className="animate-fade-up" style={{ maxWidth: 680 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setPhase('content')}
          style={{ marginBottom: 28, color: 'var(--text-tertiary)', paddingLeft: 0 }}>
          ← Back to module
        </button>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--status-completed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: '#fff', fontWeight: 700 }}>✓</div>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Checklist</span>
          </div>
          <div style={{ flex: 1, height: 1, background: 'var(--accent)', maxWidth: 40 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: '#fff', fontWeight: 700 }}>2</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Your take</span>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <h3 style={{ marginBottom: 4 }}>How useful was this module?</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Your feedback shapes future training content.
          </p>
        </div>

        {/* Star rating */}
        <div className="card card-padded" style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <StarRating value={feedbackRating} onChange={setFeedbackRating} />
            {feedbackRating > 0 && (
              <div style={{ fontSize: 13, color: 'var(--accent)', marginTop: 6, fontWeight: 500 }}>
                {STAR_LABELS[feedbackRating]}
              </div>
            )}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: 6 }}>
              Describe a scenario where you could apply this
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 6 }}>optional</span>
            </label>
            <textarea
              className="form-textarea"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="e.g. When a client resists transitioning between tasks, I could use the visual schedule technique from this module to..."
              rows={4}
            />
          </div>
        </div>

        {/* Learner note */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">
            Private notes
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 6 }}>optional · only visible to you</span>
          </label>
          <textarea
            className="form-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Questions, reminders, or anything you want to revisit..."
            rows={2}
          />
        </div>

        {error && <div style={{ marginBottom: 16 }}><Alert type="error">{error}</Alert></div>}

        <button
          className="btn btn-primary btn-lg"
          onClick={handleSubmit}
          disabled={submitting || feedbackRating === 0}
          style={{ width: '100%' }}
        >
          {submitting ? <Spinner size={18} /> : 'Submit & complete module'}
        </button>
        {feedbackRating === 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
            A star rating is required to complete
          </p>
        )}
      </div>
    );
  }

  // ── Step 1: Module content + checklist ─────────────────────────────────────
  return (
    <div className="animate-fade-up" style={{ maxWidth: 680 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/learner')}
        style={{ marginBottom: 24, color: 'var(--text-tertiary)', paddingLeft: 0 }}>
        ← Back to roadmap
      </button>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#fff', fontWeight: 700 }}>1</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Module & checklist</span>
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--border)', maxWidth: 40 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--surface-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700 }}>2</div>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Your take</span>
        </div>
      </div>

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
            {mod.media.map((item) => <MediaBlock key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {mod.why_it_matters && (
        <section className="card card-padded" style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Why it matters</h4>
          <p style={{ fontSize: 14 }}>{mod.why_it_matters}</p>
        </section>
      )}

      {mod.context_note && (
        <section style={{
          marginBottom: 20, background: 'var(--accent-light)',
          border: '1px solid var(--accent-mid)', borderRadius: 'var(--radius-md)', padding: '14px 16px',
        }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent-dark)',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>A note for you</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>{mod.context_note}</p>
        </section>
      )}

      {mod.what_to_do && (
        <section className="card card-padded" style={{ marginBottom: 28 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>What to do</h4>
          <p style={{ fontSize: 14 }}>{mod.what_to_do}</p>
        </section>
      )}

      {/* Checklist */}
      {mod.checklist && (
        <section style={{ marginBottom: 28 }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            {mod.checklist.title}
          </h4>
          <div className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mod.checklist.items.map((item) => (
              <div key={item.id}>
                {item.item_type === 'checkbox' && (
                  <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
                    <input type="checkbox"
                      checked={responses[item.id]?.bool ?? false}
                      onChange={(e) => handleCheckbox(item.id, e.target.checked)}
                      style={{ marginTop: 2, accentColor: 'var(--accent)', width: 16, height: 16 }} />
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
                    <textarea className="form-textarea"
                      value={responses[item.id]?.text ?? ''}
                      onChange={(e) => handleText(item.id, e.target.value)}
                      rows={3} />
                  </div>
                )}
                {item.item_type === 'number' && (
                  <div className="form-group">
                    <label className="form-label">
                      {item.label}
                      {item.is_required && <span style={{ color: 'var(--accent)' }}> *</span>}
                    </label>
                    <input type="number" className="form-input"
                      value={responses[item.id]?.number ?? ''}
                      onChange={(e) => handleNumber(item.id, parseFloat(e.target.value))}
                      style={{ maxWidth: 160 }} />
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
                        <button key={n} type="button" className="btn btn-secondary btn-sm"
                          onClick={() => handleNumber(item.id, n)}
                          style={{
                            background: responses[item.id]?.number === n ? 'var(--accent)' : undefined,
                            color: responses[item.id]?.number === n ? 'white' : undefined,
                            borderColor: responses[item.id]?.number === n ? 'var(--accent)' : undefined,
                          }}>{n}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <button
        className="btn btn-primary btn-lg"
        onClick={() => setPhase('feedback')}
        disabled={!canAdvance()}
        style={{ width: '100%' }}
      >
        Next: share your take →
      </button>
      {!canAdvance() && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
          Complete all required checklist items to continue
        </p>
      )}
    </div>
  );
}
