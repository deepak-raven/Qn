import React, { useState, useEffect } from 'react';
import { FileText, Upload, AlertCircle, ChevronRight } from 'lucide-react';

export default function UploadTab({
  API_BASE,
  subjects,
  selectedSubCode,
  setSelectedSubCode,
  loadQuestionsForSubject,
  setActiveTab,
  fetchSubjects
}) {
  const [curriculumData, setCurriculumData] = useState({
    college_name: "Jaya Engineering College",
    curriculum_data: []
  });

  useEffect(() => {
    fetch(`${API_BASE}/curriculum`)
      .then(res => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then(data => setCurriculumData(data))
      .catch(err => console.error("Error fetching curriculum:", err));
  }, [API_BASE]);

  // Ingestion form state
  const [upCode, setUpCode] = useState('');
  const [upName, setUpName] = useState('');
  const [upSem, setUpSem] = useState('');
  const [upReg, setUpReg] = useState('2021');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploaderName, setUploaderName] = useState('');
  const [forceReupload, setForceReupload] = useState(false);
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Curriculum dropdown states
  const [selReg, setSelReg] = useState('2021');
  const [selSemNum, setSelSemNum] = useState('1');
  const [selCurriculumSubCode, setSelCurriculumSubCode] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [showManualFields, setShowManualFields] = useState(false);

  // Fetch existing questions when upCode matches an already imported subject
  useEffect(() => {
    setForceReupload(false);
    const existingSubject = subjects.find(s => s.code === upCode);
    if (existingSubject) {
      setLoadingQuestions(true);
      fetch(`${API_BASE}/questions?subject_code=${upCode}&semester=${existingSubject.semester}`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch questions");
          return res.json();
        })
        .then(data => {
          setExistingQuestions(data);
          setLoadingQuestions(false);
        })
        .catch(err => {
          console.error(err);
          setExistingQuestions([]);
          setLoadingQuestions(false);
        });
    } else {
      setExistingQuestions([]);
    }
  }, [upCode, subjects, API_BASE]);

  // Roman numeral map helper
  const semesterRomanMap = {
    '1': 'I',
    '2': 'II',
    '3': 'III',
    '4': 'IV',
    '5': 'V',
    '6': 'VI',
    '7': 'VII',
    '8': 'VIII'
  };

  useEffect(() => {
    const regData = curriculumData.curriculum_data.find(r => r.regulation === selReg);
    if (!regData) return;
    
    // Filter subjects by selected semester number
    const filteredSubs = regData.subjects.filter(s => s.semester.toString() === selSemNum.toString());
    
    if (filteredSubs.length > 0) {
      const exists = filteredSubs.some(s => s.sub_code === selCurriculumSubCode);
      const targetSub = exists ? filteredSubs.find(s => s.sub_code === selCurriculumSubCode) : filteredSubs[0];
      
      setSelCurriculumSubCode(targetSub.sub_code);
      setUpCode(targetSub.sub_code);
      setUpName(targetSub.sub_name);
      setUpReg(selReg);
      setUpSem(semesterRomanMap[selSemNum.toString()] || selSemNum.toString());
    } else {
      setSelCurriculumSubCode('');
      setUpCode('');
      setUpName('');
      setUpReg(selReg);
      setUpSem(semesterRomanMap[selSemNum.toString()] || selSemNum.toString());
    }
  }, [selReg, selSemNum, curriculumData]);

  const handleCurriculumSubjectChange = (code) => {
    setSelCurriculumSubCode(code);
    const regData = curriculumData.curriculum_data.find(r => r.regulation === selReg);
    if (!regData) return;
    const sub = regData.subjects.find(s => s.sub_code === code);
    if (sub) {
      setUpCode(sub.sub_code);
      setUpName(sub.sub_name);
      setUpReg(selReg);
      setUpSem(semesterRomanMap[selSemNum.toString()] || selSemNum.toString());
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        setUploadStatus('Analyzing document to auto-detect subject details...');
        const res = await fetch(`${API_BASE}/analyze-file`, {
          method: 'POST',
          body: formData
        });
        
        if (res.ok) {
          const data = await res.json();
          let detectedMsg = [];
          if (data.subject_code) {
            setUpCode(data.subject_code);
            detectedMsg.push(`Code: ${data.subject_code}`);
          }
          if (data.subject_name) {
            setUpName(data.subject_name);
            detectedMsg.push(`Name: ${data.subject_name}`);
          }
          if (data.semester) {
            setUpSem(data.semester);
            detectedMsg.push(`Semester: ${data.semester}`);
          }
          if (data.regulation) {
            setUpReg(data.regulation);
            detectedMsg.push(`Regulation: ${data.regulation}`);
          }
          
          if (detectedMsg.length > 0) {
            setUploadStatus(`Auto-detected: ${detectedMsg.join(', ')}`);
            // Attempt to update curriculum dropdown selection if there is a match in our syllabus list
            if (curriculumData && curriculumData.curriculum_data) {
              const regData = curriculumData.curriculum_data.find(r => r.regulation === data.regulation);
              if (regData) {
                const matchedSub = regData.subjects.find(s => s.sub_code === data.subject_code);
                if (matchedSub) {
                  setSelReg(data.regulation);
                  setSelSemNum(matchedSub.semester.toString());
                  setSelCurriculumSubCode(matchedSub.sub_code);
                }
              }
            }
          } else {
            setUploadStatus('No details could be auto-detected from the file. Please select in dropdown or manually enter them.');
          }
        } else {
          setUploadStatus('');
        }
      } catch (err) {
        console.error("Error analyzing file:", err);
        setUploadStatus('');
      }
    }
  };

  const handleUploadQuestionBank = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a .docx, .pdf, or .doc file first.');
      return;
    }
    setUploadStatus('Uploading and parsing question bank tables...');
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('subject_code', upCode);
    formData.append('subject_name', upName);
    formData.append('semester', upSem);
    formData.append('regulation', upReg);
    formData.append('uploader_name', uploaderName || 'System');

    try {
      const res = await fetch(`${API_BASE}/upload-docx`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setUploadStatus(`Success! Parsed ${data.message}`);
        fetchSubjects();
        // Auto select the newly uploaded subject
        setSelectedSubCode(upCode);
        loadQuestionsForSubject(upCode, upSem);
        setActiveTab('questions');
      } else {
        const errData = await res.json();
        setUploadStatus(`Upload failed: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      setUploadStatus(`Network error: ${err.message}`);
    }
  };

  const existingSubject = subjects.find(s => s.code === upCode);
  const isQBAvailable = !!existingSubject;

  return (
    <div className="dashboard-grid">
      <div className="glass-panel card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <form onSubmit={handleUploadQuestionBank} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Jaya College Curriculum Quick-Selector */}
          <div style={{ background: '#f3f2f1', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', margin: 0, fontWeight: 700 }}>
              Jaya Engineering College Curriculum Quick-Selector
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Select a subject from the official syllabus database to auto-fill details below.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Regulation</label>
                <select 
                  className="form-select" 
                  value={selReg} 
                  onChange={e => setSelReg(e.target.value)}
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.5rem' }}
                >
                  <option value="2021">2021 Regulation</option>
                  <option value="2025">2025 Regulation</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Semester</label>
                <select 
                  className="form-select" 
                  value={selSemNum} 
                  onChange={e => setSelSemNum(e.target.value)}
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.5rem' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n.toString()}>Semester {n}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Subject</label>
                <select 
                  className="form-select" 
                  value={selCurriculumSubCode} 
                  onChange={e => handleCurriculumSubjectChange(e.target.value)}
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.5rem' }}
                >
                  {(() => {
                    const regData = curriculumData.curriculum_data.find(r => r.regulation === selReg);
                    const filtered = regData ? regData.subjects.filter(s => s.semester.toString() === selSemNum.toString()) : [];
                    if (filtered.length === 0) {
                      return <option value="">No subjects found</option>;
                    }
                    return filtered.map(s => (
                      <option key={s.sub_code} value={s.sub_code}>
                        [{s.sub_code}] {s.sub_name}
                      </option>
                    ));
                  })()}
                </select>
              </div>
            </div>
            
            {/* Common Branches Badge List */}
            {(() => {
              const regData = curriculumData.curriculum_data.find(r => r.regulation === selReg);
              const sub = regData ? regData.subjects.find(s => s.sub_code === selCurriculumSubCode) : null;
              if (sub && sub.common_branches && sub.common_branches.length > 0) {
                return (
                  <div style={{ marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Common Branches:
                    </span>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {sub.common_branches.map((b, idx) => (
                        <span key={idx} className="tag tag-unit" style={{ fontSize: '0.65rem', background: '#edebe9', color: '#323130', borderColor: '#dad9d8' }}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
            <input 
              type="checkbox" 
              id="toggle-manual-fields" 
              checked={showManualFields} 
              onChange={e => setShowManualFields(e.target.checked)} 
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            <label htmlFor="toggle-manual-fields" style={{ fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>
              Manually edit details (Subject Code, Name, Semester, Regulation)
            </label>
          </div>

          {showManualFields && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Subject Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={upCode} 
                    onChange={e => setUpCode(e.target.value)} 
                    placeholder="e.g. OCS353" 
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={upName} 
                    onChange={e => setUpName(e.target.value)} 
                    placeholder="e.g. Data Science fundamentals" 
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Semester</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={upSem} 
                    onChange={e => setUpSem(e.target.value)} 
                    placeholder="e.g. VII" 
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Regulation</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={upReg} 
                    onChange={e => setUpReg(e.target.value)} 
                    placeholder="e.g. 2021" 
                    required
                  />
                </div>
              </div>
            </>
          )}

          {isQBAvailable && !forceReupload ? (
            <div style={{ 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginTop: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Question Bank Already Available</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                    A parsed database has already been created for this subject.
                  </p>
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '1rem', 
                background: '#f9f9f9', 
                padding: '1rem', 
                borderRadius: '6px',
                fontSize: '0.85rem',
                border: '1px solid #f1f1f1'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uploader</span>
                  <strong style={{ color: 'var(--text-main)' }}>{existingSubject.uploader_name || 'System'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filename</span>
                  <strong style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>{existingSubject.qb_filename || 'N/A'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Database Status</span>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    <span className="tag tag-unit" style={{ background: '#e1f5fe', color: '#0288d1', borderColor: '#b3e5fc' }}>
                      {existingQuestions.length} Questions
                    </span>
                    <span className="tag tag-unit">
                      {existingQuestions.filter(q => q.part === 'A').length} Part A (2M)
                    </span>
                    <span className="tag tag-unit">
                      {existingQuestions.filter(q => q.part === 'B').length} Part B (13M)
                    </span>
                    <span className="tag tag-unit">
                      {existingQuestions.filter(q => q.part === 'C').length} Part C (15M)
                    </span>
                  </div>
                </div>
              </div>

              {loadingQuestions ? (
                <div style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Loading preview questions...
                </div>
              ) : existingQuestions.length > 0 ? (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ background: '#f5f5f5', padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                    Sample Questions Preview
                  </div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', padding: '0.5rem' }}>
                    {existingQuestions.slice(0, 5).map((q, idx) => (
                      <div key={idx} style={{ padding: '0.4rem 0.25rem', fontSize: '0.8rem', borderBottom: idx === 4 || idx === existingQuestions.length - 1 ? 'none' : '1px solid #f1f1f1', color: 'var(--text-main)', textAlign: 'left' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 600, marginRight: '0.5rem' }}>[{q.unit} - Part {q.part}]</span>
                        {q.text}
                      </div>
                    ))}
                    {existingQuestions.length > 5 && (
                      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dimmed)', paddingTop: '0.25rem' }}>
                        ... and {existingQuestions.length - 5} more questions
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={() => {
                    setSelectedSubCode(existingSubject.code);
                    loadQuestionsForSubject(existingSubject.code, existingSubject.semester);
                    setActiveTab('questions');
                  }}
                >
                  Go to Workspace <ChevronRight size={16} />
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ flex: 1, background: 'transparent', border: '1px solid #dcdcdc', color: '#666' }}
                  onClick={() => setForceReupload(true)}
                >
                  Overwrite QB
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Uploader Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={uploaderName} 
                  onChange={e => setUploaderName(e.target.value)} 
                  placeholder="e.g. Dr. K. Deepak" 
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Question Bank File (.docx, .pdf, .doc)</label>
                <div className="drag-drop-zone" onClick={() => document.getElementById('docx-file-input').click()}>
                  <FileText size={44} style={{ color: 'var(--primary)', margin: '0 auto' }} />
                  <p style={{ fontWeight: 600 }}>Click to choose or drag file here</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Only standard Word (.docx, .doc) or PDF (.pdf) Question Banks containing tables are parsed.</p>
                  {selectedFile && (
                    <div style={{ marginTop: '1rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 700 }}>
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  id="docx-file-input" 
                  accept=".docx,.pdf,.doc" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                  required={!isQBAvailable}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Upload size={18} /> Parse & Import Question Bank
              </button>
            </>
          )}
        </form>

        {uploadStatus && (
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            alignItems: 'center', 
            background: '#f3f2f1', 
            borderLeft: '4px solid var(--primary)', 
            padding: '1rem', 
            borderRadius: '4px' 
          }}>
            <AlertCircle size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{uploadStatus}</span>
          </div>
        )}
      </div>

      {/* Sidebar list of existing Subjects */}
      <div className="glass-panel">
        <div className="card-title-bar">
          <h3>Parsed Databases</h3>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {subjects.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>No question banks imported yet.</p>
          ) : (
            subjects.map((sub, idx) => (
              <div 
                key={idx}
                className="glass-panel" 
                style={{ 
                  padding: '1rem', 
                  cursor: 'pointer', 
                  background: selectedSubCode === sub.code ? 'var(--primary-light)' : 'var(--bg-card)',
                  borderColor: selectedSubCode === sub.code ? 'var(--primary)' : 'var(--border-color)'
                }}
                onClick={() => {
                  setSelectedSubCode(sub.code);
                  loadQuestionsForSubject(sub.code, sub.semester);
                  setActiveTab('questions');
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sub.code}</span>
                  <span className="tag tag-unit" style={{ fontSize: '0.7rem' }}>Reg {sub.regulation}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{sub.name}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dimmed)' }}>
                  <span>Semester: {sub.semester}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--primary)', fontWeight: 600 }}>
                    Select Workspace <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
