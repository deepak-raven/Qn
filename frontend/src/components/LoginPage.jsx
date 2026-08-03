import React, { useState } from 'react';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import logoImg from '../assets/image.png';

export default function LoginPage({ onLogin, onRegister }) {
  const [isRegister, setIsRegister] = useState(false);
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
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
              marginTop: '0.4rem'
            }}
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
            {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
          </button>
        </form>

        {/* Bottom Toggle Link */}
        <div style={{
          marginTop: '1.75rem',
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
