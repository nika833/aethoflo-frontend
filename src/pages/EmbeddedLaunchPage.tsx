import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { Spinner } from '../components/ui';

/**
 * Handles embedded launch from external app.
 * External app redirects to: /launch?token=<signed_jwt>
 */
export default function EmbeddedLaunchPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No launch token provided. Please open this from your organization app.');
      return;
    }

    authApi.embeddedLaunch(token)
      .then(({ token: aethoToken, user }) => {
        setAuth(user, aethoToken);
        navigate(user.role === 'admin' ? '/admin' : '/learner', { replace: true });
      })
      .catch(() => {
        setError('Launch failed. Your session may have expired — please re-open from the app.');
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'var(--surface)',
    }}>
      {error ? (
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ marginBottom: 8 }}>Launch error</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/login')}>
            Go to login
          </button>
        </div>
      ) : (
        <>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            AethoFlo
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10,
            color: 'var(--text-secondary)', fontSize: 14 }}>
            <Spinner size={16} />
            <span>Starting your training session…</span>
          </div>
        </>
      )}
    </div>
  );
}
