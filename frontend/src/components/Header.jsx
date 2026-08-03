import React from 'react';
import { Upload, CheckSquare, RefreshCw, Download, ShieldCheck, LogOut, User } from 'lucide-react';
import logoImg from '../assets/image.png';
import { isCATExam, is2025Regulation } from '../hooks/useSetsManager';

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

  const is2025 = is2025Regulation(config?.regulation);
  const isCAT = isCATExam(config?.exam_type, config?.regulation);

  const reqPartA = (is2025 || isCAT) ? 5 : 10;
  const reqPartB = (isCAT && !is2025) ? 2 : 5;
  const reqPartC = is2025 ? 3 : 1;

  const partACount = (selectedPartA || []).slice(0, reqPartA).filter(Boolean).length;
  
  const partBCount = is2025 
    ? (selectedPartB || []).slice(0, 5).filter(s => s && (s.a || s.b || s.text)).length
    : (selectedPartB || []).slice(0, reqPartB).filter(s => s && (s.a || s.b)).length;

  const partCCount = is2025
    ? (Array.isArray(selectedPartC) ? selectedPartC.slice(0, 3).filter(s => s && (s.a || s.b)).length : 0)
    : (selectedPartC ? (Array.isArray(selectedPartC) ? (selectedPartC[0]?.a || selectedPartC[0]?.b ? 1 : 0) : (selectedPartC.a || selectedPartC.b ? 1 : 0)) : 0);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <img 
          src={logoImg} 
          alt="Jaya Engineering College Logo" 
          style={{
            height: '44px',
            width: 'auto',
            objectFit: 'contain',
            flexShrink: 0
          }} 
        />
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0, lineHeight: 1.1 }}>
            Jaya Engineering College
          </h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Question Paper Generator
          </span>
        </div>
      </div>

      {/* 2. Middle Section: Navigation Menu (No Paper Settings tab as requested) */}
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
                  loadQuestionsForSubject(sub.code, sub.semester, false, sub);
                }
                setActiveTab('questions');
              }}
            >
              <CheckSquare size={18} />
              Select Questions
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
              <span style={{ color: partCCount === reqPartC ? 'var(--success)' : 'var(--text-muted)' }}>
                Part C: <strong>{partCCount}/{reqPartC}</strong>
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
              onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#f1f5f9'; }}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
