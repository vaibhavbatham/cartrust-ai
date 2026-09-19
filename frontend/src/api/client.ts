import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getDemoResponse } from './demoFallback';

const isGhPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  adapter: isGhPages
    ? async (config) => {
        let body = config.data;
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch {
            // ignore
          }
        }
        const fallback = getDemoResponse(config.url || '', config.method || 'get', body);
        return {
          data: fallback.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        } as AxiosResponse;
      }
    : undefined,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('cartrust_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If backend is unreachable or 404, fallback gracefully to demo data
    const isNetworkOr404 = !error.response || error.response.status === 404 || error.response.status === 502 || error.response.status === 503;
    if (isGhPages || isNetworkOr404) {
      const url = error.config?.url || '';
      const method = error.config?.method || 'get';
      let body = error.config?.data;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          // ignore
        }
      }
      const fallback = getDemoResponse(url, method, body);
      if (fallback) {
        return Promise.resolve({
          data: fallback.data,
          status: 200,
          statusText: 'OK (Demo Fallback)',
          headers: {},
          config: error.config,
        });
      }
    }

    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = localStorage.getItem('cartrust_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
          const { access_token, refresh_token: newRefresh } = res.data;
          localStorage.setItem('cartrust_token', access_token);
          localStorage.setItem('cartrust_refresh_token', newRefresh);
          error.config.headers.Authorization = `Bearer ${access_token}`;
          return axios(error.config);
        } catch {
          localStorage.removeItem('cartrust_token');
          localStorage.removeItem('cartrust_refresh_token');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
