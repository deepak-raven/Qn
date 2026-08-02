import { useMemo } from 'react';

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
  if (!klStr) return 'K1';
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
  return 'K1';
}

export function useTOSCalculator(selectedPartA, selectedPartB, selectedPartC, config) {
  return useMemo(() => {
    const isCAT1 = config?.exam_type === 'CAT-1' || config?.exam_type === 'IAT-1';
    const isCAT2 = config?.exam_type === 'CAT-2' || config?.exam_type === 'IAT-2';
    const isCAT = isCAT1 || isCAT2;
    const catTargetUnits = isCAT1 ? ['Unit I', 'Unit II'] : (isCAT2 ? ['Unit III', 'Unit IV'] : null);

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
      const parsed = parseInt(String(q.marks).replace(/[^\d.]/g, ''), 10);
      const marksVal = defaultMarks !== undefined ? defaultMarks : (!isNaN(parsed) && parsed > 0 ? parsed : 0);
      
      if (tosCounts[unitKey] && tosCounts[unitKey][klKey] !== undefined) {
        tosCounts[unitKey][klKey] += 1;
        tosMarks[unitKey][klKey] += marksVal;
      }
    };

    selectedPartA.filter(Boolean).forEach(q => addQuestion(q, parseInt(String(q.marks).replace(/[^\d.]/g, ''), 10) || 2));
    selectedPartB.forEach(slot => {
      if (slot && slot.a) addQuestion(slot.a, parseInt(String(slot.a.marks).replace(/[^\d.]/g, ''), 10) || 13);
      if (slot && slot.b) addQuestion(slot.b, parseInt(String(slot.b.marks).replace(/[^\d.]/g, ''), 10) || 13);
    });

    const partCMarks = isCAT ? 14 : 15;
    if (selectedPartC && selectedPartC.a) addQuestion(selectedPartC.a, partCMarks);
    if (selectedPartC && selectedPartC.b) addQuestion(selectedPartC.b, partCMarks);

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
