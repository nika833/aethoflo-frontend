import React from 'react';
import { createPortal } from 'react-dom';

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.7s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeDasharray="28 56" />
    </svg>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon, title, description, action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 12, padding: '48px 24px', textAlign: 'center',
    }}>
      {icon && (
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-xl)',
          background: 'var(--accent-light)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)', fontSize: 24,
        }}>
          {icon}
        </div>
      )}
      <div>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: 4 }}>{title}</h4>
        {description && <p style={{ fontSize: 14 }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({
  isOpen, onClose, title, children, width = 520,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}) {
  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(28,25,23,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto',
        padding: '40px 16px',
        animation: 'fadeIn 150ms var(--ease-out) both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: width,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          flexShrink: 0,
          animation: 'fadeUp 220ms var(--ease-out) both',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-light)',
        }}>
          <h4 style={{ color: 'var(--text-primary)' }}>{title}</h4>
          <button className="btn btn-ghost btn-icon" onClick={onClose}
            style={{ color: 'var(--text-tertiary)' }}>
            ✕
          </button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed:   { label: 'Completed', cls: 'badge-completed' },
    available:   { label: 'Available', cls: 'badge-available' },
    locked:      { label: 'Locked',    cls: 'badge-locked' },
    in_progress: { label: 'In Progress', cls: 'badge-progress' },
  };
  const s = map[status] ?? { label: status, cls: '' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

// ─── Inline Toast / Alert ─────────────────────────────────────────────────────
export function Alert({
  type = 'info', children,
}: {
  type?: 'info' | 'success' | 'error' | 'warning';
  children: React.ReactNode;
}) {
  const colors: Record<string, { bg: string; color: string }> = {
    info:    { bg: '#EFF6FF', color: '#1E40AF' },
    success: { bg: '#F0FDF4', color: '#166534' },
    error:   { bg: '#FEF2F2', color: '#991B1B' },
    warning: { bg: '#FFFBEB', color: '#92400E' },
  };
  const c = colors[type];
  return (
    <div style={{
      background: c.bg, color: c.color,
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: 14,
    }}>
      {children}
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────
export function PageHeader({
  title, subtitle, action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', gap: 16,
      marginBottom: 28,
    }}>
      <div>
        <h2 style={{ marginBottom: subtitle ? 4 : 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 14 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
