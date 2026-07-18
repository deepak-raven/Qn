import React from 'react';
import { Upload, CheckSquare, Settings, RefreshCw, Download, ShieldCheck, LogOut, User } from 'lucide-react';

export default function Header({
  config,
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
  downloading,
  auth
}) {
  const { user, logout, isAdmin } = auth || {};

  const reqPartA = config?.exam_type === 'IAT-1' || config?.exam_type === 'IAT-2' ? 5 : 10;
  const reqPartB = config?.exam_type === 'IAT-1' || config?.exam_type === 'IAT-2' ? 2 : 5;

  const partACount = selectedPartA.filter(Boolean).length;
  const partBCount = selectedPartB.filter(s => s && s.a && s.b).length;
  const partCCount = (selectedPartC.a && selectedPartC.b) ? 1 : 0;


  return (
    <header className="sidebar" style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 'auto',
      minHeight: '64px',
      padding: '0.6rem 2rem',
      background: '#ffffff',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      {/* 1. Left Section: Logo & Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(24, 90, 189, 0.25)',
          flexShrink: 0
        }}>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.95rem' }}>JEC</span>
        </div>
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0, lineHeight: 1.1 }}>
            Jaya Engineering College
          </h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Exam Cell Orchestrator
          </span>
        </div>
      </div>

      {/* 2. Middle Section: Navigation Menu */}
      <ul className="nav-menu" style={{ margin: 0, padding: 0 }}>
        {isAdmin ? (
          <li 
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <ShieldCheck size={18} />
            Admin Storage & Control
          </li>
        ) : (
          <>
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
          </>
        )}
      </ul>

      {/* 3. Right Section: Summary & User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Progress & Generate Button for Faculty */}
        {!isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ color: partACount === reqPartA ? 'var(--success)' : 'var(--text-muted)' }}>
                Part A: <strong>{partACount}/{reqPartA}</strong>
              </span>
              <span style={{ color: partBCount === reqPartB ? 'var(--success)' : 'var(--text-muted)' }}>
                Part B: <strong>{partBCount}/{reqPartB}</strong>
              </span>
              <span style={{ color: partCCount === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                Part C: <strong>{partCCount}/1</strong>
              </span>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              onClick={handleGeneratePaper}
              disabled={downloading}
            >
              {downloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              Generate docx
            </button>
          </div>
        )}

        {/* User Profile Badge & Logout */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            paddingLeft: '0.75rem',
            borderLeft: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isAdmin ? '#ef4444' : 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                {user.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.1 }}>
                  {user.name}
                </span>
                <span className="tag tag-unit" style={{ fontSize: '0.62rem', padding: '0.05rem 0.35rem', marginTop: '2px', background: isAdmin ? '#fee2e2' : '#e0e7ff', color: isAdmin ? '#dc2626' : '#4338ca', alignSelf: 'flex-start' }}>
                  {isAdmin ? 'System Admin' : 'Faculty'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Logout"
              style={{
                background: '#f1f5f9',
                border: '1px solid var(--border-color)',
                color: '#64748b',
                cursor: 'pointer',
                padding: '0.4rem 0.5rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
