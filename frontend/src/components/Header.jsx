import React from 'react';
import { Upload, CheckSquare, Settings, RefreshCw, Download } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  questions,
  subjects,
  setSelectedSubCode,
  loadQuestionsForSubject,
  selectedPartA,
  selectedPartB,
  selectedPartC,
  handleGeneratePaper,
  downloading
}) {
  return (
    <div className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* JEC LOGO MOCKUP */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '0.75rem',
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
        }}>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>JEC</span>
        </div>
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>Jaya Engineering College</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dimmed)' }}>Exam Cell Orchestrator</span>
        </div>
      </div>
      
      <ul className="nav-menu">
        <li 
          className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={18} />
          Upload Bank
        </li>
        <li 
          className={`nav-item ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => {
            if (questions.length === 0 && subjects.length > 0) {
              const sub = subjects[0];
              setSelectedSubCode(sub.code);
              loadQuestionsForSubject(sub.code, sub.semester);
            }
            setActiveTab('questions');
          }}
        >
          <CheckSquare size={18} />
          Select Questions
        </li>
        <li 
          className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Settings size={18} />
          Paper Settings
        </li>
      </ul>

      {/* Selected Summary Header Panel */}
      <div className="header-progress-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div className="header-progress-info" style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
          <span style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', color: selectedPartA.filter(Boolean).length === 10 ? 'var(--success)' : 'var(--text-muted)' }}>
            Part A: <strong>{selectedPartA.filter(Boolean).length}/10</strong>
          </span>
          <span style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', color: selectedPartB.filter(s => s.a && s.b).length === 5 ? 'var(--success)' : 'var(--text-muted)' }}>
            Part B: <strong>{selectedPartB.filter(s => s.a && s.b).length}/5</strong>
          </span>
          <span style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', color: (selectedPartC.a && selectedPartC.b) ? 'var(--success)' : 'var(--text-muted)' }}>
            Part C: <strong>{(selectedPartC.a && selectedPartC.b) ? '1/1' : '0/1'}</strong>
          </span>
        </div>
        
        <button 
          className="btn btn-primary" 
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          onClick={handleGeneratePaper}
          disabled={downloading}
        >
          {downloading ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
          Generate docx
        </button>
      </div>
    </div>
  );
}
