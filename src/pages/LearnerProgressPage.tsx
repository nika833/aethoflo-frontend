import React, { useEffect, useState } from 'react';
import { learnerProgressApi } from '../lib/api';
import { Spinner, EmptyState, StatusBadge } from '../components/ui';
import { useNavigate } from 'react-router-dom';

interface ModuleWithStatus {
  id: string; title: string; domain_name: string | null;
  status: string; display_order: number;
  release_date_calculated: string | null;
  completed_at: string | null; started_at: string | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function LearnerProgressPage() {
  const [data, setData] = useState<{
    modules: ModuleWithStatus[];
    activation_date: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    learnerProgressApi.getMy().then((d) => {
      if (d.assignment) {
        setData({ modules: d.modules, activation_date: d.assignment.activation_date });
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>;
  if (!data?.modules.length) return <EmptyState icon="◉" title="No progress yet" description="Complete modules on your roadmap to see your timeline here." />;

  const { modules, activation_date } = data;
  const completed = modules.filter((m) => m.status === 'completed');
  const totalPct = modules.length > 0 ? Math.round((completed.length / modules.length) * 100) : 0;

  // Build activity log from started_at and completed_at events
  type ActivityEvent = { date: string; type: 'completed' | 'started'; module: ModuleWithStatus };
  const activityEvents: ActivityEvent[] = modules.flatMap(m => {
    const events: ActivityEvent[] = [];
    if (m.completed_at) events.push({ date: m.completed_at, type: 'completed', module: m });
    else if (m.started_at) events.push({ date: m.started_at, type: 'started', module: m });
    return events;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="animate-fade-up" style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 6 }}>Progress</h2>
        {activation_date && (
          <p style={{ fontSize: 14 }}>
            Training started {new Date(activation_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
            <span>Overall: {completed.length} of {modules.length} modules complete</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{totalPct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{
              width: `${totalPct}%`,
              background: totalPct === 100 ? 'var(--status-completed)' : undefined,
            }} />
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 32 }}>
        {[
          { label: 'Completed', value: modules.filter(m => m.status === 'completed').length, color: 'var(--status-completed)' },
          { label: 'Available', value: modules.filter(m => m.status === 'available' || m.status === 'in_progress').length, color: 'var(--accent)' },
          { label: 'Upcoming', value: modules.filter(m => m.status === 'locked').length, color: 'var(--text-tertiary)' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '14px 8px', textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Module timeline */}
      <div style={{ position: 'relative', marginBottom: 48 }}>
        <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: 'var(--border)', borderRadius: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modules.map((mod, idx) => {
            const isClickable = mod.status !== 'locked';
            const dotColor = mod.status === 'completed' ? 'var(--status-completed)'
              : mod.status === 'locked' ? 'var(--surface-3)' : 'var(--accent)';

            // Release date coloring
            let releaseDateEl = null;
            if (mod.release_date_calculated) {
              const releaseDate = new Date(mod.release_date_calculated + 'T00:00:00');
              const now = new Date();
              const label = releaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              let color = 'var(--text-tertiary)';
              if (mod.status === 'completed') color = 'var(--status-completed)';
              else if (mod.status !== 'locked' && releaseDate < now) color = '#DC2626';
              else if (mod.status !== 'locked') color = 'var(--accent)';
              releaseDateEl = <span style={{ fontSize: 11, fontWeight: 500, color }}>{label}</span>;
            }

            return (
              <div key={mod.id} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', animationDelay: `${idx * 30}ms` }} className="animate-fade-up">
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: dotColor, border: '3px solid var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, color: mod.status === 'locked' ? 'var(--text-tertiary)' : 'white',
                  zIndex: 1, position: 'relative',
                  boxShadow: mod.status === 'available' || mod.status === 'in_progress' ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
                }}>
                  {mod.status === 'completed' ? '✓' : idx + 1}
                </div>

                <div className="card" onClick={() => isClickable && navigate(`/learner/module/${mod.id}`)}
                  style={{ flex: 1, padding: '12px 16px', cursor: isClickable ? 'pointer' : 'default', opacity: mod.status === 'locked' ? 0.6 : 1, marginBottom: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>{mod.title}</div>
                      {mod.domain_name && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{mod.domain_name}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      {releaseDateEl}
                      <StatusBadge status={mod.status} />
                    </div>
                  </div>
                  {mod.completed_at && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      Completed {fmtDate(mod.completed_at)}
                    </div>
                  )}
                  {mod.started_at && !mod.completed_at && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      Started {fmtDate(mod.started_at)}
                    </div>
                  )}
                  {mod.release_date_calculated && mod.status === 'locked' && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      Available {new Date(mod.release_date_calculated + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity log */}
      {activityEvents.length > 0 && (
        <div>
          <h4 style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontWeight: 500, letterSpacing: '0.06em',
            textTransform: 'uppercase' }}>
            Activity Log
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {activityEvents.map((evt, i) => {
              const isCompleted = evt.type === 'completed';
              const dotColor = isCompleted ? 'var(--status-completed)' : 'var(--accent)';
              const prevDate = i > 0 ? activityEvents[i - 1].date.split('T')[0] : null;
              const thisDate = evt.date.split('T')[0];
              const showDateHeader = thisDate !== prevDate;

              return (
                <React.Fragment key={`${evt.module.id}-${evt.type}`}>
                  {showDateHeader && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                      letterSpacing: '0.06em', padding: '12px 0 6px',
                      borderTop: i > 0 ? '1px solid var(--border)' : 'none', marginTop: i > 0 ? 8 : 0 }}>
                      {fmtDate(evt.date)}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: dotColor, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {isCompleted ? 'Completed' : 'Started'}
                      </span>
                      {' '}
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {evt.module.title}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                      {fmtTime(evt.date)}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
