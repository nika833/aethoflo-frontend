import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';

const ADMIN_NAV = [
  { to: '/admin',             label: 'Dashboard',     icon: '⊞' },
  { to: '/admin/domains',     label: 'Domains',       icon: '◫' },
  { to: '/admin/modules',     label: 'Module Library',icon: '⊟' },
  { to: '/admin/roadmaps',    label: 'Roadmaps',      icon: '⟶' },
  { to: '/admin/assignments', label: 'Assignments',   icon: '◎' },
  { to: '/admin/exports',     label: 'Exports',       icon: '↓' },
];

const LEARNER_NAV = [
  { to: '/learner',          label: 'My Training',  icon: '◈' },
  { to: '/learner/progress', label: 'Progress',     icon: '◉' },
];

export default function AppShell() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
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
          background: 'var(--surface-2)',
          borderRight: '1px solid var(--border)',
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
          borderBottom: '1px solid var(--border-light)',
          minHeight: 64,
          transition: 'padding 200ms cubic-bezier(0.4,0,0.2,1)',
        }}>
          {expanded ? (
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.3rem',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}>
              AethoFlo
            </span>
          ) : (
            <span style={{ fontSize: 20, color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>A</span>
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
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-light)' : 'transparent',
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
          borderTop: '1px solid var(--border-light)',
          transition: 'padding 200ms cubic-bezier(0.4,0,0.2,1)',
        }}>
          {expanded && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.display_name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {user?.role}
              </div>
            </div>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            style={{
              width: '100%',
              justifyContent: expanded ? 'flex-start' : 'center',
              color: 'var(--text-tertiary)',
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 18 }}>↩</span>
            {expanded && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
