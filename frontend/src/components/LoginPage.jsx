import React, { useState } from 'react';
import { LogIn, UserPlus, AlertCircle, Mail, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import logoImg from '../assets/image.png';

export default function LoginPage({ onLogin, onRegister, onGoogleLogin, onResendVerification, onCheckVerification }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Email verification screen state
  const [verificationPendingEmail, setVerificationPendingEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [checkingVerification, setCheckingVerification] = useState(false);

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

  const handleResend = async () => {
    setResendStatus('');
    try {
      if (onResendVerification) {
        await onResendVerification();
        setResendStatus('Verification email re-sent successfully! Please check your inbox.');
      }
    } catch (err) {
      setResendStatus('Failed to resend email. Please try again in a few moments.');
    }
  };

  const handleVerifyCheck = async () => {
    setCheckingVerification(true);
    setResendStatus('');
    try {
      if (onCheckVerification) {
        const isVerified = await onCheckVerification();
        if (isVerified) {
          setResendStatus('Email verified successfully! Redirecting...');
        } else {
          setResendStatus('Email not verified yet. Please click the link sent to your inbox.');
        }
      }
    } catch (err) {
      setResendStatus('Could not verify status. Please try again.');
    } finally {
      setCheckingVerification(false);
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

        const result = await onRegister(usernameVal, password, name.trim(), emailVal);
        if (result && result.emailSent) {
          setVerificationPendingEmail(emailVal);
        }
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
            Question Paper Generator
          </p>
        </div>

        {/* VERIFICATION SCREEN (Shown after sign up) */}
        {verificationPendingEmail ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto',
              background: '#eff6ff',
              color: '#2563eb',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={32} />
            </div>

            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>
                Verify Your Email
              </h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.4 }}>
                A verification link has been sent to:<br />
                <strong style={{ color: '#1e293b' }}>{verificationPendingEmail}</strong>
              </p>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Please check your email inbox (and spam folder) and click the verification link.
              </p>
            </div>

            {resendStatus && (
              <div style={{
                background: '#f0fdf4',
                borderLeft: '4px solid #22c55e',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                color: '#15803d',
                fontSize: '0.82rem',
                textAlign: 'left'
              }}>
                {resendStatus}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleVerifyCheck}
                disabled={checkingVerification}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {checkingVerification ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {checkingVerification ? 'Checking Status...' : 'I Have Verified My Email'}
              </button>

              <button
                type="button"
                className="btn"
                onClick={handleResend}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#475569',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Mail size={15} /> Resend Verification Email
              </button>

              <button
                type="button"
                onClick={() => { setVerificationPendingEmail(''); setIsRegister(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* REGULAR LOGIN / REGISTER FORM */
          <>
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
                padding: '0.8rem 1rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#374151',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem',
                cursor: 'pointer',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
                transition: 'all 0.15s ease',
                marginTop: '0.5rem'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              {googleLoading ? 'Connecting Google...' : 'Continue with Google'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
