import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';

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
  handleDrop,
  handleClearSlot,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderBottom: '1px solid #d1d5db', padding: '0.25rem 0.5rem 0 0.5rem', background: '#f3f4f6', borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}>
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
                    const nextSets = { ...sets };
                    delete nextSets[setId];
                    setSets(nextSets);
                    if (currentSetId === setId) {
                      const firstRemaining = Object.keys(nextSets)[0];
                      setCurrentSetId(firstRemaining);
                      setConfig(nextSets[firstRemaining].config);
                      setSelectedPartA(nextSets[firstRemaining].selectedPartA);
                      setSelectedPartB(nextSets[firstRemaining].selectedPartB);
                      setSelectedPartC(nextSets[firstRemaining].selectedPartC);
                    }
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
        
        {/* Plus button next to last tab */}
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
          title="Create new paper set"
        >
          +
        </button>
      </div>

      <div className="paper-preview">
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
              {config.institution_name || 'ENTER INSTITUTION NAME'}
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

        {/* PART A PREVIEW TABLE */}
        <div ref={partARef} className="paper-part-title">
          PART &ndash; A (10 x 2 = 20 Marks)<br />
          <span style={{ fontSize: '0.9rem', fontWeight: 'normal', fontStyle: 'italic' }}>Answer all the questions</span>
        </div>

        <table className="paper-table" style={{ marginBottom: '1.5rem' }}>
          <thead>
            <tr>
              <th style={{ width: '8%', textAlign: 'center' }}>Q.No</th>
              <th style={{ width: '64%' }}>Question Description</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Marks</th>
              <th style={{ width: '10%', textAlign: 'center' }}>CO</th>
              <th style={{ width: '10%', textAlign: 'center' }}>KL</th>
              <th style={{ width: '6%', textAlign: 'center' }}>Act</th>
            </tr>
          </thead>
          <tbody>
            {selectedPartA.map((item, idx) => (
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
                      [Drop target for Part A question card]
                    </span>
                  )}
                </td>
                <td className="center">{item ? item.marks : ''}</td>
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
          PART &ndash; B (5 x 13 = 65 Marks)<br />
          <span style={{ fontSize: '0.9rem', fontWeight: 'normal', fontStyle: 'italic' }}>Answer all the questions</span>
        </div>

        <table className="paper-table" style={{ marginBottom: '1.5rem' }}>
          <thead>
            <tr>
              <th style={{ width: '8%', textAlign: 'center' }}>Q.No</th>
              <th style={{ width: '4%' }}>Opt</th>
              <th style={{ width: '60%' }}>Question Description</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Marks</th>
              <th style={{ width: '10%', textAlign: 'center' }}>CO</th>
              <th style={{ width: '10%', textAlign: 'center' }}>KL</th>
              <th style={{ width: '6%', textAlign: 'center' }}>Act</th>
            </tr>
          </thead>
          <tbody>
            {selectedPartB.map((slot, idx) => {
              const qNo = 11 + idx;
              const expectedUnit = `Unit ${['I', 'II', 'III', 'IV', 'V'][idx]}`;
              return (
                <React.Fragment key={idx}>
                  {/* Option A Row */}
                  <tr 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'B', idx, 'a')}
                    style={{ background: !slot.a ? '#faf9f8' : 'transparent' }}
                  >
                    <td className="center" style={{ fontWeight: 'bold' }}>{qNo}</td>
                    <td className="center">(a)</td>
                    <td 
                      draggable={!!slot.a}
                      onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'preview_b', slotIdx: idx, subKey: 'a', question: slot.a }))}
                      style={{ cursor: slot.a ? 'grab' : 'default' }}
                    >
                      {slot.a ? (
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
                            setFilterUnit(expectedUnit);
                          }}
                        >
                          [Drop target for Part B &ndash; {expectedUnit} question card]
                        </span>
                      )}
                    </td>
                    <td className="center">{slot.a ? slot.a.marks : ''}</td>
                    <td className="center">{slot.a ? slot.a.co : ''}</td>
                    <td className="center">{slot.a ? slot.a.kl : ''}</td>
                    <td className="center">
                      {slot.a && (
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
                    <td className="center" style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '0.82rem', padding: '0.1rem 0' }}>OR</td>
                    <td colSpan={5} style={{ background: '#f5f5f5', height: '8px', padding: 0 }}></td>
                  </tr>

                  {/* Option B Row */}
                  <tr 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'B', idx, 'b')}
                    style={{ background: !slot.b ? '#faf9f8' : 'transparent' }}
                  >
                    <td></td>
                    <td className="center">(b)</td>
                    <td 
                      draggable={!!slot.b}
                      onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'preview_b', slotIdx: idx, subKey: 'b', question: slot.b }))}
                      style={{ cursor: slot.b ? 'grab' : 'default' }}
                    >
                      {slot.b ? (
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
                            setFilterUnit(expectedUnit);
                          }}
                        >
                          [Drop target for Part B &ndash; {expectedUnit} question card]
                        </span>
                      )}
                    </td>
                    <td className="center">{slot.b ? slot.b.marks : ''}</td>
                    <td className="center">{slot.b ? slot.b.co : ''}</td>
                    <td className="center">{slot.b ? slot.b.kl : ''}</td>
                    <td className="center">
                      {slot.b && (
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

                  {/* Blank space separating questions */}
                  {idx < 4 && (
                    <tr style={{ height: '1.25rem' }}>
                      <td colSpan={7} style={{ border: 'none', background: 'transparent' }}></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* PART C PREVIEW TABLE */}
        <div ref={partCRef} className="paper-part-title">
          PART &ndash; C (1 x 15 = 15 Marks)<br />
          <span style={{ fontSize: '0.9rem', fontWeight: 'normal', fontStyle: 'italic' }}>Answer all the questions</span>
        </div>

        <table className="paper-table" style={{ marginBottom: '1.5rem' }}>
          <thead>
            <tr>
              <th style={{ width: '8%', textAlign: 'center' }}>Q.No</th>
              <th style={{ width: '4%' }}>Opt</th>
              <th style={{ width: '60%' }}>Question Description</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Marks</th>
              <th style={{ width: '10%', textAlign: 'center' }}>CO</th>
              <th style={{ width: '10%', textAlign: 'center' }}>KL</th>
              <th style={{ width: '6%', textAlign: 'center' }}>Act</th>
            </tr>
          </thead>
          <tbody>
            {/* Part C Option A */}
            <tr 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'C', 0, 'a')}
              style={{ background: !selectedPartC.a ? '#faf9f8' : 'transparent' }}
            >
              <td className="center" style={{ fontWeight: 'bold' }}>16</td>
              <td className="center">(a)</td>
              <td 
                draggable={!!selectedPartC.a}
                onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'preview_c', subKey: 'a', question: selectedPartC.a }))}
                style={{ cursor: selectedPartC.a ? 'grab' : 'default' }}
              >
                {selectedPartC.a ? (
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
                          updateQuestionText('C', 0, 'a', val);
                        }
                      }}
                    >
                      {selectedPartC.a.text}
                    </span>
                  </div>
                ) : (
                  <span 
                    style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', cursor: 'pointer' }}
                    onClick={() => {
                      setActiveTabSub('C');
                      setFilterUnit('All');
                    }}
                  >
                    [Drop target for Part C question card]
                  </span>
                )}
              </td>
              <td className="center">{selectedPartC.a ? selectedPartC.a.marks : ''}</td>
              <td className="center">{selectedPartC.a ? selectedPartC.a.co : ''}</td>
              <td className="center">{selectedPartC.a ? selectedPartC.a.kl : ''}</td>
              <td className="center">
                {selectedPartC.a && (
                  <button 
                    onClick={() => handleClearSlot('C', 0, 'a')}
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
              <td className="center" style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '0.82rem', padding: '0.1rem 0' }}>OR</td>
              <td colSpan={5} style={{ background: '#f5f5f5', height: '8px', padding: 0 }}></td>
            </tr>

            {/* Part C Option B */}
            <tr 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'C', 0, 'b')}
              style={{ background: !selectedPartC.b ? '#faf9f8' : 'transparent' }}
            >
              <td></td>
              <td className="center">(b)</td>
              <td 
                draggable={!!selectedPartC.b}
                onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'preview_c', subKey: 'b', question: selectedPartC.b }))}
                style={{ cursor: selectedPartC.b ? 'grab' : 'default' }}
              >
                {selectedPartC.b ? (
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
                          updateQuestionText('C', 0, 'b', val);
                        }
                      }}
                    >
                      {selectedPartC.b.text}
                    </span>
                  </div>
                ) : (
                  <span 
                    style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', cursor: 'pointer' }}
                    onClick={() => {
                      setActiveTabSub('C');
                      setFilterUnit('All');
                    }}
                  >
                    [Drop target for Part C question card]
                  </span>
                )}
              </td>
              <td className="center">{selectedPartC.b ? selectedPartC.b.marks : ''}</td>
              <td className="center">{selectedPartC.b ? selectedPartC.b.co : ''}</td>
              <td className="center">{selectedPartC.b ? selectedPartC.b.kl : ''}</td>
              <td className="center">
                {selectedPartC.b && (
                  <button 
                    onClick={() => handleClearSlot('C', 0, 'b')}
                    className="btn-trash"
                    title="Clear slot"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </td>
            </tr>
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
                      <th>Unit / KL</th>
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
                    {['Unit I', 'Unit II', 'Unit III', 'Unit IV', 'Unit V'].map((u, uIdx) => (
                      <tr key={uIdx}>
                        <td style={{ fontWeight: 'bold', textAlign: 'left' }}>{u}</td>
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
                        <td key={kIdx} className="center">{klTotalsCount[k]}</td>
                      ))}
                      <td className="center">{grandTotalCount}</td>
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
                      <th>Unit / KL</th>
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
                    {['Unit I', 'Unit II', 'Unit III', 'Unit IV', 'Unit V'].map((u, uIdx) => (
                      <tr key={uIdx}>
                        <td style={{ fontWeight: 'bold', textAlign: 'left' }}>{u}</td>
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
                        <td key={kIdx} className="center">{klTotalsMark[k]}</td>
                      ))}
                      <td className="center">{grandTotalMark}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
