import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

import Header from './components/Header';
import UploadTab from './components/UploadTab';
import ConfigTab from './components/ConfigTab';
import AdminTab from './components/AdminTab';
import QuestionPool from './components/QuestionPool';
import PaperPreview from './components/PaperPreview';
import LoginPage from './components/LoginPage';
import { useAppState } from './useAppState';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();
  const state = useAppState();

  // Route redirection based on role
  useEffect(() => {
    if (auth.user) {
      if (auth.isAdmin) {
        state.setActiveTab('admin');
      } else if (state.activeTab === 'admin') {
        state.setActiveTab('upload');
      }
    }
  }, [auth.user, auth.isAdmin]);

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

  if (!auth.user || !auth.token) {
    return (
      <LoginPage 
        onLogin={auth.login} 
        onRegister={auth.register} 
        onGoogleLogin={auth.loginWithGoogle}
        onResendVerification={auth.resendVerificationLink}
        onCheckVerification={auth.checkEmailVerificationStatus}
      />
    );
  }

  return (
    <div className="app-container">
      <Header {...state} auth={auth} />

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
