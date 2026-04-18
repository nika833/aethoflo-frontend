import React, { useEffect, useRef, useState } from 'react';
import { moduleSkillsApi, domainsApi, checklistsApi, analyzeApi } from '../lib/api';
import { SlideOver, EmptyState, PageHeader, Alert, Spinner, SimilarityWarning } from '../components/ui';
import { MediaUpload } from '../components/MediaUpload';

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
function ModuleEditor({
  initial, domains: initialDomains, onSave, onCancel, saving, onDomainCreated, existingTitles,
  onPendingChecklist,
}: {
  initial?: Partial<ModuleSkill>;
  domains: Domain[];
  onSave: (d: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
  onDomainCreated?: (d: Domain) => void;
  existingTitles: string[];
  onPendingChecklist?: (items: string[]) => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    domain_id: initial?.domain_id ?? '',
    objective: initial?.objective ?? '',
    why_it_matters: initial?.why_it_matters ?? '',
    context_note: initial?.context_note ?? '',
    what_to_do: initial?.what_to_do ?? '',
  });
  const [localDomains, setLocalDomains] = useState<Domain[]>(initialDomains);
  const [creatingDomain, setCreatingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [smartDragging, setSmartDragging] = useState(false);
  const newDomainInputRef = useRef<HTMLInputElement>(null);
  const smartFileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => {
    setAiFields((prev) => { const n = new Set(prev); n.delete(k); return n; });
    setForm((f) => ({ ...f, [k]: v }));
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
    setAnalyzing(true);
    try {
      const s = await analyzeApi.smartFill(file);
      setForm((f) => ({
        title: s.title || f.title,
        domain_id: f.domain_id,
        objective: s.objective || f.objective,
        why_it_matters: s.why_it_matters || f.why_it_matters,
        context_note: s.context_note || f.context_note,
        what_to_do: s.what_to_do || f.what_to_do,
      }));
      setAiFields(new Set(['title', 'objective', 'why_it_matters', 'context_note', 'what_to_do']));
      if (s.checklist_items?.length) onPendingChecklist?.(s.checklist_items);

      // Auto-suggest domain if no domain selected
      if (!form.domain_id && s.domain_suggestion) {
        const match = localDomains.find(
          (d) => d.name.toLowerCase() === s.domain_suggestion!.toLowerCase()
        );
        if (match) setForm((f) => ({ ...f, domain_id: match.id }));
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

      {/* Smart fill — only on create */}
      {isCreate && (
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Spinner size={18} />
              <span style={{ fontSize: 14, color: '#5B21B6', fontWeight: 500 }}>
                Analyzing content… this may take up to a minute for video
              </span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 22, marginBottom: 6 }}>✨</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#5B21B6', marginBottom: 2 }}>
                Smart fill from file
              </div>
              <div style={{ fontSize: 12, color: '#7C3AED' }}>
                Drop a video, audio, PDF, or doc — AI will pre-fill the form below
              </div>
            </>
          )}
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

      <div className="form-group">
        <label className="form-label">
          What to do {aiFields.has('what_to_do') && AI_BADGE}
        </label>
        <textarea className="form-textarea" value={form.what_to_do}
          onChange={(e) => set('what_to_do', e.target.value)}
          placeholder="Step-by-step instructions or action items..." rows={4}
          style={aiFields.has('what_to_do') ? { borderColor: '#A78BFA' } : {}} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!form.title.trim() || saving}
          onClick={() => onSave({
            title: form.title.trim(),
            domain_id: form.domain_id || null,
            objective: form.objective.trim() || null,
            why_it_matters: form.why_it_matters.trim() || null,
            context_note: form.context_note.trim() || null,
            what_to_do: form.what_to_do.trim() || null,
          })}>
          {saving ? <Spinner size={16} /> : (initial?.id ? 'Save changes' : 'Create module')}
        </button>
      </div>
    </div>
  );
}

