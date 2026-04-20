import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { moduleSkillsApi, domainsApi, checklistsApi, analyzeApi } from '../lib/api';
import { SlideOver, EmptyState, PageHeader, Alert, Spinner, SimilarityWarning } from '../components/ui';
import { MediaUpload } from '../components/MediaUpload';
import MediaBlock, { MediaItem } from '../components/MediaBlock';

interface Domain { id: string; name: string; }
interface ChecklistItem {
  id: string; label: string; item_type: string; is_required: boolean;
  display_order: number; helper_text: string | null;
}
interface ChecklistTemplate { id: string; title: string; items: ChecklistItem[]; }
interface ModuleSkill {
  id: string; title: string; domain_id: string | null; domain_name: string | null;
  objective: string | null; why_it_matters: string | null; context_note: string | null;
  what_to_do: string | null; is_active: boolean;
  media_count: number; checklist_count: number;
}

const AI_BADGE = (
  <span style={{ fontSize: 10, fontWeight: 600, color: '#6D28D9', background: '#EDE9FE',
    padding: '1px 6px', borderRadius: 4, marginLeft: 6, verticalAlign: 'middle' }}>
    AI
  </span>
);

const SMART_ACCEPT = [
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',');

// ─── Module Editor form ───────────────────────────────────────────────────────
interface PendingMedia { key: string; originalName: string; mimeType: string; }

interface ProposedField { key: string; label: string; current: string; proposed: string; }
interface AIProposal { fields: ProposedField[]; steps: string[]; pendingMedia?: PendingMedia; }

interface PreviewModule {
  id: string; title: string; objective: string | null;
  why_it_matters: string | null; context_note: string | null; what_to_do: string | null;
  media: MediaItem[];
  checklist: { id: string; title: string; items: { id: string; label: string; item_type: string; is_required: boolean }[] } | null;
}

