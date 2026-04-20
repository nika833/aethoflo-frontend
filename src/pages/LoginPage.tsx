import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, magicLinkApi } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { Spinner, Alert } from '../components/ui';

type Tab = 'password' | 'magic';

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.login(email, password);
      setAuth(user, token);
      navigate(user.role === 'admin' ? '/admin' : '/learner');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await magicLinkApi.request(email);
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    color: active ? 'var(--accent)' : 'var(--text-tertiary)',
    fontWeight: active ? 600 : 400,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 150ms',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(245,135,75,0.06) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(245,135,75,0.04) 0%, transparent 50%)
        `,
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 400,
        animation: 'fadeUp 300ms var(--ease-out) both',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/logo.svg" alt="AethoFlo" style={{ height: 56, width: 'auto', marginBottom: 10 }} />
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
            Roadmap-based training delivery
          </p>
        </div>

        <div className="card card-padded" style={{ boxShadow: 'var(--shadow-md)', padding: 0, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button style={tabStyle(tab === 'magic')} onClick={() => { setTab('magic'); setError(''); setSent(false); }}>
              Email link
            </button>
            <button style={tabStyle(tab === 'password')} onClick={() => { setTab('password'); setError(''); setSent(false); }}>
              Password
            </button>
          </div>

          <div style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 20, color: 'var(--text-primary)' }}>Sign in</h4>

            {error && (
              <div style={{ marginBottom: 16 }}>
                <Alert type="error">{error}</Alert>
              </div>
            )}

            {tab === 'magic' ? (
              sent ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>Check your inbox</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    We sent a login link to <strong>{email}</strong>. Click it to sign in — no password needed.
                  </p>
                  <button
                    style={{ marginTop: 20, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14 }}
                    onClick={() => { setSent(false); setEmail(''); }}
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleMagicRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      className="form-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@organization.com"
                      required
                      autoFocus
                    />
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
                    We'll email you a one-click login link — no password required.
                  </p>
                  <button
                    className="btn btn-primary btn-lg"
                    type="submit"
                    disabled={loading}
                    style={{ marginTop: 4 }}
                  >
                    {loading ? <Spinner size={18} /> : 'Send login link'}
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@organization.com"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  className="btn btn-primary btn-lg"
                  type="submit"
                  disabled={loading}
                  style={{ marginTop: 4 }}
                >
                  {loading ? <Spinner size={18} /> : 'Sign in'}
                </button>
              </form>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)', marginTop: 20 }}>
          Questions? Email{' '}
          <a href="mailto:nika@corvaco.com" style={{ color: 'var(--accent)' }}>nika@corvaco.com</a>
        </p>
      </div>
    </div>
  );
}
