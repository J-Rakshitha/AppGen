import axios from 'axios';

const API_URL = 'https://appgen-31qt.onrender.com';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name?: string) => api.post('/auth/register', { email, password, name }),
  demo: () => api.post('/auth/demo'),
  me: () => api.get('/auth/me'),
};

// Apps
export const appsApi = {
  list: () => api.get('/apps'),
  create: (data: any) => api.post('/apps', data),
  get: (id: string) => api.get(`/apps/${id}`),
  update: (id: string, data: any) => api.put(`/apps/${id}`, data),
  delete: (id: string) => api.delete(`/apps/${id}`),
  export: (id: string) => `${API_URL}/api/apps/${id}/export`,
};

// Dynamic data
export const dynamicApi = {
  list: (appId: string, entity: string, params?: any) => api.get(`/dynamic/${appId}/${entity}`, { params }),
  get: (appId: string, entity: string, id: string) => api.get(`/dynamic/${appId}/${entity}/${id}`),
  create: (appId: string, entity: string, data: any) => api.post(`/dynamic/${appId}/${entity}`, data),
  update: (appId: string, entity: string, id: string, data: any) => api.put(`/dynamic/${appId}/${entity}/${id}`, data),
  delete: (appId: string, entity: string, id: string) => api.delete(`/dynamic/${appId}/${entity}/${id}`),
  bulk: (appId: string, entity: string, payload: any) => api.post(`/dynamic/${appId}/${entity}/bulk`, payload),
};

// CSV
export const csvApi = {
  import: (appId: string, entity: string, file: File, mapping?: any) => {
    const form = new FormData();
    form.append('file', file);
    if (mapping) form.append('mapping', JSON.stringify(mapping));
    return api.post(`/csv/import/${appId}/${entity}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  exportUrl: (appId: string, entity: string) => `${API_URL}/api/csv/export/${appId}/${entity}`,
  preview: (appId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/csv/${appId}/preview`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  imports: (appId: string) => api.get(`/csv/${appId}/imports`),
};

// Notifications
export const notificationsApi = {
  list: (appId?: string) => api.get('/notifications', { params: appId ? { app_id: appId } : {} }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};
