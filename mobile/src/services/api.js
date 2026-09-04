import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Live Render production API
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return 'https://musicfy-thjc.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token to requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('musicfy_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
});

export default api;
