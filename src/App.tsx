import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/authStore';

import AppShell from './components/AppShell';
import { RequireAuth } from './components/RequireAuth';

import LoginPage from './pages/LoginPage';
import MagicLinkPage from './pages/MagicLinkPage';
import SignupPage from './pages/SignupPage';
import EmbeddedLaunchPage from './pages/EmbeddedLaunchPage';
import NotificationSettings from './pages/NotificationSettings';

import SuperAdminDashboard from './pages/SuperAdminDashboard';
import OrgBranding from './pages/OrgBranding';
import AdminDashboard from './pages/AdminDashboard';
import AdminDomains from './pages/AdminDomains';
import AdminModules from './pages/AdminModules';
import AdminRoadmaps from './pages/AdminRoadmaps';
import AdminAssignments from './pages/AdminAssignments';
import AdminExports from './pages/AdminExports';

import LearnerHomePage from './pages/LearnerHomePage';
import LearnerModulePage from './pages/LearnerModulePage';
import LearnerProgressPage from './pages/LearnerProgressPage';
import LearnerLibraryPage from './pages/LearnerLibraryPage';
import LearnerSavedPage from './pages/LearnerSavedPage';

function RootRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <Navigate to="/super-admin" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/learner'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/launch" element={<EmbeddedLaunchPage />} />
        <Route path="/" element={<RootRedirect />} />

        {/* Admin routes */}
        <Route path="/admin" element={
          <RequireAuth role="admin"><AppShell /></RequireAuth>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="domains" element={<AdminDomains />} />
          <Route path="modules" element={<AdminModules />} />
          <Route path="roadmaps" element={<AdminRoadmaps />} />
          <Route path="assignments" element={<AdminAssignments />} />
          <Route path="exports" element={<AdminExports />} />
          <Route path="settings" element={<NotificationSettings />} />
          <Route path="branding" element={<OrgBranding />} />
        </Route>

        {/* Learner routes */}
        <Route path="/learner" element={
          <RequireAuth role="learner"><AppShell /></RequireAuth>
        }>
          <Route index element={<LearnerHomePage />} />
          <Route path="module/:roadmapModuleId" element={<LearnerModulePage />} />
          <Route path="progress" element={<LearnerProgressPage />} />
          <Route path="library" element={<LearnerLibraryPage />} />
          <Route path="saved" element={<LearnerSavedPage />} />
          <Route path="settings" element={<NotificationSettings />} />
        </Route>

        {/* Super admin */}
        <Route path="/super-admin" element={
          <RequireAuth role="superadmin"><SuperAdminDashboard /></RequireAuth>
        } />

        {/* Magic link sign-in */}
        <Route path="/join/:token" element={<MagicLinkPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
