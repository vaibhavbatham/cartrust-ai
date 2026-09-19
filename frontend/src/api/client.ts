import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cartrust_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
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
