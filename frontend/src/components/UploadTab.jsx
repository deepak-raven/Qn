import React, { useState, useEffect } from 'react';
import { FileText, Upload, AlertCircle, ChevronRight, Trash2, RefreshCw, Download } from 'lucide-react';

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
  // Ingestion form state
  const [upCode, setUpCode] = useState('');
  const [upName, setUpName] = useState('');
  const [upSem, setUpSem] = useState('');
  const [upReg, setUpReg] = useState('2021');
  const [upDegree, setUpDegree] = useState('B.E');
  const [upBranch, setUpBranch] = useState('CSE');
  const [upYear, setUpYear] = useState('');
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

  // Analyzing & Parsing progress state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseStepText, setParseStepText] = useState('');

  // Fetch existing questions when upCode matches an already imported subject
  useEffect(() => {
    setForceReupload(false);
    const existingSubject = subjects.find(s => s.code === upCode);
    if (existingSubject) {
      setLoadingQuestions(true);
      const username = auth?.user?.username || '';
      const qParams = new URLSearchParams();
      if (upCode) qParams.append('subject_code', upCode);
      if (existingSubject.semester) qParams.append('semester', existingSubject.semester);
      if (username) qParams.append('uploaded_by', username);

      fetch(`${API_BASE}/questions?${qParams.toString()}`)
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

  // Roman numeral helper
  const toRomanSem = (sem) => {
    if (!sem) return '';
    const map = ['','I','II','III','IV','V','VI','VII','VIII'];
    const parsed = parseInt(sem, 10);
    return map[parsed] || sem;
  };

  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file) => {
    if (!file) {
      setSelectedFile(null);
      setUpCode('');
      setUpName('');
      setUpSem('');
      setUpReg('2021');
      setUpDegree('B.E');
      setUpBranch('CSE');
      setUpYear('');
      return;
    }
    setSelectedFile(file);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setIsAnalyzing(true);
      const res = await fetch(`${API_BASE}/analyze-file`, {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        const detectedCode = data.subject_code || '';
        const detectedName = data.subject_name || '';
        const detectedSem = data.semester || '';
        const detectedReg = data.regulation || '2021';
        const detectedDegree = data.degree || 'B.E';
        const detectedBranch = data.branch || 'CSE';
        const detectedYear = data.year || '';

        setUpCode(detectedCode);
        setUpName(detectedName);
        setUpSem(toRomanSem(detectedSem));
        setUpReg(detectedReg);
        setUpDegree(detectedDegree);
        setUpBranch(detectedBranch);
        setUpYear(detectedYear);
      }
    } catch (err) {
      console.error("Error analyzing file:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    } else {
      await processFile(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDropFile = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isParsing || isAnalyzing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.docx') || fileName.endsWith('.pdf')) {
        await processFile(file);
      } else {
        alert('Please drop a valid .docx or .pdf file.');
      }
    }
  };

  const handleUploadQuestionBank = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a .docx or .pdf file first.');
      return;
    }

    setIsParsing(true);
    setParseProgress(10);
    setParseStepText('Uploading question bank...');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('subject_code', upCode);
    formData.append('subject_name', upName);
    formData.append('semester', upSem);
    formData.append('regulation', upReg);
    formData.append('degree', upDegree);
    formData.append('branch', upBranch);
    formData.append('year', upYear);
    formData.append('uploader_name', uploaderName || 'System');
    formData.append('uploaded_by', auth?.user?.username || '');

    try {
      const response = await fetch(`${API_BASE}/upload-docx-stream`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete trailing chunk in buffer

        for (const line of lines) {
          const trimmed = line.replace(/^data:\s*/, '').trim();
          if (!trimmed) continue;

          try {
            const payload = JSON.parse(trimmed);

            if (payload.error) {
              setIsParsing(false);
              setParseProgress(0);
              alert(`Upload failed: ${payload.error}`);
              return;
            }

            if (payload.progress !== undefined) {
              setParseProgress(payload.progress);
            }
            if (payload.step) {
              setParseStepText(payload.step);
            }

            // Micro-delay between events so rapid progress steps animate smoothly
            await new Promise(r => setTimeout(r, 150));

            if (payload.progress === 100) {
              setTimeout(() => {
                setIsParsing(false);
                fetchSubjects();
                setSelectedSubCode(upCode);
                loadQuestionsForSubject(upCode, upSem, false, {
                  code: upCode,
                  name: upName,
                  semester: upSem,
                  regulation: upReg
                });
                setActiveTab('questions');
              }, 400);
            }
          } catch (jsonErr) {
            console.error('Failed to parse SSE payload:', jsonErr);
          }
        }
      }
    } catch (err) {
      setIsParsing(false);
      setParseProgress(0);
      alert(`Stream error: ${err.message}`);
    }
  };

  const handleDeleteSubject = async (e, subjectCode, semester) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the question bank for [${subjectCode}] ${semester}? This will permanently remove all its questions from the database.`)) {
      return;
    }
    
    try {
      const token = auth?.token || localStorage.getItem('jec_auth_token') || '';
      const encodedCode = encodeURIComponent(subjectCode);
      const encodedSem = encodeURIComponent(semester || '');
      const url = semester 
        ? `${API_BASE}/subjects/${encodedCode}/${encodedSem}`
        : `${API_BASE}/subjects/${encodedCode}`;

      const res = await fetch(url, {
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
      <div className="glass-panel card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Question Bank Template Banner - Always Visible at Top */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.03) 100%)',
          border: '1px solid rgba(37, 99, 235, 0.25)',
          borderRadius: '8px',
          padding: '0.9rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--primary, #2563eb)', color: '#fff', padding: '0.45rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Question Bank Word Template (.docx)
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Download the standardized blank Word template formatted with 5 units, Bloom's levels & Course Outcomes to distribute to faculties.
              </div>
            </div>
          </div>
          <a
            href={`${API_BASE}/download-qb-template`}
            download="Question_Bank_Template.docx"
            className="btn btn-primary"
            style={{
              fontSize: '0.82rem',
              padding: '0.5rem 0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              textDecoration: 'none',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              fontWeight: 600
            }}
          >
            <Download size={15} /> Download Blank Template (.docx)
          </a>
        </div>

        <form onSubmit={handleUploadQuestionBank} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                    loadQuestionsForSubject(existingSubject.code, existingSubject.semester, false, existingSubject);
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
              {/* File Upload Zone */}
              <div className="form-group">
                <label className="form-label">Question Bank File (.docx, .pdf)</label>
                <div 
                  className="drag-drop-zone" 
                  onClick={() => !isParsing && !isAnalyzing && document.getElementById('docx-file-input').click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropFile}
                  style={{ 
                    cursor: (isParsing || isAnalyzing) ? 'default' : 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    borderColor: isDragging ? 'var(--primary, #2563eb)' : undefined,
                    backgroundColor: isDragging ? 'rgba(37, 99, 235, 0.08)' : undefined
                  }}
                >
                  {/* Seamless Progress Fill Background */}
                  {isParsing && (
                    <div 
                      style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${parseProgress}%`,
                        background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.20) 100%)',
                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: 1
                      }}
                    />
                  )}

                  <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                    {isParsing || isAnalyzing ? (
                      <div style={{ padding: '0.75rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                        <RefreshCw size={40} className="animate-spin" style={{ color: 'var(--primary, #2563eb)', margin: '0 auto' }} />
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', margin: 0 }}>
                            {isParsing ? `${parseStepText} (${parseProgress}%)` : 'Analyzing document to auto-detect subject details...'}
                          </p>
                          <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                            {isParsing ? 'Parsing document tables & indexing questions into database...' : 'Scanning syllabus metadata, course code & semester...'}
                          </p>
                        </div>
                        {selectedFile && (
                          <div style={{ marginTop: '0.5rem', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 700 }}>
                            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <FileText size={44} style={{ color: 'var(--primary)', margin: '0 auto' }} />
                        <p style={{ fontWeight: 600 }}>Click to choose or drag file here</p>
                        <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Only standard Word (.docx) or PDF (.pdf) Question Banks containing tables are parsed.</p>
                        {selectedFile && (
                          <div style={{ marginTop: '1rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 700 }}>
                            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <input 
                  type="file" 
                  id="docx-file-input" 
                  accept=".docx,.pdf" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                />
              </div>

              {/* Skeleton Loader during Document Analysis */}
              {isAnalyzing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div className="skeleton-line" style={{ width: '90px', height: '14px', marginBottom: '6px', borderRadius: '4px' }} />
                      <div className="skeleton-box" style={{ height: '38px', borderRadius: '6px' }} />
                    </div>
                    <div>
                      <div className="skeleton-line" style={{ width: '100px', height: '14px', marginBottom: '6px', borderRadius: '4px' }} />
                      <div className="skeleton-box" style={{ height: '38px', borderRadius: '6px' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div className="skeleton-line" style={{ width: '75px', height: '14px', marginBottom: '6px', borderRadius: '4px' }} />
                      <div className="skeleton-box" style={{ height: '38px', borderRadius: '6px' }} />
                    </div>
                    <div>
                      <div className="skeleton-line" style={{ width: '85px', height: '14px', marginBottom: '6px', borderRadius: '4px' }} />
                      <div className="skeleton-box" style={{ height: '38px', borderRadius: '6px' }} />
                    </div>
                  </div>

                  <div className="skeleton-box" style={{ height: '40px', borderRadius: '6px' }} />
                  <div className="skeleton-box" style={{ height: '42px', borderRadius: '6px' }} />
                </div>
              )}

              {/* Subject Details Input Fields & Status Banner (Only shown AFTER file selection & analysis) */}
              {selectedFile && !isAnalyzing && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Subject Code</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={upCode} 
                        onChange={e => setUpCode(e.target.value)} 
                        placeholder="e.g. CCS375" 
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
                        placeholder="e.g. WEB TECHNOLOGY" 
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
                        placeholder="e.g. V" 
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

                  {/* Status Banner */}
                  {(upCode && upName && upSem && upReg) ? (
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      color: '#166534',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      <span>✔</span> Auto fetched subject details, double check the details before continue.
                    </div>
                  ) : (
                    <div style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      color: '#991b1b',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      <AlertCircle size={18} /> Failed to fetch details, manually enter it before continue.
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={isParsing || isAnalyzing || !upCode || !upName || !upSem || !upReg}
                    style={{ 
                      width: '100%', 
                      opacity: (isParsing || isAnalyzing || !upCode || !upName || !upSem || !upReg) ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isParsing ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" /> Parsing Question Bank ({parseProgress}%)...
                      </>
                    ) : (
                      <>
                        Continue <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}
        </form>
      </div>

      {/* Sidebar list of existing Subjects */}
      <div className="glass-panel">
        <div className="card-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Uploaded Question Banks</h3>
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
                  loadQuestionsForSubject(sub.code, sub.semester, false, sub);
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
