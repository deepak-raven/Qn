import { useState } from 'react';

export const DEFAULT_CONFIG = {
  institution_name: 'Jaya Engineering College',
  exam_type: 'MODEL EXAMINATION', // 'MODEL EXAMINATION' | 'CAT-1' | 'CAT-2'
  exam_name: 'MODEL EXAMINATION',
  regulation: '',
  semester: '',
  subject_code: '',
  subject_name: '',
  degree_branch_sem: '',
  time: '3 Hours',
  max_marks: 100,
  set: 'SET-I',
  date: ''
};

export function getSlotCounts(exam_type) {
  if (exam_type === 'CAT-1' || exam_type === 'CAT-2' || exam_type === 'IAT-1' || exam_type === 'IAT-2') {
    return { partA: 5, partB: 2, partC: 1, defaultMarks: 50, defaultTime: '1.5 Hours' };
  }
  return { partA: 10, partB: 5, partC: 1, defaultMarks: 100, defaultTime: '3 Hours' };
}

export function isCATExam(examType) {
  return examType === 'CAT-1' || examType === 'CAT-2' || examType === 'IAT-1' || examType === 'IAT-2';
}

export function getExpectedUnitForPartASlot(examType, index) {
  if (examType === 'CAT-1' || examType === 'IAT-1') {
    if (index === 0 || index === 1) return ['Unit I'];
    if (index === 2 || index === 3) return ['Unit II'];
    return ['Unit I', 'Unit II'];
  }
  if (examType === 'CAT-2' || examType === 'IAT-2') {
    if (index === 0 || index === 1) return ['Unit III'];
    if (index === 2 || index === 3) return ['Unit IV'];
    return ['Unit III', 'Unit IV'];
  }
  // MODEL EXAMINATION
  const units = ['Unit I', 'Unit I', 'Unit II', 'Unit II', 'Unit III', 'Unit III', 'Unit IV', 'Unit IV', 'Unit V', 'Unit V'];
  return [units[index]];
}

export function getExpectedUnitForPartBSlot(examType, index) {
  if (examType === 'CAT-1' || examType === 'IAT-1') {
    const units = ['Unit I', 'Unit II'];
    return units[index] || `Unit ${index + 1}`;
  }
  if (examType === 'CAT-2' || examType === 'IAT-2') {
    const units = ['Unit III', 'Unit IV'];
    return units[index] || `Unit ${index + 3}`;
  }
  // MODEL EXAMINATION
  const units = ['Unit I', 'Unit II', 'Unit III', 'Unit IV', 'Unit V'];
  return units[index] || `Unit ${index + 1}`;
}

export function getPartBQuestionNo(examType, index) {
  return (isCATExam(examType) ? 6 : 11) + index;
}

export function getPartCQuestionNo(examType) {
  return isCATExam(examType) ? 8 : 16;
}

export function createDefaultSetData(config) {
  const counts = getSlotCounts(config.exam_type);
  return {
    config: {
      ...config,
      max_marks: config.max_marks || counts.defaultMarks,
      time: config.time || counts.defaultTime
    },
    selectedPartA: Array(counts.partA).fill(null),
    selectedPartB: Array(counts.partB).fill(null).map(() => ({ a: null, b: null })),
    selectedPartC: { a: null, b: null }
  };
}

export function useSetsManager() {
  const [sets, setSets] = useState({
    'SET-I': createDefaultSetData({ ...DEFAULT_CONFIG, set: 'SET-I' })
  });
  const [currentSetId, setCurrentSetId] = useState('SET-I');

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
        const counts = getSlotCounts(nextConfig.exam_type);
        const newPartA = [...set.selectedPartA].slice(0, counts.partA);
        while (newPartA.length < counts.partA) newPartA.push(null);
        
        const newPartB = [...set.selectedPartB].slice(0, counts.partB);
        while (newPartB.length < counts.partB) newPartB.push({ a: null, b: null });
        
        nextConfig.max_marks = counts.defaultMarks;
        nextConfig.time = counts.defaultTime;
        nextConfig.exam_name = nextConfig.exam_type === 'MODEL EXAMINATION' 
          ? 'MODEL EXAMINATION' 
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
    const romanNumerals = ['SET-I', 'SET-II', 'SET-III', 'SET-IV', 'SET-V', 'SET-VI', 'SET-VII'];
    let nextSetId = `SET-${existingSetIds.length + 1}`;
    for (const num of romanNumerals) {
      if (!existingSetIds.includes(num)) {
        nextSetId = num;
        break;
      }
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
    handleRenameActiveSet
  };
}
