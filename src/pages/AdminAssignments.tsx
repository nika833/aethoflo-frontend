import React, { useEffect, useState } from 'react';
import { assignmentsApi, usersApi, roadmapsApi, magicLinkApi, learnerProgressApi } from '../lib/api';
import { Modal, SlideOver, EmptyState, PageHeader, Alert, Spinner, StatusBadge } from '../components/ui';

interface User { id: string; display_name: string; email: string; role: string; group_label: string | null; }
interface Roadmap { id: string; title: string; }
interface Assignment {
  id: string; learner_name: string; learner_email: string;
  roadmap_title: string; roadmap_id: string; learner_id: string;
  is_active: boolean; created_at: string;
  activation_date: string | null; trigger_source: string | null;
  completed_modules: number; total_modules: number;
  allow_early_release: boolean;
  learner_group_label: string | null;
}
interface ModuleProgress {
  id: string; title: string; status: string;
  started_at: string | null; completed_at: string | null;
}

// ─── Add Learner Form ─────────────────────────────────────────────────────────

function AddLearnerForm({ roadmaps, existingGroups, onDone, onCancel, onAssignExisting }: {
  roadmaps: Roadmap[];
  existingGroups: string[];
  onDone: (assignment: Assignment) => void;
  onCancel: () => void;
  onAssignExisting: () => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [groupLabel, setGroupLabel] = useState('');
  const [roadmapId, setRoadmapId] = useState('');
  const [activationDate, setActivationDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicateEmail, setDuplicateEmail] = useState('');
  const [magicLinkUrl, setMagicLinkUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim() || !email.trim() || !roadmapId) return;
    setSaving(true); setError(''); setDuplicateEmail('');
    try {
      const created = await usersApi.create({
        display_name: displayName.trim(), email: email.trim(),
        phone_number: phone.trim() || null, role: 'learner',
        group_label: groupLabel.trim() || null,
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
        learner_group_label: created.group_label ?? null,
      });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setDuplicateEmail(email.trim());
      } else {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          ?? 'Could not add learner.';
        setError(msg);
      }
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

  if (duplicateEmail) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#92400E', marginBottom: 4 }}>
            Account already exists
          </div>
          <div style={{ fontSize: 13, color: '#92400E' }}>
            <strong>{duplicateEmail}</strong> already has an account. Use "Assign existing learner" to add them to a roadmap without creating a duplicate.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setDuplicateEmail('')}>Go back</button>
          <button className="btn btn-primary" onClick={onAssignExisting}>Assign existing learner →</button>
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
        <label className="form-label">Group <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>(optional — e.g. Sales, New Hires)</span></label>
        <input list="add-learner-groups" className="form-input" value={groupLabel}
          onChange={(e) => setGroupLabel(e.target.value)} placeholder="Type or select a group" />
        <datalist id="add-learner-groups">
          {existingGroups.map((g) => <option key={g} value={g} />)}
        </datalist>
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

// ─── Bulk Assign Form ─────────────────────────────────────────────────────────

function BulkAssignForm({ users, roadmaps, existingAssignments, onDone, onCancel }: {
  users: User[]; roadmaps: Roadmap[];
  existingAssignments: Assignment[];
  onDone: (added: Assignment[]) => void;
  onCancel: () => void;
}) {
  const [roadmapId, setRoadmapId] = useState('');
  const [activationDate, setActivationDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const assignedLearnerIds = new Set(existingAssignments.map((a) => a.learner_id));
  const learners = users.filter((u) => u.role === 'learner');
  const filteredLearners = learners.filter((u) =>
    !search || u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => setSelectedIds((prev) => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const handleSave = async () => {
    if (!roadmapId || selectedIds.size === 0) return;
    setSaving(true); setError('');
    const added: Assignment[] = [];
    try {
      for (const learnerId of [...selectedIds]) {
        const a = await assignmentsApi.create({
          learner_id: learnerId, roadmap_id: roadmapId,
          ...(activationDate ? { activation_date: activationDate } : {}),
        });
        const u = users.find((x) => x.id === learnerId);
        const r = roadmaps.find((x) => x.id === roadmapId);
        added.push({
          ...a, learner_name: u?.display_name ?? '', learner_email: u?.email ?? '',
          roadmap_title: r?.title ?? '', completed_modules: 0, total_modules: 0,
          learner_group_label: u?.group_label ?? null,
        });
      }
      onDone(added);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Some assignments failed.';
      setError(msg);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <Alert type="error">{error}</Alert>}
      <div className="form-group">
        <label className="form-label">Roadmap <span style={{ color: 'var(--accent)' }}>*</span></label>
        <select className="form-select form-input" value={roadmapId} onChange={(e) => setRoadmapId(e.target.value)}>
          <option value="">— Select roadmap —</option>
          {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Activation date <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>(optional)</span></label>
        <input type="date" className="form-input" value={activationDate} onChange={(e) => setActivationDate(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Select learners <span style={{ color: 'var(--accent)' }}>*</span></label>
        <input className="form-input" style={{ marginBottom: 8, fontSize: 13 }}
          placeholder="Search learners…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          maxHeight: 240, overflowY: 'auto' }}>
          {filteredLearners.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>No learners found</div>
          ) : filteredLearners.map((u) => {
            const alreadyAssigned = roadmapId ? assignedLearnerIds.has(u.id) &&
              existingAssignments.some((a) => a.learner_id === u.id && a.roadmap_id === roadmapId) : false;
            return (
              <label key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                cursor: alreadyAssigned ? 'default' : 'pointer',
                opacity: alreadyAssigned ? 0.45 : 1,
                borderBottom: '1px solid var(--border-light)',
              }}>
                <input type="checkbox" disabled={alreadyAssigned}
                  checked={selectedIds.has(u.id)} onChange={() => !alreadyAssigned && toggle(u.id)}
                  style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{u.display_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.email}{u.group_label ? ` · ${u.group_label}` : ''}
                  </div>
                </div>
                {alreadyAssigned && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Already assigned</span>}
              </label>
            );
          })}
        </div>
        {selectedIds.size > 0 && (
          <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, fontWeight: 500 }}>
            {selectedIds.size} learner{selectedIds.size > 1 ? 's' : ''} selected
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!roadmapId || selectedIds.size === 0 || saving}
          onClick={handleSave}>
          {saving ? <Spinner size={16} /> : `Assign ${selectedIds.size > 0 ? selectedIds.size : ''} learner${selectedIds.size !== 1 ? 's' : ''}`}
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

function LearnerDetail({ assignment, onClose, onActivate, onRemove, onEarlyReleaseToggle, onArchiveLearner }: {
  assignment: Assignment;
  onClose: () => void;
  onActivate: () => void;
  onRemove: () => void;
  onEarlyReleaseToggle: (val: boolean) => void;
  onArchiveLearner: () => void;
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
          {assignment.learner_group_label && (
            <span style={{ fontSize: 12, background: '#F3F0FF', color: '#7C3AED',
              padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>
              {assignment.learner_group_label}
            </span>
          )}
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

        {/* Early release toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
          marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Early release</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
              Learner can access upcoming modules before their scheduled date
            </div>
          </div>
          <button
            onClick={() => onEarlyReleaseToggle(!assignment.allow_early_release)}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: assignment.allow_early_release ? 'var(--accent)' : 'var(--border)',
              position: 'relative', transition: 'background 150ms', flexShrink: 0,
            }}>
            <span style={{
              position: 'absolute', top: 2, left: assignment.allow_early_release ? 20 : 2,
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={onActivate}>
            {assignment.activation_date ? 'Edit activation' : 'Set activation'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleResendLink} disabled={generatingLink}>
            {generatingLink ? <Spinner size={12} /> : 'Generate magic link'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onRemove}
            style={{ color: 'var(--text-secondary)' }}>
            Remove assignment
          </button>
          <button className="btn btn-danger btn-sm" onClick={onArchiveLearner}>
            Archive learner
          </button>
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
  const [modal, setModal] = useState<'addLearner' | 'assign' | 'bulkAssign' | 'activate' | null>(null);
  const [activating, setActivating] = useState<Assignment | null>(null);
  const [detailAssignment, setDetailAssignment] = useState<Assignment | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkActivationDate, setBulkActivationDate] = useState('');
  const [showBulkDateInput, setShowBulkDateInput] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRoadmap, setFilterRoadmap] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  const load = () => Promise.all([
    assignmentsApi.list().catch(() => []),
    usersApi.list().catch(() => []),
    roadmapsApi.list().catch(() => []),
  ]).then(([a, u, r]) => {
    setAssignments(a); setUsers(u); setRoadmaps(r);
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleAddLearnerDone = (assignment: Assignment) => {
    setAssignments((prev) => [assignment, ...prev]);
  };

  const handleBulkAssignDone = (added: Assignment[]) => {
    setAssignments((prev) => [...added, ...prev]);
    setModal(null);
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
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } catch { setError('Could not remove assignment.'); }
  };

  const handleArchiveLearner = async (learnerId: string) => {
    if (!confirm('Archive this learner? Their account will be deactivated and they will lose access. You can restore them later.')) return;
    try {
      await usersApi.archive(learnerId);
      setAssignments((prev) => prev.filter((a) => a.learner_id !== learnerId));
      setDetailAssignment(null);
    } catch { setError('Could not archive learner.'); }
  };

  const handleEarlyRelease = async (id: string, val: boolean) => {
    try {
      await assignmentsApi.setEarlyRelease(id, val);
      const update = (a: Assignment) => a.id === id ? { ...a, allow_early_release: val } : a;
      setAssignments((prev) => prev.map(update));
      if (detailAssignment?.id === id) setDetailAssignment((prev) => prev ? update(prev) : prev);
    } catch { setError('Could not update early release.'); }
  };

  const handleBulkEarlyRelease = async (val: boolean) => {
    if (selected.size === 0) return;
    setBulkSaving(true);
    try {
      await assignmentsApi.bulkUpdate([...selected], { allow_early_release: val });
      setAssignments((prev) => prev.map((a) =>
        selected.has(a.id) ? { ...a, allow_early_release: val } : a));
      setSelected(new Set());
    } catch { setError('Bulk update failed.'); }
    finally { setBulkSaving(false); }
  };

  const handleBulkActivate = async () => {
    if (!bulkActivationDate || selected.size === 0) return;
    setBulkSaving(true);
    try {
      await assignmentsApi.bulkUpdate([...selected], { activation_date: bulkActivationDate });
      setAssignments((prev) => prev.map((a) =>
        selected.has(a.id) ? { ...a, activation_date: bulkActivationDate, trigger_source: 'manual_admin' } : a));
      setSelected(new Set()); setShowBulkDateInput(false); setBulkActivationDate('');
    } catch { setError('Bulk activation failed.'); }
    finally { setBulkSaving(false); }
  };

  // Filter + sort
  const statusOf = (a: Assignment) => {
    if (a.completed_modules > 0 && a.completed_modules === a.total_modules) return 'completed';
    if (a.activation_date) return 'active';
    return 'awaiting';
  };

  const groups = [...new Set(assignments.map((a) => a.learner_group_label).filter(Boolean) as string[])].sort();

  const filtered = assignments
    .filter((a) => {
      if (search && !a.learner_name.toLowerCase().includes(search.toLowerCase()) &&
          !a.learner_email.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterRoadmap && a.roadmap_id !== filterRoadmap) return false;
      if (filterStatus && statusOf(a) !== filterStatus) return false;
      if (filterGroup && a.learner_group_label !== filterGroup) return false;
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
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setModal('bulkAssign')}>Bulk assign</button>
            <button className="btn btn-primary" onClick={() => setModal('addLearner')}>+ Add learner</button>
          </div>
        }
      />

      {error && <div style={{ marginBottom: 16 }}><Alert type="error">{error}</Alert></div>}

      {/* Filter bar — single row */}
      {assignments.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ width: 200, flexShrink: 0, fontSize: 13, padding: '7px 12px' }}
            placeholder="Search…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-input form-select"
            style={{ width: 180, flexShrink: 0, fontSize: 13, padding: '7px 12px' }}
            value={filterRoadmap} onChange={(e) => setFilterRoadmap(e.target.value)}>
            <option value="">All roadmaps</option>
            {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
          <select className="form-input form-select"
            style={{ width: 170, flexShrink: 0, fontSize: 13, padding: '7px 12px' }}
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="awaiting">Awaiting activation</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          {groups.length > 0 && (
            <select className="form-input form-select"
              style={{ width: 150, flexShrink: 0, fontSize: 13, padding: '7px 12px' }}
              value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
              <option value="">All groups</option>
              {groups.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
          <select className="form-input form-select"
            style={{ width: 140, flexShrink: 0, fontSize: 13, padding: '7px 12px' }}
            value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}>
            <option value="date">Newest first</option>
            <option value="name">Name A–Z</option>
          </select>
          {(search || filterRoadmap || filterStatus || filterGroup) && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, flexShrink: 0 }}
              onClick={() => { setSearch(''); setFilterRoadmap(''); setFilterStatus(''); setFilterGroup(''); }}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '10px 16px', marginBottom: 12, borderRadius: 'var(--radius-md)',
          background: '#FEF0E9', border: '1px solid rgba(201,107,71,0.25)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginRight: 4 }}>
            {selected.size} selected
          </span>
          <button className="btn btn-secondary btn-sm"
            onClick={() => handleBulkEarlyRelease(true)} disabled={bulkSaving}>
            Enable early release
          </button>
          <button className="btn btn-secondary btn-sm"
            onClick={() => handleBulkEarlyRelease(false)} disabled={bulkSaving}>
            Disable early release
          </button>
          {showBulkDateInput ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="date" className="form-input"
                style={{ fontSize: 12, padding: '5px 10px', width: 140 }}
                value={bulkActivationDate} onChange={(e) => setBulkActivationDate(e.target.value)} />
              <button className="btn btn-primary btn-sm" disabled={!bulkActivationDate || bulkSaving}
                onClick={handleBulkActivate}>
                {bulkSaving ? <Spinner size={12} /> : 'Set'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowBulkDateInput(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowBulkDateInput(true)}>
              Set activation date
            </button>
          )}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 12 }}
            onClick={() => setSelected(new Set())}>
            Deselect all
          </button>
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
          {/* Select all row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px' }}>
            <input type="checkbox"
              checked={filtered.length > 0 && filtered.every((a) => selected.has(a.id))}
              onChange={(e) => {
                if (e.target.checked) setSelected(new Set(filtered.map((a) => a.id)));
                else setSelected(new Set());
              }}
              style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Select all ({filtered.length})
            </span>
          </div>

          {filtered.map((a) => {
            const pct = a.total_modules > 0
              ? Math.round((a.completed_modules / a.total_modules) * 100) : 0;
            const status = statusOf(a);
            const isSelected = selected.has(a.id);

            return (
              <div key={a.id} className="card"
                style={{
                  padding: '14px 20px', cursor: 'pointer', transition: 'box-shadow 120ms',
                  outline: isSelected ? '2px solid var(--accent)' : 'none',
                  outlineOffset: -1,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <input type="checkbox" checked={isSelected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      setSelected((prev) => {
                        const s = new Set(prev);
                        e.target.checked ? s.add(a.id) : s.delete(a.id);
                        return s;
                      });
                    }}
                    style={{ width: 15, height: 15, marginTop: 3, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setDetailAssignment(a)}>
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
                      {a.allow_early_release && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px',
                          borderRadius: 'var(--radius-full)', background: '#FEF3C7', color: '#D97706' }}>
                          Early release
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      {a.learner_email} · {a.roadmap_title}
                      {a.learner_group_label && (
                        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600,
                          background: '#F3F0FF', color: '#7C3AED',
                          padding: '1px 7px', borderRadius: 'var(--radius-full)' }}>
                          {a.learner_group_label}
                        </span>
                      )}
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
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0, textAlign: 'right' }}
                    onClick={() => setDetailAssignment(a)}>
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
            onEarlyReleaseToggle={(val) => handleEarlyRelease(detailAssignment.id, val)}
            onArchiveLearner={() => handleArchiveLearner(detailAssignment.learner_id)}
          />
        )}
      </SlideOver>

      {/* Add Learner modal */}
      <Modal isOpen={modal === 'addLearner'} onClose={() => setModal(null)} title="Add learner">
        <AddLearnerForm
          roadmaps={roadmaps}
          existingGroups={[...new Set(users.filter(u => u.group_label).map(u => u.group_label!))].sort()}
          onDone={handleAddLearnerDone}
          onCancel={() => setModal(null)}
          onAssignExisting={() => setModal('assign')}
        />
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

      <Modal isOpen={modal === 'bulkAssign'} onClose={() => setModal(null)} title="Bulk assign learners">
        <BulkAssignForm users={users} roadmaps={roadmaps} existingAssignments={assignments}
          onDone={handleBulkAssignDone} onCancel={() => setModal(null)} />
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
