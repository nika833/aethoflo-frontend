import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';

const ADMIN_NAV = [
  { to: '/admin',             label: 'Dashboard',      icon: '⊞' },
  { to: '/admin/domains',     label: 'Domains',        icon: '◫' },
  { to: '/admin/modules',     label: 'Module Library', icon: '⊟' },
  { to: '/admin/roadmaps',    label: 'Roadmaps',       icon: '⟶' },
  { to: '/admin/assignments', label: 'Assignments',    icon: '◎' },
  { to: '/admin/exports',     label: 'Exports',        icon: '↓' },
];

const LEARNER_NAV = [
  { to: '/learner',          label: 'My Training', icon: '◈' },
  { to: '/learner/progress', label: 'Progress',    icon: '◉' },
];

const SIDEBAR_BG = '#3A2215';
const BORDER_COLOR = 'rgba(255,255,255,0.08)';

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
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
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
    </div>
  );
}
