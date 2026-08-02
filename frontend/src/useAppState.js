import { useState, useEffect, useRef, useMemo } from 'react';
import { useSetsManager, DEFAULT_CONFIG, getExpectedUnitForPartASlot, getExpectedUnitForPartBSlot, getPartBQuestionNo, getPartCQuestionNo } from './hooks/useSetsManager';
import { useTOSCalculator } from './hooks/useTOSCalculator';
import { usePaperDownloader } from './hooks/usePaperDownloader';

import { API_BASE } from './config';


export function useAppState() {
  const [activeTab, setActiveTab] = useState('upload');
  const [activeTabSub, setActiveTabSub] = useState('A');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubCode, setSelectedSubCode] = useState('');
  const [questions, setQuestions] = useState([]);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('jec_staff_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const handleLoginSuccess = (user) => {
    localStorage.setItem('jec_staff_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('jec_staff_user');
    setCurrentUser(null);
    setSubjects([]);
    setQuestions([]);
    setSelectedSubCode('');
  };

  // Delegate sets manager state
  const setsManager = useSetsManager();
  const {
    sets,
    setSets,
    currentSetId,
    setCurrentSetId,
    config,
    setConfig,
    selectedPartA,
    selectedPartB,
    selectedPartC,
    updateCurrentSet,
    handleSwitchSet,
    handleCreateNewSet,
    handleRenameActiveSet,
    handleDeleteSet
  } = setsManager;

  // Delegate TOS calculator math
  const tosCalculator = useTOSCalculator(selectedPartA, selectedPartB, selectedPartC, config);
  const {
    tosCounts,
    tosMarks,
    unitTotalsCount,
    klTotalsCount,
    grandTotalCount,
    unitTotalsMark,
    klTotalsMark,
    grandTotalMark
  } = tosCalculator;

  // Delegate docx downloader & validation
  const { downloading, generatePaper } = usePaperDownloader();

  const partARef = useRef(null);
  const partBRef = useRef(null);
  const partCRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'questions') return;
    if (activeTabSub === 'A' && partARef.current) {
      partARef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (activeTabSub === 'B' && partBRef.current) {
      partBRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (activeTabSub === 'C' && partCRef.current) {
      partCRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeTabSub, activeTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnit, setFilterUnit] = useState('All');

  useEffect(() => {
    if (currentUser) {
      fetchSubjects();
    } else {
      setSubjects([]);
    }
  }, [currentUser]);

  const fetchSubjects = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/subjects?uploaded_by=${currentUser.username}`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const loadQuestionsForSubject = async (code, sem) => {
    if (!code || !sem || !currentUser) return;
    
    const freshPartA = Array(10).fill(null);
    const freshPartB = Array(5).fill(null).map(() => ({ a: null, b: null }));
    const freshPartC = { a: null, b: null };

    setSearchQuery('');
    setFilterUnit('All');
    setCurrentSetId('SET-I');

    setSets({
      'SET-I': {
        config: { ...DEFAULT_CONFIG, set: 'SET-I', subject_code: code },
        selectedPartA: freshPartA,
        selectedPartB: freshPartB,
        selectedPartC: freshPartC
      }
    });

    try {
      const res = await fetch(`${API_BASE}/questions?subject_code=${code}&semester=${sem}&uploaded_by=${currentUser.username}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
        
        const sub = subjects.find(s => s.code === code);
        if (sub) {
          const freshConfig = {
            ...DEFAULT_CONFIG,
            set: 'SET-I',
            subject_code: sub.code,
            subject_name: sub.name,
            regulation: `${sub.regulation}-Regulation`,
            semester: `ODD SEMESTER-2025-26`,
            exam_name: 'MODEL EXAMINATION',
            time: '3 Hours',
            degree_branch_sem: `BE/BTECH/ CIVIL/AERO/MECH/EEE/TEXT/${sub.semester || 'VII'}`
          };
          setSets({
            'SET-I': {
              config: freshConfig,
              selectedPartA: freshPartA,
              selectedPartB: freshPartB,
              selectedPartC: freshPartC
            }
          });
        }
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  };

  const isSameQ = (a, b) => {
    if (!a || !b) return false;
    const aObj = typeof a === 'object' ? a : null;
    const bObj = typeof b === 'object' ? b : null;
    const aId = aObj ? aObj._id : a;
    const bId = bObj ? bObj._id : b;
    
    if (aId && bId && String(aId) === String(bId)) return true;
    if (aObj && bObj) {
      return aObj.text === bObj.text && aObj.unit === bObj.unit;
    }
    return false;
  };

  const isAssigned = (qTarget) => {
    if (!qTarget) return false;
    if (selectedPartA.some(item => isSameQ(item, qTarget))) return true;
    if (selectedPartB.some(slot => slot && (isSameQ(slot.a, qTarget) || isSameQ(slot.b, qTarget)))) return true;
    if (selectedPartC && (isSameQ(selectedPartC.a, qTarget) || isSameQ(selectedPartC.b, qTarget))) return true;
    return false;
  };

  const handleGeneratePaper = () => {
    generatePaper(config, selectedPartA, selectedPartB, selectedPartC);
  };

  const handleToggleQuestion = (q) => {
    const assigned = isAssigned(q);
    updateCurrentSet(set => {
      if (assigned) {
        // Universal cancel / unassign across all parts and slots
        return {
          selectedPartA: set.selectedPartA.map(item => isSameQ(item, q) ? null : item),
          selectedPartB: set.selectedPartB.map(slot => ({
            a: isSameQ(slot.a, q) ? null : slot.a,
            b: isSameQ(slot.b, q) ? null : slot.b
          })),
          selectedPartC: {
            a: isSameQ(set.selectedPartC.a, q) ? null : set.selectedPartC.a,
            b: isSameQ(set.selectedPartC.b, q) ? null : set.selectedPartC.b
          }
        };
      } else {
        if (activeTabSub === 'A') {
          const reqCount = (config.exam_type === 'CAT-1' || config.exam_type === 'CAT-2' || config.exam_type === 'IAT-1' || config.exam_type === 'IAT-2') ? 5 : 10;
          // Find first empty slot where the question's unit is allowed
          let emptyIdx = -1;
          for (let i = 0; i < reqCount; i++) {
            if (set.selectedPartA[i] === null) {
              const expectedUnits = getExpectedUnitForPartASlot(config.exam_type, i);
              if (expectedUnits.includes(q.unit)) {
                emptyIdx = i;
                break;
              }
            }
          }
          if (emptyIdx === -1) {
            alert(`No empty slots available in Part A for ${q.unit}.`);
            return {};
          }
          const next = [...set.selectedPartA];
          next[emptyIdx] = q;
          return { selectedPartA: next };
        } else if (activeTabSub === 'B') {
          let slotIdx = -1;
          if (config.exam_type === 'CAT-1' || config.exam_type === 'IAT-1') {
            slotIdx = ['Unit I', 'Unit II'].indexOf(q.unit);
          } else if (config.exam_type === 'CAT-2' || config.exam_type === 'IAT-2') {
            slotIdx = ['Unit III', 'Unit IV'].indexOf(q.unit);
          } else {
            slotIdx = ['Unit I', 'Unit II', 'Unit III', 'Unit IV', 'Unit V'].indexOf(q.unit);
          }

          if (slotIdx === -1 || slotIdx >= set.selectedPartB.length) {
            alert(`Part B question for ${config.exam_type || 'MODEL EXAM'} must belong to valid syllabus units.`);
            return {};
          }
          const next = [...set.selectedPartB];
          const slot = next[slotIdx];
          if (!slot || !slot.a) {
            next[slotIdx] = { ...slot, a: q };
          } else if (!slot.b) {
            next[slotIdx] = { ...slot, b: q };
          } else {
            alert(`Question ${getPartBQuestionNo(config.exam_type, slotIdx)} already has both choices selected.`);
          }
          return { selectedPartB: next };
        } else if (activeTabSub === 'C') {
          const next = { ...set.selectedPartC };
          if (!next.a) {
            next.a = q;
          } else if (!next.b) {
            next.b = q;
          } else {
            alert(`Question ${getPartCQuestionNo(config.exam_type)} already has both choices selected.`);
          }
          return { selectedPartC: next };
        }
      }
      return {};
    });
  };

  const handleClearSlot = (part, idx, key) => {
    updateCurrentSet(set => {
      if (part === 'A') {
        return { selectedPartA: set.selectedPartA.map((q, qIdx) => qIdx === idx ? null : q) };
      } else if (part === 'B') {
        const next = [...set.selectedPartB];
        if (next[idx]) {
          next[idx] = { ...next[idx], [key]: null };
        }
        return { selectedPartB: next };
      } else if (part === 'C') {
        return { selectedPartC: { ...set.selectedPartC, [key]: null } };
      }
      return {};
    });
  };

  const updateQuestionText = (part, idx, key, newText) => {
    updateCurrentSet(set => {
      if (part === 'A') {
        const next = [...set.selectedPartA];
        next[idx] = { ...next[idx], text: newText };
        return { selectedPartA: next };
      } else if (part === 'B') {
        const next = [...set.selectedPartB];
        next[idx] = { ...next[idx], [key]: { ...next[idx][key], text: newText } };
        return { selectedPartB: next };
      } else if (part === 'C') {
        const next = { ...set.selectedPartC };
        next[key] = { ...next[key], text: newText };
        return { selectedPartC: next };
      }
      return {};
    });
  };

  const handleDragStart = (e, q) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'pool',
      question: q
    }));
  };

  const handleDrop = (e, part, index, subKey) => {
    e.preventDefault();
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/json'));
      const q = payload.question;
      if (q.part !== part) {
        alert(`You can only drop Part ${part} questions here.`);
        return;
      }
      
      if (part === 'A') {
        const expectedUnits = getExpectedUnitForPartASlot(config.exam_type, index);
        if (!expectedUnits.includes(q.unit)) {
          alert(`Only questions from ${expectedUnits.join(' or ')} can be placed in Part A Question ${index + 1}.`);
          return;
        }
        
        updateCurrentSet(set => {
          const next = [...set.selectedPartA];
          if (payload.type === 'preview_a' && payload.index !== undefined) {
            const temp = next[index];
            if (temp) {
              const sourceExpectedUnits = getExpectedUnitForPartASlot(config.exam_type, payload.index);
              if (!sourceExpectedUnits.includes(temp.unit)) {
                alert(`Swap failed: Question ${index + 1} (${temp.unit}) cannot be placed in Question ${payload.index + 1} (${sourceExpectedUnits.join(' or ')} expected).`);
                return {};
              }
            }
            next[index] = q;
            next[payload.index] = temp;
          } else {
            const cleaned = next.map(item => (item && item._id === q._id) ? null : item);
            cleaned[index] = q;
            return { selectedPartA: cleaned };
          }
          return { selectedPartA: next };
        });
      } else if (part === 'B') {
        const expectedUnit = getExpectedUnitForPartBSlot(config.exam_type, index);
        if (q.unit !== expectedUnit) {
          const qNo = getPartBQuestionNo(config.exam_type, index);
          alert(`Only questions from ${expectedUnit} can be placed in Question ${qNo}.`);
          return;
        }
        updateCurrentSet(set => {
          let next = [...set.selectedPartB];
          if (payload.type === 'preview_b') {
            const sourceSlotIdx = payload.slotIdx;
            const sourceSubKey = payload.subKey;
            const temp = next[index][subKey];
            if (temp) {
              const sourceExpectedUnit = getExpectedUnitForPartBSlot(config.exam_type, sourceSlotIdx);
              if (temp.unit !== sourceExpectedUnit) {
                const sourceQNo = getPartBQuestionNo(config.exam_type, sourceSlotIdx);
                const targetQNo = getPartBQuestionNo(config.exam_type, index);
                alert(`Swap failed: Question ${targetQNo} (${temp.unit}) cannot be placed in Question ${sourceQNo} (${sourceExpectedUnit} expected).`);
                return {};
              }
            }
            next[index] = { ...next[index], [subKey]: q };
            next[sourceSlotIdx] = { ...next[sourceSlotIdx], [sourceSubKey]: temp };
          } else {
            next = next.map((slot, idx) => {
              if (idx === index) {
                return { ...slot, [subKey]: q };
              }
              const newSlot = { ...slot };
              if (newSlot.a && newSlot.a._id === q._id) newSlot.a = null;
              if (newSlot.b && newSlot.b._id === q._id) newSlot.b = null;
              return newSlot;
            });
          }
          return { selectedPartB: next };
        });
      } else if (part === 'C') {
        updateCurrentSet(set => {
          const next = { ...set.selectedPartC };
          if (payload.type === 'preview_c') {
            const sourceSubKey = payload.subKey;
            const temp = next[subKey];
            next[subKey] = q;
            next[sourceSubKey] = temp;
          } else {
            next[subKey] = q;
            const otherKey = subKey === 'a' ? 'b' : 'a';
            if (next[otherKey] && next[otherKey]._id === q._id) {
              next[otherKey] = null;
            }
          }
          return { selectedPartC: next };
        });
      }
    } catch (err) {
      console.error(err);
    }
  };



  const filteredPool = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return questions.filter(q => {
      if (q.part !== activeTabSub) return false;
      if (filterUnit !== 'All' && q.unit !== filterUnit) return false;
      if (query !== '' && !q.text.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [questions, activeTabSub, filterUnit, searchQuery]);

  return {
    API_BASE,
    activeTab,
    setActiveTab,
    activeTabSub,
    setActiveTabSub,
    subjects,
    selectedSubCode,
    setSelectedSubCode,
    questions,
    config,
    setConfig,
    selectedPartA,
    selectedPartB,
    selectedPartC,
    sets,
    currentSetId,
    setCurrentSetId,
    searchQuery,
    setSearchQuery,
    filterUnit,
    setFilterUnit,
    downloading,
    partARef,
    partBRef,
    partCRef,
    handleSwitchSet,
    handleCreateNewSet,
    handleRenameActiveSet,
    handleDeleteSet,
    fetchSubjects,
    loadQuestionsForSubject,
    handleGeneratePaper,
    handleToggleQuestion,
    handleClearSlot,
    updateQuestionText,
    handleDragStart,
    handleDrop,
    isAssigned,
    filteredPool,
    tosCounts,
    tosMarks,
    unitTotalsCount,
    klTotalsCount,
    grandTotalCount,
    unitTotalsMark,
    klTotalsMark,
    grandTotalMark,
    currentUser,
    setCurrentUser,
    handleLoginSuccess,
    handleLogout
  };
}
