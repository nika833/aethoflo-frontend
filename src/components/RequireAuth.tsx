import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';

export function RequireAuth({ children, role }: {
  children: React.ReactNode;
  role?: 'admin' | 'learner' | 'superadmin';
}) {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    if (user.role === 'superadmin') return <Navigate to="/super-admin" replace />;
    return <Navigate to={user.role === 'admin' ? '/admin' : '/learner'} replace />;
  }
  return <>{children}</>;
}
