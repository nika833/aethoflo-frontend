import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { domainsApi, moduleSkillsApi, roadmapsApi, assignmentsApi, usersApi } from '../lib/api';
import { Spinner } from '../components/ui';

interface Domain { id: string; name: string; }
interface ModuleSkill {
  id: string; title: string; domain_id: string | null;
  media_count: number; objective: string | null;
}
interface Roadmap { id: string; title: string; module_count: number; }

interface Stats {
  domains: number;
  modules: number;
  roadmaps: number;
  assignments: number;
  learners: number;
}

const StatCard = ({
  label, value, icon, to, loading,
}: {
  label: string; value: number; icon: string; to: string; loading: boolean;
}) => {
  const navigate = useNavigate();
  return (
    <div
      className="card card-padded"
      onClick={() => navigate(to)}
      style={{ cursor: 'pointer', flex: '1 1 160px' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 12 }}>{icon}</div>
      {loading ? (
        <div style={{ height: 36, display: 'flex', alignItems: 'center' }}>
          <Spinner size={20} />
        </div>
      ) : (
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          color: 'var(--text-primary)',
          lineHeight: 1,
          marginBottom: 4,
        }}>
          {value}
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
    </div>
  );
};

function CheckStep({ done, label }: { done: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? '#D1FAE5' : 'var(--surface-3)',
        color: done ? '#065F46' : 'var(--text-tertiary)',
        fontSize: 12, fontWeight: 700,
        border: `1.5px solid ${done ? '#6EE7B7' : 'var(--border)'}`,
      }}>
        {done ? '✓' : '·'}
      </div>
      <span style={{
        fontSize: 14,
        color: done ? 'var(--text-primary)' : 'var(--text-secondary)',
        textDecoration: done ? 'none' : 'none',
        fontWeight: done ? 500 : 400,
      }}>
        {label}
      </span>
    </div>
  );
}

function IssueRow({ icon, text, count }: { icon: string; text: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      background: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-light)' }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{text}</span>
      <span style={{ fontSize: 12, fontWeight: 600,
        background: '#FEF3C7', color: '#92400E',
        padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
        {count}
      </span>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ domains: 0, modules: 0, roadmaps: 0, assignments: 0, learners: 0 });
  const [domains, setDomains] = useState<Domain[]>([]);
  const [modules, setModules] = useState<ModuleSkill[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      domainsApi.list(),
      moduleSkillsApi.list(),
      roadmapsApi.list(),
      assignmentsApi.list(),
      usersApi.list(),
    ]).then(([doms, mods, roads, assignments, users]) => {
      setDomains(doms);
      setModules(mods);
      setRoadmaps(roads);
      setStats({
        domains: doms.length,
        modules: mods.length,
        roadmaps: roads.length,
        assignments: assignments.length,
        learners: users.filter((u: { role: string }) => u.role === 'learner').length,
      });
    }).finally(() => setLoading(false));
  }, []);

  // Health calculations
  const orphanedModules = modules.filter((m) => !m.domain_id);
  const noMediaModules = modules.filter((m) => m.media_count === 0);
  const emptyRoadmaps = roadmaps.filter((r) => r.module_count === 0);
  const assignedDomainIds = new Set(modules.map((m) => m.domain_id).filter(Boolean));
  const emptyDomains = domains.filter((d) => !assignedDomainIds.has(d.id));

  const issues = [
    orphanedModules.length > 0 && { icon: '⚠️', text: 'Modules with no domain assigned', count: orphanedModules.length },
    noMediaModules.length > 0 && { icon: '📭', text: 'Modules with no media uploaded', count: noMediaModules.length },
    emptyRoadmaps.length > 0 && { icon: '🗺️', text: 'Roadmaps with no modules', count: emptyRoadmaps.length },
    emptyDomains.length > 0 && { icon: '◫', text: 'Domains with no modules', count: emptyDomains.length },
  ].filter(Boolean) as { icon: string; text: string; count: number }[];

  const started = { domains: domains.length > 0, modules: modules.length > 0, roadmaps: roadmaps.length > 0 };
  const allStarted = started.domains && started.modules && started.roadmaps;

  const quickActions = [
    { label: 'Create a module', desc: 'Add a new training module skill', to: '/admin/modules', icon: '⊟' },
    { label: 'Build a roadmap', desc: 'Sequence modules into a learning path', to: '/admin/roadmaps', icon: '⟶' },
    { label: 'Assign training', desc: 'Connect learners to roadmaps', to: '/admin/assignments', icon: '◎' },
    { label: 'Export data', desc: 'Download learner progress as CSV', to: '/admin/exports', icon: '↓' },
  ];

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ marginBottom: 6 }}>Dashboard</h2>
        <p style={{ fontSize: 14 }}>Overview of your training program</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
        <StatCard label="Domains" value={stats.domains} icon="◫" to="/admin/domains" loading={loading} />
        <StatCard label="Modules" value={stats.modules} icon="⊟" to="/admin/modules" loading={loading} />
        <StatCard label="Roadmaps" value={stats.roadmaps} icon="⟶" to="/admin/roadmaps" loading={loading} />
        <StatCard label="Assignments" value={stats.assignments} icon="◎" to="/admin/assignments" loading={loading} />
        <StatCard label="Learners" value={stats.learners} icon="◈" to="/admin/assignments" loading={loading} />
      </div>

      {/* Health section */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 40 }}>

          {/* Getting started checklist */}
          {!allStarted && (
            <div className="card card-padded">
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>
                Getting started
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <CheckStep done={started.domains} label="① Create at least one domain" />
                <CheckStep done={started.modules} label="② Build your first module" />
                <CheckStep done={started.roadmaps} label="③ Define a learning roadmap" />
              </div>
              {!started.domains && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16, alignSelf: 'flex-start' }}
                  onClick={() => navigate('/admin/domains')}>
                  Create a domain →
                </button>
              )}
              {started.domains && !started.modules && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16, alignSelf: 'flex-start' }}
                  onClick={() => navigate('/admin/modules')}>
                  Build a module →
                </button>
              )}
              {started.domains && started.modules && !started.roadmaps && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16, alignSelf: 'flex-start' }}
                  onClick={() => navigate('/admin/roadmaps')}>
                  Create a roadmap →
                </button>
              )}
            </div>
          )}

          {/* Content health */}
          {(allStarted || issues.length > 0) && (
            <div className="card card-padded" style={{ gridColumn: allStarted ? '1 / -1' : 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                  Content health
                </div>
                {issues.length === 0 ? (
                  <span style={{ fontSize: 13, color: '#065F46', background: '#D1FAE5',
                    padding: '3px 10px', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>
                    ✓ All good
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: '#92400E', background: '#FEF3C7',
                    padding: '3px 10px', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>
                    {issues.length} issue{issues.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {issues.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Every module has a domain, media, and is part of a roadmap. Your content library is complete.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {issues.map((issue) => (
                    <IssueRow key={issue.text} icon={issue.icon} text={issue.text} count={issue.count} />
                  ))}
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
                    Click into Modules, Domains, or Roadmaps above to resolve these.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ marginBottom: 12 }}>
        <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
          letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
          Quick actions
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {quickActions.map((a) => (
            <div
              key={a.to}
              className="card"
              onClick={() => navigate(a.to)}
              style={{ padding: '16px 18px', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-mid)';
                (e.currentTarget as HTMLDivElement).style.background = 'var(--accent-light)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '';
                (e.currentTarget as HTMLDivElement).style.background = '';
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, color: 'var(--text-primary)' }}>
                {a.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
