import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { Spinner, Alert } from '../components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Subtle background texture */}
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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/logo.svg" alt="AethoFlo" style={{ height: 36, width: 'auto', marginBottom: 10 }} />
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
            Roadmap-based training delivery
          </p>
        </div>

        <div className="card card-padded" style={{ boxShadow: 'var(--shadow-md)' }}>
          <h4 style={{ marginBottom: 20, color: 'var(--text-primary)' }}>Sign in</h4>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert type="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 20 }}>
          No account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 500 }}>Create a free workspace</Link>
        </p>
      </div>
    </div>
  );
}
