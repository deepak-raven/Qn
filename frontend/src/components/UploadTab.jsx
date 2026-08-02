import React, { useState, useEffect } from 'react';
import { FileText, Upload, AlertCircle, ChevronRight, Trash2 } from 'lucide-react';

export default function UploadTab({
  API_BASE,
  subjects,
  selectedSubCode,
  setSelectedSubCode,
  loadQuestionsForSubject,
  setActiveTab,
  fetchSubjects,
  auth
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
  const [uploaderName, setUploaderName] = useState(auth?.user?.name || auth?.user?.username || '');
  const [forceReupload, setForceReupload] = useState(false);
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);


  useEffect(() => {
    if (auth?.user) {
      setUploaderName(auth.user.name || auth.user.username);
    }
  }, [auth?.user]);

  const [uploadStatus, setUploadStatus] = useState('');
  const [showManualFields, setShowManualFields] = useState(false);
  const [mappedSubject, setMappedSubject] = useState(null);

  // Fetch existing questions when upCode matches an already imported subject
  useEffect(() => {
    setForceReupload(false);
    const existingSubject = subjects.find(s => s.code === upCode);
    if (existingSubject) {
      setLoadingQuestions(true);
      const username = auth?.user?.username || '';
      fetch(`${API_BASE}/questions?subject_code=${upCode}&semester=${existingSubject.semester}&uploaded_by=${username}`)
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
  }, [upCode, subjects, API_BASE, auth]);

  // Roman numeral map helper
  const semesterRomanMap = {
    '1': 'I',
    '2': 'II',
    '3': 'III',
    '4': 'IV',
    '5': 'V',
    '6': 'VI',
    '7': 'VII',
    '8': 'VIII',
    'I': 'I',
    'II': 'II',
    'III': 'III',
    'IV': 'IV',
    'V': 'V',
    'VI': 'VI',
    'VII': 'VII',
    'VIII': 'VIII'
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setMappedSubject(null);
      
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
          let detectedCode = data.subject_code || '';
          let detectedName = data.subject_name || '';
          let detectedSem = data.semester || '';
          let detectedReg = data.regulation || '2021';

          let matchedSub = null;
          let matchedReg = null;

          if (detectedCode && curriculumData && curriculumData.curriculum_data) {
            for (const regGroup of curriculumData.curriculum_data) {
              const sub = regGroup.subjects.find(
                s => s.sub_code.toLowerCase().trim() === detectedCode.toLowerCase().trim()
              );
              if (sub) {
                matchedSub = sub;
                matchedReg = regGroup.regulation;
                break;
              }
            }
          }

          if (matchedSub) {
            setUpCode(matchedSub.sub_code);
            setUpName(matchedSub.sub_name);
            setUpSem(semesterRomanMap[matchedSub.semester.toString()] || matchedSub.semester.toString());
            setUpReg(matchedReg);
            setMappedSubject({ ...matchedSub, regulation: matchedReg });
            setUploadStatus(`Auto-detected and successfully mapped to curriculum: [${matchedSub.sub_code}] ${matchedSub.sub_name}`);
            setShowManualFields(false);
          } else {
            setUpCode(detectedCode);
            setUpName(detectedName);
            setUpSem(detectedSem);
            setUpReg(detectedReg);
            setMappedSubject(null);
            setShowManualFields(true); // Automatically show manual edit fields since mapping failed
            if (detectedCode || detectedName) {
              setUploadStatus(`Auto-detected: ${detectedCode ? `Code: ${detectedCode}` : ''} ${detectedName ? `, Name: ${detectedName}` : ''}. (Could not map to official syllabus)`);
            } else {
              setUploadStatus('Could not detect details from the file. Please enter details manually.');
            }
          }
        } else {
          setUploadStatus('');
          setShowManualFields(true);
        }
      } catch (err) {
        console.error("Error analyzing file:", err);
        setUploadStatus('');
        setShowManualFields(true);
      }
    } else {
      setSelectedFile(null);
      setMappedSubject(null);
      setUpCode('');
      setUpName('');
      setUpSem('');
      setUpReg('2021');
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
    formData.append('uploaded_by', auth?.user?.username || '');

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

  const handleDeleteSubject = async (e, subjectCode, semester) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the question bank for [${subjectCode}] ${semester}? This will permanently remove all its questions from the database.`)) {
      return;
    }
    
    try {
      const token = auth?.token || localStorage.getItem('jec_auth_token') || '';
      const res = await fetch(`${API_BASE}/subjects/${subjectCode}/${semester}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        alert('Question bank deleted successfully.');
        fetchSubjects();
        if (selectedSubCode === subjectCode) {
          setSelectedSubCode('');
        }
      } else {
        const data = await res.json();
        alert(`Deletion failed: ${data.detail || 'Unknown error'}`);
        fetchSubjects(); // Refresh in case the item was already deleted
      }
    } catch (err) {
      console.error("Error deleting subject:", err);
      alert(`Network error: ${err.message}`);
    }
  };

  const existingSubject = subjects.find(s => s.code === upCode);
  const isQBAvailable = !!existingSubject;

  return (
    <div className="dashboard-grid">
      <div className="glass-panel card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <form onSubmit={handleUploadQuestionBank} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Automated Curriculum Mapping Result Card */}
          {selectedFile && (
            mappedSubject ? (
              <div style={{ 
                background: 'var(--primary-light)', 
                border: '1px solid var(--primary)', 
                borderRadius: '8px', 
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>✔</span> Mapped to Official Syllabus
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject Code</span>
                    <strong>{mappedSubject.sub_code}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject Name</span>
                    <strong>{mappedSubject.sub_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Regulation</span>
                    <strong>{mappedSubject.regulation} Regulation</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester</span>
                    <strong>Semester {mappedSubject.semester} ({semesterRomanMap[mappedSubject.semester.toString()] || mappedSubject.semester})</strong>
                  </div>
                </div>
                {mappedSubject.common_branches && mappedSubject.common_branches.length > 0 && (
                  <div style={{ marginTop: '0.5rem', borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Common Branches:
                    </span>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {mappedSubject.common_branches.map((b, idx) => (
                        <span key={idx} className="tag tag-unit" style={{ fontSize: '0.65rem', background: '#edebe9', color: '#323130', borderColor: '#dad9d8' }}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ 
                background: '#fff9e6', 
                border: '1px solid #ffe0b2', 
                borderRadius: '8px', 
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b78103', fontWeight: 700, fontSize: '0.9rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>⚠</span> Not Found in Official Syllabus
                </div>
                <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>
                  The uploaded question bank could not be mapped to any known syllabus entry in the database.
                </p>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <div>
                    <span style={{ color: '#b78103', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detected Code</span>
                    <strong>{upCode || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#b78103', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detected Name</span>
                    <strong>{upName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#b78103', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Regulation</span>
                    <strong>{upReg || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#b78103', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester</span>
                    <strong>{upSem || 'N/A'}</strong>
                  </div>
                </div>
              </div>
            )
          )}

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
                      {existingQuestions.filter(q => q.part === 'C').length} Part C (14M/15M)
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
        <div className="card-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Parsed Databases</h3>
          <span className="tag tag-unit" style={{ fontSize: '0.7rem' }}>{subjects.length} Available</span>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {subjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>No Question Banks uploaded yet.</p>
              <p style={{ margin: 0, fontSize: '0.75rem' }}>Upload a docx or pdf file above to populate databases.</p>
            </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="tag tag-unit" style={{ fontSize: '0.7rem' }}>Reg {sub.regulation}</span>
                    {(sub.uploaded_by === auth?.user?.username || auth?.user?.role === 'admin') && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSubject(e, sub.code, sub.semester)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#e05656',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#feecef'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        title="Delete Question Bank"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{sub.name}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-dimmed)' }}>
                  <span>Uploader: <strong style={{ color: 'var(--primary)' }}>{sub.uploader_name || 'System'}</strong></span>
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
