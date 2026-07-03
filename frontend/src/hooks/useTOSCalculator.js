import { useMemo } from 'react';

export function useTOSCalculator(selectedPartA, selectedPartB, selectedPartC) {
  return useMemo(() => {
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

    const allSelected = [];
    allSelected.push(...selectedPartA.filter(Boolean));
    selectedPartB.forEach(slot => {
      if (slot.a) allSelected.push(slot.a);
      if (slot.b) allSelected.push(slot.b);
    });
    if (selectedPartC.a) allSelected.push(selectedPartC.a);
    if (selectedPartC.b) allSelected.push(selectedPartC.b);

    allSelected.forEach(q => {
      const unitKey = q.unit;
      const klKey = q.kl ? q.kl.split(' ')[0].trim() : 'K1';
      
      if (tosCounts[unitKey] && tosCounts[unitKey][klKey] !== undefined) {
        tosCounts[unitKey][klKey] += 1;
        tosMarks[unitKey][klKey] += q.marks;
      }
    });

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
  }, [selectedPartA, selectedPartB, selectedPartC]);
}
