import { api } from './client';

export const authApi = {
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  me: () => api.get('/auth/me'),
  updateProfile: (body) => api.patch('/auth/profile', body),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/auth/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const workspaceApi = {
  list: () => api.get('/workspaces'),
  get: (id) => api.get(`/workspaces/${id}`),
  create: (body) => api.post('/workspaces/create', body),
  addMember: (body) => api.post('/workspaces/add-member', body),
  updatePlugins: (id, plugins) => api.patch(`/workspaces/${id}/plugins`, { plugins }),
};

export const projectApi = {
  list: (config) => api.get('/projects', config),
  get: (id) => api.get(`/projects/${id}`),
  create: (body) => api.post('/projects/create', body),
  update: (id, body) => api.put(`/projects/${id}`, body),
  addMember: (body) => api.post('/projects/add-member', body),
  removeMember: (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`),
  updateMemberRole: (projectId, userId, role) =>
    api.patch(`/projects/${projectId}/members/${userId}/role`, { role }),
};

export const taskApi = {
  list: (projectId, params) => api.get(`/tasks/${projectId}`, { params }),
  get: (projectId, taskId) => api.get(`/tasks/${projectId}/${taskId}`),
  create: (body) => api.post('/tasks/create', body),
  update: (projectId, taskId, body) =>
    api.put(`/tasks/update/${projectId}/${taskId}`, body),
  move: (body) => api.put('/tasks/move', body),
  reorder: (projectId, body) => api.put(`/tasks/reorder/${projectId}`, body),
  delete: (projectId, taskId) => api.delete(`/tasks/delete/${projectId}/${taskId}`),
  versions: (projectId, taskId) => api.get(`/tasks/${projectId}/versions/${taskId}`),
  rollback: (projectId, taskId, version) =>
    api.post(`/tasks/rollback/${projectId}/${taskId}`, { version }),
};

export const commentApi = {
  add: (body) => api.post('/comments/add', body),
  list: (taskId) => api.get(`/comments/${taskId}`),
};

export const miscApi = {
  analytics: (projectId) => api.get(`/analytics/${projectId}`),
  burndown: (projectId, days = 14) =>
    api.get(`/analytics/${projectId}/burndown`, { params: { days } }),
  activity: (projectId, params) => api.get(`/activity/${projectId}`, { params }),
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  searchUsers: (q) => api.get('/users/search', { params: { q } }),
  search: (params) => api.get('/search', { params }),
  downloadPdf: async (projectId) => {
    const res = await api.get(`/reports/pdf/${projectId}`, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${projectId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
};

export const messageApi = {
  listProject: (projectId, params) =>
    api.get(`/messages/project/${projectId}`, { params }),
  listDm: (otherUserId, params) => api.get(`/messages/dm/${otherUserId}`, { params }),
  send: (body) => api.post('/messages', body),
};
