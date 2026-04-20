import React, { useEffect, useState } from 'react';
import { assignmentsApi, usersApi, roadmapsApi, magicLinkApi, learnerProgressApi } from '../lib/api';
import { Modal, SlideOver, EmptyState, PageHeader, Alert, Spinner, StatusBadge } from '../components/ui';

interface User { id: string; display_name: string; email: string; role: string; }
interface Roadmap { id: string; title: string; }
interface Assignment {
  id: string; learner_name: string; learner_email: string;
  roadmap_title: string; roadmap_id: string; learner_id: string;
  is_active: boolean; created_at: string;
  activation_date: string | null; trigger_source: string | null;
  completed_modules: number; total_modules: number;
}
interface ModuleProgress {
  id: string; title: string; status: string;
  started_at: string | null; completed_at: string | null;
}

// ─── Add Learner Form ─────────────────────────────────────────────────────────

function AddLearnerForm({ roadmaps, onDone, onCancel }: {
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
    setSaving(true); setError('');
    try {
      const created = await usersApi.create({
        display_name: displayName.trim(), email: email.trim(),
        phone_number: phone.trim() || null, role: 'learner',
      });
      const assignment = await assignmentsApi.create({
        learner_id: created.id, roadmap_id: roadmapId,
        ...(activationDate ? { activation_date: activationDate } : {}),
      });
      const { url } = await magicLinkApi.generate(created.id);
      setMagicLinkUrl(url);
      onDone({
        ...assignment,
        learner_name: created.display_name, learner_email: created.email,
        roadmap_title: roadmaps.find((r) => r.id === roadmapId)?.title ?? '',
        completed_modules: 0, total_modules: 0,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Could not add learner.';
      setError(msg);
    } finally { setSaving(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(magicLinkUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  if (magicLinkUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
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
            <input readOnly value={magicLinkUrl} style={{
              flex: 1, fontFamily: 'monospace', fontSize: 12,
              background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '8px 12px',
              color: 'var(--text-primary)', minWidth: 0,
            }} onFocus={(e) => e.target.select()} />
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
          onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Smith" autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">Email <span style={{ color: 'var(--accent)' }}>*</span></label>
        <input type="email" className="form-input" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
      </div>
      <div className="form-group">
        <label className="form-label">Phone number <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>(optional)</span></label>
        <input type="tel" className="form-input" value={phone}
          onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
      </div>
      <div className="form-group">
        <label className="form-label">Roadmap <span style={{ color: 'var(--accent)' }}>*</span></label>
        <select className="form-select form-input" value={roadmapId}
          onChange={(e) => setRoadmapId(e.target.value)}>
          <option value="">— Select roadmap —</option>
          {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
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

function AssignForm({ users, roadmaps, onSave, onCancel, saving }: {
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
          {learners.map((u) => <option key={u.id} value={u.id}>{u.display_name} ({u.email})</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Roadmap <span style={{ color: 'var(--accent)' }}>*</span></label>
        <select className="form-select form-input" value={roadmapId}
          onChange={(e) => setRoadmapId(e.target.value)}>
          <option value="">— Select roadmap —</option>
          {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
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
          onClick={() => onSave({ learner_id: learnerId, roadmap_id: roadmapId,
            ...(activationDate ? { activation_date: activationDate } : {}) })}>
          {saving ? <Spinner size={16} /> : 'Assign roadmap'}
        </button>
      </div>
    </div>
  );
}

// ─── Activate Modal ───────────────────────────────────────────────────────────

function ActivateModal({ assignment, onSave, onClose, saving }: {
  assignment: Assignment; onSave: (date: string) => void;
  onClose: () => void; saving: boolean;
}) {
  const [date, setDate] = useState(assignment.activation_date ?? new Date().toISOString().slice(0, 10));
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

// ─── Learner Detail Slide-over ────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  completed:   { bg: '#DCFCE7', color: '#16A34A', label: 'Completed' },
  in_progress: { bg: '#FEF3C7', color: '#D97706', label: 'In progress' },
  available:   { bg: '#EFF6FF', color: '#2563EB', label: 'Available' },
  locked:      { bg: 'var(--surface-3)', color: 'var(--text-tertiary)', label: 'Locked' },
};

function LearnerDetail({ assignment, onClose, onActivate, onRemove }: {
  assignment: Assignment;
  onClose: () => void;
  onActivate: () => void;
  onRemove: () => void;
}) {
  const [modules, setModules] = useState<ModuleProgress[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [magicLinkUrl, setMagicLinkUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    learnerProgressApi.getAssignment(assignment.id)
      .then((data) => setModules(data.modules ?? []))
      .catch(() => {})
      .finally(() => setLoadingModules(false));
  }, [assignment.id]);

  const handleResendLink = async () => {
    setGeneratingLink(true);
    try {
      const { url } = await magicLinkApi.generate(assignment.learner_id);
      setMagicLinkUrl(url);
    } catch { /* silent */ }
    finally { setGeneratingLink(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(magicLinkUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const pct = assignment.total_modules > 0
    ? Math.round((assignment.completed_modules / assignment.total_modules) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* Info */}
      <div style={{ padding: '4px 24px 20px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>{assignment.learner_email}</div>

        {/* Info pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12, background: 'var(--surface-2)', color: 'var(--text-secondary)',
            padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>
            {assignment.roadmap_title}
          </span>
          {assignment.activation_date ? (
            <span style={{ fontSize: 12, background: '#DCFCE7', color: '#16A34A',
              padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>
              Active from {assignment.activation_date}
            </span>
          ) : (
            <span style={{ fontSize: 12, background: 'var(--surface-3)', color: 'var(--text-tertiary)',
              padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
              Awaiting activation
            </span>
          )}
          <span style={{ fontSize: 12, background: 'var(--surface-2)', color: 'var(--text-secondary)',
            padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
            Enrolled {new Date(assignment.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Progress bar */}
        {assignment.total_modules > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12,
              color: 'var(--text-secondary)', marginBottom: 4 }}>
              <span>Progress</span>
              <span>{assignment.completed_modules}/{assignment.total_modules} modules ({pct}%)</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={onActivate}>
            {assignment.activation_date ? 'Edit activation' : 'Set activation'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleResendLink} disabled={generatingLink}>
            {generatingLink ? <Spinner size={12} /> : 'Generate magic link'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={onRemove}>Remove</button>
        </div>

        {/* Magic link display */}
        {magicLinkUrl && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <input readOnly value={magicLinkUrl} style={{
              flex: 1, fontFamily: 'monospace', fontSize: 11,
              background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '6px 10px', minWidth: 0,
            }} onFocus={(e) => e.target.select()} />
            <button className="btn btn-secondary btn-sm" onClick={handleCopy} style={{ flexShrink: 0 }}>
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {/* Module activity log */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Module activity
        </div>

        {loadingModules ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size={20} /></div>
        ) : modules.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: 32 }}>
            No module activity yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {modules.map((mod) => {
              const s = STATUS_COLORS[mod.status] ?? STATUS_COLORS.locked;
              return (
                <div key={mod.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)', background: '#fff',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px',
                    borderRadius: 'var(--radius-full)', background: s.bg, color: s.color,
                    flexShrink: 0, minWidth: 72, textAlign: 'center' }}>
                    {s.label}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, lineHeight: 1.4 }}>
                    {mod.title}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                    {mod.completed_at
                      ? new Date(mod.completed_at).toLocaleDateString()
                      : mod.started_at
                        ? `Started ${new Date(mod.started_at).toLocaleDateString()}`
                        : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
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
  const [detailAssignment, setDetailAssignment] = useState<Assignment | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRoadmap, setFilterRoadmap] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  const load = () => Promise.all([
    assignmentsApi.list(), usersApi.list(), roadmapsApi.list(),
  ]).then(([a, u, r]) => {
    setAssignments(a); setUsers(u); setRoadmaps(r);
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleAddLearnerDone = (assignment: Assignment) => {
    setAssignments((prev) => [assignment, ...prev]);
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
      const updated = { ...activating, activation_date: date, trigger_source: 'manual_admin' };
      setAssignments((prev) => prev.map((a) => a.id === activating.id ? updated : a));
      if (detailAssignment?.id === activating.id) setDetailAssignment(updated);
      setModal(null); setActivating(null);
    } catch { setError('Could not set activation date.'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await assignmentsApi.deactivate(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      if (detailAssignment?.id === id) setDetailAssignment(null);
    } catch { setError('Could not remove assignment.'); }
  };

  // Filter + sort
  const statusOf = (a: Assignment) => {
    if (a.completed_modules > 0 && a.completed_modules === a.total_modules) return 'completed';
    if (a.activation_date) return 'active';
    return 'awaiting';
  };

  const filtered = assignments
    .filter((a) => {
      if (search && !a.learner_name.toLowerCase().includes(search.toLowerCase()) &&
          !a.learner_email.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterRoadmap && a.roadmap_id !== filterRoadmap) return false;
      if (filterStatus && statusOf(a) !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.learner_name.localeCompare(b.learner_name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Assignments"
        subtitle="Connect learners to roadmaps and manage activation"
        action={<button className="btn btn-primary" onClick={() => setModal('addLearner')}>+ Add learner</button>}
      />

      {error && <div style={{ marginBottom: 16 }}><Alert type="error">{error}</Alert></div>}

      {/* Filter bar */}
      {assignments.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ flex: '1 1 180px', maxWidth: 240, fontSize: 13, padding: '7px 12px' }}
            placeholder="Search by name or email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-input form-select"
            style={{ flex: '0 0 auto', fontSize: 13, padding: '7px 12px' }}
            value={filterRoadmap} onChange={(e) => setFilterRoadmap(e.target.value)}>
            <option value="">All roadmaps</option>
            {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
          <select className="form-input form-select"
            style={{ flex: '0 0 auto', fontSize: 13, padding: '7px 12px' }}
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="awaiting">Awaiting activation</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <select className="form-input form-select"
            style={{ flex: '0 0 auto', fontSize: 13, padding: '7px 12px' }}
            value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}>
            <option value="date">Newest first</option>
            <option value="name">Name A–Z</option>
          </select>
          {(search || filterRoadmap || filterStatus) && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
              onClick={() => { setSearch(''); setFilterRoadmap(''); setFilterStatus(''); }}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {assignments.length === 0 ? (
        <EmptyState icon="◎" title="No assignments yet"
          description="Add a learner to get started — you'll create their account, assign a roadmap, and send them a magic link in one step."
          action={<button className="btn btn-primary" onClick={() => setModal('addLearner')}>Add first learner</button>}
        />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: 14 }}>
          No learners match your filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((a) => {
            const pct = a.total_modules > 0
              ? Math.round((a.completed_modules / a.total_modules) * 100) : 0;
            const status = statusOf(a);

            return (
              <div key={a.id} className="card"
                onClick={() => setDetailAssignment(a)}
                style={{ padding: '14px 20px', cursor: 'pointer', transition: 'box-shadow 120ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                        {a.learner_name}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px',
                        borderRadius: 'var(--radius-full)',
                        background: status === 'completed' ? '#DCFCE7' : status === 'active' ? '#EFF6FF' : 'var(--surface-3)',
                        color: status === 'completed' ? '#16A34A' : status === 'active' ? '#2563EB' : 'var(--text-tertiary)',
                      }}>
                        {status === 'completed' ? 'Completed' : status === 'active' ? 'Active' : 'Awaiting activation'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      {a.learner_email} · {a.roadmap_title}
                    </div>
                    {a.total_modules > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="progress-bar" style={{ maxWidth: 200, flex: 1 }}>
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {a.completed_modules}/{a.total_modules} ({pct}%)
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0, textAlign: 'right' }}>
                    <div>Enrolled {new Date(a.created_at).toLocaleDateString()}</div>
                    {a.activation_date && (
                      <div style={{ marginTop: 2 }}>Active from {a.activation_date}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Learner detail slide-over */}
      <SlideOver isOpen={!!detailAssignment} onClose={() => setDetailAssignment(null)}
        title={detailAssignment?.learner_name ?? ''}>
        {detailAssignment && (
          <LearnerDetail
            assignment={detailAssignment}
            onClose={() => setDetailAssignment(null)}
            onActivate={() => { setActivating(detailAssignment); setModal('activate'); }}
            onRemove={() => { setDetailAssignment(null); handleDeactivate(detailAssignment.id); }}
          />
        )}
      </SlideOver>

      {/* Add Learner modal */}
      <Modal isOpen={modal === 'addLearner'} onClose={() => setModal(null)} title="Add learner">
        <AddLearnerForm roadmaps={roadmaps} onDone={handleAddLearnerDone} onCancel={() => setModal(null)} />
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)',
            fontSize: 12, cursor: 'pointer', padding: 0 }} onClick={() => setModal('assign')}>
            Assign an existing learner instead →
          </button>
        </div>
      </Modal>

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
