import React from 'react';
import { ChevronRight, Award, Layers } from 'lucide-react';

export default function ConfigTab({ config, setConfig, setActiveTab }) {
  return (
    <div className="glass-panel card-body" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Exam Type Quick Selector */}
        <div style={{ background: 'var(--primary-light, #eff6fc)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
            <Layers size={20} />
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Select Examination Rule & Type</h4>
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Exam Pattern / Assessment Type</label>
            <select
              className="form-select"
              value={config.exam_type || 'MODEL EXAMINATION'}
              onChange={e => setConfig({ ...config, exam_type: e.target.value })}
              style={{ fontSize: '0.95rem', fontWeight: 600, padding: '0.6rem' }}
            >
              <option value="MODEL EXAMINATION">
                MODEL EXAMINATION (Full Syllabus: Unit I - V | 100 Marks | 10 Part A, 5 Part B pairs, 1 Part C pair)
              </option>
              <option value="CAT-1">
                CAT - I: Continuous Assessment Test 1 (Syllabus: Unit I & II | 50 Marks | 5 Part A, 2 Part B pairs, 1 Part C pair)
              </option>
              <option value="CAT-2">
                CAT - II: Continuous Assessment Test 2 (Syllabus: Unit III & IV | 50 Marks | 5 Part A, 2 Part B pairs, 1 Part C pair)
              </option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span className="tag tag-unit" style={{ background: '#fff' }}>
              Selected Rule: {(config.exam_type === 'CAT-1' || config.exam_type === 'IAT-1') ? 'Unit I & II (50 Marks)' : (config.exam_type === 'CAT-2' || config.exam_type === 'IAT-2') ? 'Unit III & IV (50 Marks)' : 'Full Syllabus (100 Marks)'}
            </span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Name of Institution</label>
          <input 
            type="text" 
            className="form-input"
            value={config.institution_name}
            onChange={e => setConfig({ ...config, institution_name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Exam Title Header</label>
          <input 
            type="text" 
            className="form-input"
            value={config.exam_name}
            onChange={e => setConfig({ ...config, exam_name: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Regulation Code</label>
            <input 
              type="text" 
              className="form-input"
              value={config.regulation}
              onChange={e => setConfig({ ...config, regulation: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Academic Semester / Year</label>
            <input 
              type="text" 
              className="form-input"
              value={config.semester}
              onChange={e => setConfig({ ...config, semester: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Subject Code</label>
            <input 
              type="text" 
              className="form-input"
              value={config.subject_code}
              onChange={e => setConfig({ ...config, subject_code: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Subject Name</label>
            <input 
              type="text" 
              className="form-input"
              value={config.subject_name}
              onChange={e => setConfig({ ...config, subject_name: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Degree/Branch/Semester Line</label>
          <input 
            type="text" 
            className="form-input"
            value={config.degree_branch_sem}
            onChange={e => setConfig({ ...config, degree_branch_sem: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Exam Duration</label>
            <input 
              type="text" 
              className="form-input"
              value={config.time}
              onChange={e => setConfig({ ...config, time: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Maximum Marks</label>
            <input 
              type="number" 
              className="form-input"
              value={config.max_marks}
              onChange={e => setConfig({ ...config, max_marks: parseInt(e.target.value) || 100 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Paper Set ID</label>
            <input 
              type="text" 
              className="form-input"
              value={config.set}
              onChange={e => setConfig({ ...config, set: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Exam Date</label>
          <input 
            type="text" 
            className="form-input"
            value={config.date}
            onChange={e => setConfig({ ...config, date: e.target.value })}
            placeholder="e.g. 03-07-2026"
          />
        </div>

        <button className="btn btn-primary" onClick={() => setActiveTab('questions')} style={{ alignSelf: 'flex-end', marginTop: '1rem' }}>
          Go back to selection <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
