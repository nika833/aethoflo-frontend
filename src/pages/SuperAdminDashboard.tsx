import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../lib/api';
import { useAuthStore } from '../lib/authStore';

interface Org {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  created_at: string;
  admin_count: number;
  learner_count: number;
  roadmap_count: number;
  last_activity: string | null;
}

export default function SuperAdminDashboard() {
  const { clearAuth } = useAuthStore();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOrg, setNewOrg] = useState({ org_name: '', admin_name: '', admin_email: '' });
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    superAdminApi.listOrgs()
      .then(setOrgs)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await superAdminApi.createOrg(newOrg);
      setCreatedLink(result.magic_link);
      setNewOrg({ org_name: '', admin_name: '', admin_email: '' });
      load();
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (org: Org) => {
    const next = org.status === 'active' ? 'inactive' : 'active';
    await superAdminApi.updateOrg(org.id, { status: next });
    showToast(`${org.name} set to ${next}`);
    load();
  };

  const resendInvite = async (org: Org) => {
    const result = await superAdminApi.resendInvite(org.id);
    await navigator.clipboard.writeText(result.magic_link);
    showToast('Invite link copied to clipboard');
  };

  const fmt = (d: string | null) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div style={{ minHeight: '100vh', background: '#FAF5EF', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#2A1810', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#FAF5EF' }}>
            aetho<em style={{ fontStyle: 'italic', color: '#E87A4E' }}>flo</em>
          </span>
          <span style={{ color: 'rgba(250,245,239,0.4)', fontSize: 13 }}>/ super admin</span>
        </div>
        <button
          onClick={() => { clearAuth(); window.location.href = '/login'; }}
          style={{ background: 'none', border: '1px solid rgba(250,245,239,0.2)', color: 'rgba(250,245,239,0.6)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        >
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        {/* Page title + create button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#2A1810', margin: 0 }}>Organizations</h1>
            <p style={{ color: '#78716C', fontSize: 14, margin: '4px 0 0' }}>{orgs.length} org{orgs.length !== 1 ? 's' : ''} total</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setCreatedLink(null); }}
            style={{ background: '#E87A4E', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            + New Organization
          </button>
        </div>

        {/* Create org modal */}
        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              {createdLink ? (
                <>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: '#2A1810', marginTop: 0 }}>Organization created ✓</h2>
                  <p style={{ color: '#57534E', fontSize: 14, marginBottom: 16 }}>
                    A welcome email has been sent. Share this magic link if needed:
                  </p>
                  <div style={{ background: '#F5F5F4', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#1C1917', wordBreak: 'break-all', marginBottom: 20 }}>
                    {createdLink}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => { navigator.clipboard.writeText(createdLink); showToast('Copied!'); }}
                      style={{ flex: 1, background: '#E87A4E', color: '#fff', border: 'none', padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Copy link
                    </button>
                    <button
                      onClick={() => { setShowCreate(false); setCreatedLink(null); }}
                      style={{ flex: 1, background: '#F5F5F4', color: '#57534E', border: 'none', padding: '10px 0', borderRadius: 8, cursor: 'pointer' }}
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: '#2A1810', marginTop: 0 }}>New Organization</h2>
                  <form onSubmit={handleCreate}>
                    {[
                      { label: 'Organization name', key: 'org_name', placeholder: 'Corva Behavioral Health' },
                      { label: 'Admin name', key: 'admin_name', placeholder: 'Jane Smith' },
                      { label: 'Admin email', key: 'admin_email', placeholder: 'jane@org.com' },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2A1810', marginBottom: 6 }}>{label}</label>
                        <input
                          type={key === 'admin_email' ? 'email' : 'text'}
                          required
                          placeholder={placeholder}
                          value={newOrg[key as keyof typeof newOrg]}
                          onChange={(e) => setNewOrg({ ...newOrg, [key]: e.target.value })}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #E7E5E4', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <button
                        type="submit"
                        disabled={creating}
                        style={{ flex: 1, background: '#E87A4E', color: '#fff', border: 'none', padding: '11px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                      >
                        {creating ? 'Creating…' : 'Create & send invite'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreate(false)}
                        style={{ flex: 1, background: '#F5F5F4', color: '#57534E', border: 'none', padding: '11px 0', borderRadius: 8, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* Orgs table */}
        {loading ? (
          <p style={{ color: '#78716C' }}>Loading…</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E7E5E4', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F4', borderBottom: '1px solid #E7E5E4' }}>
                  {['Organization', 'Admins', 'Learners', 'Roadmaps', 'Last activity', 'Status', ''].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map((org, i) => (
                  <tr key={org.id} style={{ borderBottom: i < orgs.length - 1 ? '1px solid #F5F5F4' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1C1917', fontSize: 14 }}>{org.name}</div>
                      <div style={{ fontSize: 12, color: '#A8A29E', marginTop: 2 }}>{org.slug}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#57534E', fontSize: 14 }}>{org.admin_count}</td>
                    <td style={{ padding: '14px 16px', color: '#57534E', fontSize: 14 }}>{org.learner_count}</td>
                    <td style={{ padding: '14px 16px', color: '#57534E', fontSize: 14 }}>{org.roadmap_count}</td>
                    <td style={{ padding: '14px 16px', color: '#57534E', fontSize: 13 }}>{fmt(org.last_activity)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                        background: org.status === 'active' ? '#DCFCE7' : '#F5F5F4',
                        color: org.status === 'active' ? '#16A34A' : '#78716C',
                      }}>
                        {org.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => resendInvite(org)}
                          style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #E7E5E4', background: '#fff', cursor: 'pointer', color: '#57534E' }}
                        >
                          Resend invite
                        </button>
                        <button
                          onClick={() => toggleStatus(org)}
                          style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #E7E5E4', background: '#fff', cursor: 'pointer', color: org.status === 'active' ? '#DC2626' : '#16A34A' }}
                        >
                          {org.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#A8A29E', fontSize: 14 }}>
                      No organizations yet. Create your first one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2A1810', color: '#FAF5EF', padding: '10px 20px', borderRadius: 8, fontSize: 14, zIndex: 100 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
