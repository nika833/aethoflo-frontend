import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { magicLinkApi } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { Spinner } from '../components/ui';

export default function MagicLinkPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('Invalid link.'); return; }
    magicLinkApi.redeem(token)
      .then(({ token: jwt, user }) => {
        setAuth(
          { id: user.id, email: user.email, display_name: user.display_name, role: user.role as 'admin' | 'learner', organization_id: user.org },
          jwt
        );
        navigate(user.role === 'admin' ? '/admin' : '/learner', { replace: true });
      })
      .catch((err) => {
        const msg = err?.response?.data?.error ?? 'This link has expired or is invalid.';
        setError(msg);
      });
  }, [token]);

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#FAF5EF', padding: 24,
      }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
          <h2 style={{ color: '#2A1810', marginBottom: 12 }}>Link expired</h2>
          <p style={{ color: '#57534E', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>{error}</p>
          <a href="/login" style={{ color: '#E87A4E', fontWeight: 500 }}>Go to login →</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FAF5EF',
    }}>
      <div style={{ textAlign: 'center' }}>
        <Spinner size={32} />
        <p style={{ marginTop: 16, color: '#57534E', fontSize: 15 }}>Signing you in…</p>
      </div>
    </div>
  );
}
