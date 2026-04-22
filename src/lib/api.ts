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
  applyWeekSchedule: (roadmapId: string) =>
    api.post(`/roadmaps/${roadmapId}/apply-week-schedule`).then((r) => r.data),
};

export const assignmentsApi = {
  list: () => api.get('/assignments').then((r) => r.data),
  get: (id: string) => api.get(`/assignments/${id}`).then((r) => r.data),
  create: (d: { learner_id: string; roadmap_id: string; activation_date?: string }) =>
    api.post('/assignments', d).then((r) => r.data),
  activate: (assignmentId: string, activation_date: string) =>
    api.post(`/assignments/${assignmentId}/activate`, { activation_date }).then((r) => r.data),
  deactivate: (id: string) => api.delete(`/assignments/${id}`),
  setEarlyRelease: (id: string, allow_early_release: boolean) =>
    api.patch(`/assignments/${id}/early-release`, { allow_early_release }).then((r) => r.data),
  bulkUpdate: (ids: string[], opts: { allow_early_release?: boolean; activation_date?: string }) =>
    api.patch('/assignments/bulk', { ids, ...opts }).then((r) => r.data),
};

export const learnerProgressApi = {
  getMy: () => api.get('/learner-progress/my').then((r) => r.data),
  getModule: (roadmapModuleId: string) =>
    api.get(`/learner-progress/module/${roadmapModuleId}`).then((r) => r.data),
  submitModule: (roadmapModuleId: string, d: Record<string, unknown>) =>
    api.post(`/learner-progress/module/${roadmapModuleId}/submit`, d).then((r) => r.data),
  peerSignal: (roadmapModuleId: string, prompt: string) =>
    api.get(`/learner-progress/peer-signal/${roadmapModuleId}`, { params: { prompt } })
      .then((r) => r.data as { count: number; samples: string[] }),
  getAssignment: (assignmentId: string) =>
    api.get(`/learner-progress/assignment/${assignmentId}`).then((r) => r.data),
  unlockEarlyAccess: () =>
    api.post('/learner-progress/early-access').then((r) => r.data),
  toggleSave: (moduleId: string) =>
    api.post(`/learner-progress/save/${moduleId}`).then((r) => r.data as { saved: boolean }),
  getSaved: () =>
    api.get('/learner-progress/saved').then((r) => r.data as { id: string; title: string; objective: string | null; domain_name: string | null; saved_at: string }[]),
  saveChecklist: (roadmapModuleId: string, checklistTemplateId: string, responses: { template_item_id: string; value_text?: string | null; value_bool?: boolean | null; value_number?: number | null }[]) =>
    api.patch(`/learner-progress/module/${roadmapModuleId}/checklist`, { checklist_template_id: checklistTemplateId, responses }).then((r) => r.data),
};

export const usersApi = {
  list: () => api.get('/users').then((r) => r.data),
  create: (d: Record<string, unknown>) => api.post('/users', d).then((r) => r.data),
  update: (id: string, d: Record<string, unknown>) =>
    api.patch(`/users/${id}`, d).then((r) => r.data),
  archive: (id: string) => api.post(`/users/${id}/archive`).then((r) => r.data),
  restore: (id: string) => api.post(`/users/${id}/restore`).then((r) => r.data),
  groups: () => api.get('/users/groups').then((r) => r.data as string[]),
};

export const mediaApi = {
  presign: (d: { filename: string; mime_type: string; module_skill_id: string }) =>
    api.post('/media/presign', d).then((r) => r.data),
  register: (d: Record<string, unknown>) => api.post('/media', d).then((r) => r.data),
  delete: (id: string) => api.delete(`/media/${id}`),
};

export const analyzeApi = {
  smartFill: async (file: File, onProgress?: (pct: number) => void): Promise<{
    suggestions: { title: string; objective: string; why_it_matters: string; what_to_do: string; context_note: string | null; checklist_items: string[]; domain_suggestion: string | null; };
    pendingMedia?: { key: string; originalName: string; mimeType: string };
  }> => {
    const base = import.meta.env.VITE_API_URL ?? '';
    const token = localStorage.getItem('aethoflo_token');
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    // Step 1: get presigned PUT URL from backend
    const presignRes = await fetch(`${base}/api/analyze/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ filename: file.name, mime_type: file.type }),
    });
    if (!presignRes.ok) {
      const e = await presignRes.json().catch(() => ({}));
      throw new Error(e.error ?? 'Could not get upload URL');
    }
    const { url, key } = await presignRes.json() as { url: string; key: string };

    // Step 2: upload directly to R2 (bypasses Railway gateway limit)
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 80));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          console.error('[smart-fill] R2 upload failed', xhr.status, xhr.responseText);
          reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText || 'no response body'}`));
        }
      };
      xhr.onerror = () => {
        console.error('[smart-fill] R2 upload network error — likely CORS');
        reject(new Error('Upload blocked — check R2 CORS policy allows PUT from this origin'));
      };
      xhr.send(file);
    });

    onProgress?.(85);

    // Step 3: tell backend to process the uploaded file
    const analyzeRes = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ key, originalName: file.name, mimeType: file.type }),
    });
    if (!analyzeRes.ok) {
      const e = await analyzeRes.json().catch(() => ({}));
      throw new Error(e.error ?? 'Analysis failed');
    }
    onProgress?.(100);
    const data = await analyzeRes.json();
    return { suggestions: data.suggestions, pendingMedia: data.pendingMedia };
  },

  registerMedia: async (r2Key: string, moduleId: string, originalName: string, mimeType: string) => {
    const base = import.meta.env.VITE_API_URL ?? '';
    const token = localStorage.getItem('aethoflo_token');
    const res = await fetch(`${base}/api/analyze/register-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ r2Key, moduleId, originalName, mimeType }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? 'Failed to attach media');
    }
    return res.json();
  },
};

export const adminStatsApi = {
  get: () => api.get('/admin/stats').then((r) => r.data as {
    active_learners_month: number;
    completions_week: number;
    avg_completion_rate: number;
    modules_no_completions: number;
  }),
  auditLog: () => api.get('/admin/audit-log').then((r) => r.data as {
    id: string; action: string; entity_type: string | null; entity_id: string | null;
    metadata: Record<string, unknown> | null; created_at: string;
    actor_name: string | null; actor_email: string | null;
  }[]),
};

export const magicLinkApi = {
  generate: (userId: string) =>
    api.post('/magic-link/generate', { user_id: userId }).then((r) => r.data as { url: string; token: string }),
  redeem: (token: string) =>
    api.post('/magic-link/redeem', { token }).then((r) => r.data as { token: string; user: { id: string; email: string; display_name: string; role: string; org: string } }),
  request: (email: string) =>
    api.post('/magic-link/request', { email }).then((r) => r.data as { message: string }),
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
