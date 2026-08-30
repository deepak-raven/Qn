import { useState } from 'react';

export const DEFAULT_CONFIG = {
  institution_name: 'Jaya Engineering College',
  exam_type: 'CAT-2', // 'MODEL EXAMINATION' | 'CAT-1' | 'CAT-2'
  exam_name: 'CONTINUOUS ASSESSMENT TEST - II',
  regulation: '',
  semester: '',
  subject_code: '',
  subject_name: '',
  degree_branch_sem: '',
  time: '90 Minutes',
  max_marks: 50,
  set: 'SET-I',
  date: ''
};

export function cleanDegreeBranch(degInput) {
  if (!degInput) return 'B.E/CSE';
  let cleaned = String(degInput).trim().replace(/\s*\/\s*(?:[I|V|X]+|\d+)\s*$/i, '');
  cleaned = cleaned.replace(/BE\/BTECH/gi, 'B.E').replace(/BE \/ BTECH/gi, 'B.E');
  cleaned = cleaned.replace(/\s*\/\s*/g, '/');
  return cleaned || 'B.E/CSE';
}

const ROMAN_YEAR_SEM = {
  1: ['I', 'I'], 2: ['I', 'II'], 3: ['II', 'III'], 4: ['II', 'IV'],
  5: ['III', 'V'], 6: ['III', 'VI'], 7: ['IV', 'VII'], 8: ['IV', 'VIII']
};
const ROMAN_MAP = { 8: 'VIII', 7: 'VII', 6: 'VI', 5: 'V', 4: 'IV', 3: 'III', 2: 'II', 1: 'I' };

export function formatYearSem(semInput, altInput) {
  const text = `${semInput || ''} ${altInput || ''}`.trim().toUpperCase();
  if (!text) return 'II / III';

  const match = text.match(/\b([I|V|X]+)\s*\/\s*([I|V|X]+)\b/i);
  if (match) {
    return `${match[1]} / ${match[2]}`;
  }

  for (let num = 8; num >= 1; num--) {
    const rom = ROMAN_MAP[num];
    const regex = new RegExp(`\\b(${rom}|SEM\\s*${num}|${num})\\b`, 'i');
    if (regex.test(text)) {
      const [yearRom, semRom] = ROMAN_YEAR_SEM[num];
      return `${yearRom} / ${semRom}`;
    }
  }

  return 'II / III';
}

// --- SEPARATE REGULATION RULES (2021 REGULATION vs 2025 REGULATION) ---

export const REGULATION_2021_RULES = {
  regulation: '2021-REGULATION',
  code: '2021',
  name: 'Regulation 2021',
  defaultExamType: 'CAT-2',
  defaultExamName: 'CONTINUOUS ASSESSMENT TEST - II',
  defaultTime: '90 Minutes',
  defaultMaxMarks: 50,
  partA: {
    count: 10,
    marksPerQuestion: 2,
    totalMarks: 20
  },
  partB: {
    count: 5,
    isEitherOr: true,
    marksPerQuestion: 13,
    totalMarks: 65
  },
  partC: {
    count: 1,
    isEitherOr: true,
    marksPerQuestion: 15,
    totalMarks: 15
  }
};

export const REGULATION_2025_RULES = {
  regulation: '2025-REGULATION',
  code: '2025',
  name: 'Regulation 2025',
  defaultExamType: 'CAT-2',
  defaultExamName: 'CONTINUOUS ASSESSMENT TEST - II',
  defaultTime: '90 Minutes',
  defaultMaxMarks: 50,
  partA: {
    count: 5,
    marksPerQuestion: 1,
    totalMarks: 5
  },
  partB: {
    count: 5,
    isEitherOr: false, // Single short questions Q6 to Q10
    marksPerQuestion: 3,
    totalMarks: 15
  },
  partC: {
    count: 3,
    isEitherOr: true, // 3 Either-Or pairs Q11a/b, Q12a/b, Q13a/b
    marksPerQuestion: 10,
    totalMarks: 30
  }
};

export function is2025Regulation(regulation) {
  return Boolean(regulation && String(regulation).includes('2025'));
}

export function is2021Regulation(regulation) {
  return !is2025Regulation(regulation);
}

export function getRegulationRules(regulation) {
  return is2025Regulation(regulation) ? REGULATION_2025_RULES : REGULATION_2021_RULES;
}

