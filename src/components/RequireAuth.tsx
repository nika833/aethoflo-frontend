import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';

export function RequireAuth({ children, role }: {
  children: React.ReactNode;
  role?: 'admin' | 'learner';
}) {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/learner'} replace />;
  }
  return <>{children}</>;
}
