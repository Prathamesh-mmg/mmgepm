// src/lib/api.ts  — All endpoints aligned with Guid-based ASP.NET Core 8 controllers
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

let isRefreshing = false;
let failedQueue: { resolve: Function; reject: Function }[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token);
  });
  failedQueue = [];
};

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach bearer token ───────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// ── Response interceptor: handle 401 + token refresh ───────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const { refreshToken, setAuth, clearAuth, user } = useAuthStore.getState();

      if (!refreshToken) {
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        setAuth(data.accessToken, data.refreshToken, user!);
        processQueue(null, data.accessToken);
        original.headers = { ...original.headers, Authorization: `Bearer ${data.accessToken}` };
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError as Error);
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth ───────────────────────────────────────────────────────
export const authApi = {
  login:          (data: { email: string; password: string }) => api.post('/auth/login', data),
  refresh:        (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout:         () => api.post('/auth/logout'),
  me:             () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
                    api.post('/auth/change-password', data),
};

// ── Projects ───────────────────────────────────────────────────
export const projectsApi = {
  getAll:        (params?: { search?: string; status?: string; page?: number; pageSize?: number }) =>
                   api.get('/projects', { params }),
  getById:       (id: string) => api.get(`/projects/${id}`),
  create:        (data: any)  => api.post('/projects', data),
  updateStatus:  (id: string, status: string) => api.patch(`/projects/${id}/status`, { status }),
  getTasks:      (id: string) => api.get(`/projects/${id}/tasks`),
  getDPRs:       (id: string) => api.get(`/projects/${id}/dprs`),
  getAttendance: (id: string, date?: string) =>
                   api.get(`/projects/${id}/attendance`, { params: { date } }),
  addMember:     (id: string, data: { email: string; projectRole: string }) =>
                   api.post(`/projects/${id}/members`, data),
  removeMember:  (id: string, userId: string) =>
                   api.delete(`/projects/${id}/members/${userId}`),
  export:        () => api.get('/projects/export', { responseType: 'blob' }),
};

// ── Tasks ──────────────────────────────────────────────────────
export const tasksApi = {
  getAll:          (params?: { projectId?: string; status?: string; search?: string; parentId?: string }) =>
                     api.get('/tasks', { params }),
  getById:         (id: string) => api.get(`/tasks/${id}`),
  create:          (data: any)  => api.post('/tasks', data),
  updateStatus:    (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }),
  getProgress:     (id: string) => api.get(`/tasks/${id}/progress`),
  addProgress:     (id: string, data: { notes?: string; progressPercentage: number; hoursLogged?: number }, photos?: File[]) => {
    const fd = new FormData();
    fd.append('notes', data.notes ?? '');
    fd.append('progressPercentage', String(data.progressPercentage));
    if (data.hoursLogged != null) fd.append('hoursLogged', String(data.hoursLogged));
    photos?.forEach(p => fd.append('photos', p));
    return api.post(`/tasks/${id}/progress`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getSubtasks:     (id: string) => api.get(`/tasks/${id}/subtasks`),
  getAttachments:  (id: string) => api.get(`/tasks/${id}/attachments`),
  uploadAttachment:(id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post(`/tasks/${id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  import:          (projectId: string, file: File) => {
    const fd = new FormData(); fd.append('projectId', projectId); fd.append('file', file);
    return api.post('/tasks/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  export:          (projectId: string) =>
                     api.get('/tasks/export', { params: { projectId }, responseType: 'blob' }),
};

// ── Risks ──────────────────────────────────────────────────────
export const risksApi = {
  getAll:       (params?: { projectId?: string; status?: string; category?: string; page?: number }) =>
                  api.get('/risks', { params }),
  getById:      (id: string) => api.get(`/risks/${id}`),
  create:       (data: any)  => api.post('/risks', data),
  updateStatus: (id: string, status: string, notes?: string) =>
                  api.patch(`/risks/${id}/status`, { status, notes }),
  addUpdate:    (id: string, data: any) => api.post(`/risks/${id}/updates`, data),
  getUpdates:   (id: string) => api.get(`/risks/${id}/updates`),
  exportExcel:  (projectId?: string) =>
                  api.get('/reports/risks', { params: { projectId }, responseType: 'blob' }),
};

// ── Budget ─────────────────────────────────────────────────────
export const budgetApi = {
  getBudgets:       (projectId: string) => api.get(`/budget/project/${projectId}`),
  getWBS:           (projectId: string) => api.get(`/budget/wbs/${projectId}`),
  getWBSItem:       (id: string)        => api.get(`/budget/wbs/item/${id}`),
  getExpenditures:  (projectId: string, wbsId?: string) =>
                      api.get(`/budget/expenditures/${projectId}`, { params: { wbsId } }),
  addExpenditure:   (data: any) => api.post('/budget/expenditures', data),
  recalculate:      (projectId: string) => api.post(`/budget/recalculate/${projectId}`),
  exportExcel:      (projectId: string) =>
                      api.get(`/budget/export/${projectId}`, { responseType: 'blob' }),
};

// ── Procurement ────────────────────────────────────────────────
export const procurementApi = {
  getMRs:     (params?: { projectId?: string; status?: string; page?: number }) =>
                api.get('/procurement/material-requests', { params }),
  getMRById:  (id: string) => api.get(`/procurement/material-requests/${id}`),
  createMR:   (data: any)  => api.post('/procurement/material-requests', data),
  advanceMR:  (id: string, action: string) =>
                api.post(`/procurement/material-requests/${id}/advance`, { action }),
  getPOs:     (params?: { projectId?: string }) =>
                api.get('/procurement/purchase-orders', { params }),
  getVendors: () => api.get('/procurement/vendors'),
  exportExcel:(projectId?: string) =>
                api.get('/procurement/export', { params: { projectId }, responseType: 'blob' }),
};

// ── Inventory ──────────────────────────────────────────────────
export const inventoryApi = {
  getMaterials:   (params?: { search?: string; categoryId?: string; page?: number }) =>
                    api.get('/inventory/materials', { params }),
  getLedger:      (params?: { projectId?: string; materialId?: string }) =>
                    api.get('/inventory/stock-ledger', { params }),
  getTransfers:   (projectId?: string) =>
                    api.get('/inventory/site-transfers', { params: { projectId } }),
  addEntry:       (materialId: string, projectId: string, type: string, qty: number, cost?: number, notes?: string) =>
                    api.post('/inventory/stock-entry', null, { params: { materialId, projectId, type, qty, cost, notes } }),
  exportExcel:    (projectId?: string) =>
                    api.get('/inventory/export', { params: { projectId }, responseType: 'blob' }),
};

// ── Resources ──────────────────────────────────────────────────
export const resourcesApi = {
  getAll:         (params?: { search?: string; status?: string; type?: string; page?: number }) =>
                    api.get('/resources', { params }),
  getAllocations:  (params?: { projectId?: string; resourceId?: string }) =>
                    api.get('/resources/allocations', { params }),
  allocate:       (taskId: string, resourceId: string, start: string, end: string, percent = 100) =>
                    api.post('/resources/allocations', null, { params: { taskId, resourceId, start, end, percent } }),
};

// ── Documents ──────────────────────────────────────────────────
export const documentsApi = {
  getFolders:     (projectId: string) =>
                    api.get('/documents/folders', { params: { projectId } }),
  getAll:         (params?: { projectId?: string; folderId?: string; search?: string; type?: string; page?: number }) =>
                    api.get('/documents', { params }),
  upload:         (projectId: string, folderId: string | null, title: string, description: string | null, documentType: string | null, file: File) => {
    const fd = new FormData();
    fd.append('projectId', projectId);
    if (folderId) fd.append('folderId', folderId);
    fd.append('title', title);
    if (description) fd.append('description', description);
    if (documentType) fd.append('documentType', documentType);
    fd.append('file', file);
    return api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getChangeRequests: (projectId?: string) =>
                       api.get('/documents/change-requests', { params: { projectId } }),
  createCR:          (data: any) => api.post('/documents/change-requests', data),
  updateCRStatus:    (id: string, status: string, comments?: string) =>
                       api.patch(`/documents/change-requests/${id}/status`, { status, comments }),
};

// ── Dashboard ──────────────────────────────────────────────────
export const dashboardApi = {
  get:        () => api.get('/dashboard'),
  getMyTasks: (limit = 10) => api.get('/dashboard/my-tasks', { params: { limit } }),
};

// ── Users ──────────────────────────────────────────────────────
export const usersApi = {
  getAll:       (params?: { search?: string; role?: string; isActive?: boolean; page?: number }) =>
                  api.get('/users', { params }),
  getById:      (id: string) => api.get(`/users/${id}`),
  me:           () => api.get('/users/me'),
  create:       (data: any)  => api.post('/users', data),
  update:       (id: string, data: any) => api.put(`/users/${id}`, data),
  updateRoles:  (id: string, roles: string[]) => api.put(`/users/${id}/roles`, { roles }),
  toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`),
  getRoles:     () => api.get('/users/roles'),
  export:       () => api.get('/users/export', { responseType: 'blob' }),
};

// ── Notifications ──────────────────────────────────────────────
export const notificationsApi = {
  getUnread:   () => api.get('/notifications/unread'),
  markRead:    (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

// ── Files ──────────────────────────────────────────────────────
export const filesApi = {
  download: (path: string) => api.get(`/files/${path}`, { responseType: 'blob' }),
  previewUrl: (path: string) => `${BASE_URL}/files/${path}`,
};
// ─── Task Dependencies ─────────────────────────────────────────
export const dependenciesApi = {
  getAll:  (taskId: string) =>
    api.get(`/tasks/${taskId}/dependencies`),
  add:     (taskId: string, predecessorId: string, type = 'FS', lagDays = 0) =>
    api.post(`/tasks/${taskId}/dependencies`, { predecessorId, dependencyType: type, lagDays }),
  remove:  (taskId: string, depId: string) =>
    api.delete(`/tasks/${taskId}/dependencies/${depId}`),
};

// ─── Gantt ─────────────────────────────────────────────────────
export const ganttApi = {
  getProjectGantt: (projectId: string) =>
    api.get(`/projects/${projectId}/gantt`),
};
// ─── Labour ────────────────────────────────────────────────────
export const labourApi = {
  getAll:           (params?: any) => api.get('/labour', { params }),
  getPending:       (projectId?: string) => api.get('/labour/pending-approvals',
                      { params: projectId ? { projectId } : {} }),
  bulkCreate:       (data: any) => api.post('/labour/bulk', data),
  create:           (data: any) => api.post('/labour', data),
  approve:          (id: string, approve: boolean, remarks?: string) =>
                      api.patch(`/labour/${id}/approve`, { approve, remarks }),
  getDashboard:     (projectId?: string) => api.get('/labour/dashboard',
                      { params: projectId ? { projectId } : {} }),
  getCategories:    () => api.get('/labour/categories'),
};

// ─── DPR ───────────────────────────────────────────────────────
export const dprApi = {
  getAll:     (params?: any) => api.get('/dpr', { params }),
  getById:    (id: string) => api.get(`/dpr/${id}`),
  create:     (data: any) => api.post('/dpr', data),
  update:     (id: string, data: any) => api.put(`/dpr/${id}`, data),
  generate:   (id: string) => api.post(`/dpr/${id}/generate`),
  approve:    (id: string, approve: boolean, reason?: string) =>
                api.patch(`/dpr/${id}/approve`, { approve, reason }),
  exportHtml: (id: string) => `${api.defaults.baseURL}/dpr/${id}/export`,
};