export function isCATExam(examType, regulation) {
  if (is2025Regulation(regulation)) return true;
  return examType === 'CAT-1' || examType === 'CAT-2' || examType === 'CAT-3' || examType === 'IAT-1' || examType === 'IAT-2' || examType === 'IAT-3';
}

function getSlotCounts(examType, regulation) {
  if (isCATExam(examType, regulation)) {
    return { partA: 5, partB: 5, partC: 3, defaultMarks: 50, defaultTime: '90 Minutes' };
  }
  return { partA: 10, partB: 5, partC: 1, defaultMarks: 100, defaultTime: '3 Hours' };
}

export function getSuggestedUnitForPartASlot(examType, index, regulation) {
  if (examType === 'CAT-3' || examType === 'IAT-3') {
    if (index === 0 || index === 1) return ['Unit IV'];
    if (index >= 2 && index <= 4) return ['Unit V'];
    return ['Unit IV', 'Unit V'];
  }
  if (examType === 'CAT-2' || examType === 'IAT-2') {
    if (index === 0 || index === 1) return ['Unit II'];
    if (index >= 2 && index <= 4) return ['Unit III'];
    return ['Unit II', 'Unit III'];
  }
  if (isCATExam(examType, regulation)) {
    if (index === 0 || index === 1 || index === 2) return ['Unit I'];
    if (index === 3 || index === 4) return ['Unit II'];
    return ['Unit I', 'Unit II'];
  }
  const units = ['Unit I', 'Unit I', 'Unit II', 'Unit II', 'Unit III', 'Unit III', 'Unit IV', 'Unit IV', 'Unit V', 'Unit V'];
  return [units[index] || `Unit ${Math.floor(index / 2) + 1}`];
}

export function getSuggestedUnitForPartBSlot(examType, index, regulation) {
  const is2025 = is2025Regulation(regulation);

  if (examType === 'CAT-3' || examType === 'IAT-3') {
    if (is2025) {
      if (index === 0 || index === 1) return ['Unit IV'];
      if (index >= 2 && index <= 4) return ['Unit V'];
      return ['Unit IV', 'Unit V'];
    }
    // 2021 Regulation CAT-3 (2 Either-Or pairs Q6 and Q7)
    if (index === 0) return ['Unit IV'];
    if (index === 1) return ['Unit V'];
    return ['Unit IV', 'Unit V'];
  }
  if (examType === 'CAT-2' || examType === 'IAT-2') {
    if (is2025) {
      if (index === 0 || index === 1) return ['Unit II'];
      if (index >= 2 && index <= 4) return ['Unit III'];
      return ['Unit II', 'Unit III'];
    }
    // 2021 Regulation CAT-2 (2 Either-Or pairs Q6 and Q7)
    if (index === 0) return ['Unit II'];
    if (index === 1) return ['Unit III'];
    return ['Unit II', 'Unit III'];
  }
  if (isCATExam(examType, regulation)) {
    if (is2025) {
      if (index === 0 || index === 1 || index === 2) return ['Unit I'];
      if (index === 3 || index === 4) return ['Unit II'];
      return ['Unit I', 'Unit II'];
    }
    // 2021 Regulation CAT-1 (2 Either-Or pairs Q6 and Q7)
    if (index === 0) return ['Unit I'];
    if (index === 1) return ['Unit II'];
    return ['Unit I', 'Unit II'];
  }
  const units = ['Unit I', 'Unit II', 'Unit III', 'Unit IV', 'Unit V'];
  return [units[index] || `Unit ${index + 1}`];
}

export function getExpectedUnitForPartASlot(examType, index, regulation) {
  return getSuggestedUnitForPartASlot(examType, index, regulation);
}

export function getExpectedUnitForPartBSlot(examType, index, regulation) {
  return getSuggestedUnitForPartBSlot(examType, index, regulation);
}

