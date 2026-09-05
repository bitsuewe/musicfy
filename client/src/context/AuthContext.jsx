import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Synchronous cache hydration to completely eliminate flash of unauthenticated content
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('musicfy_user');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  // Always start with loading: true until initial session validation finishes
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        try {
          localStorage.setItem('musicfy_user', JSON.stringify(res.data.user));
          if (res.data.token) {
            localStorage.setItem('musicfy_token', res.data.token);
          }
        } catch (e) {}
      } else {
        setUser(null);
        localStorage.removeItem('musicfy_user');
        localStorage.removeItem('musicfy_token');
      }
    } catch (err) {
      // If unauthorized (401), clear cached user
      if (err.response?.status === 401) {
        setUser(null);
        localStorage.removeItem('musicfy_user');
        localStorage.removeItem('musicfy_token');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success && res.data.user) {
      if (res.data.token) {
        localStorage.setItem('musicfy_token', res.data.token);
      }
      localStorage.setItem('musicfy_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const register = async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    if (res.data.success && res.data.user) {
      if (res.data.token) {
        localStorage.setItem('musicfy_token', res.data.token);
      }
      localStorage.setItem('musicfy_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('musicfy_token');
      localStorage.removeItem('musicfy_user');
      setUser(null);
    }
  };

  const logoutAll = async () => {
    try {
      await api.post('/auth/logout-all');
    } catch (err) {
      console.error('LogoutAll error:', err);
    } finally {
      localStorage.removeItem('musicfy_token');
      localStorage.removeItem('musicfy_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, register, logout, logoutAll, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
