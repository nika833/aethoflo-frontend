import React, { useState } from 'react';
import { exportsApi } from '../lib/api';
import { PageHeader, Alert } from '../components/ui';

const EXPORTS = [
  {
    id: 'learner_progress',
    label: 'Learner progress by roadmap',
    desc: 'All learners, roadmaps, modules, statuses, and timestamps.',
    icon: '◈',
  },
  {
    id: 'module_completion',
    label: 'Module completion history',
    desc: 'All completed modules with completion dates and learner notes.',
    icon: '✓',
  },
  {
    id: 'checklist_responses',
    label: 'Checklist responses',
    desc: 'All submitted checklist answers with per-item values.',
    icon: '⊟',
  },
  {
    id: 'roadmap_assignments',
    label: 'Roadmap assignments',
    desc: 'All learner-to-roadmap assignments with activation dates and trigger sources.',
    icon: '◎',
  },
  {
    id: 'release_status',
    label: 'Release status by learner',
    desc: 'Calculated release dates per module per learner based on activation and release rules.',
    icon: '⟶',
  },
];

export default function AdminExports() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lastDownloaded, setLastDownloaded] = useState<string | null>(null);

  const handleDownload = async (id: string) => {
    setLoading(id); setError(''); setLastDownloaded(null);
    try {
      await exportsApi.download(id);
      setLastDownloaded(id);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Exports"
        subtitle="Download learner and training data as CSV"
      />

      {error && <div style={{ marginBottom: 16 }}><Alert type="error">{error}</Alert></div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {EXPORTS.map((exp) => (
          <div key={exp.id} className="card" style={{ padding: '18px 22px',
            display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: 'var(--accent)', flexShrink: 0,
            }}>
              {exp.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)',
                marginBottom: 2 }}>{exp.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{exp.desc}</div>
            </div>
            {lastDownloaded === exp.id && (
              <span style={{ fontSize: 12, color: 'var(--status-completed)' }}>Downloaded ✓</span>
            )}
            <button
              className="btn btn-secondary btn-sm"
              disabled={loading === exp.id}
              onClick={() => handleDownload(exp.id)}
              style={{ flexShrink: 0 }}
            >
              {loading === exp.id ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ animation: 'pulse-soft 1s ease infinite', display: 'inline-block' }}>•</span>
                  Generating...
                </span>
              ) : '↓ Download CSV'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: '14px 18px', background: 'var(--surface-2)',
        borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)',
        border: '1px solid var(--border-light)' }}>
        All exports are generated in real time and reflect current data. CSV only for MVP.
      </div>
    </div>
  );
}
