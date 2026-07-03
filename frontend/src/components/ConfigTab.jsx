import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function ConfigTab({ config, setConfig, setActiveTab }) {
  return (
    <div className="glass-panel card-body" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
          <label className="form-label">Exam Title</label>
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
            <label className="form-label">Exam duration</label>
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
