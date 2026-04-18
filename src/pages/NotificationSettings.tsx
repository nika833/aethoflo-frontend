import React, { useEffect, useState } from 'react';
import { PageHeader, Alert, Spinner } from '../components/ui';
import api from '../lib/api';

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState({ phone_number: '', notify_sms: false, notify_email: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/me/notifications').then((r) => {
      setPrefs({
        phone_number: r.data.phone_number ?? '',
        notify_sms: r.data.notify_sms ?? false,
        notify_email: r.data.notify_email ?? false,
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.patch('/users/me/notifications', {
        phone_number: prefs.phone_number.trim() || null,
        notify_sms: prefs.notify_sms,
        notify_email: prefs.notify_email,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError('Could not save preferences.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={24} /></div>;

  return (
    <div className="animate-fade-up" style={{ maxWidth: 520 }}>
      <PageHeader title="Notification settings" subtitle="Choose how you want to be reminded about your training" />

      <div className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div className="form-group">
          <label className="form-label">Mobile number</label>
          <input className="form-input" type="tel" value={prefs.phone_number}
            onChange={(e) => setPrefs((p) => ({ ...p, phone_number: e.target.value }))}
            placeholder="+1 555 000 0000" />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Required for SMS reminders. Standard message rates apply.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
            letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Remind me when a new module unlocks
          </div>

          {[
            { key: 'notify_sms', label: 'Text message (SMS)', desc: 'A short text to your mobile number', icon: '💬' },
            { key: 'notify_email', label: 'Email', desc: 'A reminder sent to your account email', icon: '✉️' },
          ].map(({ key, label, desc, icon }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${prefs[key as keyof typeof prefs] ? 'var(--accent-mid)' : 'var(--border-light)'}`,
              background: prefs[key as keyof typeof prefs] ? 'var(--accent-light)' : 'var(--surface-2)',
              cursor: 'pointer', transition: 'all 150ms' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
              </div>
              <input type="checkbox" checked={!!prefs[key as keyof typeof prefs]}
                onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            </label>
          ))}
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {saved && <Alert type="success">Preferences saved!</Alert>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={16} /> : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