export function getSuggestedUnitForPartCSlot(examType, index = 0, subKey = null, regulation) {
  const is2021CAT = isCATExam(examType, regulation) && !is2025Regulation(regulation);
  const is2025 = is2025Regulation(regulation);

  if (examType === 'CAT-3' || examType === 'IAT-3') {
    if (is2021CAT) {
      if (subKey === 'a') return ['Unit IV'];
      if (subKey === 'b') return ['Unit V'];
      return ['Unit IV', 'Unit V'];
    }
    if (is2025) {
      if (index === 0) return ['Unit IV'];
      if (index === 1 || index === 2) return ['Unit V'];
      return ['Unit IV', 'Unit V'];
    }
    if (subKey === 'a') return ['Unit IV'];
    if (subKey === 'b') return ['Unit V'];
    return ['Unit IV', 'Unit V'];
  }
  if (examType === 'CAT-2' || examType === 'IAT-2') {
    if (is2021CAT) {
      if (subKey === 'a') return ['Unit II'];
      if (subKey === 'b') return ['Unit III'];
      return ['Unit II', 'Unit III'];
    }
    if (is2025) {
      if (index === 0) return ['Unit II'];
      if (index === 1 || index === 2) return ['Unit III'];
      return ['Unit II', 'Unit III'];
    }
    if (subKey === 'a') return ['Unit II'];
    if (subKey === 'b') return ['Unit III'];
    return ['Unit II', 'Unit III'];
  }
  if (isCATExam(examType, regulation)) {
    if (is2021CAT) {
      if (subKey === 'a') return ['Unit I'];
      if (subKey === 'b') return ['Unit II'];
      return ['Unit I', 'Unit II'];
    }
    if (is2025) {
      if (index === 0 || index === 1) return ['Unit I'];
      if (index === 2) return ['Unit II'];
      return ['Unit I', 'Unit II'];
    }
    if (subKey === 'a') return ['Unit I'];
    if (subKey === 'b') return ['Unit II'];
    return ['Unit I', 'Unit II'];
  }
  return ['Unit V', 'Unit IV'];
}

export function getExpectedUnitForPartCSlot(examType, index = 0, subKey = null, regulation) {
  return getSuggestedUnitForPartCSlot(examType, index, subKey, regulation);
}

export function getPartBQuestionNo(examType, index, regulation) {
  return (isCATExam(examType, regulation) ? 6 : 11) + index;
}

export function getPartCQuestionNo(examType, index = 0, regulation) {
  if (isCATExam(examType, regulation)) {
    return (is2025Regulation(regulation) ? 11 : 8) + index;
  }
  return 16 + index;
}

function createDefaultSetData(config) {
  const rules = getRegulationRules(config.regulation);
  const isCAT = isCATExam(config.exam_type, config.regulation);
  const catExamName = config.exam_type === 'CAT-3' || config.exam_type === 'IAT-3'
    ? 'CONTINUOUS ASSESSMENT TEST - III'
    : (config.exam_type === 'CAT-2' || config.exam_type === 'IAT-2' ? 'CONTINUOUS ASSESSMENT TEST - II' : 'CONTINUOUS ASSESSMENT TEST - I');

  return {
    config: {
      ...config,
      regulation: config.regulation || rules.regulation,
      exam_type: config.exam_type || rules.defaultExamType,
      exam_name: config.exam_name || (isCAT ? catExamName : rules.defaultExamName),
      max_marks: config.max_marks || (isCAT ? 50 : rules.defaultMaxMarks),
      time: config.time || (isCAT ? '90 Minutes' : rules.defaultTime)
    },
    selectedPartA: Array(isCAT ? 5 : 10).fill(null),
    selectedPartB: Array(5).fill(null).map(() => ({ a: null, b: null })),
    selectedPartC: isCAT ? Array(3).fill(null).map(() => ({ a: null, b: null })) : { a: null, b: null }
  };
}

