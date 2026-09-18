import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

import Header from './components/Header';
import UploadTab from './components/UploadTab';
import ConfigTab from './components/ConfigTab';
import AdminTab from './components/AdminTab';
import QuestionPool from './components/QuestionPool';
import PaperPreview from './components/PaperPreview';
import LoginPage from './components/LoginPage';
import AdminLoginPage from './components/AdminLoginPage';
import { useAppState } from './useAppState';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();
  const state = useAppState();

  // Path routing state
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname.toLowerCase());

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname.toLowerCase());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path.toLowerCase());
  };

  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/');

  // Route redirection based on role and current URL
  useEffect(() => {
    if (auth.user) {
      if (auth.isAdmin) {
        state.setActiveTab('admin');
        if (!isAdminRoute && window.location.pathname === '/') {
          navigate('/admin');
        }
      } else if (state.activeTab === 'admin') {
        state.setActiveTab('upload');
      }
    }
  }, [auth.user, auth.isAdmin, isAdminRoute]);

  // Sync currentUser with auth.user for state scoping in components
  useEffect(() => {
    if (auth.user) {
      state.setCurrentUser(auth.user);
    } else {
      state.setCurrentUser(null);
    }
  }, [auth.user]);

  if (auth.authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <RefreshCw size={36} className="animate-spin" style={{ color: '#6366f1' }} />
          <span>Verifying authentication...</span>
        </div>
      </div>
    );
  }

  // If not logged in
  if (!auth.user || !auth.token) {
    if (isAdminRoute) {
      return (
        <AdminLoginPage 
          onLogin={auth.login}
          onNavigate={navigate}
          onLogout={auth.logout}
        />
      );
    }

    return (
      <LoginPage 
        onLogin={auth.login} 
        onRegister={auth.register} 
        onGoogleLogin={auth.loginWithGoogle}
        onResendVerification={auth.resendVerificationLink}
        onCheckVerification={auth.checkEmailVerificationStatus}
        onNavigate={navigate}
      />
    );
  }

  // If logged in as a normal user attempting to access /admin
  if (isAdminRoute && !auth.isAdmin) {
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
          maxWidth: '460px',
          padding: '2.5rem',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 1.25rem',
            background: '#fee2e2',
            color: '#dc2626',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={34} />
          </div>

          <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
            Access Restricted
          </h2>
          <p style={{ margin: '0.6rem 0 1.5rem', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
            You are currently signed in as <strong>{auth.user.name || auth.user.username}</strong> ({auth.user.email || 'Faculty Account'}), which does not have administrator privileges.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={async () => {
                await auth.logout();
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#ffffff',
                background: '#dc2626',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <LogOut size={16} /> Sign In with Admin Account
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#334155',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <ArrowLeft size={16} /> Return to Faculty Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header {...state} auth={auth} onNavigate={navigate} />

      <div className={`main-content ${state.activeTab === 'questions' ? 'workspace-layout' : ''}`}>
        {auth.isAdmin ? (
          /* Dedicated Admin Control Page for Logged-In Admin */
          <AdminTab {...state} auth={auth} />
        ) : (
          /* Faculty Workspace Pages */
          <>
            {state.activeTab === 'upload' && (
              <UploadTab {...state} auth={auth} />
            )}

            {state.activeTab === 'questions' && (
              <div>
                {state.loadingWorkspace && state.questions.length === 0 ? (
                  <div className="glass-panel card-body" style={{ textAlign: 'center', padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>Restoring workspace database...</span>
                  </div>
                ) : state.questions.length === 0 ? (
                  <div className="glass-panel card-body" style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <AlertCircle size={48} style={{ color: 'var(--text-dimmed)', margin: '0 auto 1rem' }} />
                    <h3>No Database Selected</h3>
                    <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                      Go to the 'Upload Bank' tab, upload a docx file, or select a parsed database.
                    </p>
                  </div>
                ) : (
                  <div className="workspace-grid">
                    <QuestionPool {...state} />
                    <PaperPreview {...state} />
                  </div>
                )}
              </div>
            )}

            {state.activeTab === 'config' && (
              <ConfigTab {...state} auth={auth} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
