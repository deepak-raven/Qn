import React, { useState } from 'react';
import { Shield, KeyRound, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import logoImg from '../assets/image.png';

export default function LoginPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState('user'); // 'user' | 'admin' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const identifierVal = username.trim().toLowerCase();
      
      // Admin username check
      if (mode === 'admin') {
        await onLogin(identifierVal, password);
      } else if (mode === 'register') {
        if (!name.trim()) throw new Error('Full Name is required.');
        
        const usernameVal = username.trim().toLowerCase();
        const usernameRegex = /^[a-zA-Z0-9_\-\.]{3,30}$/;
        if (!usernameRegex.test(usernameVal)) {
          throw new Error('Username must be 3-30 characters long and contain only letters, numbers, underscores, hyphens, or dots.');
        }

        const emailVal = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal)) {
          throw new Error('Please enter a valid email address.');
        }

        await onRegister(usernameVal, password, name.trim(), emailVal);
      } else {
        // Faculty Login (Username or Email)
        if (!identifierVal) {
          throw new Error('Username or Email is required.');
        }
        
        if (identifierVal.includes('@')) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(identifierVal)) {
            throw new Error('Please enter a valid email address.');
          }
        } else {
          const usernameRegex = /^[a-zA-Z0-9_\-\.]{3,30}$/;
          if (!usernameRegex.test(identifierVal)) {
            throw new Error('Username must be 3-30 characters long and contain only letters, numbers, underscores, hyphens, or dots.');
          }
        }
        
        await onLogin(identifierVal, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminQuickFill = () => {
    setMode('admin');
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-gradient, linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%))',
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '2.5rem',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: 'drop-shadow(0 6px 16px rgba(0, 0, 0, 0.12))'
          }}>
            <img 
              src={logoImg} 
              alt="Jaya Educational Trust Logo" 
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }} 
            />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', color: '#1e293b', fontWeight: 800 }}>
            Jaya Engineering College
          </h2>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Question Bank & Exam Orchestration System
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.4rem',
          background: '#f1f5f9',
          padding: '0.3rem',
          borderRadius: '10px',
          marginBottom: '1.75rem'
        }}>
          <button
            type="button"
            className={`btn ${mode === 'user' ? 'btn-primary' : ''}`}
            onClick={() => { setMode('user'); setError(''); setUsername(''); setPassword(''); setEmail(''); }}
            style={{ fontSize: '0.78rem', padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: mode === 'user' ? undefined : 'transparent', color: mode === 'user' ? undefined : '#475569' }}
          >
            <KeyRound size={14} /> Faculty
          </button>

          <button
            type="button"
            className={`btn ${mode === 'admin' ? 'btn-primary' : ''}`}
            onClick={() => { setMode('admin'); setError(''); setUsername(''); setPassword(''); setEmail(''); }}
            style={{ fontSize: '0.78rem', padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: mode === 'admin' ? undefined : 'transparent', color: mode === 'admin' ? undefined : '#475569' }}
          >
            <Shield size={14} /> Admin
          </button>

          <button
            type="button"
            className={`btn ${mode === 'register' ? 'btn-primary' : ''}`}
            onClick={() => { setMode('register'); setError(''); setUsername(''); setPassword(''); setEmail(''); }}
            style={{ fontSize: '0.78rem', padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: mode === 'register' ? undefined : 'transparent', color: mode === 'register' ? undefined : '#475569' }}
          >
            <UserPlus size={14} /> Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: '#fef2f2',
            borderLeft: '4px solid #ef4444',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#991b1b',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {mode === 'register' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name / Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Dr. K. Deepak"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              {mode === 'register' ? 'Choose Username' : mode === 'admin' ? 'Admin Username' : 'Username or Email'}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={mode === 'admin' ? 'admin' : mode === 'register' ? 'choose username' : 'enter username or email'}
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          {mode === 'register' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              margin: '0.5rem 0'
            }}
          >
            {loading ? 'Authenticating...' : mode === 'register' ? 'Create Account' : mode === 'admin' ? 'Login as Admin' : 'Login as Faculty'}
            <LogIn size={18} />
          </button>
        </form>

        {/* Quick Admin Helper Badge */}
        {mode === 'admin' && (
          <div style={{
            marginTop: '1.5rem',
            padding: '0.75rem',
            background: '#f8fafc',
            border: '1px border #e2e8f0',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '0.78rem',
            color: '#64748b'
          }}>
            Default Admin Credentials: <strong>admin</strong> / <strong>admin123</strong>
            <button
              type="button"
              onClick={handleAdminQuickFill}
              style={{
                display: 'block',
                margin: '0.4rem auto 0',
                background: 'none',
                border: 'none',
                color: 'var(--primary, #6366f1)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              Click here to Auto-Fill Admin Credentials
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
