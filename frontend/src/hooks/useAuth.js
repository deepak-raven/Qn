import { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('jec_auth_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('jec_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchMe(token);
    } else {
      setAuthLoading(false);
    }
  }, []);

  const fetchMe = async (authToken) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('jec_auth_user', JSON.stringify(userData));
      } else {
        // Token expired or invalid
        logout();
      }
    } catch (err) {
      console.error("Auth validation error:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Login failed with status ${res.status}`);
      }

      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('jec_auth_token', data.access_token);
      localStorage.setItem('jec_auth_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        throw new Error('Unable to reach backend server. If using Render free tier, the backend may be spinning up (wait ~30 seconds and try again) or check VITE_API_BASE_URL & CORS configuration.');
      }
      throw err;
    }
  };

  const register = async (username, password, name, email) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, email, role: 'user' })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Registration failed with status ${res.status}`);
      }

      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('jec_auth_token', data.access_token);
      localStorage.setItem('jec_auth_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        throw new Error('Unable to reach backend server. Please verify backend service status on Render.');
      }
      throw err;
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('jec_auth_token');
    localStorage.removeItem('jec_auth_user');
  };

  return {
    token,
    user,
    authLoading,
    login,
    register,
    logout,
    isAdmin: user?.role === 'admin'
  };
}
