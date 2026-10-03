import React, { useState } from 'react';
import { LogIn, AlertCircle, ArrowLeft, Lock, User, Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/image.png';

export default function AdminLoginPage({ onLogin, onNavigate, onLogout }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setError('Please enter your administrator username or email.');
      return;
    }
    if (!password) {
      setError('Please enter your administrator password.');
      return;
    }

    setLoading(true);
    try {
      const userData = await onLogin(trimmedUser, password);
      
      // Enforce admin role check
      if (userData && userData.role !== 'admin') {
        if (onLogout) await onLogout();
        throw new Error('Access Denied: This account does not possess administrator privileges.');
      }
      // If successful admin, the parent component's auth state handles view switch
    } catch (err) {
      setError(err.message || 'Administrator sign-in failed. Please check your credentials.');
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
      background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%)',
      padding: '1.5rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Top College Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '74px',
            height: '74px',
            margin: '0 auto 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: 'drop-shadow(0 6px 16px rgba(0, 0, 0, 0.12))'
          }}>
            <img 
              src={logoImg} 
              alt="Jaya Engineering College Logo" 
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }} 
            />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Jaya Engineering College
          </h2>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Question Paper Generator System
          </p>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b', fontWeight: 700 }}>
            Administrator Sign In
          </h3>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Enter your system administrator credentials to access management controls.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            background: '#fef2f2',
            borderLeft: '4px solid #ef4444',
            padding: '0.75rem 0.9rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            color: '#991b1b',
            fontSize: '0.84rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Scoped style for clear high-contrast text and placeholder */}
        <style>{`
          .admin-auth-input::placeholder {
            color: #94a3b8 !important;
            font-weight: 400 !important;
          }
          .admin-auth-input {
            color: #0f172a !important;
          }
        `}</style>

        {/* Admin Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.45rem' }}>
              Admin Username or Email
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={18} style={{ position: 'absolute', left: '0.85rem', color: '#64748b', pointerEvents: 'none' }} />
              <input
                type="text"
                className="admin-auth-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username (e.g. admin)"
                autoComplete="username"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem 0.75rem 2.6rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  caretColor: '#2563eb',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  background: '#ffffff',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.45rem' }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} style={{ position: 'absolute', left: '0.85rem', color: '#64748b', pointerEvents: 'none' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="admin-auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 2.7rem 0.75rem 2.6rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  caretColor: '#2563eb',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  background: '#ffffff',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '0.4rem',
              padding: '0.75rem',
              fontSize: '0.92rem',
              fontWeight: 700,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn size={17} />
                <span>Sign In to Admin Portal</span>
              </>
            )}
          </button>
        </form>

        {/* Back to Faculty Portal Navigation */}
        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center'
        }}>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'color 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#1e293b'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; }}
          >
            <ArrowLeft size={14} />
            <span>Return to Faculty Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
