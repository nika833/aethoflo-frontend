import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { domainsApi, moduleSkillsApi, roadmapsApi, assignmentsApi, usersApi } from '../lib/api';
import { Spinner } from '../components/ui';

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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ domains: 0, modules: 0, roadmaps: 0, assignments: 0, learners: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      domainsApi.list(),
      moduleSkillsApi.list(),
      roadmapsApi.list(),
      assignmentsApi.list(),
      usersApi.list(),
    ]).then(([domains, modules, roadmaps, assignments, users]) => {
      setStats({
        domains: domains.length,
        modules: modules.length,
        roadmaps: roadmaps.length,
        assignments: assignments.length,
        learners: users.filter((u: { role: string }) => u.role === 'learner').length,
      });
    }).finally(() => setLoading(false));
  }, []);

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
