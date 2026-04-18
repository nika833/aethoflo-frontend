import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aethoflo_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('aethoflo_token');
      localStorage.removeItem('aethoflo_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Typed API helpers ────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  embeddedLaunch: (token: string) =>
    api.post('/auth/embedded-launch', { token }).then((r) => r.data),
};

export const domainsApi = {
  list: () => api.get('/domains').then((r) => r.data),
  create: (d: { name: string; description?: string; display_order?: number }) =>
    api.post('/domains', d).then((r) => r.data),
  update: (id: string, d: Partial<{ name: string; description: string }>) =>
    api.patch(`/domains/${id}`, d).then((r) => r.data),
  delete: (id: string) => api.delete(`/domains/${id}`),
};

export const moduleSkillsApi = {
  list: (domainId?: string) =>
    api.get('/module-skills', { params: domainId ? { domain_id: domainId } : {} })
      .then((r) => r.data),
  get: (id: string) => api.get(`/module-skills/${id}`).then((r) => r.data),
  create: (d: Record<string, unknown>) => api.post('/module-skills', d).then((r) => r.data),
  update: (id: string, d: Record<string, unknown>) =>
    api.patch(`/module-skills/${id}`, d).then((r) => r.data),
  delete: (id: string) => api.delete(`/module-skills/${id}`),
};

export const checklistsApi = {
  listByModule: (moduleSkillId: string) =>
    api.get(`/checklists/module/${moduleSkillId}`).then((r) => r.data),
  createTemplate: (moduleSkillId: string, d: { title?: string; description?: string }) =>
    api.post(`/checklists/module/${moduleSkillId}`, d).then((r) => r.data),
  addItem: (templateId: string, d: Record<string, unknown>) =>
    api.post(`/checklists/${templateId}/items`, d).then((r) => r.data),
  updateItem: (itemId: string, d: Record<string, unknown>) =>
    api.patch(`/checklists/items/${itemId}`, d).then((r) => r.data),
  deleteItem: (itemId: string) => api.delete(`/checklists/items/${itemId}`),
};

export const roadmapsApi = {
  list: () => api.get('/roadmaps').then((r) => r.data),
  get: (id: string) => api.get(`/roadmaps/${id}`).then((r) => r.data),
  create: (d: Record<string, unknown>) => api.post('/roadmaps', d).then((r) => r.data),
  update: (id: string, d: Record<string, unknown>) =>
    api.patch(`/roadmaps/${id}`, d).then((r) => r.data),
  addModule: (roadmapId: string, d: Record<string, unknown>) =>
    api.post(`/roadmaps/${roadmapId}/modules`, d).then((r) => r.data),
  updateModule: (roadmapId: string, moduleId: string, d: Record<string, unknown>) =>
    api.patch(`/roadmaps/${roadmapId}/modules/${moduleId}`, d).then((r) => r.data),
  reorderModules: (roadmapId: string, order: { id: string; display_order: number }[]) =>
    api.put(`/roadmaps/${roadmapId}/modules/reorder`, { order }).then((r) => r.data),
  removeModule: (roadmapId: string, moduleId: string) =>
    api.delete(`/roadmaps/${roadmapId}/modules/${moduleId}`),
};

export const assignmentsApi = {
  list: () => api.get('/assignments').then((r) => r.data),
  get: (id: string) => api.get(`/assignments/${id}`).then((r) => r.data),
  create: (d: { learner_id: string; roadmap_id: string; activation_date?: string }) =>
    api.post('/assignments', d).then((r) => r.data),
  activate: (assignmentId: string, activation_date: string) =>
    api.post(`/assignments/${assignmentId}/activate`, { activation_date }).then((r) => r.data),
  deactivate: (id: string) => api.delete(`/assignments/${id}`),
};

export const learnerProgressApi = {
  getMy: () => api.get('/learner-progress/my').then((r) => r.data),
  getModule: (roadmapModuleId: string) =>
    api.get(`/learner-progress/module/${roadmapModuleId}`).then((r) => r.data),
  submitModule: (roadmapModuleId: string, d: Record<string, unknown>) =>
    api.post(`/learner-progress/module/${roadmapModuleId}/submit`, d).then((r) => r.data),
  getAssignment: (assignmentId: string) =>
    api.get(`/learner-progress/assignment/${assignmentId}`).then((r) => r.data),
};

export const usersApi = {
  list: () => api.get('/users').then((r) => r.data),
  create: (d: Record<string, unknown>) => api.post('/users', d).then((r) => r.data),
  update: (id: string, d: Record<string, unknown>) =>
    api.patch(`/users/${id}`, d).then((r) => r.data),
};

export const mediaApi = {
  presign: (d: { filename: string; mime_type: string; module_skill_id: string }) =>
    api.post('/media/presign', d).then((r) => r.data),
  register: (d: Record<string, unknown>) => api.post('/media', d).then((r) => r.data),
  delete: (id: string) => api.delete(`/media/${id}`),
};

export const analyzeApi = {
  smartFill: async (file: File): Promise<{
    title: string; objective: string; why_it_matters: string;
    what_to_do: string; context_note: string | null;
    checklist_items: string[]; domain_suggestion: string | null;
  }> => {
    const token = localStorage.getItem('aethoflo_token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/analyze`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Analysis failed');
    }
    const data = await res.json();
    return data.suggestions;
  },
};

export const exportsApi = {
  download: async (exportType: string) => {
    const response = await api.post('/exports/download', { export_type: exportType }, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `aethoflo_${exportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
