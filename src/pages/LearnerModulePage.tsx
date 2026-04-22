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
  is_saved?: boolean;
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

const PEER_PROMPTS: { key: 'hard' | 'style' | 'easier'; question: string; placeholder: string }[] = [
  {
    key: 'hard',
    question: 'What was the hardest part?',
    placeholder: 'e.g. The trickiest part for me was staying consistent when the client was dysregulated — I had to remind myself to slow down before responding...',
  },
  {
    key: 'style',
    question: "What's your approach to this in practice?",
    placeholder: "e.g. I tend to walk through the visual schedule before every session now — it's become a quick 30-second ritual that sets the tone...",
  },
  {
    key: 'easier',
    question: 'How has this changed your work?',
    placeholder: 'e.g. Data collection feels less like a chore now that I understand why each data point matters for treatment decisions...',
  },
];


export default function LearnerModulePage() {
  const { roadmapModuleId } = useParams<{ roadmapModuleId: string }>();
  const navigate = useNavigate();
  const [mod, setMod] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'content' | 'feedback' | 'peer'>('content');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [responses, setResponses] = useState<Record<string, { bool?: boolean; text?: string; number?: number }>>({});
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [peerSignal, setPeerSignal] = useState<{ count: number; samples: string[] } | null>(null);
  const [saved, setSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 700);

  // Random per-provider, stable for this session
  const [promptIdx] = useState(() => Math.floor(Math.random() * 3));
  const currentPrompt = PEER_PROMPTS[promptIdx];

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!roadmapModuleId) return;
    learnerProgressApi.getModule(roadmapModuleId)
      .then((data) => {
        setMod(data);
        setSaved(data.is_saved ?? false);
        // Don't enter submitted state on revisit — show content so learner can review
      })
      .catch((err: any) => {
        const status = err?.response?.status;
        if (status === 403) setError("This module hasn't been released yet. Complete the previous module to unlock it, or ask your administrator to enable early access.");
        else if (status === 404) setError('Module not found. It may have been removed from your roadmap.');
        else setError('Could not load module. Check your connection and try again.');
      })
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
        checklist_template_id: mod.checklist?.id ?? null,
        responses: responseItems,
        feedback_rating: feedbackRating,
        feedback_comment: feedbackComment.trim() || null,
        feedback_prompt: currentPrompt.key,
      });
      setSubmitted(true);
      // Fetch peer signal in background — non-blocking
      learnerProgressApi.peerSignal(roadmapModuleId, currentPrompt.key)
        .then((signal) => { setPeerSignal(signal); setPhase('peer'); })
        .catch(() => { setPhase('peer'); }); // show peer screen even if signal fails
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 80, display: 'flex', justifyContent: 'center' }}><Spinner size={32} /></div>;
  if (error && !mod) return <Alert type="error">{error}</Alert>;
  if (!mod) return null;

  // ── Peer moment screen (shown after submit) ─────────────────────────────────
  if (submitted && phase === 'peer') {
    return (
      <div className="animate-fade-up" style={{ maxWidth: 600 }}>
        {/* Completion mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: 'var(--status-completed)',
          }}>✓</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Module complete</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Your feedback has been saved</div>
          </div>
        </div>

        {/* Peer signal card */}
        {peerSignal && peerSignal.count >= 3 ? (
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 28,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--accent)', marginBottom: 12,
            }}>From your peers</div>
            <p style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.6 }}>
              <strong>{peerSignal.count}</strong> providers in your organization completed this milestone this month.
            </p>
            {peerSignal.samples.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  On "{currentPrompt.question}"
                </div>
                {peerSignal.samples.map((s, i) => (
                  <blockquote key={i} style={{
                    margin: 0, padding: '12px 16px',
                    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid var(--accent-mid)',
                    fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65,
                    fontStyle: 'italic',
                  }}>
                    "{s}"
                  </blockquote>
                ))}
              </div>
            )}
            {peerSignal.samples.length === 0 && (
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                Be one of the first to share on this question — your response may appear here for future providers.
              </p>
            )}
          </div>
        ) : peerSignal !== null ? (
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 28,
          }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
              You're among the first to complete this milestone. Your feedback will help shape what future providers see here.
            </p>
          </div>
        ) : null}

        <button className="btn btn-primary" onClick={() => navigate('/learner')}>
          Back to roadmap →
        </button>
      </div>
    );
  }

  // ── Submitted but peer signal still loading ──────────────────────────────────
  if (submitted) {
    return (
      <div style={{ padding: 80, display: 'flex', justifyContent: 'center' }}>
        <Spinner size={28} />
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
            Your feedback helps future providers — responses may appear anonymously as peer insights.
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
              Share with peers: {currentPrompt.question}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 6 }}>optional</span>
            </label>
            <textarea
              className="form-textarea"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder={currentPrompt.placeholder}
              rows={4}
            />
          </div>
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

  const saveButton = (
    <button
      onClick={async () => {
        if (savingToggle || !roadmapModuleId) return;
        setSavingToggle(true);
        try {
          const res = await learnerProgressApi.toggleSave(roadmapModuleId);
          setSaved(res.saved);
        } finally { setSavingToggle(false); }
      }}
      title={saved ? 'Remove from saved' : 'Save this module'}
      style={{
        background: 'none', border: 'none', cursor: savingToggle ? 'default' : 'pointer',
        fontSize: 24, lineHeight: 1, padding: '4px 6px',
        color: saved ? '#E11D48' : 'var(--text-tertiary)',
        opacity: savingToggle ? 0.5 : 1, transition: 'color 150ms',
      }}
    >{saved ? '♥' : '♡'}</button>
  );

  const mediaBlock = mod.media.length > 0 ? (
    <section style={{ marginBottom: 20 }}>
      <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
        Resources
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {mod.media.map((item) => <MediaBlock key={item.id} item={item} />)}
      </div>
    </section>
  ) : null;

  const checklistBlock = mod.checklist ? (
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
                  {item.label}{item.is_required && <span style={{ color: 'var(--accent)' }}> *</span>}
                </label>
                {item.helper_text && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: -2 }}>{item.helper_text}</p>}
                <textarea className="form-textarea" value={responses[item.id]?.text ?? ''}
                  onChange={(e) => handleText(item.id, e.target.value)} rows={3} />
              </div>
            )}
            {item.item_type === 'number' && (
              <div className="form-group">
                <label className="form-label">
                  {item.label}{item.is_required && <span style={{ color: 'var(--accent)' }}> *</span>}
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
                  {item.label}{item.is_required && <span style={{ color: 'var(--accent)' }}> *</span>}
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
  ) : null;

  const isCompleted = mod.status === 'completed';

  const ctaBlock = isCompleted ? (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 'var(--radius-md)',
      background: '#F0FDF4', border: '1px solid #BBF7D0',
    }}>
      <span style={{ fontSize: 16, color: 'var(--status-completed)' }}>✓</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: '#065F46' }}>You completed this module</span>
    </div>
  ) : (
    <>
      <button className="btn btn-primary btn-lg" onClick={() => setPhase('feedback')}
        disabled={!canAdvance()} style={{ width: '100%' }}>
        Next: share your take →
      </button>
      {!canAdvance() && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
          Complete all required checklist items to continue
        </p>
      )}
    </>
  );

  return (
    <div className="animate-fade-up" style={{ width: '100%', boxSizing: 'border-box' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/learner')}
        style={{ marginBottom: 24, color: 'var(--text-tertiary)', paddingLeft: 0 }}>
        ← Back to roadmap
      </button>

      {/* Completed banner */}
      {isCompleted && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
          padding: '10px 16px', borderRadius: 'var(--radius-md)',
          background: '#F0FDF4', border: '1px solid #BBF7D0',
        }}>
          <span style={{ fontSize: 15, color: 'var(--status-completed)' }}>✓</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#065F46' }}>Completed — reviewing this module</span>
        </div>
      )}

      {/* Step indicator — hidden for completed modules */}
      {!isCompleted && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
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
      </div>}

      {isMobile ? (
        /* ── Mobile: single column, video between why-it-matters and note ── */
        <div>
          {/* Title + heart */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: '0 0 8px' }}>{mod.title}</h2>
              {mod.objective && (
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {mod.objective}
                </p>
              )}
            </div>
            <div style={{ flexShrink: 0 }}>{saveButton}</div>
          </div>

          {mod.why_it_matters && (
            <section className="card card-padded" style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Why it matters</h4>
              <p style={{ fontSize: 14 }}>{mod.why_it_matters}</p>
            </section>
          )}

          {/* Video between why-it-matters and note */}
          {mediaBlock}

          {mod.context_note && (
            <section style={{
              marginBottom: 16, background: 'var(--accent-light)',
              border: '1px solid var(--accent-mid)', borderRadius: 'var(--radius-md)', padding: '14px 16px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent-dark)',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>A note for you</div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>{mod.context_note}</p>
            </section>
          )}

          {checklistBlock}
          {ctaBlock}
        </div>
      ) : (
        /* ── Desktop: two-column side by side ── */
        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
          {/* Left column */}
          <div style={{ flex: '0 0 400px', minWidth: 0 }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ margin: '0 0 10px' }}>{mod.title}</h2>
              {mod.objective && (
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  {mod.objective}
                </p>
              )}
            </div>

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

            {checklistBlock}
            {ctaBlock}
          </div>

          {/* Right column — media + heart */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              {saveButton}
            </div>
            {mediaBlock}
          </div>
        </div>
      )}
    </div>
  );
}
