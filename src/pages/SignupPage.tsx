import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';
import { Spinner } from '../components/ui';

export default function SignupPage() {
  const [form, setForm] = useState({
    display_name: '', email: '', password: '', confirm: '',
    org_name: '', phone_number: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name.trim(),
          email: form.email.trim(),
          password: form.password,
          org_name: form.org_name.trim() || undefined,
          phone_number: form.phone_number.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Signup failed');
      setAuth(data.user, data.token);
      navigate('/admin');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface-2)', padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)', padding: '36px 32px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)', marginBottom: 6 }}>
            AethoFlo
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Create your training workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Your name</label>
            <input className="form-input" required value={form.display_name}
              onChange={(e) => set('display_name', e.target.value)}
              placeholder="Jane Smith" autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="jane@yourorg.com" />
          </div>

          <div className="form-group">
            <label className="form-label">Workspace name <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
            <input className="form-input" value={form.org_name}
              onChange={(e) => set('org_name', e.target.value)}
              placeholder="e.g. Acme Behavior Health" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" required value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="8+ characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm</label>
              <input className="form-input" type="password" required value={form.confirm}
                onChange={(e) => set('confirm', e.target.value)}
                placeholder="Repeat password" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Mobile number <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(for training reminders)</span>
            </label>
            <input className="form-input" type="tel" value={form.phone_number}
              onChange={(e) => set('phone_number', e.target.value)}
              placeholder="+1 555 000 0000" />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Optional — you can enable SMS reminders anytime in settings
            </span>
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#DC2626', background: '#FEF2F2',
              borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ marginTop: 4, width: '100%', justifyContent: 'center', padding: '12px' }}>
            {loading ? <Spinner size={18} /> : 'Create workspace'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
