import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { learnerProgressApi } from '../lib/api';
import { Spinner, EmptyState } from '../components/ui';

interface ModuleWithStatus {
  id: string;
  module_skill_id: string;
  title: string;
  objective: string | null;
  domain_name: string | null;
  status: string;
  display_order: number;
  release_date_calculated: string | null;
  completed_at: string | null;
  started_at: string | null;
}

type FilterKey = 'all' | 'available' | 'in_progress' | 'completed' | 'locked' | 'saved';

const STATUS_FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'completed',   label: 'Completed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'available',   label: 'Available' },
  { key: 'saved',       label: 'Saved' },
  { key: 'locked',      label: 'Upcoming' },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  completed:   { label: 'Completed',   color: 'var(--status-completed)', bg: '#F0FDF4' },
  in_progress: { label: 'In Progress', color: 'var(--accent)',           bg: 'var(--accent-light)' },
  available:   { label: 'Available',   color: 'var(--accent)',           bg: 'var(--accent-light)' },
  locked:      { label: 'Upcoming',    color: 'var(--text-tertiary)',    bg: 'var(--surface-3)' },
};

export default function LearnerLibraryPage() {
  const [modules, setModules] = useState<ModuleWithStatus[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      learnerProgressApi.getMy(),
      learnerProgressApi.getSaved(),
    ]).then(([data, saved]) => {
      setModules(data.modules ?? []);
      setSavedIds(new Set(saved.map((s: any) => s.id)));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <Spinner size={28} />
    </div>
  );

  if (modules.length === 0) return (
    <EmptyState icon="⊟" title="No modules yet" description="Your roadmap hasn't been set up yet." />
  );

  // Deduplicate by module_skill_id — keep the most relevant instance
  // Priority: completed > in_progress > available > locked
  const STATUS_RANK: Record<string, number> = { completed: 0, in_progress: 1, available: 2, locked: 3 };
  const dedupedMap = new Map<string, ModuleWithStatus>();
  for (const m of modules) {
    const existing = dedupedMap.get(m.module_skill_id);
    if (!existing || (STATUS_RANK[m.status] ?? 9) < (STATUS_RANK[existing.status] ?? 9)) {
      dedupedMap.set(m.module_skill_id, m);
    }
  }
  const deduped = Array.from(dedupedMap.values());

  // Apply filter
  const filtered = deduped.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'saved') return savedIds.has(m.id);
    return m.status === filter;
  });

  // Group by domain
  const domains: string[] = [];
  const byDomain: Record<string, ModuleWithStatus[]> = {};
  for (const m of filtered) {
    const d = m.domain_name ?? 'General';
    if (!byDomain[d]) { byDomain[d] = []; domains.push(d); }
    byDomain[d].push(m);
  }

  const fmtDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="animate-fade-up" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 4 }}>Library</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          All modules from your roadmap, organized by domain.
        </p>
      </div>

      {/* Filter dropdown */}
      <div style={{ marginBottom: 28 }}>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as FilterKey)}
          className="form-input"
          style={{ width: 'auto', minWidth: 200, fontSize: 14, cursor: 'pointer' }}
        >
          {STATUS_FILTERS.map(f => {
            const count = f.key === 'all' ? deduped.length
              : f.key === 'saved' ? savedIds.size
              : deduped.filter(m => m.status === f.key).length;
            return (
              <option key={f.key} value={f.key}>
                {f.label} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {filtered.length === 0 && (
        <EmptyState icon="◌" title="No modules match this filter" description="Try a different filter above." />
      )}

      {/* Domain groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {domains.map(domain => (
          <div key={domain}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--accent-dark)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
              paddingBottom: 8, borderBottom: '1px solid var(--border-light)',
            }}>
              {domain}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {byDomain[domain].map(m => {
                const isLocked = m.status === 'locked';
                const isSaved = savedIds.has(m.id);
                const meta = STATUS_META[m.status];

                return (
                  <div
                    key={m.id}
                    className="card"
                    onClick={() => !isLocked && navigate(`/learner/module/${m.id}`)}
                    style={{
                      padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                      cursor: isLocked ? 'default' : 'pointer',
                      opacity: isLocked ? 0.7 : 1,
                      transition: 'transform var(--duration-base) var(--ease-out)',
                    }}
                    onMouseEnter={!isLocked ? e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; } : undefined}
                    onMouseLeave={!isLocked ? e => { (e.currentTarget as HTMLDivElement).style.transform = ''; } : undefined}
                  >
                    {/* Status dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: meta?.color ?? 'var(--text-tertiary)',
                    }} />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {m.title}
                      </div>
                      {m.objective && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.objective}
                        </div>
                      )}
                    </div>

                    {/* Right: badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {isSaved && (
                        <span style={{ fontSize: 14, color: '#E11D48' }}>♥</span>
                      )}
                      {m.release_date_calculated && (
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                          {fmtDate(m.release_date_calculated)}
                        </span>
                      )}
                      {meta && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
                          background: meta.bg, color: meta.color,
                        }}>
                          {meta.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
