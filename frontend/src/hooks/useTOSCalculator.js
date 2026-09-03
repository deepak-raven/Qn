import { useMemo } from 'react';
import { is2025Regulation } from './useSetsManager';

export function normalizeUnit(unitStr) {
  if (!unitStr) return 'Unit I';
  const u = String(unitStr).trim().toUpperCase();
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

export function useTOSCalculator(selectedPartA, selectedPartB, selectedPartC, config) {
  return useMemo(() => {
    const isCAT1 = config?.exam_type === 'CAT-1' || config?.exam_type === 'IAT-1';
    const isCAT2 = config?.exam_type === 'CAT-2' || config?.exam_type === 'IAT-2';
    const isCAT3 = config?.exam_type === 'CAT-3' || config?.exam_type === 'IAT-3';
    const isCAT = isCAT1 || isCAT2 || isCAT3;
    const is2025 = is2025Regulation(config?.regulation);
    const is2021CAT = isCAT && !is2025;
    const catTargetUnits = isCAT3
      ? ['Unit IV', 'Unit V']
      : isCAT2 
      ? (is2021CAT ? ['Unit II', 'Unit III'] : ['Unit III', 'Unit IV']) 
      : isCAT1
      ? ['Unit I', 'Unit II']
      : null;

    const units = ['Unit I', 'Unit II', 'Unit III', 'Unit IV', 'Unit V'];
    const kls = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6'];

    const tosCounts = {};
    const tosMarks = {};
    units.forEach(u => {
      tosCounts[u] = {};
      tosMarks[u] = {};
      kls.forEach(k => {
        tosCounts[u][k] = 0;
        tosMarks[u][k] = 0;
      });
    });

    const addQuestion = (q, defaultMarks) => {
      if (!q) return;
      let unitKey = normalizeUnit(q.unit);
      if (catTargetUnits && !catTargetUnits.includes(unitKey)) {
        unitKey = catTargetUnits[0];
      }
      const klKey = normalizeKL(q.kl);
      const marksVal = defaultMarks !== undefined ? defaultMarks : 0;
      
      if (klKey && tosCounts[unitKey] && tosCounts[unitKey][klKey] !== undefined) {
        tosCounts[unitKey][klKey] += 1;
        tosMarks[unitKey][klKey] += marksVal;
      }
    };

    const partAMarks = is2025 ? 1 : 2;
    const partBMarks = is2025 ? 3 : 13;
    const partCMarks = is2025 ? 10 : (isCAT ? 14 : 15);

    selectedPartA.slice(0, (is2025 || isCAT) ? 5 : 10).filter(Boolean).forEach(q => addQuestion(q, partAMarks));

    const reqPartBSlots = (isCAT && !is2025) ? 2 : 5;
    selectedPartB.slice(0, reqPartBSlots).forEach(slot => {
      if (!slot) return;
      if (slot.a) addQuestion(slot.a, partBMarks);
      if (slot.b) addQuestion(slot.b, partBMarks);
      if (!slot.a && !slot.b && slot.text) addQuestion(slot, partBMarks);
    });

    const targetPartC = (isCAT && !is2025)
      ? (Array.isArray(selectedPartC) ? selectedPartC.slice(0, 1) : [selectedPartC])
      : selectedPartC;

    if (Array.isArray(targetPartC)) {
      targetPartC.forEach(slot => {
        if (!slot) return;
        if (slot.a) addQuestion(slot.a, partCMarks);
        if (slot.b) addQuestion(slot.b, partCMarks);
        if (!slot.a && !slot.b && slot.text) addQuestion(slot, partCMarks);
      });
    } else if (targetPartC) {
      if (targetPartC.a) addQuestion(targetPartC.a, partCMarks);
      if (targetPartC.b) addQuestion(targetPartC.b, partCMarks);
      if (!targetPartC.a && !targetPartC.b && targetPartC.text) addQuestion(targetPartC, partCMarks);
    }

    const unitTotalsCount = {};
    const klTotalsCount = { K1: 0, K2: 0, K3: 0, K4: 0, K5: 0, K6: 0 };
    let grandTotalCount = 0;
    
    const unitTotalsMark = {};
    const klTotalsMark = { K1: 0, K2: 0, K3: 0, K4: 0, K5: 0, K6: 0 };
    let grandTotalMark = 0;

    units.forEach(u => {
      unitTotalsCount[u] = 0;
      unitTotalsMark[u] = 0;
      kls.forEach(k => {
        const valC = tosCounts[u][k] || 0;
        const valM = tosMarks[u][k] || 0;
        
        unitTotalsCount[u] += valC;
        klTotalsCount[k] += valC;
        grandTotalCount += valC;

        unitTotalsMark[u] += valM;
        klTotalsMark[k] += valM;
        grandTotalMark += valM;
      });
    });

    return {
      tosCounts,
      tosMarks,
      unitTotalsCount,
      klTotalsCount,
      grandTotalCount,
      unitTotalsMark,
      klTotalsMark,
      grandTotalMark
    };
  }, [selectedPartA, selectedPartB, selectedPartC, config]);
}

