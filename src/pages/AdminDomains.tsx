import React, { useEffect, useState } from 'react';
import { domainsApi } from '../lib/api';
import { Modal, EmptyState, PageHeader, Alert, Spinner } from '../components/ui';

interface Domain {
  id: string; name: string; description: string | null;
  display_order: number; module_count: number;
}

function DomainForm({
  initial, onSave, onCancel, loading,
}: {
  initial?: Partial<Domain>;
  onSave: (d: { name: string; description: string }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-group">
        <label className="form-label">Name <span style={{ color: 'var(--accent)' }}>*</span></label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Session Readiness" autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={desc} onChange={(e) => setDesc(e.target.value)}
          placeholder="Optional description of this domain..." rows={3} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!name.trim() || loading}
          onClick={() => onSave({ name: name.trim(), description: desc.trim() })}>
          {loading ? <Spinner size={16} /> : (initial?.id ? 'Save changes' : 'Create domain')}
        </button>
      </div>
    </div>
  );
}

export default function AdminDomains() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Domain | null>(null);

  const load = () => domainsApi.list().then(setDomains).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async (d: { name: string; description: string }) => {
    setSaving(true);
    setError('');
    try {
      const created = await domainsApi.create(d);
      setDomains((prev) => [...prev, { ...created, module_count: 0 }]);
      setModal(null);
    } catch { setError('Could not create domain.'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (d: { name: string; description: string }) => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const updated = await domainsApi.update(editing.id, d);
      setDomains((prev) => prev.map((dom) => dom.id === editing.id ? { ...dom, ...updated } : dom));
      setModal(null); setEditing(null);
    } catch { setError('Could not update domain.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this domain? Modules will be unassigned.')) return;
    try {
      await domainsApi.delete(id);
      setDomains((prev) => prev.filter((d) => d.id !== id));
    } catch { setError('Could not delete domain.'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Domains"
        subtitle="Organize module skills into categories"
        action={
          <button className="btn btn-primary" onClick={() => setModal('create')}>
            + New domain
          </button>
        }
      />

      {error && <div style={{ marginBottom: 16 }}><Alert type="error">{error}</Alert></div>}

      {domains.length === 0 ? (
        <EmptyState icon="◫" title="No domains yet"
          description="Create a domain to start organizing your module library."
          action={<button className="btn btn-primary" onClick={() => setModal('create')}>Create first domain</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {domains.map((domain) => (
            <div key={domain.id} className="card"
              style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)',
                  marginBottom: 2 }}>{domain.name}</div>
                {domain.description && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{domain.description}</div>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {domain.module_count} module{domain.module_count !== 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => { setEditing(domain); setModal('edit'); }}>
                  Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(domain.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="New domain">
        <DomainForm onSave={handleCreate} onCancel={() => setModal(null)} loading={saving} />
      </Modal>

      <Modal isOpen={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }} title="Edit domain">
        {editing && (
          <DomainForm initial={editing} onSave={handleEdit}
            onCancel={() => { setModal(null); setEditing(null); }} loading={saving} />
        )}
      </Modal>
    </div>
  );
}
