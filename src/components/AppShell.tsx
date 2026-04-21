import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';
import { domainsApi, moduleSkillsApi, roadmapsApi } from '../lib/api';
import api from '../lib/api';

const ADMIN_NAV = [
  { to: '/admin',             label: 'Dashboard',      icon: '⊞' },
  { to: '/admin/domains',     label: 'Domains',        icon: '◫' },
  { to: '/admin/modules',     label: 'Module Library', icon: '⊟' },
  { to: '/admin/roadmaps',    label: 'Roadmaps',       icon: '⟶' },
  { to: '/admin/assignments', label: 'Assignments',    icon: '◎' },
  { to: '/admin/exports',     label: 'Exports',        icon: '↓' },
];

const LEARNER_NAV = [
  { to: '/learner',          label: 'My Roadmap',  icon: '◈' },
  { to: '/learner/progress', label: 'Progress',    icon: '◉' },
  { to: '/learner/saved',    label: 'Saved',       icon: '♥' },
];

const SIDEBAR_BG = '#5C3520';
const BORDER_COLOR = 'rgba(255,255,255,0.08)';
const ONBOARDING_KEY = 'aethoflo_onboarding_done';

// ─── Onboarding Floater ───────────────────────────────────────────────────────

function OnboardingFloater() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(ONBOARDING_KEY));
  const [steps, setSteps] = useState({ domains: false, modules: false, roadmaps: false });
  const [loading, setLoading] = useState(true);

  const check = () => {
    Promise.all([domainsApi.list(), moduleSkillsApi.list(), roadmapsApi.list()])
      .then(([doms, mods, roads]) => {
        setSteps({ domains: doms.length > 0, modules: mods.length > 0, roadmaps: roads.length > 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!dismissed) check();
  }, [location.pathname]);

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed || loading) return null;

  const allDone = steps.domains && steps.modules && steps.roadmaps;
  const nextStep = !steps.domains ? 'domains' : !steps.modules ? 'modules' : 'roadmaps';
  const nextPath = { domains: '/admin/domains', modules: '/admin/modules', roadmaps: '/admin/roadmaps' }[nextStep];
  const nextLabel = { domains: 'Create a domain →', modules: 'Build a module →', roadmaps: 'Create a roadmap →' }[nextStep];

  const stepRows = [
    { done: steps.domains,  label: 'Create at least one domain',  path: '/admin/domains' },
    { done: steps.modules,  label: 'Build your first module',      path: '/admin/modules' },
    { done: steps.roadmaps, label: 'Define a learning roadmap',    path: '/admin/roadmaps' },
  ];

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
      width: 320, borderRadius: 14,
      background: '#fff',
      boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid var(--border)',
      animation: 'fadeUp 300ms var(--ease-out) both',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--border-light)',
        background: allDone ? '#F0FDF4' : 'var(--accent-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{allDone ? '🎉' : '✦'}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            {allDone ? "You're all set!" : 'Quick setup'}
          </span>
        </div>
        <button onClick={dismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-tertiary)', fontSize: 18, lineHeight: 1,
          padding: '2px 4px', borderRadius: 4,
        }}>×</button>
      </div>

      {/* Steps */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stepRows.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            opacity: s.done ? 0.6 : 1,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: s.done ? '#D1FAE5' : 'var(--surface-3)',
              color: s.done ? '#065F46' : 'var(--text-tertiary)',
              fontSize: 11, fontWeight: 700,
              border: `1.5px solid ${s.done ? '#6EE7B7' : 'var(--border)'}`,
              transition: 'all 200ms',
            }}>
              {s.done ? '✓' : i + 1}
            </div>
            <span style={{
              flex: 1, fontSize: 13,
              color: s.done ? 'var(--text-tertiary)' : 'var(--text-primary)',
              textDecoration: s.done ? 'line-through' : 'none',
            }}>
              {s.label}
            </span>
            {!s.done && (
              <button onClick={() => navigate(s.path)} style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '2px 0',
                flexShrink: 0,
              }}>
                Go →
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '0 16px 14px' }}>
        {allDone ? (
          <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={dismiss}>
            Done — hide this
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" style={{ width: '100%' }}
            onClick={() => navigate(nextPath)}>
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Set Password Modal ───────────────────────────────────────────────────────

function SetPasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuthStore();

  const handleSave = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true); setError('');
    try {
      await api.patch(`/users/${user!.id}`, { password });
      setDone(true);
    } catch {
      setError('Could not set password. Try again.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: 28, width: 360,
        boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Set a password</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Lets you log in with email + password (useful for staging).
        </div>
        {done ? (
          <>
            <div style={{ fontSize: 14, color: '#065F46', background: '#D1FAE5',
              padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
              Password set. You can now use it on any environment.
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            {error && <div style={{ fontSize: 13, color: '#B91C1C', background: '#FEE2E2',
              padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <input type="password" className="form-input" placeholder="New password (min 8 chars)"
                value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              <input type="password" className="form-input" placeholder="Confirm password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !password || !confirm}>
                {saving ? 'Saving…' : 'Set password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const nav = user?.role === 'admin' ? ADMIN_NAV : LEARNER_NAV;
  const expanded = hovered;

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: expanded ? 220 : 60,
          background: SIDEBAR_BG,
          borderRight: `1px solid ${BORDER_COLOR}`,
          display: 'flex', flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          position: 'sticky', top: 0, height: '100vh',
        }}>

        {/* Logo */}
        <div style={{
          padding: '20px 0',
          display: 'flex', alignItems: 'center',
          justifyContent: expanded ? 'flex-start' : 'center',
          paddingLeft: expanded ? 18 : 0,
          borderBottom: `1px solid ${BORDER_COLOR}`,
          minHeight: 64,
          transition: 'padding 200ms cubic-bezier(0.4,0,0.2,1)',
        }}>
          {expanded ? (
            <img src="/logo-dark.svg" alt="AethoFlo" style={{ height: 40, width: 'auto' }} />
          ) : (
            <img src="/favicon.svg" alt="AethoFlo" style={{ height: 26, width: 26 }} />
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/learner'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: expanded ? '9px 12px' : '10px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? '#C96B47' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(201,107,71,0.14)' : 'transparent',
                textDecoration: 'none',
                transition: 'all var(--duration-fast)',
                justifyContent: expanded ? 'flex-start' : 'center',
                whiteSpace: 'nowrap',
              })}
            >
              <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
              {expanded && item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{
          padding: expanded ? '12px 16px' : '12px 8px',
          borderTop: `1px solid ${BORDER_COLOR}`,
          transition: 'padding 200ms cubic-bezier(0.4,0,0.2,1)',
        }}>
          {expanded && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.display_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {user?.role}
                </div>
                <button onClick={() => setShowSetPassword(true)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: 0,
                  textDecoration: 'underline',
                }}>
                  set password
                </button>
              </div>
            </div>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            style={{
              width: '100%',
              justifyContent: expanded ? 'flex-start' : 'center',
              color: 'rgba(255,255,255,0.35)',
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 18 }}>↩</span>
            {expanded && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <div style={{ padding: '36px 28px' }}>
          <Outlet />
        </div>
      </main>

      {/* Onboarding floater — admin only */}
      {user?.role === 'admin' && <OnboardingFloater />}

      {/* Set password modal */}
      {showSetPassword && <SetPasswordModal onClose={() => setShowSetPassword(false)} />}
    </div>
  );
}
