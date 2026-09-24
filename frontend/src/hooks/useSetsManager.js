import { useState } from 'react';

export const DEFAULT_CONFIG = {
  institution_name: 'NAME OF THE INSTITUTION:',
  exam_type: 'CAT-3', // 'MODEL EXAMINATION' | 'CAT-1' | 'CAT-2' | 'CAT-3'
  exam_name: 'CONTINUOUS ASSESSMENT TEST - III',
  regulation: '',
  semester: '',
  subject_code: '',
  subject_name: '',
  degree_branch_sem: '',
  time: '90 Minutes',
  max_marks: 50,
  set: 'SET-I',
  date: '',
  session: '',
  total_units: 5,
  prepared_by_name: '',
  prepared_by_sign: '',
  verified_by_name: '',
  verified_by_sign: '',
  reviewed_by_name: '',
  reviewed_by_sign: ''
};

export function normalizeUnit(unitStr) {
  if (!unitStr) return 'Unit I';
  const u = String(unitStr).trim().toUpperCase();
  if (u.includes('VI') || u === 'UNIT 6' || u === '6') return 'Unit VI';
  if (u.includes('III') || u === 'UNIT 3' || u === '3') return 'Unit III';
  if (u.includes('II') || u === 'UNIT 2' || u === '2') return 'Unit II';
  if (u.includes('IV') || u === 'UNIT 4' || u === '4') return 'Unit IV';
  if (u.includes('V') || u === 'UNIT 5' || u === '5') return 'Unit V';
  if (u.includes('I') || u === 'UNIT 1' || u === '1') return 'Unit I';
  return 'Unit I';
}

export function normalizeKL(klStr) {
  if (!klStr) return null;
  const k = String(klStr).trim().toUpperCase();
  if (k.includes('K1') || k.includes('REMEMBER')) return 'K1';
  if (k.includes('K2') || k.includes('UNDERSTAND')) return 'K2';
  if (k.includes('K3') || k.includes('APPLY') || k.includes('APPLI')) return 'K3';
  if (k.includes('K4') || k.includes('ANALY')) return 'K4';
  if (k.includes('K5') || k.includes('EVALUAT')) return 'K5';
  if (k.includes('K6') || k.includes('CREAT')) return 'K6';
  
  const digits = k.match(/\d/);
  if (digits && parseInt(digits[0]) >= 1 && parseInt(digits[0]) <= 6) {
    return `K${digits[0]}`;
  }
  return null;
}

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

export function formatYearSem(semInput, altInput, subjectCode = '') {
  const text = `${semInput || ''} ${altInput || ''}`.trim().toUpperCase();

  const match = text.match(/\b([I|V|X]+)\s*\/\s*([I|V|X]+)\b/i);
  if (match) {
    return `${match[1]} / ${match[2]}`;
  }

  // Check explicit semester suffix in semInput e.g. "B.E/CSE / V" or "B.E/CSE/5"
  const mSem = String(semInput || '').match(/\/([I|V|X]+|\d+)\s*$/i);
  if (mSem) {
    const sVal = mSem[1].toUpperCase();
    for (let num = 8; num >= 1; num--) {
      if (ROMAN_MAP[num] === sVal || String(num) === sVal) {
        const [yearRom, semRom] = ROMAN_YEAR_SEM[num];
        return `${yearRom} / ${semRom}`;
      }
    }
  }

  for (let num = 8; num >= 1; num--) {
    const rom = ROMAN_MAP[num];
    const regex = new RegExp(`\\b(${rom}|SEM\\s*${num}|SEM\\s*${rom})\\b`, 'i');
    if (regex.test(text)) {
      const [yearRom, semRom] = ROMAN_YEAR_SEM[num];
      return `${yearRom} / ${semRom}`;
    }
  }

  // Infer semester from Anna University subject code (e.g. CS3551 -> sem 5 -> III / V)
  if (subjectCode) {
    const digits = String(subjectCode).replace(/\D/g, '');
    if (digits.length >= 3) {
      const semDigit = parseInt(digits.length === 4 ? digits[1] : digits[1], 10);
      if (semDigit >= 1 && semDigit <= 8) {
        const [yearRom, semRom] = ROMAN_YEAR_SEM[semDigit];
        return `${yearRom} / ${semRom}`;
      }
    }
  }

  if (text.includes('EVEN')) {
    return 'II / IV';
  }
  return 'III / V';
}

