import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roadmapsApi, domainsApi, moduleSkillsApi } from '../lib/api';
import { PageHeader, EmptyState, Spinner, Alert } from '../components/ui';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  const ampm = i < 12 ? 'AM' : 'PM';
  return { value: i, label: `${h}:00 ${ampm}` };
});

function SchedulePill({ roadmapId, initialDay, initialHour, onSaved }: {
  roadmapId: string;
  initialDay: number | null;
  initialHour: number | null;
  onSaved: (day: number | null, hour: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<number>(initialDay ?? 1);
  const [hour, setHour] = useState<number>(initialHour ?? 9);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hasSchedule = initialDay !== null && initialHour !== null;
  const label = hasSchedule
    ? `⏰ ${DAYS[initialDay!]} · ${HOURS[initialHour!].label}`
    : '⏰ No release schedule';

  const save = async () => {
    setSaving(true);
    try {
      await roadmapsApi.update(roadmapId, { release_day_of_week: day, release_hour: hour });
      onSaved(day, hour);
      setOpen(false);
    } finally { setSaving(false); }
  };

  const clear = async () => {
    setSaving(true);
    try {
      await roadmapsApi.update(roadmapId, { release_day_of_week: null, release_hour: null });
      onSaved(null, null);
      setOpen(false);
    } finally { setSaving(false); }
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 13px', borderRadius: 20,
          border: `1px solid ${hasSchedule ? 'rgba(201,107,71,0.35)' : 'var(--border)'}`,
          background: hasSchedule ? HEADER_BG : 'var(--surface-2)',
          color: hasSchedule ? HEADER_TEXT : 'var(--text-tertiary)',
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          transition: 'all 120ms',
        }}
      >{label}</button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 40,
          background: '#fff', borderRadius: 12,
          boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
          border: '1px solid var(--border-light)',
          padding: 16, width: 240,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Auto-release schedule
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <select className="form-input" style={{ fontSize: 13 }}
              value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <select className="form-input" style={{ fontSize: 13 }}
              value={hour} onChange={(e) => setHour(Number(e.target.value))}>
              {HOURS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12, lineHeight: 1.5 }}>
            Set the day and time modules auto-release to each learner based on their enrollment date.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
              disabled={saving} onClick={save}>
              {saving ? <Spinner size={13} /> : 'Save'}
            </button>
            {hasSchedule && (
              <button className="btn btn-ghost btn-sm" disabled={saving} onClick={clear}
                style={{ color: 'var(--text-tertiary)' }}>
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Roadmap {
  id: string; title: string; target_audience: string | null;
  duration_label: string | null; module_count: number; is_active: boolean;
  release_day_of_week: number | null; release_hour: number | null;
}
interface Domain { id: string; name: string; display_order: number; }
interface ModuleSkill { id: string; title: string; domain_id: string | null; domain_name: string | null; }
interface GridModule {
  id: string; module_skill_id: string; title: string;
  week_number: number; module_domain_id: string | null; domain_name: string | null;
}

const MAX_PER_WEEK = 4;
const MIN_WEEKS = 6;
const WEEK_COL_W = 150;
const DOMAIN_COL_W = 140;

// Header colors derived from brand palette
const HEADER_BG = '#FEF0E9';
const HEADER_TEXT = '#C96B47';
const HEADER_BORDER = 'rgba(201,107,71,0.2)';

function ModuleChip({ mod, repeatCount, onRemove, onDragStart }: {
  mod: GridModule; repeatCount: number;
  onRemove: () => void; onDragStart: (e: React.DragEvent) => void;
}) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable onDragStart={onDragStart}
      title="Drag to move · Click title to edit"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: '1px solid rgba(201,107,71,0.18)',
        borderRadius: 22,
        padding: '5px 8px 5px 12px',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--text-primary)',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: hovered
          ? '0 4px 14px rgba(0,0,0,0.11), 0 1px 3px rgba(0,0,0,0.06)'
          : '0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        transition: 'box-shadow 120ms, transform 120ms',
      }}
    >
      <span
        onClick={(e) => { e.stopPropagation(); navigate(`/admin/modules?edit=${mod.module_skill_id}`); }}
        style={{ flex: 1, lineHeight: 1.35, cursor: 'pointer' }}
      >{mod.title}</span>
      {repeatCount > 1 && (
        <span style={{
          background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700,
          borderRadius: 10, padding: '1px 5px', flexShrink: 0,
        }}>{repeatCount}×</span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove from roadmap"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0 2px', lineHeight: 1, fontSize: 14,
          color: 'var(--text-tertiary)', opacity: hovered ? 1 : 0,
          transition: 'opacity 120ms, color 80ms',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#DC2626'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'; }}
      >×</button>
    </div>
  );
}