function ModulePreviewDrawer({ moduleId, onClose }: { moduleId: string; onClose: () => void }) {
  const [mod, setMod] = useState<PreviewModule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    moduleSkillsApi.get(moduleId)
      .then((data) => {
        const checklist = data.checklists?.[0] ?? null;
        setMod({
          id: data.id,
          title: data.title,
          objective: data.objective,
          why_it_matters: data.why_it_matters,
          context_note: data.context_note,
          what_to_do: data.what_to_do,
          media: data.media ?? [],
          checklist: checklist ? { id: checklist.id, title: checklist.title, items: checklist.items ?? [] } : null,
        });
      })
      .finally(() => setLoading(false));
  }, [moduleId]);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 45,
        background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)',
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 46,
        width: 540, background: 'var(--surface)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.14)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header bar */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: 'var(--accent)', background: 'var(--accent-light)',
              padding: '3px 8px', borderRadius: 6,
            }}>Learner view</span>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Preview only — no changes saved</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Content — min-height:0 required for overflow-y:auto to work inside flex column */}
        <div style={{ padding: '28px 28px 48px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
          ) : !mod ? null : (
            <>
              <h2 style={{ marginBottom: 8, fontSize: '1.4rem' }}>{mod.title}</h2>
              {mod.objective && (
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 28 }}>
                  {mod.objective}
                </p>
              )}

              {mod.media.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
                    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Resources</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {mod.media.map((item) => <MediaBlock key={item.id} item={item} />)}
                  </div>
                </section>
              )}

              {mod.why_it_matters && (
                <section className="card card-padded" style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Why it matters</div>
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

              {mod.checklist && mod.checklist.items.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
                    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                    {mod.checklist.title}
                  </div>
                  <div className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {mod.checklist.items.map((item) => (
                      <label key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'default', opacity: 0.75 }}>
                        <input type="checkbox" disabled
                          style={{ marginTop: 2, accentColor: 'var(--accent)', width: 16, height: 16 }} />
                        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                          {item.label}
                          {item.is_required && <span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {/* Sparse module hint — only shows when no body content exists */}
              {!mod.why_it_matters && !mod.context_note && mod.media.length === 0 && (!mod.checklist || mod.checklist.items.length === 0) && (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: 24 }}>
                  No additional content — add Why it matters, a context note, or a checklist in the editor.
                </p>
              )}

              {/* Submit button — non-functional, visual only */}
              <button className="btn btn-primary btn-lg" style={{ width: '100%', pointerEvents: 'none', marginTop: 8 }}>
                Mark complete &amp; submit
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ModuleEditor({
  initial, domains: initialDomains, onSave, onCancel, saving, onDomainCreated, existingTitles,
  onPendingChecklist, onPendingMedia, onApplyProposedSteps,
}: {
  initial?: Partial<ModuleSkill>;
  domains: Domain[];
  onSave: (d: Record<string, unknown>, steps: string[]) => void;
  onCancel: () => void;
  saving: boolean;
  onDomainCreated?: (d: Domain) => void;
  existingTitles: string[];
  onPendingMedia?: (pm: PendingMedia) => void;
  onApplyProposedSteps?: (steps: string[]) => Promise<void>;
}) {
  const draftKey = initial?.id ? `module-draft-${initial.id}` : 'module-draft-new';

  const loadDraft = () => {
    try { return JSON.parse(localStorage.getItem(draftKey) ?? 'null'); } catch { return null; }
  };

  const savedDraft = !initial?.id ? loadDraft() : null; // only restore drafts for new modules

  const [form, setForm] = useState({
    title: savedDraft?.title ?? initial?.title ?? '',
    domain_id: savedDraft?.domain_id ?? initial?.domain_id ?? '',
    objective: savedDraft?.objective ?? initial?.objective ?? '',
    why_it_matters: savedDraft?.why_it_matters ?? initial?.why_it_matters ?? '',
    context_note: savedDraft?.context_note ?? initial?.context_note ?? '',
    what_to_do: savedDraft?.what_to_do ?? initial?.what_to_do ?? '',
  });
  const [steps, setSteps] = useState<string[]>(savedDraft?.steps ?? []);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(savedDraft ? new Date() : null);
  const [localDomains, setLocalDomains] = useState<Domain[]>(initialDomains);
  const [creatingDomain, setCreatingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeError, setAnalyzeError] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [smartDragging, setSmartDragging] = useState(false);
  const [aiProposal, setAiProposal] = useState<AIProposal | null>(null);
  const [applyingSteps, setApplyingSteps] = useState(false);
  const newDomainInputRef = useRef<HTMLInputElement>(null);
  const smartFileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistDraft = useCallback((data: typeof form, currentSteps?: string[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({ ...data, steps: currentSteps }));
      setDraftSavedAt(new Date());
    }, 800);
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    localStorage.removeItem(draftKey);
    setDraftSavedAt(null);
  }, [draftKey]);

  const set = (k: string, v: string) => {
    setAiFields((prev) => { const n = new Set(prev); n.delete(k); return n; });
    const next = { ...form, [k]: v };
    setForm(next);
    persistDraft(next, steps);
  };

  const setStepsAndSave = (newSteps: string[]) => {
    setSteps(newSteps);
    persistDraft(form, newSteps);
  };

  const otherTitles = existingTitles.filter((t) => t !== initial?.title);

  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__new__') {
      setCreatingDomain(true);
      setTimeout(() => newDomainInputRef.current?.focus(), 50);
    } else {
      set('domain_id', e.target.value);
    }
  };

  const confirmNewDomain = async () => {
    const name = newDomainName.trim();
    if (!name) return;
    setDomainSaving(true);
    try {
      const created: Domain = await domainsApi.create({ name });
      setLocalDomains((prev) => [...prev, created]);
      setForm((f) => ({ ...f, domain_id: created.id }));
      onDomainCreated?.(created);
    } finally {
      setDomainSaving(false);
      setCreatingDomain(false);
      setNewDomainName('');
    }
  };

  const runAnalysis = async (file: File) => {
    setAnalyzeError('');
    setAnalyzeProgress(0);
    setAnalyzing(true);
    setAiProposal(null);
    try {
      const { suggestions: s, pendingMedia } = await analyzeApi.smartFill(file, setAnalyzeProgress);

      if (isCreate) {
        // Create mode: apply directly
        const aiSteps = s.checklist_items?.length ? s.checklist_items : steps;
        const nextForm = {
          title: s.title || form.title,
          domain_id: form.domain_id,
          objective: s.objective || form.objective,
          why_it_matters: s.why_it_matters || form.why_it_matters,
          context_note: s.context_note || form.context_note,
          what_to_do: form.what_to_do,
        };
        setForm(nextForm);
        if (s.checklist_items?.length) setSteps(s.checklist_items);
        setAiFields(new Set(['title', 'objective', 'why_it_matters', 'context_note', 'steps']));
        persistDraft(nextForm, aiSteps);
        if (pendingMedia) onPendingMedia?.(pendingMedia);
        if (!form.domain_id && s.domain_suggestion) {
          const match = localDomains.find((d) => d.name.toLowerCase() === s.domain_suggestion!.toLowerCase());
          if (match) setForm((f) => ({ ...f, domain_id: match.id }));
        }
      } else {
        // Edit mode: build proposal for user to review
        const LABELS: Record<string, string> = {
          title: 'Title', objective: 'Objective',
          why_it_matters: 'Why it matters', context_note: 'Context note',
        };
        const fields: ProposedField[] = (['title', 'objective', 'why_it_matters', 'context_note'] as const)
          .filter((k) => s[k] && s[k] !== form[k])
          .map((k) => ({ key: k, label: LABELS[k], current: form[k] ?? '', proposed: s[k] ?? '' }));
        setAiProposal({ fields, steps: s.checklist_items ?? [], pendingMedia });
      }
    } catch (err: unknown) {
      setAnalyzeError((err as Error).message ?? 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const isCreate = !initial?.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Smart fill — create: auto-fills; edit: shows proposal for review */}
      <div
        onDragOver={(e) => { e.preventDefault(); setSmartDragging(true); }}
        onDragLeave={() => setSmartDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setSmartDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) runAnalysis(f);
        }}
        onClick={() => !analyzing && smartFileRef.current?.click()}
        style={{
          border: `2px dashed ${smartDragging ? '#7C3AED' : analyzing ? '#7C3AED' : '#C4B5FD'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '18px 16px',
          textAlign: 'center',
          cursor: analyzing ? 'default' : 'pointer',
          background: smartDragging ? '#EDE9FE' : analyzing ? '#F5F3FF' : '#FAFAFF',
          transition: 'all 150ms',
        }}
      >
        <input ref={smartFileRef} type="file" accept={SMART_ACCEPT} style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) runAnalysis(e.target.files[0]); }} />
        {analyzing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Spinner size={18} />
              <span style={{ fontSize: 14, color: '#5B21B6', fontWeight: 500 }}>
                {analyzeProgress < 85 ? `Uploading… ${analyzeProgress}%` : 'Analyzing with AI…'}
              </span>
            </div>
            <div style={{ width: '100%', height: 4, background: '#EDE9FE', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${analyzeProgress}%`, height: '100%', background: '#7C3AED', borderRadius: 2, transition: 'width 300ms ease' }} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 22, marginBottom: 6 }}>✨</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#5B21B6', marginBottom: 2 }}>
              {isCreate ? 'Smart fill from file' : 'Re-analyze with AI'}
            </div>
            <div style={{ fontSize: 12, color: '#7C3AED' }}>
              {isCreate
                ? 'Drop a video, audio, PDF, or doc — AI will pre-fill the form below'
                : 'Drop a file — AI will suggest field updates for review. The file is also saved as primary content.'}
            </div>
          </>
        )}
      </div>

      {/* AI Proposal panel — edit mode only */}
      {aiProposal && !isCreate && (
        <div style={{
          border: '1px solid #A78BFA',
          borderRadius: 'var(--radius-lg)',
          background: '#FAFAFF',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px',
            background: '#EDE9FE',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>✨</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#5B21B6' }}>
                AI Suggestions — review before applying
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#7C3AED', color: '#fff', border: 'none' }}
                onClick={() => {
                  // Apply all field changes
                  const next = { ...form };
                  const accepted = new Set<string>();
                  aiProposal.fields.forEach((f) => {
                    (next as Record<string, string>)[f.key] = f.proposed;
                    accepted.add(f.key);
                  });
                  setForm(next);
                  setAiFields(accepted);
                  persistDraft(next, steps);
                  // Apply all steps
                  if (aiProposal.steps.length) {
                    setApplyingSteps(true);
                    onApplyProposedSteps?.(aiProposal.steps).finally(() => setApplyingSteps(false));
                  }
                  if (aiProposal.pendingMedia) onPendingMedia?.(aiProposal.pendingMedia);
                  setAiProposal(null);
                }}
              >
                Accept all
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAiProposal(null)}>
                Dismiss
              </button>
            </div>
          </div>

          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Field proposals */}
            {aiProposal.fields.map((f) => (
              <div key={f.key} style={{
                background: '#fff', border: '1px solid #DDD6FE',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {f.label}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#7C3AED', color: '#fff', border: 'none', fontSize: 12 }}
                    onClick={() => {
                      const next = { ...form, [f.key]: f.proposed };
                      setForm(next);
                      setAiFields((prev) => new Set([...prev, f.key]));
                      persistDraft(next, steps);
                      setAiProposal((p) => p ? { ...p, fields: p.fields.filter((x) => x.key !== f.key) } : null);
                    }}
                  >
                    Apply
                  </button>
                </div>
                {f.current && (
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
                    {f.current}
                  </div>
                )}
                <div style={{ fontSize: 13, color: '#5B21B6', fontWeight: 500 }}>{f.proposed}</div>
              </div>
            ))}

            {/* Proposed checklist steps */}
            {aiProposal.steps.length > 0 && (
              <div style={{
                background: '#fff', border: '1px solid #DDD6FE',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Checklist steps ({aiProposal.steps.length})
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#7C3AED', color: '#fff', border: 'none', fontSize: 12 }}
                    disabled={applyingSteps}
                    onClick={() => {
                      setApplyingSteps(true);
                      onApplyProposedSteps?.(aiProposal.steps)
                        .then(() => setAiProposal((p) => p ? { ...p, steps: [] } : null))
                        .finally(() => setApplyingSteps(false));
                    }}
                  >
                    {applyingSteps ? <Spinner size={12} /> : 'Add to checklist'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {aiProposal.steps.map((step, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#5B21B6', display: 'flex', gap: 8 }}>
                      <span style={{ color: '#A78BFA', flexShrink: 0 }}>{i + 1}.</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiProposal.fields.length === 0 && aiProposal.steps.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: 8 }}>
                No changes to suggest — content looks up to date.
              </div>
            )}
          </div>
        </div>
      )}
      {analyzeError && (
        <div style={{ fontSize: 13, color: '#DC2626', background: '#FEF2F2',
          borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
          {analyzeError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">
            Title <span style={{ color: 'var(--accent)' }}>*</span>
            {aiFields.has('title') && AI_BADGE}
          </label>
          <input className="form-input" value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Introduction to DTT"
            autoFocus={!isCreate}
            style={aiFields.has('title') ? { borderColor: '#A78BFA' } : {}} />
          <SimilarityWarning value={form.title} existing={otherTitles} />
        </div>
        <div className="form-group">
          <label className="form-label">Domain</label>
          <select className="form-select form-input" value={form.domain_id}
            onChange={handleDomainChange}>
            <option value="">— No domain —</option>
            {localDomains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            <option value="__new__">+ Create new domain…</option>
          </select>
          {creatingDomain && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input ref={newDomainInputRef} className="form-input" style={{ flex: 1 }}
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmNewDomain();
                    if (e.key === 'Escape') { setCreatingDomain(false); setNewDomainName(''); }
                  }}
                  placeholder="Domain name…" />
                <button className="btn btn-primary btn-sm" disabled={!newDomainName.trim() || domainSaving}
                  onClick={confirmNewDomain}>
                  {domainSaving ? <Spinner size={14} /> : 'Add'}
                </button>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => { setCreatingDomain(false); setNewDomainName(''); }}>
                  Cancel
                </button>
              </div>
              <SimilarityWarning value={newDomainName} existing={localDomains.map((d) => d.name)} />
            </div>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Objective {aiFields.has('objective') && AI_BADGE}
        </label>
        <input className="form-input" value={form.objective}
          onChange={(e) => set('objective', e.target.value)}
          placeholder="What learners will know or be able to do"
          style={aiFields.has('objective') ? { borderColor: '#A78BFA' } : {}} />
      </div>

      <div className="form-group">
        <label className="form-label">
          Why it matters {aiFields.has('why_it_matters') && AI_BADGE}
        </label>
        <textarea className="form-textarea" value={form.why_it_matters}
          onChange={(e) => set('why_it_matters', e.target.value)}
          placeholder="Explain the relevance and importance of this skill..." rows={3}
          style={aiFields.has('why_it_matters') ? { borderColor: '#A78BFA' } : {}} />
      </div>

      <div className="form-group">
        <label className="form-label">
          Context note for learner {aiFields.has('context_note') && AI_BADGE}
        </label>
        <textarea className="form-textarea" value={form.context_note}
          onChange={(e) => set('context_note', e.target.value)}
          placeholder="Optional: explain why this module appears at this moment."
          rows={2}
          style={aiFields.has('context_note') ? { borderColor: '#A78BFA' } : {}} />
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
          Shown to the learner when this module is delivered. Leave blank to hide.
        </span>
      </div>


      {isCreate && (
        <div className="form-group">
          <label className="form-label">
            Steps {aiFields.has('steps') && AI_BADGE}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8 }}>
              Learners check these off to complete the module
            </span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', width: 22, flexShrink: 0, textAlign: 'right' }}>{i + 1}.</span>
                <input
                  className="form-input"
                  value={step}
                  onChange={(e) => {
                    const next = [...steps]; next[i] = e.target.value;
                    setStepsAndSave(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); setStepsAndSave([...steps, '']); }
                  }}
                  placeholder={`Step ${i + 1}`}
                  style={{ flex: 1, ...(aiFields.has('steps') ? { borderColor: '#A78BFA' } : {}) }}
                  autoFocus={i === steps.length - 1 && step === ''}
                />
                <button type="button" className="btn btn-ghost btn-icon"
                  onClick={() => setStepsAndSave(steps.filter((_, j) => j !== i))}
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => setStepsAndSave([...steps, ''])}
              style={{ alignSelf: 'flex-start', color: 'var(--accent)', marginTop: 2 }}>
              + Add step
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
        {draftSavedAt && (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Draft saved {draftSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={!form.title.trim() || saving}
          onClick={() => {
            const validSteps = steps.map((s) => s.trim()).filter(Boolean);
            clearDraft();
            onSave({
              title: form.title.trim(),
              domain_id: form.domain_id || null,
              objective: form.objective.trim() || null,
              why_it_matters: form.why_it_matters.trim() || null,
              context_note: form.context_note.trim() || null,
              what_to_do: form.what_to_do.trim() || null,
            }, validSteps);
          }}>
          {saving ? <Spinner size={16} /> : (initial?.id ? 'Save changes' : 'Create module')}
        </button>
      </div>
    </div>
  );
}

// ─── Checklist sub-editor ────────────────────────────────────────────────────
function ChecklistSection({ moduleId, autoItems, refreshKey }: { moduleId: string; autoItems?: string[]; refreshKey?: number }) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemLabel, setNewItemLabel] = useState<Record<string, string>>({});
  const [bulkText, setBulkText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const autoCreated = useRef(false);

  useEffect(() => {
    setLoading(true);
    checklistsApi.listByModule(moduleId).then(async (loaded) => {
      if (autoItems?.length && !autoCreated.current && loaded.length === 0) {
        autoCreated.current = true;
        try {
          const t = await checklistsApi.createTemplate(moduleId, { title: 'Completion Checklist' });
          const items = await Promise.all(
            autoItems.map((label, i) =>
              checklistsApi.addItem(t.id, { label, item_type: 'checkbox', is_required: true, display_order: i })
            )
          );
          setTemplates([{ ...t, items }]);
          return;
        } catch {}
      }
      setTemplates(loaded);
    }).finally(() => setLoading(false));
  }, [moduleId, refreshKey]);

  const getOrCreateTemplate = async () => {
    if (templates.length > 0) return templates[0];
    const t = await checklistsApi.createTemplate(moduleId, { title: 'Completion Checklist' });
    setTemplates([{ ...t, items: [] }]);
    return t;
  };

  const addItem = async (templateId: string) => {
    const label = newItemLabel[templateId]?.trim();
    if (!label) return;
    const item = await checklistsApi.addItem(templateId, {
      label, item_type: 'checkbox', is_required: true,
      display_order: templates.find((t) => t.id === templateId)?.items.length ?? 0,
    });
    setTemplates((prev) => prev.map((t) =>
      t.id === templateId ? { ...t, items: [...(t.items || []), item] } : t));
    setNewItemLabel((p) => ({ ...p, [templateId]: '' }));
  };

  const bulkAdd = async () => {
    const lines = bulkText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return;
    setBulkSaving(true);
    try {
      const t = await getOrCreateTemplate();
      const existingCount = t.items?.length ?? 0;
      const items = await Promise.all(
        lines.map((label, i) =>
          checklistsApi.addItem(t.id, { label, item_type: 'checkbox', is_required: true, display_order: existingCount + i })
        )
      );
      setTemplates((prev) => prev.map((x) =>
        x.id === t.id ? { ...x, items: [...(x.items || []), ...items] } : x
      ));
      setBulkText('');
    } finally {
      setBulkSaving(false);
    }
  };

  const removeItem = async (templateId: string, itemId: string) => {
    await checklistsApi.deleteItem(itemId);
    setTemplates((prev) => prev.map((t) =>
      t.id === templateId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t));
  };

  if (loading) return <div style={{ padding: 16 }}><Spinner size={16} /></div>;

  const hasItems = templates.some((t) => t.items?.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Existing items */}
      {templates.map((t) => (
        <div key={t.id}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {(t.items || []).map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', background: 'var(--surface-2)',
                borderRadius: 'var(--radius-md)', fontSize: 14 }}>
                <span style={{ fontSize: 16, color: 'var(--text-tertiary)' }}>☐</span>
                <span style={{ flex: 1, color: 'var(--text-primary)' }}>{item.label}</span>
                <button className="btn btn-ghost btn-icon"
                  style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '4px 8px' }}
                  onClick={() => removeItem(t.id, item.id)}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" style={{ flex: 1 }}
              value={newItemLabel[t.id] ?? ''}
              onChange={(e) => setNewItemLabel((p) => ({ ...p, [t.id]: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addItem(t.id)}
              placeholder="Add a step…" />
            <button className="btn btn-secondary btn-sm" onClick={() => addItem(t.id)}>Add</button>
          </div>
        </div>
      ))}

      {/* Bulk add — shown when no items exist yet */}
      {!hasItems && (
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Paste your steps — one per line
          </div>
          <textarea
            className="form-textarea"
            rows={5}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"Review case file\nContact family\nPrepare data sheets\n…"}
            style={{ marginBottom: 10, fontSize: 13 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary btn-sm"
              disabled={!bulkText.trim() || bulkSaving}
              onClick={bulkAdd}
            >
              {bulkSaving ? <Spinner size={13} /> : 'Save checklist'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminModules() {
  const [modules, setModules] = useState<ModuleSkill[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pendingSmartMedia, setPendingSmartMedia] = useState<PendingMedia | null>(null);
  const [justCreated, setJustCreated] = useState(false);
  const [checklistRefreshKey, setChecklistRefreshKey] = useState(0);
  const [panel, setPanel] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<ModuleSkill | null>(null);
  const [editingMedia, setEditingMedia] = useState<{ id: string; title: string | null; url: string; mime_type: string }[]>([]);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [filterDomain, setFilterDomain] = useState('');
  const [expandedIssues, setExpandedIssues] = useState<string | null>(null);

  const getIssues = (mod: ModuleSkill): string[] => {
    const issues: string[] = [];
    if (!mod.domain_id) issues.push('No domain assigned');
    if (!mod.objective) issues.push('Missing objective');
    if (mod.checklist_count === 0) issues.push('No completion checklist');
    if (mod.media_count === 0) issues.push('No media attached');
    return issues;
  };

  const load = () => Promise.all([
    moduleSkillsApi.list(filterDomain || undefined),
    domainsApi.list(),
  ]).then(([mods, doms]) => { setModules(mods); setDomains(doms); })
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, [filterDomain]);

  // Load existing media when edit panel opens so uploads persist across sessions
  useEffect(() => {
    if (panel === 'edit' && editing?.id) {
      moduleSkillsApi.get(editing.id).then((full) => setEditingMedia(full.media ?? []));
    } else {
      setEditingMedia([]);
    }
  }, [panel, editing?.id]);

  const refreshEditingMedia = async () => {
    if (!editing?.id) return;
    const full = await moduleSkillsApi.get(editing.id);
    setEditingMedia(full.media ?? []);
    setModules((prev) => prev.map((m) =>
      m.id === editing.id ? { ...m, media_count: full.media?.length ?? 0 } : m
    ));
  };

  const closePanel = () => { setPanel(null); setEditing(null); setJustCreated(false); };

  const handleCreate = async (d: Record<string, unknown>, steps: string[]) => {
    setSaving(true); setError('');
    try {
      const created = await moduleSkillsApi.create(d) as ModuleSkill;
      setModules((prev) => [...prev, created]);
      // Create checklist with steps passed directly — avoids stale-closure bug with state
      if (steps.length) {
        const t = await checklistsApi.createTemplate(created.id, { title: 'Completion Checklist' });
        await Promise.all(
          steps.map((label, i) =>
            checklistsApi.addItem(t.id, { label, item_type: 'checkbox', is_required: true, display_order: i })
          )
        );
        setModules((prev) => prev.map((m) => m.id === created.id ? { ...m, checklist_count: 1 } : m));
      }
      // Attach smart fill file as media in background (non-critical)
      if (pendingSmartMedia) {
        const pm = pendingSmartMedia;
        setPendingSmartMedia(null);
        analyzeApi.registerMedia(pm.key, created.id, pm.originalName, pm.mimeType).catch(() => {});
      }
      closePanel();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err as Error)?.message ?? 'Could not create module.';
      setError(msg);
    } finally { setSaving(false); }
  };

  const handleEdit = async (d: Record<string, unknown>, _steps: string[]) => {
    if (!editing) return;
    setSaving(true); setError('');
    try {
      const updated = await moduleSkillsApi.update(editing.id, d);
      // PATCH RETURNING * has no domain join — restore domain_name from local domains list
      const domain = domains.find((dom) => dom.id === updated.domain_id);
      setModules((prev) => prev.map((m) =>
        m.id === editing.id ? { ...m, ...updated, domain_name: domain?.name ?? null } : m
      ));
      closePanel();
    } catch { setError('Could not update module.'); }
    finally { setSaving(false); }
  };

  const handleApplyProposedSteps = async (steps: string[]) => {
    if (!editing) return;
    const templates = await checklistsApi.listByModule(editing.id);
    let templateId: string;
    if (templates.length > 0) {
      templateId = templates[0].id;
    } else {
      const t = await checklistsApi.createTemplate(editing.id, { title: 'Completion Checklist' });
      templateId = t.id;
    }
    const existing: ChecklistTemplate[] = templates;
    const existingCount = existing.length > 0 ? (existing[0].items?.length ?? 0) : 0;
    for (let i = 0; i < steps.length; i++) {
      await checklistsApi.addItem(templateId, {
        label: steps[i], item_type: 'checkbox', is_required: true, display_order: existingCount + i,
      });
    }
    setChecklistRefreshKey((k) => k + 1);
  };

  const handleDuplicate = async (mod: ModuleSkill) => {
    setDuplicating(mod.id);
    try {
      const created = await moduleSkillsApi.create({
        title: `Copy of ${mod.title}`,
        domain_id: mod.domain_id,
        objective: mod.objective,
        why_it_matters: mod.why_it_matters,
        context_note: mod.context_note,
        what_to_do: mod.what_to_do,
      });
      setModules((prev) => [...prev, created]);
      setEditing(created);
      setPanel('edit');
    } catch { setError('Could not duplicate module.'); }
    finally { setDuplicating(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this module? It will no longer appear in new roadmaps.')) return;
    try {
      await moduleSkillsApi.delete(id);
      setModules((prev) => prev.filter((m) => m.id !== id));
    } catch { setError('Could not delete module.'); }
  };

  const moduleTitles = modules.map((m) => m.title);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Module Library"
        subtitle="Reusable training skills grouped by domain"
        action={
          <button className="btn btn-primary" onClick={() => setPanel('create')}>
            + New module
          </button>
        }
      />

      {error && <div style={{ marginBottom: 16 }}><Alert type="error">{error}</Alert></div>}

      {/* Domain filter */}
      {domains.length > 0 && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${!filterDomain ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterDomain('')}>All</button>
          {domains.map((d) => (
            <button key={d.id}
              className={`btn btn-sm ${filterDomain === d.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterDomain(d.id)}>{d.name}</button>
          ))}
        </div>
      )}

      {modules.length === 0 ? (
        <EmptyState icon="⊟" title="No modules yet"
          description="Create reusable module skills to add to your roadmaps."
          action={<button className="btn btn-primary" onClick={() => setPanel('create')}>Create first module</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {modules.map((mod) => (
            <div key={mod.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{mod.title}</div>
                    {getIssues(mod).length > 0 && (
                      <button
                        onClick={() => setExpandedIssues(expandedIssues === mod.id ? null : mod.id)}
                        title="Incomplete — click for details"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                          fontSize: 15, lineHeight: 1, color: '#D97706',
                        }}
                      >⚠</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {mod.domain_name && (
                      <span style={{ fontSize: 12, color: 'var(--accent-dark)',
                        background: 'var(--accent-light)', padding: '2px 8px',
                        borderRadius: 'var(--radius-full)' }}>{mod.domain_name}</span>
                    )}
                    {mod.objective && (
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 300 }}>{mod.objective}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {mod.checklist_count > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>✓ Checklist</span>
                  )}
                  <button className="btn btn-secondary btn-sm"
                    disabled={duplicating === mod.id}
                    onClick={() => handleDuplicate(mod)}
                    title="Duplicate this module">
                    {duplicating === mod.id ? <Spinner size={12} /> : '⎘ Duplicate'}
                  </button>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => setPreviewing(mod.id)}
                    title="Preview as learner">Preview</button>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => { setEditing(mod); setPanel('edit'); }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(mod.id)}>Archive</button>
                </div>
              </div>

              {expandedIssues === mod.id && getIssues(mod).length > 0 && (
                <div style={{
                  borderTop: '1px solid #FDE68A',
                  background: '#FFFBEB',
                  padding: '10px 20px',
                  display: 'flex', gap: 16, flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginRight: 4 }}>
                    Incomplete:
                  </span>
                  {getIssues(mod).map((issue) => (
                    <span key={issue} style={{
                      fontSize: 12, color: '#92400E',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ color: '#D97706' }}>·</span> {issue}
                    </span>
                  ))}
                  <button
                    className="btn btn-sm"
                    style={{ marginLeft: 'auto', background: '#D97706', color: '#fff', border: 'none', fontSize: 12 }}
                    onClick={() => { setEditing(mod); setPanel('edit'); setExpandedIssues(null); }}
                  >
                    Fix in Edit →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create panel */}
      <SlideOver isOpen={panel === 'create'} onClose={closePanel} title="New module skill">
        {error && (
          <div style={{ marginBottom: 16, fontSize: 13, color: '#DC2626', background: '#FEF2F2',
            borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
            {error}
          </div>
        )}
        <ModuleEditor domains={domains} onSave={handleCreate}
          onCancel={closePanel} saving={saving}
          existingTitles={moduleTitles}
          onDomainCreated={(d) => setDomains((prev) => [...prev, d])}
          onPendingMedia={setPendingSmartMedia} />
      </SlideOver>

      {/* Edit panel */}
      <SlideOver isOpen={panel === 'edit'} onClose={closePanel} title="Edit module skill">
        {justCreated && (
          <div style={{ marginBottom: 16, fontSize: 13, color: '#15803D', background: '#F0FDF4',
            borderRadius: 'var(--radius-md)', padding: '10px 14px', border: '1px solid #BBF7D0',
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <span><strong>Module created.</strong> Your steps were saved as the checklist. Add media below, then close when done.</span>
          </div>
        )}
        {error && (
          <div style={{ marginBottom: 16, fontSize: 13, color: '#DC2626', background: '#FEF2F2',
            borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
            {error}
          </div>
        )}
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <ModuleEditor initial={editing} domains={domains} onSave={handleEdit}
              onCancel={closePanel} saving={saving}
              existingTitles={moduleTitles}
              onDomainCreated={(d) => setDomains((prev) => [...prev, d])}
              onPendingMedia={(pm) => {
                analyzeApi.registerMedia(pm.key, editing.id, pm.originalName, pm.mimeType).catch(() => {});
              }}
              onApplyProposedSteps={handleApplyProposedSteps} />

            <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 8, paddingTop: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                Supplementary materials
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 14 }}>
                Additional files learners can reference — separate from any AI-analyzed content above.
              </div>
              <MediaUpload moduleId={editing.id} existingMedia={editingMedia} onUploaded={refreshEditingMedia} />
            </div>
            <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 8, paddingTop: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>
                Completion checklist
              </div>
              <ChecklistSection moduleId={editing.id} refreshKey={checklistRefreshKey} />
            </div>
          </div>
        )}
      </SlideOver>

      {previewing && createPortal(
        <ModulePreviewDrawer moduleId={previewing} onClose={() => setPreviewing(null)} />,
        document.body
      )}
    </div>
  );
}
