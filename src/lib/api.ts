import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Agent API
export const agentsApi = {
  list: () => api.get('/agents/list'),
  add: (data: any) => api.post('/agents/add', data),
  delete: (id: string) => api.delete(`/agents/delete/${id}`),
  setIdentity: (data: any) => api.post('/agents/set-identity', data),
};

// Chat API
export const chatApi = {
  send: (data: any) => api.post('/agent', data),
};

// Memory API
export const memoryApi = {
  search: (data: any) => api.post('/memory/search', data),
  get: (userId: string, limit = 100) => api.get(`/memory/${userId}?limit=${limit}`),
  delete: (memoryId: string) => api.delete(`/memory/${memoryId}`),
  deleteUser: (userId: string) => api.delete(`/memory/user/${userId}`),
};

// Health API
export const healthApi = {
  check: () => api.get('/health'),
};

export default api;
