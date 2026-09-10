import React from 'react';
import { ChevronRight, Award, Layers } from 'lucide-react';
import { is2025Regulation } from '../hooks/useSetsManager';

export default function ConfigTab({ config, setConfig, setActiveTab }) {
  const is2025 = is2025Regulation(config.regulation);
  const totalUnits = Number(config.total_units) || 5;

  const getRuleDescription = () => {
    if (config.exam_type === 'MODEL EXAMINATION') return 'Full Syllabus (100 Marks)';
    if (!is2025) {
      if (config.exam_type === 'CAT-3' || config.exam_type === 'IAT-3') return 'Unit IV & V (50 Marks)';
      if (config.exam_type === 'CAT-2' || config.exam_type === 'IAT-2') return 'Unit II & III (50 Marks)';
      return 'Unit I & II (50 Marks)';
    }
    if (totalUnits === 4) {
      if (config.exam_type === 'CAT-3' || config.exam_type === 'IAT-3') return 'Unit IV (1 Unit - 50 Marks)';
      if (config.exam_type === 'CAT-2' || config.exam_type === 'IAT-2') return 'Unit II & III (1½ Units - 50 Marks)';
      return 'Unit I & II (1½ Units - 50 Marks)';
    }
    if (totalUnits === 6) {
      if (config.exam_type === 'CAT-3' || config.exam_type === 'IAT-3') return 'Unit V & VI (2 Units - 50 Marks)';
      if (config.exam_type === 'CAT-2' || config.exam_type === 'IAT-2') return 'Unit III & IV (2 Units - 50 Marks)';
      return 'Unit I & II (2 Units - 50 Marks)';
    }
    // 5 units (default)
    if (config.exam_type === 'CAT-3' || config.exam_type === 'IAT-3') return 'Unit IV & V (2 Units - 50 Marks)';
    if (config.exam_type === 'CAT-2' || config.exam_type === 'IAT-2') return 'Unit II & III (1½ Units - 50 Marks)';
    return 'Unit I & II (1½ Units - 50 Marks)';
  };

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
              onChange={e => {
                const newType = e.target.value;
                const isCatType = newType === 'CAT-1' || newType === 'CAT-2' || newType === 'CAT-3';
                const catExamName = newType === 'CAT-3'
                  ? 'CONTINUOUS ASSESSMENT TEST - III'
                  : (newType === 'CAT-2' ? 'CONTINUOUS ASSESSMENT TEST - II' : 'CONTINUOUS ASSESSMENT TEST - I');
                setConfig({
                  ...config,
                  exam_type: newType,
                  exam_name: isCatType ? catExamName : 'MODEL EXAMINATION',
                  time: isCatType ? '90 Minutes' : '3 Hours',
                  max_marks: isCatType ? 50 : 100
                });
              }}
              style={{ fontSize: '0.95rem', fontWeight: 600, padding: '0.6rem' }}
            >
              <option value="MODEL EXAMINATION">MODEL EXAMINATION</option>
              <option value="CAT-1">CAT - I</option>
              <option value="CAT-2">CAT - II</option>
              <option value="CAT-3">CAT - III</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span className="tag tag-unit" style={{ background: '#fff' }}>
              Selected Rule: {getRuleDescription()}
            </span>
          </div>
        </div>

        {/* 2025 Regulation Subject Units Selector */}
        {is2025 && (
          <div className="form-group" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <label className="form-label" style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.35rem' }}>
              Total Units in Subject (2025 Regulation)
            </label>
            <select
              className="form-select"
              value={config.total_units || 5}
              onChange={e => setConfig({ ...config, total_units: parseInt(e.target.value, 10) || 5 })}
              style={{ fontSize: '0.9rem', padding: '0.5rem', fontWeight: 500 }}
            >
              <option value={5}>5 Units — Standard (CAT-1: U1 & U2 [1½ U], CAT-2: U2 & U3 [1½ U], CAT-3: U4 & U5 [2 U])</option>
              <option value={4}>4 Units (CAT-1: U1 & U2 [1½ U], CAT-2: U2 & U3 [1½ U], CAT-3: U4 [1 U])</option>
              <option value={6}>6 Units (CAT-1: U1 & U2 [2 U], CAT-2: U3 & U4 [2 U], CAT-3: U5 & U6 [2 U])</option>
            </select>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Syllabus distribution across CAT-1, CAT-2, and CAT-3 automatically adapts based on the total units.
            </div>
          </div>
        )}

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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Exam Date</label>
            <input 
              type="text" 
              className="form-input"
              value={config.date || ''}
              onChange={e => setConfig({ ...config, date: e.target.value })}
              placeholder="e.g. 03-07-2026"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Exam Session</label>
            <input 
              type="text" 
              className="form-input"
              value={config.session || ''}
              onChange={e => setConfig({ ...config, session: e.target.value })}
              placeholder="e.g. FN or AN"
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => setActiveTab('questions')} style={{ alignSelf: 'flex-end', marginTop: '1rem' }}>
          Go back to selection <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