export function useSetsManager(initialSets = null, initialSetId = 'SET-I') {
  const [sets, setSets] = useState(() => {
    if (initialSets && typeof initialSets === 'object' && Object.keys(initialSets).length > 0) {
      return initialSets;
    }
    return {
      'SET-I': createDefaultSetData({ ...DEFAULT_CONFIG, set: 'SET-I' })
    };
  });
  const [currentSetId, setCurrentSetId] = useState(() => {
    if (initialSetId && sets && sets[initialSetId]) {
      return initialSetId;
    }
    return Object.keys(sets)[0] || 'SET-I';
  });

  const currentSet = sets[currentSetId] || createDefaultSetData(DEFAULT_CONFIG);
  const { config, selectedPartA, selectedPartB, selectedPartC } = currentSet;

  const updateCurrentSet = (updater) => {
    setSets(prev => {
      const currentSet = prev[currentSetId];
      if (!currentSet) return prev;
      const updated = updater(currentSet);
      return {
        ...prev,
        [currentSetId]: {
          ...currentSet,
          ...updated
        }
      };
    });
  };

  const setConfig = (newConfig) => {
    updateCurrentSet(set => {
      const nextConfig = typeof newConfig === 'function' ? newConfig(set.config) : newConfig;
      
      // If exam_type changed, resize slots appropriately if needed
      if (nextConfig.exam_type && nextConfig.exam_type !== set.config.exam_type) {
        const counts = getSlotCounts(nextConfig.exam_type, nextConfig.regulation);
        const newPartA = [...set.selectedPartA].slice(0, counts.partA);
        while (newPartA.length < counts.partA) newPartA.push(null);
        
        const newPartB = [...set.selectedPartB].slice(0, counts.partB);
        while (newPartB.length < counts.partB) newPartB.push({ a: null, b: null });
        
        nextConfig.max_marks = counts.defaultMarks;
        nextConfig.time = counts.defaultTime;
        nextConfig.exam_name = nextConfig.exam_type === 'MODEL EXAMINATION' 
          ? 'MODEL EXAMINATION' 
          : (nextConfig.exam_type === 'CAT-3' || nextConfig.exam_type === 'IAT-3')
          ? 'CONTINUOUS ASSESSMENT TEST - III'
          : (nextConfig.exam_type === 'CAT-1' || nextConfig.exam_type === 'IAT-1')
          ? 'CONTINUOUS ASSESSMENT TEST - I' 
          : 'CONTINUOUS ASSESSMENT TEST - II';

        return {
          config: nextConfig,
          selectedPartA: newPartA,
          selectedPartB: newPartB
        };
      }

      return { config: nextConfig };
    });
  };

  const setSelectedPartA = (updater) => {
    updateCurrentSet(set => {
      const next = typeof updater === 'function' ? updater(set.selectedPartA) : updater;
      return { selectedPartA: next };
    });
  };

  const setSelectedPartB = (updater) => {
    updateCurrentSet(set => {
      const next = typeof updater === 'function' ? updater(set.selectedPartB) : updater;
      return { selectedPartB: next };
    });
  };

  const setSelectedPartC = (updater) => {
    updateCurrentSet(set => {
      const next = typeof updater === 'function' ? updater(set.selectedPartC) : updater;
      return { selectedPartC: next };
    });
  };

  const handleSwitchSet = (nextSetId) => {
    const targetSet = sets[nextSetId];
    if (targetSet) {
      setCurrentSetId(nextSetId);
    }
  };

  const handleCreateNewSet = () => {
    const existingSetIds = Object.keys(sets);
    if (existingSetIds.length >= 3) {
      alert("Maximum of 3 sets (SET-I, SET-II, SET-III) allowed.");
      return;
    }

    const romanNumerals = ['SET-I', 'SET-II', 'SET-III'];
    let nextSetId = null;
    for (const num of romanNumerals) {
      if (!existingSetIds.includes(num)) {
        nextSetId = num;
        break;
      }
    }
    if (!nextSetId) {
      alert("Maximum of 3 sets allowed.");
      return;
    }

    const newSetData = createDefaultSetData({ ...config, set: nextSetId });
    setSets(prev => ({ ...prev, [nextSetId]: newSetData }));
    setCurrentSetId(nextSetId);
  };

  const handleRenameActiveSet = (newName) => {
    if (!newName || newName.trim() === '' || currentSetId === newName) return;
    setSets(prev => {
      const next = { ...prev };
      next[newName] = {
        ...next[currentSetId],
        config: { ...next[currentSetId].config, set: newName }
      };
      delete next[currentSetId];
      return next;
    });
    setCurrentSetId(newName);
  };

  const handleDeleteSet = (setIdToDelete) => {
    const setKeys = Object.keys(sets);
    if (setKeys.length <= 1) return;

    if (currentSetId === setIdToDelete) {
      const remainingKeys = setKeys.filter(id => id !== setIdToDelete);
      setCurrentSetId(remainingKeys[0]);
    }

    setSets(prev => {
      const next = { ...prev };
      delete next[setIdToDelete];
      return next;
    });
  };

  return {
    sets,
    setSets,
    currentSetId,
    setCurrentSetId,
    config,
    setConfig,
    selectedPartA,
    setSelectedPartA,
    selectedPartB,
    setSelectedPartB,
    selectedPartC,
    setSelectedPartC,
    updateCurrentSet,
    handleSwitchSet,
    handleCreateNewSet,
    handleRenameActiveSet,
    handleDeleteSet
  };
}
