import axios from 'axios';

const getBaseUrl = () => {
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  const envUrl = import.meta.env.VITE_API_URL;

  if (isLocalhost && (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
    return 'http://localhost:5000/api';
  }

  if (envUrl) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    if (!trimmed.endsWith('/api') && trimmed.startsWith('http')) {
      return `${trimmed}/api`;
    }
    return trimmed;
  }

  if (isLocalhost) return 'http://localhost:5000/api';

  return 'https://musicfy-thjc.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization header if token stored in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('musicfy_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export default api;