// ─── Checklist sub-editor ────────────────────────────────────────────────────
function ChecklistSection({ moduleId, autoItems }: { moduleId: string; autoItems?: string[] }) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemLabel, setNewItemLabel] = useState<Record<string, string>>({});
  const autoCreated = useRef(false);

  useEffect(() => {
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
  }, [moduleId]);

  const createTemplate = async () => {
    const t = await checklistsApi.createTemplate(moduleId, { title: 'Completion Checklist' });
    setTemplates((prev) => [...prev, t]);
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

  const removeItem = async (templateId: string, itemId: string) => {
    await checklistsApi.deleteItem(itemId);
    setTemplates((prev) => prev.map((t) =>
      t.id === templateId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t));
  };

  if (loading) return <div style={{ padding: 16 }}><Spinner size={16} /></div>;

  return (
    <div>
      {templates.map((t) => (
        <div key={t.id} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 10 }}>
            {t.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {(t.items || []).map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', background: 'var(--surface-2)',
                borderRadius: 'var(--radius-md)', fontSize: 14 }}>
                <span style={{ flex: 1, color: 'var(--text-primary)' }}>{item.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--surface-3)',
                  padding: '2px 6px', borderRadius: 4 }}>{item.item_type}</span>
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
              placeholder="Add checklist item..." />
            <button className="btn btn-secondary btn-sm" onClick={() => addItem(t.id)}>Add</button>
          </div>
        </div>
      ))}
      {templates.length === 0 && (
        <button className="btn btn-secondary btn-sm" onClick={createTemplate}>
          + Add checklist
        </button>
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
  const [pendingChecklist, setPendingChecklist] = useState<string[]>([]);
  const [panel, setPanel] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<ModuleSkill | null>(null);
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
  const [filterDomain, setFilterDomain] = useState('');

  const load = () => Promise.all([
    moduleSkillsApi.list(filterDomain || undefined),
    domainsApi.list(),
  ]).then(([mods, doms]) => { setModules(mods); setDomains(doms); })
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, [filterDomain]);

  const closePanel = () => { setPanel(null); setEditing(null); };

  const handleCreate = async (d: Record<string, unknown>) => {
    setSaving(true); setError('');
    try {
      const created = await moduleSkillsApi.create(d);
      setModules((prev) => [...prev, created]);
      setEditing(created);
      setPanel('edit');
      // pendingChecklist was set by SmartFill — ChecklistSection will consume it
    } catch { setError('Could not create module.'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (d: Record<string, unknown>) => {
    if (!editing) return;
    setSaving(true); setError('');
    try {
      const updated = await moduleSkillsApi.update(editing.id, d);
      setModules((prev) => prev.map((m) => m.id === editing.id ? { ...m, ...updated } : m));
      closePanel();
    } catch { setError('Could not update module.'); }
    finally { setSaving(false); }
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
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)',
                    marginBottom: 2 }}>{mod.title}</div>
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
                    onClick={() => setExpandedChecklist(expandedChecklist === mod.id ? null : mod.id)}>
                    {expandedChecklist === mod.id ? 'Close' : 'Checklist'}
                  </button>
                  <button className="btn btn-secondary btn-sm"
                    disabled={duplicating === mod.id}
                    onClick={() => handleDuplicate(mod)}
                    title="Duplicate this module">
                    {duplicating === mod.id ? <Spinner size={12} /> : '⎘ Duplicate'}
                  </button>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => { setEditing(mod); setPanel('edit'); }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(mod.id)}>Archive</button>
                </div>
              </div>

              {expandedChecklist === mod.id && (
                <div style={{ padding: '16px 20px 20px',
                  borderTop: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                    Checklist items
                  </div>
                  <ChecklistSection moduleId={mod.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create panel */}
      <SlideOver isOpen={panel === 'create'} onClose={closePanel} title="New module skill">
        <ModuleEditor domains={domains} onSave={handleCreate}
          onCancel={closePanel} saving={saving}
          existingTitles={moduleTitles}
          onDomainCreated={(d) => setDomains((prev) => [...prev, d])}
          onPendingChecklist={setPendingChecklist} />
      </SlideOver>

      {/* Edit panel */}
      <SlideOver isOpen={panel === 'edit'} onClose={closePanel} title="Edit module skill">
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <ModuleEditor initial={editing} domains={domains} onSave={handleEdit}
              onCancel={closePanel} saving={saving}
              existingTitles={moduleTitles}
              onDomainCreated={(d) => setDomains((prev) => [...prev, d])} />
            <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 8, paddingTop: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                Media files
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 14 }}>
                Attach videos, audio, recordings, PDFs, or Word docs learners will see with this module.
              </div>
              <MediaUpload moduleId={editing.id} />
            </div>
            <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 8, paddingTop: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>
                Completion checklist
              </div>
              <ChecklistSection moduleId={editing.id} autoItems={pendingChecklist.length ? pendingChecklist : undefined} />
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
