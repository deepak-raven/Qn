import React, { useState } from 'react';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import logoImg from '../assets/image.png';

export default function LoginPage({ onLogin, onRegister, onGoogleLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleClick = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      if (onGoogleLogin) {
        await onGoogleLogin();
      }
    } catch (err) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
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
        const identifierVal = username.trim().toLowerCase();
        if (!identifierVal) {
          throw new Error('Username or Email is required.');
        }
        
        if (identifierVal.includes('@')) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(identifierVal)) {
            throw new Error('Please enter a valid email address.');
          }
        }

        await onLogin(identifierVal, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
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
        maxWidth: '440px',
        padding: '2.5rem',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
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
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
            Question Bank & Exam Orchestration System
          </p>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>
            {isRegister ? 'Create Account' : 'Sign In'}
          </h3>
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

        {/* Google Auth Button */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={googleLoading || loading}
          style={{
            width: '100%',
            padding: '0.7rem 1rem',
            fontSize: '0.92rem',
            fontWeight: 600,
            color: '#374151',
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            cursor: 'pointer',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'all 0.15s ease',
            marginBottom: '1.25rem'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          {googleLoading ? 'Connecting Google...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: '1.25rem',
          color: '#94a3b8',
          fontSize: '0.78rem',
          fontWeight: 500
        }}>
          <div style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }}></div>
          <span style={{ padding: '0 0.75rem' }}>or sign in with email/username</span>
          <div style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }}></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isRegister && (
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
              {isRegister ? 'Choose Username' : 'Username or Email'}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={isRegister ? 'e.g. deepak' : 'enter username or email'}
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          {isRegister && (
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
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.4rem'
            }}
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
            {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
          </button>
        </form>

        {/* Bottom Toggle Link */}
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#64748b',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '1.25rem'
        }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #2563eb)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #2563eb)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
