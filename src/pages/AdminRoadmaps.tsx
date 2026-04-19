import React, { useEffect, useState } from 'react';
import { roadmapsApi, domainsApi, moduleSkillsApi } from '../lib/api';
import { PageHeader, EmptyState, Spinner, Alert } from '../components/ui';

interface Roadmap {
  id: string; title: string; target_audience: string | null;
  duration_label: string | null; module_count: number; is_active: boolean;
}
interface Domain { id: string; name: string; display_order: number; }
interface ModuleSkill { id: string; title: string; domain_id: string | null; domain_name: string | null; }
interface GridModule {
  id: string; module_skill_id: string; title: string;
  week_number: number; module_domain_id: string | null; domain_name: string | null;
}

const MAX_PER_WEEK = 4;
const MIN_WEEKS = 6;
const COL_W = 165;
const WEEK_W = 68;

function ModuleChip({ mod, repeatCount, onRemove, onDragStart }: {
  mod: GridModule; repeatCount: number;
  onRemove: () => void; onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable onDragStart={onDragStart}
      onDoubleClick={(e) => { e.stopPropagation(); onRemove(); }}
      title="Drag to move · Double-click to remove"
      style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: 7,
        padding: '5px 8px', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
        cursor: 'grab', userSelect: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'flex-start', gap: 4,
      }}
    >
      <span style={{ flex: 1, lineHeight: 1.35 }}>{mod.title}</span>
      {repeatCount > 1 && (
        <span style={{
          background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700,
          borderRadius: 10, padding: '1px 5px', flexShrink: 0, marginTop: 1,
        }}>{repeatCount}×</span>
      )}
    </div>
  );
}

