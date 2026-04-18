import React, { useEffect, useState } from 'react';
import { moduleSkillsApi, domainsApi, checklistsApi } from '../lib/api';
import { Modal, EmptyState, PageHeader, Alert, Spinner, StatusBadge } from '../components/ui';

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

// ─── Module Editor form ───────────────────────────────────────────────────────
function ModuleEditor({
  initial, domains, onSave, onCancel, saving,
}: {
  initial?: Partial<ModuleSkill>;
  domains: Domain[];
  onSave: (d: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    domain_id: initial?.domain_id ?? '',
    objective: initial?.objective ?? '',
    why_it_matters: initial?.why_it_matters ?? '',
    context_note: initial?.context_note ?? '',
    what_to_do: initial?.what_to_do ?? '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Title <span style={{ color: 'var(--accent)' }}>*</span></label>
          <input className="form-input" value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Introduction to DTT" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Domain</label>
          <select className="form-select form-input" value={form.domain_id}
            onChange={(e) => set('domain_id', e.target.value)}>
            <option value="">— No domain —</option>
            {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Objective</label>
        <input className="form-input" value={form.objective}
          onChange={(e) => set('objective', e.target.value)}
          placeholder="What learners will know or be able to do" />
      </div>

      <div className="form-group">
        <label className="form-label">Why it matters</label>
        <textarea className="form-textarea" value={form.why_it_matters}
          onChange={(e) => set('why_it_matters', e.target.value)}
          placeholder="Explain the relevance and importance of this skill..." rows={3} />
      </div>

      {/* context_note — exact label and placeholder per spec */}
      <div className="form-group">
        <label className="form-label">Context note for learner</label>
        <textarea className="form-textarea" value={form.context_note}
          onChange={(e) => set('context_note', e.target.value)}
          placeholder="Optional: explain why this module appears at this moment."
          rows={2} />
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
          Shown to the learner when this module is delivered. Leave blank to hide.
        </span>
      </div>

      <div className="form-group">
        <label className="form-label">What to do</label>
        <textarea className="form-textarea" value={form.what_to_do}
          onChange={(e) => set('what_to_do', e.target.value)}
          placeholder="Step-by-step instructions or action items..." rows={3} />
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
function ChecklistSection({ moduleId }: { moduleId: string }) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemLabel, setNewItemLabel] = useState<Record<string, string>>({});

  useEffect(() => {
    checklistsApi.listByModule(moduleId).then(setTemplates).finally(() => setLoading(false));
  }, [moduleId]);

  const createTemplate = async () => {
    const t = await checklistsApi.createTemplate(moduleId, { title: 'Completion Checklist' });
    setTemplates((prev) => [...prev, t]);
  };

  const addItem = async (templateId: string) => {
    const label = newItemLabel[templateId]?.trim();
    if (!label) return;
    const item = await checklistsApi.addItem(templateId, { label, item_type: 'checkbox', is_required: true, display_order: templates.find(t => t.id === templateId)?.items.length ?? 0 });
    setTemplates((prev) => prev.map((t) => t.id === templateId ? { ...t, items: [...(t.items || []), item] } : t));
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
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<ModuleSkill | null>(null);
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
  const [filterDomain, setFilterDomain] = useState('');

  const load = () => Promise.all([
    moduleSkillsApi.list(filterDomain || undefined),
    domainsApi.list(),
  ]).then(([mods, doms]) => { setModules(mods); setDomains(doms); })
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, [filterDomain]);

  const handleCreate = async (d: Record<string, unknown>) => {
    setSaving(true); setError('');
    try {
      const created = await moduleSkillsApi.create(d);
      setModules((prev) => [...prev, created]);
      setModal(null);
    } catch { setError('Could not create module.'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (d: Record<string, unknown>) => {
    if (!editing) return;
    setSaving(true); setError('');
    try {
      const updated = await moduleSkillsApi.update(editing.id, d);
      setModules((prev) => prev.map((m) => m.id === editing.id ? { ...m, ...updated } : m));
      setModal(null); setEditing(null);
    } catch { setError('Could not update module.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this module? It will no longer appear in new roadmaps.')) return;
    try {
      await moduleSkillsApi.delete(id);
      setModules((prev) => prev.filter((m) => m.id !== id));
    } catch { setError('Could not delete module.'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Module Library"
        subtitle="Reusable training skills grouped by domain"
        action={
          <button className="btn btn-primary" onClick={() => setModal('create')}>
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
          action={<button className="btn btn-primary" onClick={() => setModal('create')}>Create first module</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {modules.map((mod) => (
            <div key={mod.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Module row */}
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
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {mod.checklist_count > 0 && `✓ Checklist`}
                  </span>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => setExpandedChecklist(expandedChecklist === mod.id ? null : mod.id)}>
                    {expandedChecklist === mod.id ? 'Close' : 'Checklist'}
                  </button>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => { setEditing(mod); setModal('edit'); }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(mod.id)}>Archive</button>
                </div>
              </div>

              {/* Inline checklist editor */}
              {expandedChecklist === mod.id && (
                <div style={{ padding: '0 20px 20px',
                  borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
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

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)}
        title="New module skill" width={600}>
        <ModuleEditor domains={domains} onSave={handleCreate}
          onCancel={() => setModal(null)} saving={saving} />
      </Modal>

      <Modal isOpen={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }}
        title="Edit module skill" width={600}>
        {editing && (
          <ModuleEditor initial={editing} domains={domains} onSave={handleEdit}
            onCancel={() => { setModal(null); setEditing(null); }} saving={saving} />
        )}
      </Modal>
    </div>
  );
}
