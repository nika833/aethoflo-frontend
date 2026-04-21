import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { learnerProgressApi } from '../lib/api';
import { Spinner, EmptyState } from '../components/ui';

interface SavedModule {
  id: string;
  title: string;
  objective: string | null;
  domain_name: string | null;
  saved_at: string;
}

export default function LearnerSavedPage() {
  const [items, setItems] = useState<SavedModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    learnerProgressApi.getSaved()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await learnerProgressApi.toggleSave(id);
      setItems(prev => prev.filter(m => m.id !== id));
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <Spinner size={28} />
    </div>
  );

  if (items.length === 0) return (
    <EmptyState
      icon="♡"
      title="No saved modules yet"
      description="Tap the ♡ on any module to save it here for quick access."
    />
  );

  return (
    <div className="animate-fade-up" style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 4 }}>Saved</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {items.length} saved module{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((m, idx) => (
          <div
            key={m.id}
            className="card"
            style={{
              padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer',
              transition: 'transform var(--duration-base) var(--ease-out)',
              animationDelay: `${idx * 30}ms`,
            }}
            onClick={() => navigate(`/learner/module/${m.id}`)}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {m.domain_name && (
                <div style={{ fontSize: 11, color: 'var(--accent-dark)', fontWeight: 500, marginBottom: 3, letterSpacing: '0.04em' }}>
                  {m.domain_name}
                </div>
              )}
              <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>
                {m.title}
              </div>
              {m.objective && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.objective}
                </div>
              )}
            </div>
            <button
              onClick={e => { e.stopPropagation(); handleRemove(m.id); }}
              disabled={removingId === m.id}
              title="Remove from saved"
              style={{
                background: 'none', border: 'none', cursor: removingId === m.id ? 'default' : 'pointer',
                fontSize: 20, color: '#E11D48', flexShrink: 0, padding: '2px 4px',
                opacity: removingId === m.id ? 0.4 : 1,
                transition: 'opacity 150ms',
              }}
            >♥</button>
          </div>
        ))}
      </div>
    </div>
  );
}
