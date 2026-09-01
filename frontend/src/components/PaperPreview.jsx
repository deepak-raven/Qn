import React from 'react';
import { Trash2, GripVertical, RotateCcw } from 'lucide-react';
import { getExpectedUnitForPartASlot, getExpectedUnitForPartBSlot, getSuggestedUnitForPartASlot, getSuggestedUnitForPartBSlot, getSuggestedUnitForPartCSlot, getPartBQuestionNo, getPartCQuestionNo, isCATExam, is2025Regulation, cleanDegreeBranch, formatYearSem } from '../hooks/useSetsManager';

export default function PaperPreview({
  config,
  setConfig,
  sets,
  setSets,
  currentSetId,
  setCurrentSetId,
  selectedPartA,
  selectedPartB,
  selectedPartC,
  handleSwitchSet,
  handleCreateNewSet,
  handleRenameActiveSet,
  handleDeleteSet,
  handleDrop,
  handleClearSlot,
  handleClearAllQuestions,
  updateQuestionText,
  setActiveTabSub,
  setFilterUnit,
  tosCounts,
  tosMarks,
  unitTotalsCount,
  klTotalsCount,
  grandTotalCount,
  unitTotalsMark,
  klTotalsMark,
  grandTotalMark,
  partARef,
  partBRef,
  partCRef
}) {
  const handleDragOver = (e) => e.preventDefault();

  const isCAT1 = config.exam_type === 'CAT-1' || config.exam_type === 'IAT-1';
  const isCAT2 = config.exam_type === 'CAT-2' || config.exam_type === 'IAT-2';
  const isCAT3 = config.exam_type === 'CAT-3' || config.exam_type === 'IAT-3';
  const isCAT = isCATExam(config.exam_type, config.regulation);
  const is2025 = is2025Regulation(config.regulation);
  const is2021CAT = isCAT && !is2025;

  const tosUnits = isCAT3
    ? ['Unit IV', 'Unit V']
    : isCAT2 
    ? (is2021CAT ? ['Unit II', 'Unit III'] : ['Unit III', 'Unit IV']) 
    : isCAT1 
    ? ['Unit I', 'Unit II'] 
    : ['Unit I', 'Unit II', 'Unit III', 'Unit IV', 'Unit V'];

  const filteredKlTotalsCount = React.useMemo(() => {
    const totals = { K1: 0, K2: 0, K3: 0, K4: 0, K5: 0, K6: 0 };
    tosUnits.forEach(u => {
      ['K1', 'K2', 'K3', 'K4', 'K5', 'K6'].forEach(k => {
        totals[k] += (tosCounts[u]?.[k] || 0);
      });
    });
    return totals;
  }, [tosUnits, tosCounts]);

  const filteredGrandTotalCount = React.useMemo(() => {
    return tosUnits.reduce((acc, u) => acc + (unitTotalsCount[u] || 0), 0);
  }, [tosUnits, unitTotalsCount]);

  const filteredKlTotalsMark = React.useMemo(() => {
    const totals = { K1: 0, K2: 0, K3: 0, K4: 0, K5: 0, K6: 0 };
    tosUnits.forEach(u => {
      ['K1', 'K2', 'K3', 'K4', 'K5', 'K6'].forEach(k => {
        totals[k] += (tosMarks[u]?.[k] || 0);
      });
    });
    return totals;
  }, [tosUnits, tosMarks]);

  const filteredGrandTotalMark = React.useMemo(() => {
    return tosUnits.reduce((acc, u) => acc + (unitTotalsMark[u] || 0), 0);
  }, [tosUnits, unitTotalsMark]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1rem', 
      padding: '2rem', 
      overflowY: 'auto', 
      height: 'calc(100vh - 64px)' 
    }}>
      {/* Sets Manager Bar (Browser-Style Inline Tabs) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #d1d5db', padding: '0.25rem 0.5rem 0 0.5rem', background: '#f3f4f6', borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {Object.keys(sets).map((setId) => {
            const isActive = currentSetId === setId;
            return (
              <div 
                key={setId} 
                onClick={() => handleSwitchSet(setId)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem',
                  background: isActive ? '#ffffff' : 'transparent',
                  border: '1px solid ' + (isActive ? '#d1d5db' : 'transparent'),
                  borderBottom: isActive ? '1px solid #ffffff' : '1px solid transparent',
                  borderTopLeftRadius: '4px',
                  borderTopRightRadius: '4px',
                  padding: '0.35rem 0.75rem',
                  cursor: 'pointer',
                  marginBottom: '-1px',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  zIndex: isActive ? 2 : 1
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--primary)' : 'var(--text-dimmed)' }}>
                  {setId}
                </span>
                {Object.keys(sets).length > 1 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSet(setId);
                    }}
                    style={{ 
                      border: 'none', 
                      background: 'transparent', 
                      color: '#9ca3af', 
                      fontSize: '0.9rem', 
                      cursor: 'pointer', 
                      padding: '0 2px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      lineHeight: 1 
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = '#9ca3af'; }}
                    title="Delete Set"
                  >
                    &times;
                  </button>
                )}
              </div>
            );
          })}
          
          {/* Plus button next to last tab (Max 3 sets: SET-I, SET-II, SET-III) */}
          {Object.keys(sets).length < 3 && (
            <button 
              onClick={handleCreateNewSet}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '20px', 
                height: '20px', 
                borderRadius: '4px', 
                border: 'none', 
                background: 'transparent', 
                color: 'var(--text-dimmed)', 
                fontSize: '1rem', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                marginBottom: '0.2rem',
                marginLeft: '0.2rem',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = 'var(--text-main)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-dimmed)'; }}
              title="Create new paper set (Max 3: SET-I, SET-II, SET-III)"
            >
              +
            </button>
          )}
        </div>
        
        {/* Clear Questions Button */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.85rem', paddingBottom: '0.25rem', whiteSpace: 'nowrap' }}>

          <button
            onClick={handleClearAllQuestions}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.35rem',
              borderRadius: '4px',
              border: '1px solid #fca5a5',
              background: '#fef2f2',
              color: '#dc2626',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#f87171'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            title={`Clear all selected questions from ${currentSetId}`}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="paper-preview">
        {/* Document Header for CAT vs Model Exam */}
        {isCAT ? (
          <>
            {/* Top Right SET indicator */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.25rem', fontFamily: "'Times New Roman', Times, serif", fontWeight: 'bold', fontSize: '1.05rem', color: '#000000' }}>
              <span contentEditable suppressContentEditableWarning onBlur={(e) => handleRenameActiveSet(e.target.innerText)}>
                {config.set ? (config.set.includes('–') || config.set.includes('-') ? config.set : `SET – ${config.set.replace('SET', '').trim() || 'I'}`) : 'SET – I'}
              </span>
            </div>

            {/* Main Header Box */}
            <div style={{ border: '1px solid #000000', marginBottom: '0.4rem', fontFamily: "'Times New Roman', Times, serif", color: '#000000', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
              {/* Row 1: Logo & Institution Header */}
              <div style={{ display: 'flex', borderBottom: '1px solid #000000', alignItems: 'stretch', width: '100%' }}>
                <div style={{ width: '85px', minWidth: '85px', borderRight: '1px solid #000000', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img 
                    src="/jaya_logo.png" 
                    alt="Jaya Logo" 
                    style={{ maxHeight: '62px', maxWidth: '100%', objectFit: 'contain' }} 
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: '0.35rem 0.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const val = e.target.innerText.replace(/_+/g, '').trim();
                        setConfig(prev => ({ ...prev, institution_name: val ? (val.toUpperCase().startsWith('NAME OF THE INSTITUTION') ? 'NAME OF THE INSTITUTION:' : val) : 'NAME OF THE INSTITUTION:' }));
                      }}
                    >
                      {(!config.institution_name || config.institution_name.toUpperCase().startsWith('NAME OF THE INSTITUTION')) ? 'NAME OF THE INSTITUTION:____________________________________' : config.institution_name}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 'bold', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    (Approved by AICTE, Affiliated to Anna University Chennai & NAAC Accredited Institution)
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 'bold', marginTop: '0.15rem' }}>
                    Chennai, Tamil Nadu.
                  </div>
                </div>
              </div>

              {/* Row 2: Exam Title, Regulation, Semester & Side Box */}
              <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
                <div style={{ flex: 1, minWidth: 0, padding: '0.6rem 0.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.2rem' }}>
                  <h4 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => setConfig(prev => ({ ...prev, exam_name: e.target.innerText }))}
                    style={{ fontSize: '1.02rem', fontWeight: 'bold', textDecoration: 'underline', margin: 0, letterSpacing: '0.01em' }}
                  >
                    {config.exam_name || (isCAT3 ? 'CONTINUOUS ASSESSMENT TEST- III' : (isCAT2 ? 'CONTINUOUS ASSESSMENT TEST- II' : 'CONTINUOUS ASSESSMENT TEST- I'))}
                  </h4>
                  <div style={{ fontSize: '0.92rem', fontWeight: 'normal', margin: '0.15rem 0' }}>
                    (<span 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => setConfig(prev => ({ ...prev, regulation: e.target.innerText }))}
                    >
                      {config.regulation || '2021-REGULATION'}
                    </span>)
                  </div>
                  <div 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => setConfig(prev => ({ ...prev, semester: e.target.innerText }))}
                    style={{ fontSize: '0.92rem', fontWeight: 'normal', margin: 0 }}
                  >
                    {config.semester && !/^[IVX\s/]+$/i.test(config.semester.trim()) ? config.semester : 'ODD SEMESTER 2026-27'}
                  </div>
                </div>

                {/* Side Box for DATE/SESSION, PAGES, COPIES */}
                <div style={{ width: '150px', minWidth: '150px', borderLeft: '1px solid #000000' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', height: '100%', tableLayout: 'fixed', fontSize: '0.75rem', fontFamily: "'Times New Roman', Times, serif" }}>
                    <colgroup>
                      <col style={{ width: '50%' }} />
                      <col style={{ width: '50%' }} />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td rowSpan={2} style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', padding: '0.15rem' }}>
                          DATE/<br />SESSION
                        </td>
                        <td style={{ borderBottom: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', height: '22px', padding: '0.15rem' }}>
                          <span contentEditable suppressContentEditableWarning onBlur={(e) => setConfig(prev => ({ ...prev, date: e.target.innerText.replace(/_/g, '').trim() }))} style={{ display: 'inline-block', minWidth: '20px' }}>
                            {(config.date || '').replace(/_/g, '')}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ borderBottom: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', height: '22px', padding: '0.15rem' }}>
                          <span contentEditable suppressContentEditableWarning onBlur={(e) => setConfig(prev => ({ ...prev, session: e.target.innerText.replace(/_/g, '').trim() }))} style={{ display: 'inline-block', minWidth: '20px' }}>
                            {(config.session || '').replace(/_/g, '')}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', height: '22px', padding: '0.15rem' }}>
                          PAGES
                        </td>
                        <td style={{ borderBottom: '1px solid #000000', height: '22px' }}></td>
                      </tr>
                      <tr>
                        <td style={{ borderRight: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', height: '22px', padding: '0.15rem' }}>
                          COPIES
                        </td>
                        <td style={{ height: '22px' }}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Course Details Box */}
            <div style={{ border: '1px solid #000000', marginBottom: '0.35rem', fontFamily: "'Times New Roman', Times, serif", fontSize: '0.88rem', color: '#000000' }}>
              <div style={{ borderBottom: '1px solid #000000', padding: '0.35rem 0.6rem' }}>
                <strong>Sub. Code / Sub. Name:</strong>{' '}
                <span contentEditable suppressContentEditableWarning onBlur={(e) => setConfig(prev => ({ ...prev, subject_code: e.target.innerText }))}>{config.subject_code || ''}</span>
                {config.subject_code && config.subject_name ? ' – ' : ''}
                <span contentEditable suppressContentEditableWarning onBlur={(e) => setConfig(prev => ({ ...prev, subject_name: e.target.innerText }))}>{config.subject_name || ''}</span>
              </div>
              <div style={{ display: 'flex', borderBottom: '1px solid #000000' }}>
                <div style={{ flex: 1, borderRight: '1px solid #000000', padding: '0.35rem 0.6rem' }}>
                  <strong>Degree / Branch:</strong>{' '}
                  <span contentEditable suppressContentEditableWarning onBlur={(e) => setConfig(prev => ({ ...prev, degree_branch_sem: e.target.innerText }))}>{cleanDegreeBranch(config.degree_branch_sem)}</span>
                </div>
                <div style={{ flex: 1, padding: '0.35rem 0.6rem' }}>
                  <strong>Year / Semester:</strong>{' '}
                  <span 
                    contentEditable 
                    suppressContentEditableWarning 
                    onBlur={(e) => {
                      const val = e.target.innerText.trim();
                      const semMatch = val.match(/([I|V|X]+)$/i);
                      if (semMatch) {
                        const degBase = cleanDegreeBranch(config.degree_branch_sem);
                        setConfig(prev => ({ ...prev, degree_branch_sem: `${degBase}/${semMatch[1].toUpperCase()}` }));
                      }
                    }}
                  >
                    {formatYearSem(config.degree_branch_sem, config.semester)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ flex: 1, borderRight: '1px solid #000000', padding: '0.35rem 0.6rem' }}>
                  <strong>Time:</strong>{' '}
                  <span contentEditable suppressContentEditableWarning onBlur={(e) => setConfig(prev => ({ ...prev, time: e.target.innerText }))}>{config.time || '90 Minutes'}</span>
                </div>
                <div style={{ flex: 1, padding: '0.35rem 0.6rem' }}>
                  <strong>Maximum Marks:</strong>{' '}
                  <span contentEditable suppressContentEditableWarning onBlur={(e) => setConfig(prev => ({ ...prev, max_marks: parseInt(e.target.innerText) || 50 }))}>{config.max_marks || 50}</span>
                </div>
              </div>
            </div>

            {/* Knowledge Level Box */}
            <div style={{ 
              border: '1px solid #000000', 
              marginBottom: '1.25rem', 
              fontFamily: "'Times New Roman', Times, serif", 
              fontSize: '0.82rem', 
              color: '#000000',
              padding: '0.35rem 0.6rem',
              lineHeight: 1.35
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ width: '105px', minWidth: '105px', fontWeight: 'bold' }}>
                  Knowledge Level:
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div><strong>K1–Remember-</strong> (Define, List, State, Identify, Recall, Name, Mention)</div>
                  <div><strong>K2–Understand-</strong> (Explain, Describe, Discuss, Distinguish, illustrate)</div>
                  <div><strong>K3–Apply-</strong> (Compute, Calculate, Solve, Apply, Drive, Demonstrate, Determine)</div>
                  <div><strong>K4–Analyze-</strong> (Analyze, Differentiate, Examine, Classify, Compare, Investigate)</div>
                  <div><strong>K5–Evaluate-</strong> (Justify, Evaluate, Assess, Critique, Validate)</div>
                  <div><strong>K6–Create-</strong> (Design, Develop, Construct, Formulate, Propose)</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Document Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.2rem', fontFamily: "'Times New Roman', Times, serif" }}>
              <div 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleRenameActiveSet(e.target.innerText)}
              >
                {config.set}
              </div>
              <div 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setConfig(prev => ({ ...prev, date: e.target.innerText.replace('Date:', '').trim() }))}
              >
                Date: {config.date || '__________'}
              </div>
            </div>

            <div style={{ 
              border: '1px solid #000000', 
              padding: '0.5rem 1rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              marginBottom: '1rem', 
              fontFamily: "'Times New Roman', Times, serif" 
            }}>
              <img 
                src="/jaya_logo.png" 
                alt="Jaya Logo" 
                style={{ height: '64px', width: 'auto', objectFit: 'contain' }} 
              />
              <div style={{ flex: 1, textAlign: 'center', color: '#000000' }}>
                <h3 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => setConfig(prev => ({ ...prev, institution_name: e.target.innerText }))}
                  style={{ fontSize: '1.1rem', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}
                >
                  {config.institution_name || 'NAME OF THE INSTITUTION:'}
                </h3>
                <p style={{ fontSize: '0.72rem', margin: '0.2rem 0 0 0', lineHeight: 1.3, fontWeight: '500' }}>
                  (Approved by AICTE, Affiliated to Anna University Chennai & NAAC Accredited Institution)<br />
                  Thiruninravur, Chennai-602 024, Tamil Nadu.
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1rem', fontFamily: "'Times New Roman', Times, serif", color: '#000000' }}>
              <h4 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => setConfig(prev => ({ ...prev, exam_name: e.target.innerText }))}
                style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 0.15rem 0' }}
              >
                {config.exam_name || 'ENTER EXAMINATION NAME'}
              </h4>
              <h5 style={{ fontSize: '0.9rem', fontWeight: 'normal', margin: '0 0 0.15rem 0' }}>
                (<span 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => setConfig(prev => ({ ...prev, regulation: e.target.innerText }))}
                >
                  {config.regulation || 'Regulation'}
                </span>)
              </h5>
              <h5 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => setConfig(prev => ({ ...prev, semester: e.target.innerText }))}
                style={{ fontSize: '0.9rem', fontWeight: 'normal', margin: 0 }}
              >
                {config.semester || 'ENTER SEMESTER'}
              </h5>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.95rem', borderBottom: '3px double #000000', paddingBottom: '0.5rem', marginBottom: '1.5rem', fontFamily: "'Times New Roman', Times, serif", color: '#000000' }}>
              <div>
                <strong>Sub. Code/Sub.Name:</strong>{' '}
                <span 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => setConfig(prev => ({ ...prev, subject_code: e.target.innerText }))}
                >
                  {config.subject_code || 'SUB CODE'}
                </span>
                {' '}/{' '}
                <span 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => setConfig(prev => ({ ...prev, subject_name: e.target.innerText }))}
                >
                  {config.subject_name || 'SUBJECT NAME'}
                </span>
              </div>
              <div>
                <strong>Degree/Branch/Sem:</strong>{' '}
                <span 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => setConfig(prev => ({ ...prev, degree_branch_sem: e.target.innerText }))}
                >
                  {config.degree_branch_sem || 'DEGREE / BRANCH / SEMESTER'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>Time :</strong>{' '}
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => setConfig(prev => ({ ...prev, time: e.target.innerText }))}
                  >
                    {config.time || '3 Hours'}
                  </span>
                </div>
                <div>
                  <strong>Maximum Marks:</strong>{' '}
                  <span 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => setConfig(prev => ({ ...prev, max_marks: parseInt(e.target.innerText) || 100 }))}
                  >
                    {config.max_marks}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* PART A PREVIEW TABLE */}
        <div ref={partARef} className="paper-part-title">
          PART &ndash; A ({is2025 ? '5 X 1 = 5' : `${selectedPartA.slice(0, isCAT ? 5 : 10).length} X 2 = ${selectedPartA.slice(0, isCAT ? 5 : 10).length * 2}`} MARKS)<br />
          <span style={{ fontSize: '0.9rem', fontWeight: 'normal', fontStyle: 'italic' }}>ANSWER ALL THE QUESTIONS</span>
        </div>

        <table className="paper-table" style={{ marginBottom: '1.5rem' }}>
          <thead>
            <tr>
              <th style={{ width: '8%', textAlign: 'center' }}>Q.No</th>
              <th style={{ width: '68%' }}>Question Description</th>
              <th style={{ width: '10%', textAlign: 'center' }}>CO</th>
              <th style={{ width: '10%', textAlign: 'center' }}>KL</th>
              <th style={{ width: '4%', textAlign: 'center' }}>Act</th>
            </tr>
          </thead>
          <tbody>
            {selectedPartA.slice(0, (is2025 || isCAT) ? 5 : 10).map((item, idx) => (
              <tr 
                key={idx}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'A', idx)}
                style={{ 
                  background: !item ? '#faf9f8' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
              >
                <td className="center">{idx + 1}</td>
                <td 
                  draggable={!!item}
                  onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'preview_a', index: idx, question: item }))}
                  style={{ cursor: item ? 'grab' : 'default', position: 'relative' }}
                >
                  {item ? (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                      <span style={{ color: '#8a8886', cursor: 'grab', display: 'inline-flex', alignItems: 'center', marginTop: '0.15rem' }}>
                        <GripVertical size={13} />
                      </span>
                      <span 
                        contentEditable 
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const val = e.target.innerText.trim();
                          if (val !== '') {
                            updateQuestionText('A', idx, null, val);
                          }
                        }}
                      >
                        {item.text}
                      </span>
                    </div>
                  ) : (
                    <span 
                      style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', cursor: 'pointer' }}
                      onClick={() => {
                        setActiveTabSub('A');
                        setFilterUnit('All');
                      }}
                    >
                      [Drop target for Part A: {getSuggestedUnitForPartASlot(config.exam_type, idx, config.regulation).join('/')}]
                    </span>
                  )}
                </td>
                <td className="center">{item ? item.co : ''}</td>
                <td className="center">{item ? item.kl : ''}</td>
                <td className="center">
                  {item && (
                    <button 
                      onClick={() => handleClearSlot('A', idx)}
                      className="btn-trash"
                      title="Clear slot"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PART B PREVIEW TABLE */}
        <div ref={partBRef} className="paper-part-title">
          PART &ndash; B ({is2025 ? '5 X 3 = 15' : (isCAT ? '2 X 13 = 26' : `${selectedPartB.length} X 13 = ${selectedPartB.length * 13}`)} MARKS)
        </div>

        {is2025 ? (
          /* CAT 2025 PART B: 5 Single Questions (Q6 to Q10, 3 Marks each) */
          <table className="paper-table" style={{ marginBottom: '1.5rem' }}>
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>Q.No</th>
                <th style={{ width: '68%' }}>Question Description</th>
                <th style={{ width: '10%', textAlign: 'center' }}>CO</th>
                <th style={{ width: '10%', textAlign: 'center' }}>KL</th>
                <th style={{ width: '4%', textAlign: 'center' }}>Act</th>
              </tr>
            </thead>
            <tbody>
              {Array(5).fill(null).map((_, idx) => {
                const slotRaw = selectedPartB[idx];
                const item = slotRaw ? (slotRaw.a || slotRaw.b || (slotRaw.text ? slotRaw : null)) : null;
                const qNo = 6 + idx;
                const expectedUnit = getSuggestedUnitForPartBSlot(config.exam_type, idx, config.regulation);

                return (
                  <tr 
                    key={idx}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'B', idx, 'a')}
                    style={{ background: !item ? '#faf9f8' : 'transparent' }}
                  >
                    <td className="center" style={{ fontWeight: 'bold' }}>{qNo}</td>
                    <td 
                      draggable={!!item}
                      onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'preview_b', slotIdx: idx, subKey: 'a', question: item }))}
                      style={{ cursor: item ? 'grab' : 'default' }}
                    >
                      {item ? (
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                          <span style={{ color: '#8a8886', cursor: 'grab', display: 'inline-flex', alignItems: 'center', marginTop: '0.15rem' }}>
                            <GripVertical size={13} />
                          </span>
                          <span 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const val = e.target.innerText.trim();
                              if (val !== '') {
                                updateQuestionText('B', idx, 'a', val);
                              }
                            }}
                          >
                            {item.text}
                          </span>
                        </div>
                      ) : (
                        <span 
                          style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', cursor: 'pointer' }}
                          onClick={() => {
                            setActiveTabSub('B');
                            setFilterUnit(Array.isArray(expectedUnit) ? (expectedUnit.length === 1 ? expectedUnit[0] : 'All') : expectedUnit);
                          }}
                        >
                          [Drop target for Part B Question {qNo} ({Array.isArray(expectedUnit) ? expectedUnit.join(' / ') : expectedUnit})]
                        </span>
                      )}
                    </td>
                    <td className="center">{item ? item.co : ''}</td>
                    <td className="center">{item ? item.kl : ''}</td>
                    <td className="center">
                      {item && (
                        <button 
                          onClick={() => handleClearSlot('B', idx, 'a')}
                          className="btn-trash"
                          title="Clear slot"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* MODEL EXAM & 2021 CAT PART B: Either-OR Pairs (13 Marks each) */
          <table className="paper-table" style={{ marginBottom: '1.5rem' }}>
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>Q.No</th>
                <th style={{ width: '5%', textAlign: 'center' }}>Opt</th>
                <th style={{ width: '63%' }}>Question Description</th>
                <th style={{ width: '10%', textAlign: 'center' }}>CO</th>
                <th style={{ width: '10%', textAlign: 'center' }}>KL</th>
                <th style={{ width: '4%', textAlign: 'center' }}>Act</th>
              </tr>
            </thead>
            <tbody>
              {selectedPartB.slice(0, isCAT ? 2 : 5).map((slot, idx) => {
                const qNo = getPartBQuestionNo(config.exam_type, idx, config.regulation);
                const expectedUnit = getSuggestedUnitForPartBSlot(config.exam_type, idx, config.regulation);

                return (
                  <React.Fragment key={idx}>
                    {/* Option A Row */}
                    <tr 
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, 'B', idx, 'a')}
                      style={{ background: !slot?.a ? '#faf9f8' : 'transparent' }}
                    >
                      <td className="center" style={{ fontWeight: 'bold' }}>{qNo}</td>
                      <td className="center">(a)</td>
                      <td 
                        draggable={!!slot?.a}
                        onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'preview_b', slotIdx: idx, subKey: 'a', question: slot?.a }))}
                        style={{ cursor: slot?.a ? 'grab' : 'default' }}
                      >
                        {slot?.a ? (
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                            <span style={{ color: '#8a8886', cursor: 'grab', display: 'inline-flex', alignItems: 'center', marginTop: '0.15rem' }}>
                              <GripVertical size={13} />
                            </span>
                            <span 
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const val = e.target.innerText.trim();
                                if (val !== '') {
                                  updateQuestionText('B', idx, 'a', val);
                                }
                              }}
                            >
                              {slot.a.text}
                            </span>
                          </div>
                        ) : (
                          <span 
                            style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', cursor: 'pointer' }}
                            onClick={() => {
                              setActiveTabSub('B');
                              setFilterUnit(Array.isArray(expectedUnit) ? (expectedUnit.length === 1 ? expectedUnit[0] : 'All') : expectedUnit);
                            }}
                          >
                            [Drop target for Part B &ndash; {Array.isArray(expectedUnit) ? expectedUnit.join(' / ') : expectedUnit} question card]
                          </span>
                        )}
                      </td>
                      <td className="center">{slot?.a ? slot.a.co : ''}</td>
                      <td className="center">{slot?.a ? slot.a.kl : ''}</td>
                      <td className="center">
                        {slot?.a && (
                          <button 
                            onClick={() => handleClearSlot('B', idx, 'a')}
                            className="btn-trash"
                            title="Clear slot"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Either Or Divider */}
                    <tr>
                      <td></td>
                      <td></td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontStyle: 'italic', fontSize: '0.88rem', padding: '0.25rem 0' }}>OR</td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>

                    {/* Option B Row */}
                    <tr 
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, 'B', idx, 'b')}
                      style={{ background: !slot?.b ? '#faf9f8' : 'transparent' }}
                    >
                      <td></td>
                      <td className="center">(b)</td>
                      <td 
                        draggable={!!slot?.b}
                        onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'preview_b', slotIdx: idx, subKey: 'b', question: slot?.b }))}
                        style={{ cursor: slot?.b ? 'grab' : 'default' }}
                      >
                        {slot?.b ? (
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                            <span style={{ color: '#8a8886', cursor: 'grab', display: 'inline-flex', alignItems: 'center', marginTop: '0.15rem' }}>
                              <GripVertical size={13} />
                            </span>
                            <span 
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const val = e.target.innerText.trim();
                                if (val !== '') {
                                  updateQuestionText('B', idx, 'b', val);
                                }
                              }}
                            >
                              {slot.b.text}
                            </span>
                          </div>
                        ) : (
                          <span 
                            style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', cursor: 'pointer' }}
                            onClick={() => {
                              setActiveTabSub('B');
                              setFilterUnit(Array.isArray(expectedUnit) ? (expectedUnit.length === 1 ? expectedUnit[0] : 'All') : expectedUnit);
                            }}
                          >
                            [Drop target for Part B &ndash; {Array.isArray(expectedUnit) ? expectedUnit.join(' / ') : expectedUnit} question card]
                          </span>
                        )}
                      </td>
                      <td className="center">{slot?.b ? slot.b.co : ''}</td>
                      <td className="center">{slot?.b ? slot.b.kl : ''}</td>
                      <td className="center">
                        {slot?.b && (
                          <button 
                            onClick={() => handleClearSlot('B', idx, 'b')}
                            className="btn-trash"
                            title="Clear slot"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>

                    {idx < (isCAT ? 1 : 4) && (
                      <tr style={{ height: '1.25rem' }}>
                        <td colSpan={6} style={{ border: 'none', background: 'transparent' }}></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {/* PART C PREVIEW TABLE */}
        <div ref={partCRef} className="paper-part-title">
          PART &ndash; C ({is2025 ? '3 X 10 = 30' : (isCAT ? '1 X 14 = 14' : '1 X 15 = 15')} MARKS)
        </div>

        <table className="paper-table" style={{ marginBottom: '1.5rem' }}>
          <thead>
            <tr>
              <th style={{ width: '8%', textAlign: 'center' }}>Q.No</th>
              <th style={{ width: '5%', textAlign: 'center' }}>Opt</th>
              <th style={{ width: '63%' }}>Question Description</th>
              <th style={{ width: '10%', textAlign: 'center' }}>CO</th>
              <th style={{ width: '10%', textAlign: 'center' }}>KL</th>
              <th style={{ width: '4%', textAlign: 'center' }}>Act</th>
            </tr>
          </thead>
          <tbody>
            {(is2025 ? (
              Array.isArray(selectedPartC) ? selectedPartC : [selectedPartC, { a: null, b: null }, { a: null, b: null }]
            ).slice(0, 3) : (Array.isArray(selectedPartC) ? selectedPartC.slice(0, 1) : [selectedPartC])).map((pairSlot, pairIdx) => {
              const qNo = is2025 ? (11 + pairIdx) : (isCAT ? (8 + pairIdx) : getPartCQuestionNo(config.exam_type, pairIdx, config.regulation));
              const slotA = pairSlot?.a;
              const slotB = pairSlot?.b;

              return (
                <React.Fragment key={pairIdx}>
                  {/* Option A */}
                  <tr 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'C', pairIdx, 'a')}
                    style={{ background: !slotA ? '#faf9f8' : 'transparent' }}
                  >
                    <td className="center" style={{ fontWeight: 'bold' }}>{qNo}</td>
                    <td className="center">(a)</td>
                    <td 
                      draggable={!!slotA}
                      onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'preview_c', pairIdx, subKey: 'a', question: slotA }))}
                      style={{ cursor: slotA ? 'grab' : 'default' }}
                    >
                      {slotA ? (
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                          <span style={{ color: '#8a8886', cursor: 'grab', display: 'inline-flex', alignItems: 'center', marginTop: '0.15rem' }}>
                            <GripVertical size={13} />
                          </span>
                          <span 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const val = e.target.innerText.trim();
                              if (val !== '') {
                                updateQuestionText('C', pairIdx, 'a', val);
                              }
                            }}
                          >
                            {slotA.text}
                          </span>
                        </div>
                      ) : (
                        <span 
                          style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', cursor: 'pointer' }}
                          onClick={() => {
                            setActiveTabSub('C');
                            const suggested = getSuggestedUnitForPartCSlot(config.exam_type, pairIdx, 'a', config.regulation);
                            setFilterUnit(suggested.length === 1 ? suggested[0] : 'All');
                          }}
                        >
                          [Drop target for Part C Question {qNo}(a) ({getSuggestedUnitForPartCSlot(config.exam_type, pairIdx, 'a', config.regulation).join('/')})]
                        </span>
                      )}
                    </td>
                    <td className="center">{slotA ? slotA.co : ''}</td>
                    <td className="center">{slotA ? slotA.kl : ''}</td>
                    <td className="center">
                      {slotA && (
                        <button 
                          onClick={() => handleClearSlot('C', pairIdx, 'a')}
                          className="btn-trash"
                          title="Clear slot"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Either Or Divider */}
                  <tr>
                    <td></td>
                    <td></td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontStyle: 'italic', fontSize: '0.88rem', padding: '0.25rem 0' }}>OR</td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>

                  {/* Option B */}
                  <tr 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'C', pairIdx, 'b')}
                    style={{ background: !slotB ? '#faf9f8' : 'transparent' }}
                  >
                    <td></td>
                    <td className="center">(b)</td>
                    <td 
                      draggable={!!slotB}
                      onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'preview_c', pairIdx, subKey: 'b', question: slotB }))}
                      style={{ cursor: slotB ? 'grab' : 'default' }}
                    >
                      {slotB ? (
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                          <span style={{ color: '#8a8886', cursor: 'grab', display: 'inline-flex', alignItems: 'center', marginTop: '0.15rem' }}>
                            <GripVertical size={13} />
                          </span>
                          <span 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const val = e.target.innerText.trim();
                              if (val !== '') {
                                updateQuestionText('C', pairIdx, 'b', val);
                              }
                            }}
                          >
                            {slotB.text}
                          </span>
                        </div>
                      ) : (
                        <span 
                          style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', cursor: 'pointer' }}
                          onClick={() => {
                            setActiveTabSub('C');
                            const suggested = getSuggestedUnitForPartCSlot(config.exam_type, pairIdx, 'b', config.regulation);
                            setFilterUnit(suggested.length === 1 ? suggested[0] : 'All');
                          }}
                        >
                          [Drop target for Part C Question {qNo}(b) ({getSuggestedUnitForPartCSlot(config.exam_type, pairIdx, 'b', config.regulation).join('/')})]
                        </span>
                      )}
                    </td>
                    <td className="center">{slotB ? slotB.co : ''}</td>
                    <td className="center">{slotB ? slotB.kl : ''}</td>
                    <td className="center">
                      {slotB && (
                        <button 
                          onClick={() => handleClearSlot('C', pairIdx, 'b')}
                          className="btn-trash"
                          title="Clear slot"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>

                  {pairIdx < (isCAT ? 2 : 0) && (
                    <tr style={{ height: '1.25rem' }}>
                      <td colSpan={6} style={{ border: 'none', background: 'transparent' }}></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Dynamic Table of Specification Matrices */}
        <div style={{ borderTop: '2px dashed #000000', margin: '2rem 0 1rem 0', paddingTop: '1.5rem', fontFamily: "'Times New Roman', Times, serif", color: '#000000' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '1rem', textAlign: 'center', letterSpacing: '0.5px' }}>
            Appendix: Table of Specifications (TOS)
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Counts Matrix */}
            <div>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem', color: '#111111' }}>
                I. Question Count Distribution Matrix
              </h5>
              <div style={{ overflowX: 'auto' }}>
                <table className="paper-table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center' }}>Unit</th>
                      <th>K1</th>
                      <th>K2</th>
                      <th>K3</th>
                      <th>K4</th>
                      <th>K5</th>
                      <th>K6</th>
                      <th>Total Qs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tosUnits.map((u, uIdx) => (
                      <tr key={uIdx}>
                        <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{u.replace(/^Unit\s+/i, '')}</td>
                        {['K1', 'K2', 'K3', 'K4', 'K5', 'K6'].map((k, kIdx) => {
                          const val = tosCounts[u][k] || 0;
                          return <td key={kIdx} className="center">{val > 0 ? val : '-'}</td>;
                        })}
                        <td className="center" style={{ fontWeight: 'bold' }}>{unitTotalsCount[u]}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold' }}>
                      <td className="center">Total</td>
                      {['K1', 'K2', 'K3', 'K4', 'K5', 'K6'].map((k, kIdx) => (
                        <td key={kIdx} className="center">{filteredKlTotalsCount[k]}</td>
                      ))}
                      <td className="center">{filteredGrandTotalCount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Separator Line */}
            <div style={{ borderTop: '1px dashed #dddddd' }}></div>

            {/* Marks Matrix */}
            <div>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem', color: '#111111' }}>
                II. Marks Distribution Matrix (Total weightage)
              </h5>
              <div style={{ overflowX: 'auto' }}>
                <table className="paper-table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center' }}>Unit</th>
                      <th>K1</th>
                      <th>K2</th>
                      <th>K3</th>
                      <th>K4</th>
                      <th>K5</th>
                      <th>K6</th>
                      <th>Total Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tosUnits.map((u, uIdx) => (
                      <tr key={uIdx}>
                        <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{u.replace(/^Unit\s+/i, '')}</td>
                        {['K1', 'K2', 'K3', 'K4', 'K5', 'K6'].map((k, kIdx) => {
                          const val = tosMarks[u][k] || 0;
                          return <td key={kIdx} className="center">{val > 0 ? val : '-'}</td>;
                        })}
                        <td className="center" style={{ fontWeight: 'bold' }}>{unitTotalsMark[u]}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold' }}>
                      <td className="center">Total</td>
                      {['K1', 'K2', 'K3', 'K4', 'K5', 'K6'].map((k, kIdx) => (
                        <td key={kIdx} className="center">{filteredKlTotalsMark[k]}</td>
                      ))}
                      <td className="center">{filteredGrandTotalMark}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* CAT Staff Signatures Footer */}
        {isCAT && (
          <div style={{ marginTop: '2rem', fontFamily: "'Times New Roman', Times, serif" }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center', border: '1px solid #000000' }}>
              <thead>
                <tr style={{ background: '#faf9f8' }}>
                  <th style={{ border: '1px solid #000000', padding: '0.4rem', width: '25%' }}></th>
                  <th style={{ border: '1px solid #000000', padding: '0.4rem' }}>Name of the staff / Academic Institution / Department</th>
                  <th style={{ border: '1px solid #000000', padding: '0.4rem', width: '25%' }}>Sign with date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '0.4rem', fontWeight: 'bold' }}>Prepared by</td>
                  <td style={{ border: '1px solid #000000', padding: '0.4rem' }}></td>
                  <td style={{ border: '1px solid #000000', padding: '0.4rem' }}></td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '0.4rem', fontWeight: 'bold' }}>Verified by</td>
                  <td style={{ border: '1px solid #000000', padding: '0.4rem' }}></td>
                  <td style={{ border: '1px solid #000000', padding: '0.4rem' }}></td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '0.4rem', fontWeight: 'bold' }}>Reviewed By</td>
                  <td style={{ border: '1px solid #000000', padding: '0.4rem' }}></td>
                  <td style={{ border: '1px solid #000000', padding: '0.4rem' }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
