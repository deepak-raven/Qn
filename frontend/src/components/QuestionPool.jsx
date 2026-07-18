import React, { useState, useEffect } from 'react';
import { Search, GripVertical, Globe, BookOpen } from 'lucide-react';

export default function QuestionPool({
  API_BASE,
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
  const [poolSource, setPoolSource] = useState('current'); // 'current' | 'common'
  const [commonQuestions, setCommonQuestions] = useState([]);
  const [loadingCommon, setLoadingCommon] = useState(false);

  useEffect(() => {
    if (poolSource === 'common') {
      fetchCommonQuestions();
    }
  }, [poolSource, activeTabSub, filterUnit, searchQuery]);

  const fetchCommonQuestions = async () => {
    setLoadingCommon(true);
    try {
      const queryParams = new URLSearchParams({
        part: activeTabSub,
        unit: filterUnit,
        search: searchQuery,
        exclude_subject_code: selectedSubCode || ''
      });
      const res = await fetch(`${API_BASE}/questions/common?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCommonQuestions(data);
      }
    } catch (err) {
      console.error("Error fetching common questions:", err);
    } finally {
      setLoadingCommon(false);
    }
  };

  const displayList = poolSource === 'current' ? filteredPool : commonQuestions;

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
            Question Bank Pool
          </h3>

          {/* Toggle Pool Source: Current Subject vs Common DB */}
          <div style={{ display: 'flex', gap: '0.2rem', background: '#e0e0e0', padding: '2px', borderRadius: '4px' }}>
            <button
              type="button"
              className={`btn ${poolSource === 'current' ? 'btn-primary' : ''}`}
              onClick={() => setPoolSource('current')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', background: poolSource === 'current' ? undefined : 'transparent', color: poolSource === 'current' ? undefined : '#444' }}
              title="Show questions from current selected subject"
            >
              <BookOpen size={12} /> My QB Pool
            </button>
            <button
              type="button"
              className={`btn ${poolSource === 'common' ? 'btn-primary' : ''}`}
              onClick={() => setPoolSource('common')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', background: poolSource === 'common' ? undefined : 'transparent', color: poolSource === 'common' ? undefined : '#444' }}
              title="Search common questions across all databases in MongoDB"
            >
              <Globe size={12} /> Common DB
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
          {poolSource === 'current' 
            ? 'Showing questions from selected subject. Drag items into the paper preview.'
            : 'Searching shared questions across all uploaded databases in MongoDB.'
          }
        </p>
      </div>

      {/* SEARCH & FILTERS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <div style={{ position: 'relative', flex: 4 }}>
          <input 
            type="text" 
            placeholder={poolSource === 'current' ? "Search questions..." : "Search common DB questions..."} 
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
        {['Part A (2m)', 'Part B (13m)', 'Part C (15m)'].map((label, idx) => {
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
        {loadingCommon ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Searching common questions in database...
          </div>
        ) : displayList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-dimmed)', fontSize: '0.85rem' }}>
            {poolSource === 'current' ? 'No questions match search/filters.' : 'No common questions found in database matching search criteria.'}
          </div>
        ) : (
          displayList.map((q, idx) => {
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
                  <div className="pool-item-tags">
                    <span className="tag tag-unit">{q.unit}</span>
                    <span className="tag tag-kl">{q.kl}</span>
                    <span className="tag tag-co">{q.co}</span>
                    {poolSource === 'common' && (
                      <span className="tag tag-unit" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                        [{q.subject_code}] {q.uploader_name || 'System'}
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
