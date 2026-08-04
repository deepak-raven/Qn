import { useState, useEffect, useRef, useMemo } from 'react';
import { useSetsManager, DEFAULT_CONFIG, getExpectedUnitForPartASlot, getExpectedUnitForPartBSlot, getExpectedUnitForPartCSlot, getPartBQuestionNo, getPartCQuestionNo, isCATExam, is2025Regulation } from './hooks/useSetsManager';
import { useTOSCalculator, normalizeUnit } from './hooks/useTOSCalculator';
import { usePaperDownloader } from './hooks/usePaperDownloader';

import { API_BASE } from './config';


export function useAppState() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const stored = localStorage.getItem('jec_active_tab');
      return stored || 'upload';
    } catch (e) {
      return 'upload';
    }
  });

  const [activeTabSub, setActiveTabSub] = useState(() => {
    try {
      const stored = localStorage.getItem('jec_active_tab_sub');
      return stored || 'A';
    } catch (e) {
      return 'A';
    }
  });

  useEffect(() => {
    try {
      if (activeTab) localStorage.setItem('jec_active_tab', activeTab);
    } catch (e) { }
  }, [activeTab]);

  useEffect(() => {
    try {
      if (activeTabSub) localStorage.setItem('jec_active_tab_sub', activeTabSub);
    } catch (e) { }
  }, [activeTabSub]);

  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('jec_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  // Workspace persistence helper
  const loadSavedWorkspaceData = (username, code) => {
    if (!username) return null;
    try {
      if (code) {
        const item = localStorage.getItem(`jec_workspace_${username}_${code}`);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && parsed.sets && Object.keys(parsed.sets).length > 0) return parsed;
        }
      }
      const activeItem = localStorage.getItem(`jec_workspace_${username}_active`);
      if (activeItem) {
        const parsed = JSON.parse(activeItem);
        if (parsed && parsed.sets && Object.keys(parsed.sets).length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved workspace:', e);
    }
    return null;
  };

  const initialWorkspace = useMemo(() => {
    if (!currentUser?.username) return null;
    const savedSub = localStorage.getItem(`jec_sub_code_${currentUser.username}`);
    return loadSavedWorkspaceData(currentUser.username, savedSub);
  }, [currentUser?.username]);

  const [selectedSubCode, setSelectedSubCode] = useState(() => {
    if (initialWorkspace?.selectedSubCode) return initialWorkspace.selectedSubCode;
    if (currentUser?.username) {
      return localStorage.getItem(`jec_sub_code_${currentUser.username}`) || '';
    }
    return '';
  });

  const handleLoginSuccess = (user) => {
    localStorage.setItem('jec_auth_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    isInitialSubjectsLoadedRef.current = false;
    localStorage.removeItem('jec_auth_user');
    localStorage.removeItem('jec_active_tab');
    localStorage.removeItem('jec_active_tab_sub');
    setCurrentUser(null);
    setSubjects([]);
    setQuestions([]);
    setSelectedSubCode('');
    setActiveTab('upload');
  };

  // Delegate sets manager state initialized with saved workspace if present
  const setsManager = useSetsManager(initialWorkspace?.sets, initialWorkspace?.currentSetId);
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

  const isInitializedRef = useRef(false);

  // On login or relogin, load saved workspace state for the user
  useEffect(() => {
    if (!currentUser?.username) return;
    const savedSub = localStorage.getItem(`jec_sub_code_${currentUser.username}`);
    const savedWs = loadSavedWorkspaceData(currentUser.username, savedSub);
    if (savedWs && savedWs.sets) {
      setSets(savedWs.sets);
      if (savedWs.currentSetId) setCurrentSetId(savedWs.currentSetId);
      if (savedWs.selectedSubCode) setSelectedSubCode(savedWs.selectedSubCode);
    }
    isInitializedRef.current = true;
  }, [currentUser?.username]);

  // Auto-save workspace state to localStorage whenever sets or selectedSubCode change
  useEffect(() => {
    if (!currentUser?.username) return;
    if (!isInitializedRef.current) {
      return;
    }
    try {
      localStorage.setItem(`jec_sub_code_${currentUser.username}`, selectedSubCode || '');
      const payload = JSON.stringify({ sets, currentSetId, selectedSubCode });
      localStorage.setItem(`jec_workspace_${currentUser.username}_active`, payload);
      if (selectedSubCode) {
        localStorage.setItem(`jec_workspace_${currentUser.username}_${selectedSubCode}`, payload);
      }
    } catch (e) {
      console.error('Error auto-saving workspace:', e);
    }
  }, [sets, currentSetId, selectedSubCode, currentUser?.username]);

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
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchSubjects();
    } else {
      setSubjects([]);
    }
  }, [currentUser]);

  const fetchSubjects = async () => {
    if (!currentUser) return;
    setLoadingWorkspace(true);
    try {
      const res = await fetch(`${API_BASE}/subjects?uploaded_by=${currentUser.username}`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const isInitialSubjectsLoadedRef = useRef(false);

  // Auto-restore questions and subject workspace when subjects list finishes loading
  useEffect(() => {
    if (!currentUser || subjects.length === 0) return;

    if (isInitialSubjectsLoadedRef.current) {
      return;
    }

    const savedSubCode = localStorage.getItem(`jec_sub_code_${currentUser.username}`) || selectedSubCode;
    let targetSub = subjects.find(s => s.code === savedSubCode);
    if (!targetSub && selectedSubCode) {
      targetSub = subjects.find(s => s.code === selectedSubCode);
    }
    if (!targetSub && subjects.length > 0) {
      targetSub = subjects[0];
    }

    if (targetSub) {
      isInitialSubjectsLoadedRef.current = true;
      setSelectedSubCode(targetSub.code);
      try {
        localStorage.setItem(`jec_sub_code_${currentUser.username}`, targetSub.code);
      } catch (e) { }
      loadQuestionsForSubject(targetSub.code, targetSub.semester, true, targetSub);
    }
  }, [subjects, currentUser?.username]);

  const loadQuestionsForSubject = async (code, sem, explicitPreserve = null, customSubjectMeta = null) => {
    if (!code || !sem || !currentUser) return;

    setSearchQuery('');
    setFilterUnit('All');
    setSelectedSubCode(code);
    try {
      localStorage.setItem(`jec_sub_code_${currentUser.username}`, code);
    } catch (e) { }

    const isSameSubject = selectedSubCode === code;
    const preserveSets = explicitPreserve !== null ? explicitPreserve : isSameSubject;

    const getAcademicYear = (date = new Date()) => {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-indexed (5 = June)
      const startYear = month >= 5 ? year : year - 1;
      const endYearStr = String((startYear + 1) % 100).padStart(2, '0');
      return `${startYear}-${endYearStr}`;
    };

    const getSemesterTypeString = (semVal) => {
      const acadYear = getAcademicYear();
      if (!semVal) return `ODD SEMESTER ${acadYear}`;
      const s = String(semVal).trim().toUpperCase();
      if (['II', 'IV', 'VI', 'VIII', '2', '4', '6', '8'].includes(s) || s.includes('EVEN')) {
        return `EVEN SEMESTER ${acadYear}`;
      }
      return `ODD SEMESTER ${acadYear}`;
    };

    const sub = customSubjectMeta || subjects.find(s => s.code === code);
    const subName = sub?.name || sub?.subject_name || (code === 'CCS375' ? 'WEB TECHNOLOGY' : code);
    const subReg = sub?.regulation ? (sub.regulation.includes('REGULATION') ? sub.regulation : `${sub.regulation}-REGULATION`) : '2021-REGULATION';
    const subSem = sub?.semester || sem || 'V';
    const semesterTypeStr = getSemesterTypeString(subSem);
    const subDeg = sub?.degree || 'B.E';
    const subBranch = sub?.branch || 'CSE';
    const degreeSem = `${subDeg}/${subBranch} / ${subSem}`;

    // Check if saved workspace exists for this specific subject
    const savedForSub = loadSavedWorkspaceData(currentUser.username, code);

    const buildFreshSets = (targetReg) => {
      const is2025 = targetReg.includes('2025');
      const freshPartA = Array(is2025 ? 5 : 10).fill(null);
      const freshPartB = Array(5).fill(null).map(() => ({ a: null, b: null }));
      const freshPartC = is2025 ? Array(3).fill(null).map(() => ({ a: null, b: null })) : { a: null, b: null };
      const freshConfig = {
        ...DEFAULT_CONFIG,
        set: 'SET-I',
        subject_code: code,
        subject_name: subName,
        regulation: targetReg,
        semester: semesterTypeStr,
        exam_type: 'CAT-2',
        exam_name: 'CONTINUOUS ASSESSMENT TEST - II',
        time: '90 Minutes',
        max_marks: 50,
        degree_branch_sem: degreeSem
      };
      return {
        'SET-I': {
          config: freshConfig,
          selectedPartA: freshPartA,
          selectedPartB: freshPartB,
          selectedPartC: freshPartC
        }
      };
    };

    if (!preserveSets) {
      // Upon fresh upload or explicit subject reset, ignore old cached workspace and build fresh sets
      setCurrentSetId('SET-I');
      setSets(buildFreshSets(subReg));
    } else {
      if (savedForSub && savedForSub.sets) {
        const firstSetKey = Object.keys(savedForSub.sets)[0];
        const savedReg = savedForSub.sets[firstSetKey]?.config?.regulation || '';
        const regMismatch = (savedReg.includes('2025') !== subReg.includes('2025'));

        if (regMismatch) {
          // If stored regulation in localStorage doesn't match the subject's actual regulation, reset to fresh sets
          setCurrentSetId('SET-I');
          setSets(buildFreshSets(subReg));
        } else {
          const updatedSets = { ...savedForSub.sets };
          Object.keys(updatedSets).forEach(setId => {
            const is2025 = subReg.includes('2025');
            const currentCfg = updatedSets[setId].config || {};
            const wasStale2025Cat = !is2025 && currentCfg.exam_type === 'CAT-1' && (currentCfg.max_marks === 50 || currentCfg.time === '90 Minutes');
            const finalExamType = wasStale2025Cat ? 'MODEL EXAMINATION' : (currentCfg.exam_type || (is2025 ? 'CAT-1' : 'MODEL EXAMINATION'));

            updatedSets[setId] = {
              ...updatedSets[setId],
              selectedPartA: (!is2025 && updatedSets[setId].selectedPartA?.length < 10) ? Array(10).fill(null) : updatedSets[setId].selectedPartA,
              selectedPartC: (!is2025 && Array.isArray(updatedSets[setId].selectedPartC)) ? { a: null, b: null } : updatedSets[setId].selectedPartC,
              config: {
                ...currentCfg,
                subject_code: code,
                subject_name: subName || currentCfg.subject_name || code,
                regulation: subReg,
                semester: currentCfg.semester || semesterTypeStr,
                degree_branch_sem: currentCfg.degree_branch_sem || degreeSem,
                exam_type: finalExamType,
                exam_name: finalExamType === 'MODEL EXAMINATION' ? 'MODEL EXAMINATION' : currentCfg.exam_name,
                time: finalExamType === 'MODEL EXAMINATION' ? '3 Hours' : currentCfg.time,
                max_marks: finalExamType === 'MODEL EXAMINATION' ? 100 : currentCfg.max_marks
              }
            };
          });
          setSets(updatedSets);
          setCurrentSetId(savedForSub.currentSetId || 'SET-I');
        }
      } else {
        setCurrentSetId('SET-I');
        setSets(buildFreshSets(subReg));
      }
    }

    try {
      const qParams = new URLSearchParams();
      if (code) qParams.append('subject_code', code);
      if (sem) qParams.append('semester', sem);
      if (currentUser?.username) qParams.append('uploaded_by', currentUser.username);

      const res = await fetch(`${API_BASE}/questions?${qParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
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
      if (selectedPartB.some(slot => slot && (isSameQ(slot.a, qTarget) || isSameQ(slot.b, qTarget) || isSameQ(slot, qTarget)))) return true;
      if (Array.isArray(selectedPartC)) {
        if (selectedPartC.some(slot => slot && (isSameQ(slot.a, qTarget) || isSameQ(slot.b, qTarget)))) return true;
      } else if (selectedPartC) {
        if (isSameQ(selectedPartC.a, qTarget) || isSameQ(selectedPartC.b, qTarget)) return true;
      }
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
          const isCArray = Array.isArray(set.selectedPartC);
          return {
            selectedPartA: set.selectedPartA.map(item => isSameQ(item, q) ? null : item),
            selectedPartB: set.selectedPartB.map(slot => ({
              a: isSameQ(slot?.a, q) ? null : slot?.a,
              b: isSameQ(slot?.b, q) ? null : slot?.b
            })),
            selectedPartC: isCArray ? set.selectedPartC.map(slot => ({
              a: isSameQ(slot?.a, q) ? null : slot?.a,
              b: isSameQ(slot?.b, q) ? null : slot?.b
            })) : {
              a: isSameQ(set.selectedPartC?.a, q) ? null : set.selectedPartC?.a,
              b: isSameQ(set.selectedPartC?.b, q) ? null : set.selectedPartC?.b
            }
          };
        } else {
          const isFilled = (item) => Boolean(item && (item._id || (typeof item.text === 'string' && item.text.trim() !== '')));

          if (activeTabSub === 'A') {
            const reqCount = isCATExam(config.exam_type, config.regulation) ? 5 : 10;
            const qUnitNorm = normalizeUnit(q.unit);
            let emptyIdx = -1;

            for (let i = 0; i < reqCount; i++) {
              const expectedUnits = getExpectedUnitForPartASlot(config.exam_type, i, config.regulation);
              const allowedNorm = expectedUnits.map(normalizeUnit);
              if (allowedNorm.includes(qUnitNorm)) {
                if (!isFilled(set.selectedPartA[i])) {
                  emptyIdx = i;
                  break;
                }
              }
            }
            if (emptyIdx === -1) {
              const expectedUnitsForExam = getExpectedUnitForPartASlot(config.exam_type, 0, config.regulation);
              alert(`Cannot add Part A question (${q.unit}): Part A requires questions matching unit blueprint rules.`);
              return {};
            }
            const next = [...set.selectedPartA];
            next[emptyIdx] = q;
            return { selectedPartA: next };
          } else if (activeTabSub === 'B') {
            const isCAT = isCATExam(config.exam_type, config.regulation);
            const is2025 = is2025Regulation(config.regulation);
            const partB = [...(set.selectedPartB || [])];
            while (partB.length < 5) {
              partB.push({ a: null, b: null });
            }

            const qUnitNorm = normalizeUnit(q.unit);
            let targetIdx = -1;
            let targetSubKey = 'a';
            const reqPartBSlots = (isCAT && !is2025) ? 2 : 5;

            for (let i = 0; i < reqPartBSlots; i++) {
              const expectedUnits = getExpectedUnitForPartBSlot(config.exam_type, i, config.regulation);
              const allowedNorm = expectedUnits.map(normalizeUnit);
              if (allowedNorm.includes(qUnitNorm)) {
                const slot = partB[i];
                if (!slot || !isFilled(slot.a)) {
                  targetIdx = i;
                  targetSubKey = 'a';
                  break;
                } else if (!is2025 && !isFilled(slot.b)) {
                  targetIdx = i;
                  targetSubKey = 'b';
                  break;
                }
              }
            }

            if (targetIdx === -1) {
              alert(`Cannot add Part B question (${q.unit}): Part B requires questions matching unit blueprint rules.`);
              return {};
            }

            const next = [...partB];
            const slot = next[targetIdx] || { a: null, b: null };
            next[targetIdx] = { ...slot, [targetSubKey]: q };
            return { selectedPartB: next };
          } else if (activeTabSub === 'C') {
            const is2025 = is2025Regulation(config.regulation);
            let partC = Array.isArray(set.selectedPartC) 
              ? [...set.selectedPartC] 
              : [{ a: set.selectedPartC?.a || null, b: set.selectedPartC?.b || null }];
            
            if (is2025) {
              while (partC.length < 3) {
                partC.push({ a: null, b: null });
              }
            } else {
              partC = partC.slice(0, 1);
            }

            let added = false;
            const next = [...partC];
            const qUnitNorm = normalizeUnit(q.unit);

            for (let i = 0; i < next.length; i++) {
              const expectedA = getExpectedUnitForPartCSlot(config.exam_type, i, 'a', config.regulation).map(normalizeUnit);
              const expectedB = getExpectedUnitForPartCSlot(config.exam_type, i, 'b', config.regulation).map(normalizeUnit);

              if (!isFilled(next[i]?.a) && expectedA.includes(qUnitNorm)) {
                next[i] = { ...next[i], a: q };
                added = true;
                break;
              } else if (!isFilled(next[i]?.b) && expectedB.includes(qUnitNorm)) {
                next[i] = { ...next[i], b: q };
                added = true;
                break;
              }
            }
            if (!added) {
              alert(`Cannot add Part C question (${q.unit}): Part C requires questions matching unit blueprint rules.`);
              return {};
            }
            return { selectedPartC: is2025 ? next : (next[0] || { a: null, b: null }) };
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
            next[idx] = { ...next[idx], [key || 'a']: null };
          }
          return { selectedPartB: next };
        } else if (part === 'C') {
          if (Array.isArray(set.selectedPartC)) {
            const next = [...set.selectedPartC];
            if (next[idx]) {
              next[idx] = { ...next[idx], [key]: null };
            }
            return { selectedPartC: next };
          } else {
            return { selectedPartC: { ...set.selectedPartC, [key]: null } };
          }
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
        if (!q) return;
        if (q.part !== part) {
          alert(`You can only drop Part ${part} questions here.`);
          return;
        }

        if (part === 'A') {
          const expectedUnits = getExpectedUnitForPartASlot(config.exam_type, index, config.regulation);
          const allowedNorm = expectedUnits.map(normalizeUnit);
          if (!allowedNorm.includes(normalizeUnit(q.unit))) {
            alert(`Only Part A questions from ${expectedUnits.join(' or ')} can be placed in Question ${index + 1}.`);
            return;
          }

          updateCurrentSet(set => {
            const next = [...set.selectedPartA];
            if (payload.type === 'preview_a' && payload.index !== undefined) {
              const temp = next[index];
              if (temp) {
                const sourceExpectedUnits = getExpectedUnitForPartASlot(config.exam_type, payload.index, config.regulation);
                const sourceAllowedNorm = sourceExpectedUnits.map(normalizeUnit);
                if (!sourceAllowedNorm.includes(normalizeUnit(temp.unit))) {
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
          const expectedUnits = getExpectedUnitForPartBSlot(config.exam_type, index, config.regulation);
          const allowedNorm = expectedUnits.map(normalizeUnit);
          if (!allowedNorm.includes(normalizeUnit(q.unit))) {
            const qNo = getPartBQuestionNo(config.exam_type, index, config.regulation);
            alert(`Only Part B questions from ${expectedUnits.join(' or ')} can be placed in Question ${qNo}.`);
            return;
          }

          updateCurrentSet(set => {
            let next = [...(set.selectedPartB || [])];
            while (next.length < 5) {
              next.push({ a: null, b: null });
            }
            if (payload.type === 'preview_b') {
              const sourceSlotIdx = payload.slotIdx;
              const sourceSubKey = payload.subKey;
              const temp = next[index] ? next[index][subKey] : null;
              if (temp) {
                const sourceExpectedUnits = getExpectedUnitForPartBSlot(config.exam_type, sourceSlotIdx, config.regulation);
                const sourceAllowedNorm = sourceExpectedUnits.map(normalizeUnit);
                if (!sourceAllowedNorm.includes(normalizeUnit(temp.unit))) {
                  const sourceQNo = getPartBQuestionNo(config.exam_type, sourceSlotIdx, config.regulation);
                  const targetQNo = getPartBQuestionNo(config.exam_type, index, config.regulation);
                  alert(`Swap failed: Question ${targetQNo} (${temp.unit}) cannot be placed in Question ${sourceQNo} (${sourceExpectedUnits.join(' or ')} expected).`);
                  return {};
                }
              }
              next[index] = { ...next[index], [subKey]: q };
              if (next[sourceSlotIdx]) {
                next[sourceSlotIdx] = { ...next[sourceSlotIdx], [sourceSubKey]: temp };
              }
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
          const expectedUnits = getExpectedUnitForPartCSlot(config.exam_type, index, subKey, config.regulation);
          const allowedNorm = expectedUnits.map(normalizeUnit);
          if (!allowedNorm.includes(normalizeUnit(q.unit))) {
            const is2025 = is2025Regulation(config.regulation);
            const isCAT = isCATExam(config.exam_type, config.regulation);
            const qNo = is2025 ? (11 + index) : (isCAT ? 8 : getPartCQuestionNo(config.exam_type, index, config.regulation));
            alert(`Only questions from ${expectedUnits.join(' or ')} can be placed in Part C Question ${qNo}(${subKey}).`);
            return;
          }

          updateCurrentSet(set => {
            const isCAT = isCATExam(config.exam_type, config.regulation);
            const is2025 = is2025Regulation(config.regulation);
            let next = Array.isArray(set.selectedPartC) 
              ? [...set.selectedPartC] 
              : [{ a: set.selectedPartC?.a || null, b: set.selectedPartC?.b || null }];

            if (isCAT || is2025) {
              while (next.length < (is2025 ? 3 : 1)) {
                next.push({ a: null, b: null });
              }
            }
            const isCArray = Array.isArray(next);

            if (payload.type === 'preview_c') {
              const sourcePairIdx = payload.pairIdx !== undefined ? payload.pairIdx : 0;
              const sourceSubKey = payload.subKey;
              const sourceExpectedUnits = getExpectedUnitForPartCSlot(config.exam_type, sourcePairIdx, sourceSubKey, config.regulation);
              const sourceAllowedNorm = sourceExpectedUnits.map(normalizeUnit);

              if (isCArray) {
                const temp = next[index] ? next[index][subKey] : null;
                if (temp && !sourceAllowedNorm.includes(normalizeUnit(temp.unit))) {
                  const sourceQNo = is2025 ? (11 + sourcePairIdx) : (isCAT ? 8 : getPartCQuestionNo(config.exam_type, sourcePairIdx, config.regulation));
                  const targetQNo = is2025 ? (11 + index) : (isCAT ? 8 : getPartCQuestionNo(config.exam_type, index, config.regulation));
                  alert(`Swap failed: Question ${targetQNo}(${subKey}) (${temp.unit}) cannot be placed in Question ${sourceQNo}(${sourceSubKey}) (${sourceExpectedUnits.join(' or ')} expected).`);
                  return {};
                }
                next[index] = { ...next[index], [subKey]: q };
                if (next[sourcePairIdx]) {
                  next[sourcePairIdx] = { ...next[sourcePairIdx], [sourceSubKey]: temp };
                }
              } else {
                const temp = next[subKey];
                if (temp && !sourceAllowedNorm.includes(normalizeUnit(temp.unit))) {
                  alert(`Swap failed: Question (${temp.unit}) cannot be placed in Question (${sourceExpectedUnits.join(' or ')} expected).`);
                  return {};
                }
                next[subKey] = q;
                next[sourceSubKey] = temp;
              }
            } else {
              if (isCArray) {
                next = next.map((pair, pIdx) => {
                  if (pIdx === index) {
                    return { ...pair, [subKey]: q };
                  }
                  const newPair = { ...pair };
                  if (newPair.a && newPair.a._id === q._id) newPair.a = null;
                  if (newPair.b && newPair.b._id === q._id) newPair.b = null;
                  return newPair;
                });
              } else {
                next[subKey] = q;
                const otherKey = subKey === 'a' ? 'b' : 'a';
                if (next[otherKey] && next[otherKey]._id === q._id) {
                  next[otherKey] = null;
                }
              }
            }
            return { selectedPartC: is2025 ? next : (next[0] || { a: null, b: null }) };
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

    const handleClearAllQuestions = () => {
      if (!window.confirm(`Are you sure you want to clear all selected questions from ${currentSetId}?`)) {
        return;
      }
      updateCurrentSet(() => ({
        selectedPartA: Array(10).fill(null),
        selectedPartB: Array(5).fill(null).map(() => ({ a: null, b: null })),
        selectedPartC: { a: null, b: null }
      }));
    };

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
      loadingWorkspace,
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
      handleClearAllQuestions,
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
