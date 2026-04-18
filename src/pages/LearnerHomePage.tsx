import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { learnerProgressApi } from '../lib/api';
import { Spinner, StatusBadge, EmptyState } from '../components/ui';

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
}

interface LearnerHomeData {
  assignment: {
    id: string;
    roadmap_title: string;
    roadmap_description: string | null;
    duration_label: string | null;
    activation_date: string | null;
  } | null;
  current_module: ModuleWithStatus | null;
  modules: ModuleWithStatus[];
  stats: { total: number; completed: number; available: number; locked: number };
}

export default function LearnerHomePage() {
  const [data, setData] = useState<LearnerHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    learnerProgressApi.getMy()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!data?.assignment) {
    return (
      <EmptyState
        icon="◈"
        title="No active training"
        description="You haven't been assigned a training roadmap yet. Check back soon."
      />
    );
  }

  const { assignment, current_module, modules, stats } = data;
  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="animate-fade-up" style={{ maxWidth: 680 }}>
      {/* Roadmap header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Your Roadmap
        </p>
        <h2 style={{ marginBottom: 8 }}>{assignment.roadmap_title}</h2>
        {assignment.roadmap_description && (
          <p style={{ fontSize: 14 }}>{assignment.roadmap_description}</p>
        )}

        {/* Progress bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            <span>{stats.completed} of {stats.total} modules complete</span>
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Current module — prominent */}
      {current_module && (
        <div style={{ marginBottom: 32 }}>
          <h4 style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontWeight: 500, letterSpacing: '0.06em',
            textTransform: 'uppercase' }}>
            Up Next
          </h4>
          <div
            className="card card-padded"
            style={{
              cursor: 'pointer',
              borderColor: 'var(--accent-mid)',
              background: 'var(--accent-light)',
              transition: 'all var(--duration-base) var(--ease-out)',
            }}
            onClick={() => navigate(`/learner/module/${current_module.id}`)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-accent)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = '';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                {current_module.domain_name && (
                  <div style={{ fontSize: 12, color: 'var(--accent-dark)', fontWeight: 500,
                    marginBottom: 6, letterSpacing: '0.04em' }}>
                    {current_module.domain_name}
                  </div>
                )}
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem',
                  marginBottom: 6, color: 'var(--text-primary)' }}>
                  {current_module.title}
                </h3>
                {current_module.objective && (
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    {current_module.objective}
                  </p>
                )}
              </div>
              <StatusBadge status={current_module.status} />
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary">
                {current_module.status === 'in_progress' ? 'Continue →' : 'Start module →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module list */}
      <div>
        <h4 style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)', fontWeight: 500, letterSpacing: '0.06em',
          textTransform: 'uppercase' }}>
          Full Roadmap
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {modules.map((mod, idx) => {
            const isCurrent = mod.id === current_module?.id;
            const isClickable = mod.status !== 'locked';

            return (
              <div
                key={mod.id}
                className="card"
                onClick={() => isClickable && navigate(`/learner/module/${mod.id}`)}
                style={{
                  padding: '14px 18px',
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: mod.status === 'locked' ? 0.6 : 1,
                  borderColor: isCurrent ? 'var(--accent-mid)' : undefined,
                  display: 'flex', alignItems: 'center', gap: 14,
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                {/* Step number */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: mod.status === 'completed'
                    ? 'var(--status-completed)' : mod.status === 'locked'
                    ? 'var(--surface-3)' : 'var(--accent)',
                  color: mod.status === 'locked' ? 'var(--text-tertiary)' : 'white',
                  fontSize: 13, fontWeight: 600,
                }}>
                  {mod.status === 'completed' ? '✓' : idx + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mod.title}
                  </div>
                  {mod.domain_name && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {mod.domain_name}
                    </div>
                  )}
                </div>

                <StatusBadge status={mod.status} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
