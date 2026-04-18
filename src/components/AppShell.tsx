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
  const [collapsed, setCollapsed] = useState(false);
  const nav = user?.role === 'admin' ? ADMIN_NAV : LEARNER_NAV;

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 220,
        background: 'var(--surface-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
        transition: 'width var(--duration-base) var(--ease-out)',
        overflow: 'hidden',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 0' : '20px 20px',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--border-light)',
          minHeight: 64,
        }}>
          {!collapsed && (
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.3rem',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}>
              AethoFlo
            </span>
          )}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setCollapsed((v) => !v)}
            style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
          >
            {collapsed ? '›' : '‹'}
          </button>
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
                padding: collapsed ? '10px' : '9px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-light)' : 'transparent',
                textDecoration: 'none',
                transition: 'all var(--duration-fast)',
                justifyContent: collapsed ? 'center' : 'flex-start',
                whiteSpace: 'nowrap',
              })}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{
          padding: collapsed ? '12px 8px' : '12px 16px',
          borderTop: '1px solid var(--border-light)',
        }}>
          {!collapsed && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', truncate: 'ellipsis' }}>
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
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: 'var(--text-tertiary)',
              fontSize: 13,
            }}
          >
            <span>↩</span>
            {!collapsed && 'Sign out'}
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
