import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'learner' | 'superadmin';
  organization_id: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
}

const stored = localStorage.getItem('aethoflo_user');
const storedToken = localStorage.getItem('aethoflo_token');

export const useAuthStore = create<AuthState>((set) => ({
  user: stored ? JSON.parse(stored) : null,
  token: storedToken,

  setAuth: (user, token) => {
    localStorage.setItem('aethoflo_token', token);
    localStorage.setItem('aethoflo_user', JSON.stringify(user));
    set({ user, token });
  },

  clearAuth: () => {
    localStorage.removeItem('aethoflo_token');
    localStorage.removeItem('aethoflo_user');
    set({ user: null, token: null });
  },
}));
