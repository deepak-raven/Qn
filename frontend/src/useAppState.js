import { useState, useEffect, useRef } from 'react';
import { useSetsManager, DEFAULT_CONFIG } from './hooks/useSetsManager';
import { useTOSCalculator } from './hooks/useTOSCalculator';
import { usePaperDownloader } from './hooks/usePaperDownloader';

import { API_BASE } from './config';


export function useAppState() {
  const [activeTab, setActiveTab] = useState('upload');
  const [activeTabSub, setActiveTabSub] = useState('A');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubCode, setSelectedSubCode] = useState('');
  const [questions, setQuestions] = useState([]);

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
    handleRenameActiveSet
  } = setsManager;

  // Delegate TOS calculator math
  const tosCalculator = useTOSCalculator(selectedPartA, selectedPartB, selectedPartC);
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
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/subjects`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const loadQuestionsForSubject = async (code, sem) => {
    if (!code || !sem) return;
    
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
      const res = await fetch(`${API_BASE}/questions?subject_code=${code}&semester=${sem}`);
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
            semester: `ODD SEMESTER-2025-26`
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

  const handleGeneratePaper = () => {
    generatePaper(config, selectedPartA, selectedPartB, selectedPartC);
  };

  const handleToggleQuestion = (q) => {
    const assigned = isAssigned(q._id);
    updateCurrentSet(set => {
      if (assigned) {
        if (activeTabSub === 'A') {
          return { selectedPartA: set.selectedPartA.map(item => (item && item._id === q._id) ? null : item) };
        } else if (activeTabSub === 'B') {
          return { selectedPartB: set.selectedPartB.map(slot => {
            const newSlot = { ...slot };
            if (newSlot.a && newSlot.a._id === q._id) newSlot.a = null;
            if (newSlot.b && newSlot.b._id === q._id) newSlot.b = null;
            return newSlot;
          }) };
        } else if (activeTabSub === 'C') {
          const next = { ...set.selectedPartC };
          if (next.a && next.a._id === q._id) next.a = null;
          if (next.b && next.b._id === q._id) next.b = null;
          return { selectedPartC: next };
        }
      } else {
        if (activeTabSub === 'A') {
          const emptyIdx = set.selectedPartA.findIndex(item => item === null);
          if (emptyIdx === -1) {
            alert('All 10 Part A slots are full.');
            return {};
          }
          const next = [...set.selectedPartA];
          next[emptyIdx] = q;
          return { selectedPartA: next };
        } else if (activeTabSub === 'B') {
          const slotIdx = ['Unit I', 'Unit II', 'Unit III', 'Unit IV', 'Unit V'].indexOf(q.unit);
          if (slotIdx === -1) return {};
          const next = [...set.selectedPartB];
          const slot = next[slotIdx];
          if (!slot.a) {
            next[slotIdx] = { ...slot, a: q };
          } else if (!slot.b) {
            next[slotIdx] = { ...slot, b: q };
          } else {
            alert(`Question ${11 + slotIdx} already has both choices selected.`);
          }
          return { selectedPartB: next };
        } else if (activeTabSub === 'C') {
          const next = { ...set.selectedPartC };
          if (!next.a) {
            next.a = q;
          } else if (!next.b) {
            next.b = q;
          } else {
            alert('Question 16 already has both choices selected.');
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
        next[idx] = { ...next[idx], [key]: null };
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
        updateCurrentSet(set => {
          const next = [...set.selectedPartA];
          if (payload.type === 'preview_a' && payload.index !== undefined) {
            const temp = next[index];
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
        const expectedUnit = `Unit ${['I', 'II', 'III', 'IV', 'V'][index]}`;
        if (q.unit !== expectedUnit) {
          alert(`Only questions from ${expectedUnit} can be placed in Question ${11 + index}.`);
          return;
        }
        updateCurrentSet(set => {
          let next = [...set.selectedPartB];
          if (payload.type === 'preview_b') {
            const sourceSlotIdx = payload.slotIdx;
            const sourceSubKey = payload.subKey;
            const temp = next[index][subKey];
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

  const isAssigned = (qId) => {
    if (activeTabSub === 'A') {
      return selectedPartA.some(item => item && item._id === qId);
    }
    if (activeTabSub === 'B') {
      return selectedPartB.some(slot => (slot.a && slot.a._id === qId) || (slot.b && slot.b._id === qId));
    }
    if (activeTabSub === 'C') {
      return (selectedPartC.a && selectedPartC.a._id === qId) || (selectedPartC.b && selectedPartC.b._id === qId);
    }
    return false;
  };

  const filteredPool = questions.filter(q => {
    if (q.part !== activeTabSub) return false;
    if (filterUnit !== 'All' && q.unit !== filterUnit) return false;
    if (searchQuery.trim() !== '' && !q.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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
    grandTotalMark
  };
}