function ModulePicker({ domainId, domainName, week, modules, onPick, onClose }: {
  domainId: string | null; domainName: string; week: number;
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
        background: '#fff', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
        width: 340, maxHeight: 440, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            Add module — Week {week}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>{domainName}</div>
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
  const [dragSource, setDragSource] = useState<{ rmId: string; domainId: string | null } | null>(null);
  const [dragTarget, setDragTarget] = useState<{ week: number; domainId: string | null } | null>(null);
  const [libraryDrag, setLibraryDrag] = useState<ModuleSkill | null>(null);
  const [scheduleDay, setScheduleDay] = useState<number | null>(roadmap.release_day_of_week);
  const [scheduleHour, setScheduleHour] = useState<number | null>(roadmap.release_hour);

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

  // Rows = domains (+ "No domain" only if some modules lack a domain)
  const hasUndomained = gridModules.some((m) => m.module_domain_id === null);
  const rows: { id: string | null; name: string }[] = [
    ...domains.map((d) => ({ id: d.id, name: d.name })),
    ...(hasUndomained ? [{ id: null, name: 'No domain' }] : []),
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
    // Domain is fixed on the module — only week changes on drag
    setGridModules((prev) => prev.map((m) =>
      m.id === rmId ? { ...m, week_number: toWeek } : m
    ));
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <SchedulePill
          roadmapId={roadmap.id}
          initialDay={scheduleDay}
          initialHour={scheduleHour}
          onSaved={(d, h) => { setScheduleDay(d); setScheduleHour(h); }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Click any cell to add · Drag to move · Click title to edit · × to remove
        </span>
      </div>

      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 240px)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: DOMAIN_COL_W + weeks.length * WEEK_COL_W }}>
          <thead>
            <tr>
              {/* Top-left corner cell — sticky both axes */}
              <th style={{
                width: DOMAIN_COL_W,
                padding: '10px 14px',
                background: HEADER_BG,
                borderBottom: `2px solid ${HEADER_BORDER}`,
                borderRight: `1px solid ${HEADER_BORDER}`,
                fontSize: 11, fontWeight: 700, color: HEADER_TEXT,
                textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.07em',
                position: 'sticky', top: 0, left: 0, zIndex: 4,
              }}>Domain</th>

              {/* Week column headers — sticky to top */}
              {weeks.map((week) => {
                const total = modulesPerWeek(week);
                const over = total > MAX_PER_WEEK;
                return (
                  <th key={week} style={{
                    width: WEEK_COL_W,
                    padding: '10px 10px',
                    background: over ? '#FEF3C7' : HEADER_BG,
                    borderBottom: `2px solid ${over ? '#FCD34D' : HEADER_BORDER}`,
                    borderRight: `1px solid ${HEADER_BORDER}`,
                    fontSize: 12, fontWeight: 700,
                    color: over ? '#92400E' : HEADER_TEXT,
                    textAlign: 'center', whiteSpace: 'nowrap',
                    position: 'sticky', top: 0, zIndex: 2,
                  }}>
                    <div>Week {week}</div>
                    {over && <div style={{ fontSize: 10, color: '#D97706', marginTop: 2 }}>⚠ {total}/{MAX_PER_WEEK}</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id ?? '_null'}>
                {/* Domain row header — sticky to left */}
                <td style={{
                  padding: '10px 14px',
                  background: HEADER_BG,
                  borderRight: `1px solid ${HEADER_BORDER}`,
                  borderBottom: '1px solid var(--border-light)',
                  fontSize: 13, fontWeight: 600,
                  color: row.id ? HEADER_TEXT : 'var(--text-tertiary)',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap',
                  position: 'sticky', left: 0, zIndex: 1,
                }}>{row.name}</td>

                {/* Week cells */}
                {weeks.map((week) => {
                  const cellMods = gridModules.filter(
                    (m) => m.week_number === week && m.module_domain_id === row.id
                  );
                  const isTarget = dragTarget?.week === week && dragTarget?.domainId === row.id;
                  const weekOver = modulesPerWeek(week) > MAX_PER_WEEK;
                  return (
                    <td key={week}
                      onClick={() => { if (!dragSource && !libraryDrag) setPicker({ week, domainId: row.id, domainName: row.name }); }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        // Snap highlight to the dragged module's own domain, not the hovered row
                        const snapDomain = libraryDrag?.domain_id ?? dragSource?.domainId ?? row.id;
                        setDragTarget({ week, domainId: snapDomain });
                      }}
                      onDragLeave={() => setDragTarget(null)}
                      onDrop={(e) => {
                        e.preventDefault(); setDragTarget(null);
                        if (libraryDrag) { addModule(libraryDrag, week); setLibraryDrag(null); }
                        else if (dragSource) moveModule(dragSource.rmId, week);
                      }}
                      style={{
                        padding: 8, verticalAlign: 'top', cursor: 'pointer',
                        borderRight: '1px solid var(--border-light)',
                        borderBottom: '1px solid var(--border-light)',
                        background: isTarget
                          ? 'rgba(201,107,71,0.08)'
                          : weekOver ? '#FFFBEB' : 'transparent',
                        transition: 'background 100ms',
                        minWidth: WEEK_COL_W,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minHeight: 64 }}>
                        {cellMods.map((mod) => (
                          <ModuleChip key={mod.id} mod={mod} repeatCount={repeatCount(mod.module_skill_id)}
                            onRemove={() => removeModule(mod.id)}
                            onDragStart={(e) => { e.stopPropagation(); setDragSource({ rmId: mod.id, domainId: mod.module_domain_id }); }}
                          />
                        ))}
                        {cellMods.length === 0 && !isTarget && (
                          <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 18, color: 'rgba(201,107,71,0.2)' }}>+</span>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, color: 'var(--text-tertiary)' }}
        onClick={() => setWeekCount((w) => w + 4)}>+ Add 4 weeks</button>

      {unassigned.length > 0 && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Module library
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8 }}>drag onto the grid to place</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {unassigned.map((mod) => (
              <div key={mod.id} draggable
                onDragStart={() => setLibraryDrag(mod)}
                onDragEnd={() => setLibraryDrag(null)}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(201,107,71,0.18)',
                  borderRadius: 22,
                  padding: '6px 14px',
                  fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                  cursor: 'grab', userSelect: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                  opacity: libraryDrag?.id === mod.id ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'opacity 120ms',
                }}>
                {mod.title}
                {mod.domain_name && (
                  <span style={{
                    fontSize: 11, color: HEADER_TEXT,
                    background: HEADER_BG, borderRadius: 10,
                    padding: '1px 7px', fontWeight: 500,
                  }}>{mod.domain_name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {picker && (
        <ModulePicker domainId={picker.domainId} domainName={picker.domainName} week={picker.week}
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
