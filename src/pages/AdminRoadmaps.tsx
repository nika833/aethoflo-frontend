import React, { useEffect, useState, useCallback } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { roadmapsApi, moduleSkillsApi } from '../lib/api';
import { Modal, EmptyState, PageHeader, Alert, Spinner, SimilarityWarning } from '../components/ui';

interface ModuleSkill { id: string; title: string; domain_name: string | null; }
interface RoadmapModule {
  id: string; module_skill_id: string; display_order: number;
  title: string; domain_name: string | null;
  release_rule: string; release_days: number | null; release_date: string | null;
}
interface Roadmap {
  id: string; title: string; description: string | null;
  target_audience: string | null; duration_label: string | null;
  is_active: boolean; module_count: number;
}

// ─── Sortable module row ──────────────────────────────────────────────────────
function SortableModuleRow({
  mod, onUpdateRule, onRemove,
}: {
  mod: RoadmapModule;
  onUpdateRule: (id: string, rule: string, days: number | null, date: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="card" style={{ padding: '12px 16px', display: 'flex',
        alignItems: 'center', gap: 12, marginBottom: 6 }}>
        {/* Drag handle */}
        <div {...attributes} {...listeners}
          style={{ cursor: 'grab', color: 'var(--text-tertiary)', fontSize: 18,
            lineHeight: 1, flexShrink: 0, userSelect: 'none' }}>
          ⠿
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>
            {mod.title}
          </div>
          {mod.domain_name && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{mod.domain_name}</div>
          )}
        </div>

        {/* Release rule selector */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <select
            className="form-select form-input"
            style={{ width: 160, padding: '6px 10px', fontSize: 13 }}
            value={mod.release_rule}
            onChange={(e) => onUpdateRule(mod.id, e.target.value, mod.release_days, mod.release_date)}
          >
            <option value="immediate">Immediate</option>
            <option value="days_offset">After N days</option>
            <option value="after_previous">After previous</option>
            <option value="fixed_date">Fixed date</option>
          </select>

          {mod.release_rule === 'days_offset' && (
            <input type="number" className="form-input" min={1}
              style={{ width: 72, padding: '6px 10px', fontSize: 13 }}
              value={mod.release_days ?? ''}
              onChange={(e) => onUpdateRule(mod.id, mod.release_rule, parseInt(e.target.value) || null, null)}
              placeholder="days"
            />
          )}

          {mod.release_rule === 'fixed_date' && (
            <input type="date" className="form-input"
              style={{ width: 148, padding: '6px 10px', fontSize: 13 }}
              value={mod.release_date ?? ''}
              onChange={(e) => onUpdateRule(mod.id, mod.release_rule, null, e.target.value || null)}
            />
          )}

          <button className="btn btn-ghost btn-icon"
            style={{ color: 'var(--text-tertiary)', fontSize: 16, flexShrink: 0 }}
            onClick={() => onRemove(mod.id)}>✕</button>
        </div>
      </div>
    </div>
  );
}

// ─── Roadmap detail / builder panel ──────────────────────────────────────────
function RoadmapBuilder({
  roadmap, onClose,
}: {
  roadmap: Roadmap;
  onClose: () => void;
}) {
  const [modules, setModules] = useState<RoadmapModule[]>([]);
  const [allModules, setAllModules] = useState<ModuleSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    Promise.all([
      roadmapsApi.get(roadmap.id),
      moduleSkillsApi.list(),
    ]).then(([r, mods]) => {
      setModules(r.modules ?? []);
      setAllModules(mods);
    }).finally(() => setLoading(false));
  }, [roadmap.id]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(modules, oldIndex, newIndex);
    const withOrder = reordered.map((m, i) => ({ ...m, display_order: i }));
    setModules(withOrder);

    try {
      await roadmapsApi.reorderModules(roadmap.id,
        withOrder.map((m) => ({ id: m.id, display_order: m.display_order })));
    } catch { setError('Reorder failed. Please try again.'); }
  }, [modules, roadmap.id]);

  const handleAddModule = async () => {
    if (!addingId) return;
    setSaving(true);
    try {
      const newMod = await roadmapsApi.addModule(roadmap.id, {
        module_skill_id: addingId,
        display_order: modules.length,
        release_rule: 'immediate',
      });
      const skill = allModules.find((m) => m.id === addingId);
      setModules((prev) => [...prev, { ...newMod, title: skill?.title ?? '', domain_name: skill?.domain_name ?? null }]);
      setAddingId('');
    } catch { setError('Could not add module.'); }
    finally { setSaving(false); }
  };

  const handleUpdateRule = async (modId: string, rule: string, days: number | null, date: string | null) => {
    setModules((prev) => prev.map((m) =>
      m.id === modId ? { ...m, release_rule: rule, release_days: days, release_date: date } : m));
    try {
      await roadmapsApi.updateModule(roadmap.id, modId, {
        release_rule: rule,
        release_days: days,
        release_date: date,
      });
    } catch { setError('Could not update release rule.'); }
  };

  const handleRemove = async (modId: string) => {
    setModules((prev) => prev.filter((m) => m.id !== modId));
    try {
      await roadmapsApi.removeModule(roadmap.id, modId);
    } catch { setError('Could not remove module.'); }
  };

  const unusedModules = allModules.filter(
    (m) => !modules.some((rm) => rm.module_skill_id === m.id)
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={24} /></div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ marginBottom: 2 }}>{roadmap.title}</h3>
          {roadmap.target_audience && (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>For: {roadmap.target_audience}</span>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ color: 'var(--text-tertiary)' }}>
          ← Back to list
        </button>
      </div>

      {error && <div style={{ marginBottom: 14 }}><Alert type="error">{error}</Alert></div>}

      {/* Add module */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 8, padding: '14px 16px',
        background: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)' }}>
        <select className="form-select form-input" style={{ flex: 1 }}
          value={addingId} onChange={(e) => setAddingId(e.target.value)}>
          <option value="">— Select a module to add —</option>
          {unusedModules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.domain_name ? `[${m.domain_name}] ` : ''}{m.title}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" disabled={!addingId || saving}
          onClick={handleAddModule}>
          {saving ? <Spinner size={16} /> : '+ Add'}
        </button>
      </div>

      {/* Drag-drop module list */}
      {modules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
          Add modules above to begin building this roadmap.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            {modules.map((mod) => (
              <SortableModuleRow key={mod.id} mod={mod}
                onUpdateRule={handleUpdateRule} onRemove={handleRemove} />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>
        {modules.length} module{modules.length !== 1 ? 's' : ''} · Drag to reorder
      </div>
    </div>
  );
}

// ─── Roadmap form ─────────────────────────────────────────────────────────────
function RoadmapForm({
  initial, onSave, onCancel, saving, existingTitles,
}: {
  initial?: Partial<Roadmap>;
  onSave: (d: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
  existingTitles: string[];
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    target_audience: initial?.target_audience ?? '',
    duration_label: initial?.duration_label ?? '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const otherTitles = existingTitles.filter((t) => t !== initial?.title);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-group">
        <label className="form-label">Title <span style={{ color: 'var(--accent)' }}>*</span></label>
        <input className="form-input" value={form.title} autoFocus
          onChange={(e) => set('title', e.target.value)} placeholder="e.g. New Staff Onboarding" />
        <SimilarityWarning value={form.title} existing={otherTitles} />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={form.description}
          onChange={(e) => set('description', e.target.value)} rows={2}
          placeholder="Brief description of this roadmap..." />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Target audience</label>
          <input className="form-input" value={form.target_audience}
            onChange={(e) => set('target_audience', e.target.value)}
            placeholder="e.g. New RBTs" />
        </div>
        <div className="form-group">
          <label className="form-label">Duration label</label>
          <input className="form-input" value={form.duration_label}
            onChange={(e) => set('duration_label', e.target.value)}
            placeholder="e.g. 8 weeks" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!form.title.trim() || saving}
          onClick={() => onSave({
            title: form.title.trim(),
            description: form.description.trim() || null,
            target_audience: form.target_audience.trim() || null,
            duration_label: form.duration_label.trim() || null,
          })}>
          {saving ? <Spinner size={16} /> : (initial?.id ? 'Save changes' : 'Create roadmap')}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminRoadmaps() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Roadmap | null>(null);
  const [building, setBuilding] = useState<Roadmap | null>(null);

  const load = () => roadmapsApi.list().then(setRoadmaps).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async (d: Record<string, unknown>) => {
    setSaving(true); setError('');
    try {
      const created = await roadmapsApi.create(d);
      const r = { ...created, module_count: 0 };
      setRoadmaps((prev) => [r, ...prev]);
      setModal(null);
      setBuilding(r);
    } catch { setError('Could not create roadmap.'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (d: Record<string, unknown>) => {
    if (!editing) return;
    setSaving(true); setError('');
    try {
      const updated = await roadmapsApi.update(editing.id, d);
      setRoadmaps((prev) => prev.map((r) => r.id === editing.id ? { ...r, ...updated } : r));
      setModal(null); setEditing(null);
    } catch { setError('Could not update roadmap.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>;

  // Builder view
  if (building) {
    return (
      <div className="animate-fade-up">
        <RoadmapBuilder roadmap={building} onClose={() => { setBuilding(null); load(); }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Roadmaps"
        subtitle="Structured learning paths with sequenced modules"
        action={
          <button className="btn btn-primary" onClick={() => setModal('create')}>
            + New roadmap
          </button>
        }
      />

      {error && <div style={{ marginBottom: 16 }}><Alert type="error">{error}</Alert></div>}

      {roadmaps.length === 0 ? (
        <EmptyState icon="⟶" title="No roadmaps yet"
          description="Create a roadmap to sequence modules into a learning path."
          action={<button className="btn btn-primary" onClick={() => setModal('create')}>Create first roadmap</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {roadmaps.map((r) => (
            <div key={r.id} className="card" style={{ padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)',
                  marginBottom: 2 }}>{r.title}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {r.target_audience && <span>For: {r.target_audience}</span>}
                  {r.duration_label && <span>· {r.duration_label}</span>}
                  <span>· {r.module_count} module{r.module_count !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary btn-sm"
                  onClick={() => setBuilding(r)}>Build →</button>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => { setEditing(r); setModal('edit'); }}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="New roadmap" width={520}>
        <RoadmapForm onSave={handleCreate} onCancel={() => setModal(null)} saving={saving}
          existingTitles={roadmaps.map((r) => r.title)} />
      </Modal>
      <Modal isOpen={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }}
        title="Edit roadmap" width={520}>
        {editing && (
          <RoadmapForm initial={editing} onSave={handleEdit}
            onCancel={() => { setModal(null); setEditing(null); }} saving={saving}
            existingTitles={roadmaps.map((r) => r.title)} />
        )}
      </Modal>
    </div>
  );
}
