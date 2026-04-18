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
  const remaining = modules.filter((m) => m.status !== 'completed');

  return (
    <div className="animate-fade-up" style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 6 }}>Progress</h2>
        {activation_date && (
          <p style={{ fontSize: 14 }}>Training started {activation_date}</p>
        )}
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Completed', value: modules.filter(m => m.status === 'completed').length, color: 'var(--status-completed)' },
          { label: 'Available', value: modules.filter(m => m.status === 'available' || m.status === 'in_progress').length, color: 'var(--accent)' },
          { label: 'Upcoming', value: modules.filter(m => m.status === 'locked').length, color: 'var(--text-tertiary)' },
        ].map((s) => (
          <div key={s.label} className="card card-padded" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem',
              color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 15, top: 0, bottom: 0, width: 2,
          background: 'var(--border)', borderRadius: 1,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modules.map((mod, idx) => {
            const isClickable = mod.status !== 'locked';
            const dotColor = mod.status === 'completed' ? 'var(--status-completed)'
              : mod.status === 'locked' ? 'var(--surface-3)'
              : 'var(--accent)';

            return (
              <div key={mod.id} style={{ display: 'flex', gap: 20, alignItems: 'flex-start',
                animationDelay: `${idx * 30}ms` }} className="animate-fade-up">
                {/* Dot */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: dotColor, border: '3px solid var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, color: mod.status === 'locked' ? 'var(--text-tertiary)' : 'white',
                  zIndex: 1, position: 'relative',
                  boxShadow: mod.status === 'available' || mod.status === 'in_progress'
                    ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
                }}>
                  {mod.status === 'completed' ? '✓' : idx + 1}
                </div>

                {/* Content */}
                <div
                  className="card"
                  onClick={() => isClickable && navigate(`/learner/module/${mod.id}`)}
                  style={{
                    flex: 1, padding: '12px 16px',
                    cursor: isClickable ? 'pointer' : 'default',
                    opacity: mod.status === 'locked' ? 0.6 : 1,
                    marginBottom: 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                    justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>
                        {mod.title}
                      </div>
                      {mod.domain_name && (
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{mod.domain_name}</div>
                      )}
                    </div>
                    <StatusBadge status={mod.status} />
                  </div>
                  {mod.completed_at && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      Completed {new Date(mod.completed_at).toLocaleDateString()}
                    </div>
                  )}
                  {mod.release_date_calculated && mod.status === 'locked' && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      Available {new Date(mod.release_date_calculated + 'T00:00:00').toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
