import React, { useEffect, useState } from 'react';
import { assignmentsApi, usersApi, roadmapsApi, magicLinkApi } from '../lib/api';
import { Modal, EmptyState, PageHeader, Alert, Spinner, StatusBadge } from '../components/ui';

interface User { id: string; display_name: string; email: string; role: string; }
interface Roadmap { id: string; title: string; }
interface Assignment {
  id: string; learner_name: string; learner_email: string;
  roadmap_title: string; roadmap_id: string; learner_id: string;
  is_active: boolean; created_at: string;
  activation_date: string | null; trigger_source: string | null;
  completed_modules: number; total_modules: number;
}

// ─── Add Learner Form (create user + assign roadmap + generate magic link) ────

function AddLearnerForm({
  roadmaps, onDone, onCancel,
}: {
  roadmaps: Roadmap[];
  onDone: (assignment: Assignment) => void;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roadmapId, setRoadmapId] = useState('');
  const [activationDate, setActivationDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkUrl, setMagicLinkUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim() || !email.trim() || !roadmapId) return;
    setSaving(true);
    setError('');
    try {
      // 1. Create user
      const created = await usersApi.create({
        display_name: displayName.trim(),
        email: email.trim(),
        phone_number: phone.trim() || null,
        role: 'learner',
      });

      // 2. Create assignment
      const assignment = await assignmentsApi.create({
        learner_id: created.id,
        roadmap_id: roadmapId,
        ...(activationDate ? { activation_date: activationDate } : {}),
      });

      // 3. Generate magic link (backend also fires welcome notification)
      const { url } = await magicLinkApi.generate(created.id);
      setMagicLinkUrl(url);

      onDone({
        ...assignment,
        learner_name: created.display_name,
        learner_email: created.email,
        roadmap_title: roadmaps.find((r) => r.id === roadmapId)?.title ?? '',
        completed_modules: 0,
        total_modules: 0,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Could not add learner.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(magicLinkUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Success state
  if (magicLinkUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 'var(--radius-md)',
        }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
            Learner added and roadmap assigned.
          </span>
        </div>

        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
            Magic link — copy and send if notifications are not configured:
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <input
              readOnly
              value={magicLinkUrl}
              style={{
                flex: 1, fontFamily: 'monospace', fontSize: 12,
                background: 'var(--surface-3)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                color: 'var(--text-primary)', minWidth: 0,
              }}
              onFocus={(e) => e.target.select()}
            />
            <button className="btn btn-secondary btn-sm" onClick={handleCopy} style={{ flexShrink: 0 }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
          Email/SMS will be sent automatically if Twilio/Resend are configured in Railway.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onCancel}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <Alert type="error">{error}</Alert>}

      <div className="form-group">
        <label className="form-label">Full name <span style={{ color: 'var(--accent)' }}>*</span></label>
        <input type="text" className="form-input" value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Jane Smith" autoFocus />
      </div>

      <div className="form-group">
        <label className="form-label">Email <span style={{ color: 'var(--accent)' }}>*</span></label>
        <input type="email" className="form-input" value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@company.com" />
      </div>

      <div className="form-group">
        <label className="form-label">Phone number <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>(optional)</span></label>
        <input type="tel" className="form-input" value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000" />
      </div>

      <div className="form-group">
        <label className="form-label">Roadmap <span style={{ color: 'var(--accent)' }}>*</span></label>
        <select className="form-select form-input" value={roadmapId}
          onChange={(e) => setRoadmapId(e.target.value)}>
          <option value="">— Select roadmap —</option>
          {roadmaps.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Start date <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>(optional, defaults to today)</span></label>
        <input type="date" className="form-input" value={activationDate}
          onChange={(e) => setActivationDate(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary"
          disabled={!displayName.trim() || !email.trim() || !roadmapId || saving}
          onClick={handleSave}>
          {saving ? <Spinner size={16} /> : 'Add learner'}
        </button>
      </div>
    </div>
  );
}

// ─── Assign Existing Learner Form ─────────────────────────────────────────────

function AssignForm({
  users, roadmaps, onSave, onCancel, saving,
}: {
  users: User[]; roadmaps: Roadmap[];
  onSave: (d: { learner_id: string; roadmap_id: string; activation_date?: string }) => void;
  onCancel: () => void; saving: boolean;
}) {
  const [learnerId, setLearnerId] = useState('');
  const [roadmapId, setRoadmapId] = useState('');
  const [activationDate, setActivationDate] = useState('');
  const learners = users.filter((u) => u.role === 'learner');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-group">
        <label className="form-label">Learner <span style={{ color: 'var(--accent)' }}>*</span></label>
        <select className="form-select form-input" value={learnerId}
          onChange={(e) => setLearnerId(e.target.value)}>
          <option value="">— Select learner —</option>
          {learners.map((u) => (
            <option key={u.id} value={u.id}>{u.display_name} ({u.email})</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Roadmap <span style={{ color: 'var(--accent)' }}>*</span></label>
        <select className="form-select form-input" value={roadmapId}
          onChange={(e) => setRoadmapId(e.target.value)}>
          <option value="">— Select roadmap —</option>
          {roadmaps.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Activation date (optional)</label>
        <input type="date" className="form-input" value={activationDate}
          onChange={(e) => setActivationDate(e.target.value)} />
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
          Leave blank — activation will be set on first embedded launch.
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!learnerId || !roadmapId || saving}
          onClick={() => onSave({
            learner_id: learnerId, roadmap_id: roadmapId,
            ...(activationDate ? { activation_date: activationDate } : {}),
          })}>
          {saving ? <Spinner size={16} /> : 'Assign roadmap'}
        </button>
      </div>
    </div>
  );
}

// ─── Activate Modal ───────────────────────────────────────────────────────────

function ActivateModal({
  assignment, onSave, onClose, saving,
}: {
  assignment: Assignment; onSave: (date: string) => void;
  onClose: () => void; saving: boolean;
}) {
  const [date, setDate] = useState(
    assignment.activation_date ?? new Date().toISOString().slice(0, 10)
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 14 }}>
        Set the activation date for <strong>{assignment.learner_name}</strong> on{' '}
        <strong>{assignment.roadmap_title}</strong>. This date anchors all time-based module release rules.
      </p>
      <div className="form-group">
        <label className="form-label">Activation date</label>
        <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {assignment.activation_date && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)',
          background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
          Current: {assignment.activation_date}
          {assignment.trigger_source && ` (${assignment.trigger_source})`}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!date || saving} onClick={() => onSave(date)}>
          {saving ? <Spinner size={16} /> : 'Set activation date'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'addLearner' | 'assign' | 'activate' | null>(null);
  const [activating, setActivating] = useState<Assignment | null>(null);

  const load = () => Promise.all([
    assignmentsApi.list(),
    usersApi.list(),
    roadmapsApi.list(),
  ]).then(([a, u, r]) => {
    setAssignments(a); setUsers(u); setRoadmaps(r);
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleAddLearnerDone = (assignment: Assignment) => {
    setAssignments((prev) => [assignment, ...prev]);
    // Keep modal open to show success state with magic link
  };

  const handleAssign = async (d: { learner_id: string; roadmap_id: string; activation_date?: string }) => {
    setSaving(true); setError('');
    try {
      const created = await assignmentsApi.create(d);
      setAssignments((prev) => [{ ...created,
        learner_name: users.find(u => u.id === d.learner_id)?.display_name ?? '',
        learner_email: users.find(u => u.id === d.learner_id)?.email ?? '',
        roadmap_title: roadmaps.find(r => r.id === d.roadmap_id)?.title ?? '',
        completed_modules: 0, total_modules: 0,
      }, ...prev]);
      setModal(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Could not create assignment.';
      setError(msg);
    } finally { setSaving(false); }
  };

  const handleActivate = async (date: string) => {
    if (!activating) return;
    setSaving(true); setError('');
    try {
      await assignmentsApi.activate(activating.id, date);
      setAssignments((prev) => prev.map((a) =>
        a.id === activating.id ? { ...a, activation_date: date, trigger_source: 'manual_admin' } : a));
      setModal(null); setActivating(null);
    } catch { setError('Could not set activation date.'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await assignmentsApi.deactivate(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch { setError('Could not remove assignment.'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Assignments"
        subtitle="Connect learners to roadmaps and manage activation"
        action={
          <button className="btn btn-primary" onClick={() => setModal('addLearner')}>
            + Add learner
          </button>
        }
      />

      {error && <div style={{ marginBottom: 16 }}><Alert type="error">{error}</Alert></div>}

      {assignments.length === 0 ? (
        <EmptyState icon="◎" title="No assignments yet"
          description="Add a learner to get started — you'll create their account, assign a roadmap, and send them a magic link in one step."
          action={<button className="btn btn-primary" onClick={() => setModal('addLearner')}>Add first learner</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {assignments.map((a) => {
            const pct = a.total_modules > 0
              ? Math.round((a.completed_modules / a.total_modules) * 100) : 0;

            return (
              <div key={a.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)',
                      marginBottom: 2 }}>{a.learner_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      {a.learner_email} · {a.roadmap_title}
                    </div>

                    {/* Activation info */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      {a.activation_date ? (
                        <span style={{ fontSize: 12, color: 'var(--status-completed)',
                          background: '#DCFCE7', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                          Active from {a.activation_date}
                          {a.trigger_source && ` · ${a.trigger_source.replace(/_/g, ' ')}`}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)',
                          background: 'var(--surface-3)', padding: '3px 8px',
                          borderRadius: 'var(--radius-full)' }}>
                          Awaiting activation
                        </span>
                      )}

                      {a.total_modules > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {a.completed_modules}/{a.total_modules} complete ({pct}%)
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {a.total_modules > 0 && (
                      <div className="progress-bar" style={{ marginTop: 8, maxWidth: 300 }}>
                        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => { setActivating(a); setModal('activate'); }}>
                      {a.activation_date ? 'Edit activation' : 'Set activation'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(a.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Learner modal — primary action */}
      <Modal isOpen={modal === 'addLearner'} onClose={() => setModal(null)} title="Add learner">
        <AddLearnerForm
          roadmaps={roadmaps}
          onDone={handleAddLearnerDone}
          onCancel={() => setModal(null)}
        />
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)',
              fontSize: 12, cursor: 'pointer', padding: 0 }}
            onClick={() => setModal('assign')}
          >
            Assign an existing learner instead →
          </button>
        </div>
      </Modal>

      {/* Assign existing learner — secondary/edge case */}
      <Modal isOpen={modal === 'assign'} onClose={() => setModal(null)} title="Assign existing learner">
        <AssignForm users={users} roadmaps={roadmaps} onSave={handleAssign}
          onCancel={() => setModal(null)} saving={saving} />
      </Modal>

      <Modal isOpen={modal === 'activate' && !!activating}
        onClose={() => { setModal(null); setActivating(null); }}
        title={activating?.activation_date ? 'Edit activation date' : 'Set activation date'}>
        {activating && (
          <ActivateModal assignment={activating} onSave={handleActivate}
            onClose={() => { setModal(null); setActivating(null); }} saving={saving} />
        )}
      </Modal>
    </div>
  );
}
