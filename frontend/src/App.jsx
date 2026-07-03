import React from 'react';
import { AlertCircle } from 'lucide-react';

import Header from './components/Header';
import UploadTab from './components/UploadTab';
import ConfigTab from './components/ConfigTab';
import QuestionPool from './components/QuestionPool';
import PaperPreview from './components/PaperPreview';
import { useAppState } from './useAppState';

export default function App() {
  const state = useAppState();

  return (
    <div className="app-container">
      <Header {...state} />

      <div className={`main-content ${state.activeTab === 'questions' ? 'workspace-layout' : ''}`}>
        {state.activeTab === 'upload' && (
          <UploadTab {...state} />
        )}

        {state.activeTab === 'questions' && (
          <div>
            {state.questions.length === 0 ? (
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
          <ConfigTab {...state} />
        )}
      </div>
    </div>
  );
}
