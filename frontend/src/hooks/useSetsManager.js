import { useState } from 'react';

export const DEFAULT_CONFIG = {
  institution_name: 'Jaya Engineering College',
  exam_name: '',
  regulation: '',
  semester: '',
  subject_code: '',
  subject_name: '',
  degree_branch_sem: '',
  time: '',
  max_marks: 100,
  set: 'SET-I',
  date: ''
};

export function useSetsManager() {
  const [sets, setSets] = useState({
    'SET-I': {
      config: { ...DEFAULT_CONFIG, set: 'SET-I' },
      selectedPartA: Array(10).fill(null),
      selectedPartB: Array(5).fill(null).map(() => ({ a: null, b: null })),
      selectedPartC: { a: null, b: null }
    }
  });
  const [currentSetId, setCurrentSetId] = useState('SET-I');

  const currentSet = sets[currentSetId] || {
    config: DEFAULT_CONFIG,
    selectedPartA: Array(10).fill(null),
    selectedPartB: Array(5).fill(null).map(() => ({ a: null, b: null })),
    selectedPartC: { a: null, b: null }
  };
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

    const newSetData = {
      config: { ...config, set: nextSetId },
      selectedPartA: Array(10).fill(null),
      selectedPartB: Array(5).fill(null).map(() => ({ a: null, b: null })),
      selectedPartC: { a: null, b: null }
    };

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
