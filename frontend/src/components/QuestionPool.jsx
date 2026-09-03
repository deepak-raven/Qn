import React from 'react';
import { Search, GripVertical } from 'lucide-react';

export default function QuestionPool({
  API_BASE,
  config,
  setConfig,
  selectedSubCode,
  searchQuery,
  setSearchQuery,
  filterUnit,
  setFilterUnit,
  activeTabSub,
  setActiveTabSub,
  filteredPool,
  isAssigned,
  handleDragStart,
  handleToggleQuestion
}) {
  return (
    <div className="glass-panel card-body" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      height: 'calc(100vh - 64px)',
      overflowY: 'auto',
      position: 'sticky',
      top: '64px',
      borderRadius: 0,
      borderTop: 'none',
      borderBottom: 'none',
      borderLeft: 'none'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            Question Bank
          </h3>

          {/* Exam Type Selector */}
          {config && setConfig && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Exam Type:</span>
              <select
                value={config.exam_type || 'MODEL EXAMINATION'}
                onChange={(e) => {
                  const newType = e.target.value;
                  const isCatType = newType === 'CAT-1' || newType === 'CAT-2' || newType === 'CAT-3';
                  const catExamName = newType === 'CAT-3'
                    ? 'CONTINUOUS ASSESSMENT TEST - III'
                    : (newType === 'CAT-2' ? 'CONTINUOUS ASSESSMENT TEST - II' : 'CONTINUOUS ASSESSMENT TEST - I');
                  setConfig(prev => ({
                    ...prev,
                    exam_type: newType,
                    exam_name: isCatType ? catExamName : 'MODEL EXAMINATION',
                    time: isCatType ? '90 Minutes' : '3 Hours',
                    max_marks: isCatType ? 50 : 100
                  }));
                }}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: 'var(--primary)',
                  cursor: 'pointer'
                }}
              >
                <option value="MODEL EXAMINATION">MODEL EXAMINATION</option>
                <option value="CAT-1">CAT - I</option>
                <option value="CAT-2">CAT - II</option>
                <option value="CAT-3">CAT - III</option>
              </select>
            </div>
          )}
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
          Showing questions from selected subject. Drag items into the paper preview.
        </p>
      </div>

      {/* SEARCH & FILTERS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <div style={{ position: 'relative', flex: 4 }}>
          <input
            type="text"
            placeholder="Search questions..."
            className="form-input"
            style={{ paddingLeft: '2rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '0.7rem', color: 'var(--text-dimmed)' }} />
        </div>

        <select
          className="form-select"
          value={filterUnit}
          onChange={(e) => setFilterUnit(e.target.value)}
          style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
        >
          <option value="All">All Units</option>
          <option value="Unit I">Unit I</option>
          <option value="Unit II">Unit II</option>
          <option value="Unit III">Unit III</option>
          <option value="Unit IV">Unit IV</option>
          <option value="Unit V">Unit V</option>
        </select>
      </div>

      {/* POOL TAB SUB-SELECTOR */}
      <div className="part-tabs" style={{ marginTop: '0.25rem' }}>
        {['Part A', 'Part B', 'Part C'].map((label, idx) => {
          const keys = ['A', 'B', 'C'];
          const active = activeTabSub === keys[idx];
          return (
            <button
              key={idx}
              onClick={() => {
                setActiveTabSub(keys[idx]);
                setSearchQuery('');
              }}
              className={`tab-btn ${active ? 'active' : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* DRAGGABLE LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
        {filteredPool.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-dimmed)', fontSize: '0.85rem' }}>
            No questions match search/filters.
          </div>
        ) : (
          filteredPool.map((q, idx) => {
            const assigned = isAssigned(q);
            return (
              <div
                key={q._id || idx}
                className={`pool-item ${assigned ? 'assigned' : ''}`}
                draggable={!assigned}
                onDragStart={(e) => handleDragStart(e, q)}
              >
                <div className="pool-item-drag-handle">
                  <GripVertical size={14} />
                </div>
                <div className="pool-item-content">
                  <p className="pool-item-text">{q.text}</p>
                  {q.image_data && (
                    <div style={{ marginTop: '4px', marginBottom: '4px' }}>
                      <img
                        src={q.image_data.startsWith('data:') ? q.image_data : `data:image/png;base64,${q.image_data}`}
                        alt="Question Diagram"
                        style={{ maxHeight: '75px', maxWidth: '100%', borderRadius: '4px', border: '1px solid #cbd5e1', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                  <div className="pool-item-tags">
                    <span className="tag tag-unit">{q.unit}</span>
                    <span className="tag tag-kl">{q.kl}</span>
                    <span className="tag tag-co">{q.co}</span>
                    {q.image_data && (
                      <span className="tag" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', fontWeight: 600 }}>
                        📷 Diagram
                      </span>
                    )}
                    {assigned && (
                      <span className="tag tag-unit" style={{ background: 'var(--success-light)', color: 'var(--success)', borderColor: 'var(--success)' }}>
                        Added
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                  <input
                    type="checkbox"
                    checked={assigned}
                    onChange={() => handleToggleQuestion(q)}
                    title={assigned ? "Remove question from paper" : "Add question to paper"}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                      accentColor: 'var(--primary)'
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

