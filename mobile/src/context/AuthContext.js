import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const stored = await AsyncStorage.getItem('musicfy_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
        await AsyncStorage.setItem('musicfy_user', JSON.stringify(res.data.user));
      }
    } catch (e) {
      // Fallback guest mode
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.user) {
      setUser(res.data.user);
      if (res.data.token) {
        await AsyncStorage.setItem('musicfy_token', res.data.token);
      }
      await AsyncStorage.setItem('musicfy_user', JSON.stringify(res.data.user));
    }
    return res.data;
  };

  const register = async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    if (res.data?.user) {
      setUser(res.data.user);
      if (res.data.token) {
        await AsyncStorage.setItem('musicfy_token', res.data.token);
      }
      await AsyncStorage.setItem('musicfy_user', JSON.stringify(res.data.user));
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    setUser(null);
    await AsyncStorage.removeItem('musicfy_token');
    await AsyncStorage.removeItem('musicfy_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
