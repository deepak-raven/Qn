import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { API_BASE } from '../config';
import { 
  auth, 
  loginWithGoogle as firebaseGoogleLogin, 
  loginWithEmail as firebaseEmailLogin, 
  registerWithEmail as firebaseEmailRegister,
  logoutFirebase 
} from '../config/firebase';

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('jec_auth_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('jec_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Sync with Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const userData = {
            username: firebaseUser.email ? firebaseUser.email.split('@')[0] : firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email || 'User',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            uid: firebaseUser.uid,
            emailVerified: firebaseUser.emailVerified || false,
            role: (user?.role) || (firebaseUser.email?.toLowerCase().includes('admin') ? 'admin' : 'user')
          };

          setToken(idToken);
          setUser(userData);
          localStorage.setItem('jec_auth_token', idToken);
          localStorage.setItem('jec_auth_user', JSON.stringify(userData));
        } catch (err) {
          console.error("Error getting Firebase ID Token:", err);
        }
      } else {
        // If not logged in via Firebase and no saved local token, clear user
        if (!localStorage.getItem('jec_auth_token')) {
          setUser(null);
          setToken('');
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Validate session with backend if token exists
  const fetchMe = async (authToken) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser((prev) => ({ ...prev, ...userData }));
        localStorage.setItem('jec_auth_user', JSON.stringify({ ...user, ...userData }));
      }
    } catch (err) {
      console.warn("Backend auth validation check:", err);
    }
  };

  // Google Login Handler
  const loginWithGoogle = async () => {
    try {
      const { user: fbUser, idToken } = await firebaseGoogleLogin();
      const userData = {
        username: fbUser.email ? fbUser.email.split('@')[0] : fbUser.uid,
        name: fbUser.displayName || fbUser.email || 'User',
        email: fbUser.email || '',
        photoURL: fbUser.photoURL || '',
        uid: fbUser.uid,
        role: fbUser.email?.toLowerCase().includes('admin') ? 'admin' : 'user'
      };

      setToken(idToken);
      setUser(userData);
      localStorage.setItem('jec_auth_token', idToken);
      localStorage.setItem('jec_auth_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      throw new Error(err.message || 'Google Sign-In failed');
    }
  };

  // Standard Login (Tries Firebase Email Login, falls back to Backend API)
  const login = async (usernameOrEmail, password) => {
    try {
      // 1. Try Firebase Email Login if username looks like email
      if (usernameOrEmail.includes('@')) {
        try {
          const { user: fbUser, idToken } = await firebaseEmailLogin(usernameOrEmail, password);
          const userData = {
            username: fbUser.email.split('@')[0],
            name: fbUser.displayName || fbUser.email,
            email: fbUser.email,
            photoURL: fbUser.photoURL || '',
            uid: fbUser.uid,
            role: fbUser.email.toLowerCase().includes('admin') ? 'admin' : 'user'
          };
          setToken(idToken);
          setUser(userData);
          localStorage.setItem('jec_auth_token', idToken);
          localStorage.setItem('jec_auth_user', JSON.stringify(userData));
          return userData;
        } catch (fbErr) {
          console.log("Firebase login attempt failed, trying backend API...", fbErr.message);
        }
      }

      // 2. Backend API login fallback
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, password })
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
        throw new Error('Unable to reach backend server. Please verify backend service.');
      }
      throw err;
    }
  };

  // Registration Handler (Firebase Email Registration + Backend Fallback)
  const register = async (username, password, name, email) => {
    const targetEmail = email || (username.includes('@') ? username : `${username}@example.com`);
    try {
      // 1. Try Firebase Email Registration
      try {
        const { user: fbUser, idToken } = await firebaseEmailRegister(targetEmail, password, name);
        const userData = {
          username: username || fbUser.email.split('@')[0],
          name: name || fbUser.displayName || fbUser.email,
          email: fbUser.email,
          photoURL: fbUser.photoURL || '',
          uid: fbUser.uid,
          role: 'user'
        };
        setToken(idToken);
        setUser(userData);
        localStorage.setItem('jec_auth_token', idToken);
        localStorage.setItem('jec_auth_user', JSON.stringify(userData));
        return userData;
      } catch (fbErr) {
        console.log("Firebase registration attempt fallback to backend:", fbErr.message);
      }

      // 2. Backend API register fallback
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, email: targetEmail, role: 'user' })
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
        throw new Error('Unable to reach backend server.');
      }
      throw err;
    }
  };

  // Logout Handler
  const logout = async () => {
    await logoutFirebase();
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
    loginWithGoogle,
    register,
    logout,
    isAdmin: user?.role === 'admin'
  };
}