function ModulePicker({ domainId, domainName, modules, onPick, onClose }: {
  domainId: string | null; domainName: string;
  modules: ModuleSkill[]; onPick: (m: ModuleSkill) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = modules.filter((m) =>
    (domainId === null || m.domain_id === domainId) &&
    m.title.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        width: 340, maxHeight: 420, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Add to Week — {domainName}</div>
          <input className="form-input" style={{ fontSize: 13 }} autoFocus
            placeholder="Search modules…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>No modules found</div>
            : filtered.map((m) => (
              <button key={m.id} onClick={() => onPick(m)} style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: '1px solid var(--border-light)', cursor: 'pointer',
              }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.title}</div>
                {m.domain_name && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{m.domain_name}</div>}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

function RoadmapGrid({ roadmap, onBack }: { roadmap: Roadmap; onBack: () => void }) {
  const [gridModules, setGridModules] = useState<GridModule[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [library, setLibrary] = useState<ModuleSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekCount, setWeekCount] = useState(MIN_WEEKS);
  const [picker, setPicker] = useState<{ week: number; domainId: string | null; domainName: string } | null>(null);
  const [dragSource, setDragSource] = useState<{ rmId: string } | null>(null);
  const [dragTarget, setDragTarget] = useState<{ week: number; domainId: string | null } | null>(null);
  const [libraryDrag, setLibraryDrag] = useState<ModuleSkill | null>(null);

  useEffect(() => {
    Promise.all([roadmapsApi.get(roadmap.id), domainsApi.list(), moduleSkillsApi.list()])
      .then(([rm, doms, mods]) => {
        const mList: GridModule[] = (rm.modules || []).map((m: Record<string, unknown>) => ({
          id: m.id as string,
          module_skill_id: m.module_skill_id as string,
          title: m.title as string,
          week_number: (m.week_number as number) || 1,
          module_domain_id: (m.module_domain_id as string | null) ?? null,
          domain_name: (m.domain_name as string | null) ?? null,
        }));
        setGridModules(mList);
        setDomains((doms as Domain[]).sort((a, b) => a.display_order - b.display_order));
        setLibrary(mods as ModuleSkill[]);
        const maxWeek = mList.length ? Math.max(...mList.map((m) => m.week_number)) : 0;
        setWeekCount(Math.max(MIN_WEEKS, maxWeek + 2));
      }).finally(() => setLoading(false));
  }, [roadmap.id]);

  const columns: { id: string | null; name: string }[] = [
    ...domains.map((d) => ({ id: d.id, name: d.name })),
    { id: null, name: 'No domain' },
  ];
  const weeks = Array.from({ length: weekCount }, (_, i) => i + 1);
  const modulesPerWeek = (w: number) => gridModules.filter((m) => m.week_number === w).length;
  const repeatCount = (skillId: string) => gridModules.filter((m) => m.module_skill_id === skillId).length;
  const usedSkillIds = new Set(gridModules.map((m) => m.module_skill_id));
  const unassigned = library.filter((m) => !usedSkillIds.has(m.id));

  const addModule = async (mod: ModuleSkill, week: number) => {
    setPicker(null);
    try {
      const created = await roadmapsApi.addModule(roadmap.id, {
        module_skill_id: mod.id, week_number: week,
        display_order: modulesPerWeek(week), release_rule: 'immediate',
      });
      setGridModules((prev) => [...prev, {
        id: created.id, module_skill_id: created.module_skill_id,
        title: created.title || mod.title, week_number: created.week_number || week,
        module_domain_id: created.module_domain_id ?? mod.domain_id,
        domain_name: created.domain_name ?? mod.domain_name,
      }]);
    } catch { setError('Could not add module.'); }
  };

  const removeModule = async (rmId: string) => {
    if (!confirm('Remove this module from the roadmap?')) return;
    try {
      await roadmapsApi.removeModule(roadmap.id, rmId);
      setGridModules((prev) => prev.filter((m) => m.id !== rmId));
    } catch { setError('Could not remove module.'); }
  };

  const moveModule = async (rmId: string, toWeek: number) => {
    setGridModules((prev) => prev.map((m) => m.id === rmId ? { ...m, week_number: toWeek } : m));
    setDragSource(null); setDragTarget(null); setLibraryDrag(null);
    try { await roadmapsApi.updateModule(roadmap.id, rmId, { week_number: toWeek }); }
    catch { setError('Could not move module.'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 3 }}>{roadmap.title}</h2>
          {roadmap.target_audience && <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>For: {roadmap.target_audience}</div>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back to list</button>
      </div>

      {error && <div style={{ marginBottom: 12 }}><Alert type="error">{error}</Alert></div>}

      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
        Click any cell to add · Drag to reposition · Double-click a module to remove · {MAX_PER_WEEK} modules per week max
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: WEEK_W + columns.length * COL_W }}>
          <thead>
            <tr>
              <th style={{
                width: WEEK_W, padding: '10px 12px', background: 'var(--surface-2)',
                borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)',
                fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700,
                textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Week</th>
              {columns.map((col) => (
                <th key={col.id ?? '_null'} style={{
                  padding: '10px 14px', background: 'var(--surface-2)',
                  borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border-light)',
                  fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left',
                }}>{col.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => {
              const total = modulesPerWeek(week);
              const over = total > MAX_PER_WEEK;
              return (
                <tr key={week}>
                  <td style={{
                    padding: '8px 10px', borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border-light)', verticalAlign: 'top',
                    background: over ? '#FEF3C7' : 'var(--surface-2)',
                    fontSize: 13, fontWeight: 600,
                    color: over ? '#92400E' : 'var(--text-secondary)',
                  }}>
                    <div>{week}</div>
                    {over && <div style={{ fontSize: 10, color: '#D97706', marginTop: 3, fontWeight: 700 }}>⚠ {total}</div>}
                  </td>
                  {columns.map((col) => {
                    const cellMods = gridModules.filter(
                      (m) => m.week_number === week && m.module_domain_id === col.id
                    );
                    const isTarget = dragTarget?.week === week && dragTarget?.domainId === col.id;
                    return (
                      <td key={col.id ?? '_null'}
                        onClick={() => { if (!dragSource && !libraryDrag) setPicker({ week, domainId: col.id, domainName: col.name }); }}
                        onDragOver={(e) => { e.preventDefault(); setDragTarget({ week, domainId: col.id }); }}
                        onDragLeave={() => setDragTarget(null)}
                        onDrop={(e) => {
                          e.preventDefault(); setDragTarget(null);
                          if (libraryDrag) { addModule(libraryDrag, week); setLibraryDrag(null); }
                          else if (dragSource) moveModule(dragSource.rmId, week);
                        }}
                        style={{
                          padding: 6, verticalAlign: 'top', cursor: 'pointer',
                          borderRight: '1px solid var(--border-light)',
                          borderBottom: '1px solid var(--border-light)',
                          background: isTarget ? 'var(--accent-light)' : over ? '#FFFBEB' : 'transparent',
                          transition: 'background 100ms', minWidth: COL_W,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 68 }}>
                          {cellMods.map((mod) => (
                            <ModuleChip key={mod.id} mod={mod} repeatCount={repeatCount(mod.module_skill_id)}
                              onRemove={() => removeModule(mod.id)}
                              onDragStart={(e) => { e.stopPropagation(); setDragSource({ rmId: mod.id }); }}
                            />
                          ))}
                          {cellMods.length === 0 && !isTarget && (
                            <div style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 20, color: 'var(--border)' }}>+</span>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, color: 'var(--text-tertiary)' }}
        onClick={() => setWeekCount((w) => w + 4)}>+ Add 4 weeks</button>

      {unassigned.length > 0 && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Unassigned modules
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8 }}>drag onto the grid to place</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {unassigned.map((mod) => (
              <div key={mod.id} draggable
                onDragStart={() => setLibraryDrag(mod)}
                onDragEnd={() => setLibraryDrag(null)}
                style={{
                  background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '6px 12px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                  cursor: 'grab', userSelect: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  opacity: libraryDrag?.id === mod.id ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                {mod.title}
                {mod.domain_name && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{mod.domain_name}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {picker && (
        <ModulePicker domainId={picker.domainId} domainName={picker.domainName}
          modules={library} onPick={(m) => addModule(m, picker.week)} onClose={() => setPicker(null)} />
      )}
    </div>
  );
}

export default function AdminRoadmaps() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Roadmap | null>(null);

  useEffect(() => { roadmapsApi.list().then(setRoadmaps).finally(() => setLoading(false)); }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const created = await roadmapsApi.create({ title: newTitle.trim(), target_audience: newAudience.trim() || null, is_active: true });
      const rm = { ...created, module_count: 0 };
      setRoadmaps((prev) => [rm, ...prev]);
      setSelected(rm);
      setCreating(false); setNewTitle(''); setNewAudience('');
    } catch { setError('Could not create roadmap.'); }
    finally { setSaving(false); }
  };

  if (selected) return <RoadmapGrid roadmap={selected} onBack={() => setSelected(null)} />;
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>;

  return (
    <div className="animate-fade-up">
      <PageHeader title="Roadmaps" subtitle="Training sequences assigned to learners"
        action={<button className="btn btn-primary" onClick={() => setCreating(true)}>+ New roadmap</button>} />

      {error && <div style={{ marginBottom: 16 }}><Alert type="error">{error}</Alert></div>}

      {creating && (
        <div className="card card-padded" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="form-input" autoFocus placeholder="Roadmap title…" value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
            <input className="form-input" placeholder="Target audience (e.g. BCBA, BT)…"
              value={newAudience} onChange={(e) => setNewAudience(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" disabled={!newTitle.trim() || saving}
                onClick={handleCreate}>{saving ? <Spinner size={14} /> : 'Create'}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {roadmaps.length === 0 && !creating ? (
        <EmptyState icon="⟶" title="No roadmaps yet"
          description="Create a roadmap and build a weekly training grid for your learners."
          action={<button className="btn btn-primary" onClick={() => setCreating(true)}>Create first roadmap</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {roadmaps.map((rm) => (
            <div key={rm.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{rm.title}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-tertiary)' }}>
                  {rm.target_audience && <span>For: {rm.target_audience}</span>}
                  <span>{rm.module_count} module{rm.module_count !== 1 ? 's' : ''}</span>
                  {rm.module_count === 0 && <span style={{ color: '#D97706' }}>⚠ No modules yet</span>}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setSelected(rm)}>Build →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
