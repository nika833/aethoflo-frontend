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
  isImpersonating: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  setImpersonationAuth: (user: AuthUser, token: string) => void;
  clearImpersonation: () => void;
  clearAuth: () => void;
}

// Impersonation lives in sessionStorage (per-tab) so the original superadmin tab is untouched
const impToken = sessionStorage.getItem('aethoflo_imp_token');
const impUser  = sessionStorage.getItem('aethoflo_imp_user');

const stored      = impToken ? impUser : localStorage.getItem('aethoflo_user');
const storedToken = impToken ?? localStorage.getItem('aethoflo_token');

export const useAuthStore = create<AuthState>((set) => ({
  user:           stored      ? JSON.parse(stored)      : null,
  token:          storedToken ?? null,
  isImpersonating: !!impToken,

  setAuth: (user, token) => {
    localStorage.setItem('aethoflo_token', token);
    localStorage.setItem('aethoflo_user', JSON.stringify(user));
    set({ user, token, isImpersonating: false });
  },

  setImpersonationAuth: (user, token) => {
    sessionStorage.setItem('aethoflo_imp_token', token);
    sessionStorage.setItem('aethoflo_imp_user', JSON.stringify(user));
    set({ user, token, isImpersonating: true });
  },

  clearImpersonation: () => {
    sessionStorage.removeItem('aethoflo_imp_token');
    sessionStorage.removeItem('aethoflo_imp_user');
    set({ user: null, token: null, isImpersonating: false });
  },

  clearAuth: () => {
    localStorage.removeItem('aethoflo_token');
    localStorage.removeItem('aethoflo_user');
    sessionStorage.removeItem('aethoflo_imp_token');
    sessionStorage.removeItem('aethoflo_imp_user');
    set({ user: null, token: null, isImpersonating: false });
  },
}));