// --- SEPARATE REGULATION RULES (2021 REGULATION vs 2025 REGULATION) ---

export const REGULATION_2021_RULES = {
  regulation: '2021-REGULATION',
  code: '2021',
  name: 'Regulation 2021',
  defaultExamType: 'CAT-3',
  defaultExamName: 'CONTINUOUS ASSESSMENT TEST - III',
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
  defaultExamType: 'CAT-3',
  defaultExamName: 'CONTINUOUS ASSESSMENT TEST - III',
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

export function getSuggestedUnitForPartASlot(examType, index, regulation, totalUnits = 5) {
  const is2025 = is2025Regulation(regulation);
  const unitsCount = Number(totalUnits) || 5;

  if (examType === 'CAT-3' || examType === 'IAT-3') {
    if (is2025) {
      if (unitsCount === 4) {
        return ['Unit IV'];
      }
      if (unitsCount === 6) {
        if (index === 0 || index === 1) return ['Unit V'];
        if (index === 2) return ['Unit V', 'Unit VI'];
        if (index >= 3 && index <= 4) return ['Unit VI'];
        return ['Unit V', 'Unit VI'];
      }
      if (index === 0 || index === 1) return ['Unit IV'];
      if (index === 2) return ['Unit IV', 'Unit V'];
      if (index >= 3 && index <= 4) return ['Unit V'];
      return ['Unit IV', 'Unit V'];
    }
    if (index === 0 || index === 1) return ['Unit IV'];
    if (index === 2) return ['Unit IV', 'Unit V'];
    if (index >= 3 && index <= 4) return ['Unit V'];
    return ['Unit IV', 'Unit V'];
  }
  if (examType === 'CAT-2' || examType === 'IAT-2') {
    if (is2025 && unitsCount === 6) {
      if (index === 0 || index === 1) return ['Unit III'];
      if (index === 2) return ['Unit III', 'Unit IV'];
      if (index >= 3 && index <= 4) return ['Unit IV'];
      return ['Unit III', 'Unit IV'];
    }
    if (index === 0 || index === 1) return ['Unit II'];
    if (index >= 2 && index <= 4) return ['Unit III'];
    return ['Unit II', 'Unit III'];
  }
  if (isCATExam(examType, regulation)) {
    if (index === 0 || index === 1 || index === 2) return ['Unit I'];
    if (index === 3 || index === 4) return ['Unit II'];
    return ['Unit I', 'Unit II'];
  }
  const units = ['Unit I', 'Unit I', 'Unit II', 'Unit II', 'Unit III', 'Unit III', 'Unit IV', 'Unit IV', 'Unit V', 'Unit V', 'Unit VI', 'Unit VI'];
  return [units[index] || `Unit ${Math.floor(index / 2) + 1}`];
}

export function getSuggestedUnitForPartBSlot(examType, index, regulation, totalUnits = 5) {
  const is2025 = is2025Regulation(regulation);
  const unitsCount = Number(totalUnits) || 5;

  if (examType === 'CAT-3' || examType === 'IAT-3') {
    if (is2025) {
      if (unitsCount === 4) {
        return ['Unit IV'];
      }
      if (unitsCount === 6) {
        if (index === 0 || index === 1) return ['Unit V'];
        if (index === 2) return ['Unit V', 'Unit VI'];
        if (index >= 3 && index <= 4) return ['Unit VI'];
        return ['Unit V', 'Unit VI'];
      }
      if (index === 0 || index === 1) return ['Unit IV'];
      if (index === 2) return ['Unit IV', 'Unit V'];
      if (index >= 3 && index <= 4) return ['Unit V'];
      return ['Unit IV', 'Unit V'];
    }
    // 2021 Regulation CAT-3 (2 Either-Or pairs Q6 and Q7)
    if (index === 0) return ['Unit IV'];
    if (index === 1) return ['Unit V'];
    return ['Unit IV', 'Unit V'];
  }
  if (examType === 'CAT-2' || examType === 'IAT-2') {
    if (is2025 && unitsCount === 6) {
      if (index === 0 || index === 1) return ['Unit III'];
      if (index === 2) return ['Unit III', 'Unit IV'];
      if (index >= 3 && index <= 4) return ['Unit IV'];
      return ['Unit III', 'Unit IV'];
    }
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
  const units = ['Unit I', 'Unit II', 'Unit III', 'Unit IV', 'Unit V', 'Unit VI'];
  return [units[index] || `Unit ${index + 1}`];
}

export function getExpectedUnitForPartASlot(examType, index, regulation, totalUnits = 5) {
  return getSuggestedUnitForPartASlot(examType, index, regulation, totalUnits);
}

export function getExpectedUnitForPartBSlot(examType, index, regulation, totalUnits = 5) {
  return getSuggestedUnitForPartBSlot(examType, index, regulation, totalUnits);
}

export function getSuggestedUnitForPartCSlot(examType, index = 0, subKey = null, regulation, totalUnits = 5) {
  const is2021CAT = isCATExam(examType, regulation) && !is2025Regulation(regulation);
  const is2025 = is2025Regulation(regulation);
  const unitsCount = Number(totalUnits) || 5;

  if (examType === 'CAT-3' || examType === 'IAT-3') {
    if (is2021CAT) {
      if (subKey === 'a') return ['Unit IV'];
      if (subKey === 'b') return ['Unit V'];
      return ['Unit IV', 'Unit V'];
    }
    if (is2025) {
      if (unitsCount === 4) {
        return ['Unit IV'];
      }
      if (unitsCount === 6) {
        if (index === 0) return ['Unit V'];
        if (index === 1) {
          if (subKey === 'a') return ['Unit V'];
          if (subKey === 'b') return ['Unit VI'];
          return ['Unit V', 'Unit VI'];
        }
        if (index === 2) return ['Unit VI'];
        return ['Unit V', 'Unit VI'];
      }
      // 5 units
      if (index === 0) return ['Unit IV'];
      if (index === 1) {
        if (subKey === 'a') return ['Unit IV'];
        if (subKey === 'b') return ['Unit V'];
        return ['Unit IV', 'Unit V'];
      }
      if (index === 2) return ['Unit V'];
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
      if (unitsCount === 6) {
        if (index === 0) return ['Unit III'];
        if (index === 1) {
          if (subKey === 'a') return ['Unit III'];
          if (subKey === 'b') return ['Unit IV'];
          return ['Unit III', 'Unit IV'];
        }
        if (index === 2) return ['Unit IV'];
        return ['Unit III', 'Unit IV'];
      }
      // 4 or 5 units: Unit II & Unit III
      if (index === 0) return ['Unit II'];
      if (index === 1) {
        if (subKey === 'a') return ['Unit II'];
        if (subKey === 'b') return ['Unit III'];
        return ['Unit II', 'Unit III'];
      }
      if (index === 2) return ['Unit III'];
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
      if (index === 0) return ['Unit I'];
      if (index === 1) {
        if (subKey === 'a') return ['Unit I'];
        if (subKey === 'b') return ['Unit II'];
        return ['Unit I', 'Unit II'];
      }
      if (index === 2) return ['Unit II'];
      return ['Unit I', 'Unit II'];
    }
    if (subKey === 'a') return ['Unit I'];
    if (subKey === 'b') return ['Unit II'];
    return ['Unit I', 'Unit II'];
  }
  if (subKey === 'a') return ['Unit IV', 'Unit I', 'Unit II', 'Unit III'];
  if (subKey === 'b') return ['Unit V', 'Unit III', 'Unit II', 'Unit I'];
  return ['Unit IV', 'Unit V'];
}

export function getExpectedUnitForPartCSlot(examType, index = 0, subKey = null, regulation, totalUnits = 5) {
  return getSuggestedUnitForPartCSlot(examType, index, subKey, regulation, totalUnits);
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

export function sanitizeLoadedConfig(config) {
  if (!config) return config;
  const legacyNames = ['JAYA ENGINEERING COLLEGE', 'JAYA EDUCATIONAL TRUST', 'ENTER INSTITUTION NAME'];
  const inst = (config.institution_name || '').trim().toUpperCase();
  let updated = { ...config };
  if (!config.institution_name || legacyNames.includes(inst)) {
    updated.institution_name = 'NAME OF THE INSTITUTION:';
  }
  if (updated.session && (updated.session.includes('_') || updated.session.trim() === '')) {
    updated.session = '';
  }
  if (updated.date && (updated.date.includes('_') || updated.date.trim() === '')) {
    updated.date = '';
  }
  if (!updated.semester || /^[IVX\s/]+$/i.test(updated.semester.trim())) {
    updated.semester = 'ODD SEMESTER 2026-27';
  }
  return updated;
}

function createDefaultSetData(config) {
  const sanitizedConfig = sanitizeLoadedConfig(config);
  const rules = getRegulationRules(sanitizedConfig.regulation);
  const isCAT = isCATExam(sanitizedConfig.exam_type, sanitizedConfig.regulation);
  const catExamName = sanitizedConfig.exam_type === 'CAT-3' || sanitizedConfig.exam_type === 'IAT-3'
    ? 'CONTINUOUS ASSESSMENT TEST - III'
    : (sanitizedConfig.exam_type === 'CAT-2' || sanitizedConfig.exam_type === 'IAT-2' ? 'CONTINUOUS ASSESSMENT TEST - II' : 'CONTINUOUS ASSESSMENT TEST - I');

  return {
    config: {
      ...sanitizedConfig,
      regulation: sanitizedConfig.regulation || rules.regulation,
      exam_type: sanitizedConfig.exam_type || rules.defaultExamType,
      exam_name: sanitizedConfig.exam_name || (isCAT ? catExamName : rules.defaultExamName),
      max_marks: sanitizedConfig.max_marks || (isCAT ? 50 : rules.defaultMaxMarks),
      time: sanitizedConfig.time || (isCAT ? '90 Minutes' : rules.defaultTime)
    },
    selectedPartA: Array(isCAT ? 5 : 10).fill(null),
    selectedPartB: Array(5).fill(null).map(() => ({ a: null, b: null })),
    selectedPartC: isCAT ? Array(3).fill(null).map(() => ({ a: null, b: null })) : { a: null, b: null }
  };
}

export function useSetsManager(initialSets = null, initialSetId = 'SET-I') {
  const [sets, setSets] = useState(() => {
    if (initialSets && typeof initialSets === 'object' && Object.keys(initialSets).length > 0) {
      const sanitized = {};
      Object.entries(initialSets).forEach(([setId, setData]) => {
        sanitized[setId] = {
          ...setData,
          config: sanitizeLoadedConfig(setData?.config || DEFAULT_CONFIG)
        };
      });
      // Ensure at least SET-I, SET-II, and SET-III exist
      if (!sanitized['SET-II']) {
        sanitized['SET-II'] = createDefaultSetData({ ...DEFAULT_CONFIG, set: 'SET-II' });
      }
      if (!sanitized['SET-III']) {
        sanitized['SET-III'] = createDefaultSetData({ ...DEFAULT_CONFIG, set: 'SET-III' });
      }
      return sanitized;
    }
    return {
      'SET-I': createDefaultSetData({ ...DEFAULT_CONFIG, set: 'SET-I' }),
      'SET-II': createDefaultSetData({ ...DEFAULT_CONFIG, set: 'SET-II' }),
      'SET-III': createDefaultSetData({ ...DEFAULT_CONFIG, set: 'SET-III' })
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
    if (existingSetIds.length >= 5) {
      alert("Maximum of 5 sets allowed.");
      return;
    }

    const romanNumerals = ['SET-I', 'SET-II', 'SET-III', 'SET-IV', 'SET-V'];
    let nextSetId = null;
    for (const num of romanNumerals) {
      if (!existingSetIds.includes(num)) {
        nextSetId = num;
        break;
      }
    }
    if (!nextSetId) {
      nextSetId = `SET-${existingSetIds.length + 1}`;
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
