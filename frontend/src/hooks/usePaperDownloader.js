import { useState } from 'react';
import { API_BASE } from '../config';
import { getPartBQuestionNo, getPartCQuestionNo, isCATExam, is2025Regulation } from './useSetsManager';

export function usePaperDownloader() {
  const [downloading, setDownloading] = useState(false);

  const generatePaper = async (config, selectedPartA, selectedPartB, selectedPartC) => {
    const subCode = (config?.subject_code || '').trim();
    const subName = (config?.subject_name || '').trim();

    const isSubCodeValid = subCode !== '' && subCode !== 'ALL';
    const isSubNameValid = subName !== '' && subName !== 'SELECT SUBJECT...';

    if (!isSubCodeValid) {
      alert('Please fill in the Subject Code before downloading the question paper.');
      return;
    }
    if (!isSubNameValid) {
      alert('Please fill in the Subject Name before downloading the question paper.');
      return;
    }

    const is2025 = is2025Regulation(config.regulation);
    const isCAT = isCATExam(config.exam_type, config.regulation);
    const reqPartA = (is2025 || isCAT) ? 5 : 10;

    const filledPartA = selectedPartA.filter(Boolean);
    if (filledPartA.length !== reqPartA) {
      alert(`Please select exactly ${reqPartA} questions for Part A (currently chosen: ${filledPartA.length})`);
      return;
    }
    
    if (is2025) {
      const filledPartB = selectedPartB.slice(0, 5).map(slot => (slot?.a || slot?.b || (slot?.text ? slot : null))).filter(Boolean);
      if (filledPartB.length < 5) {
        alert(`Please select 5 questions for Part B (currently chosen: ${filledPartB.length}).`);
        return;
      }

      const partCPairs = Array.isArray(selectedPartC) ? selectedPartC.slice(0, 3) : [selectedPartC];
      for (let i = 0; i < 3; i++) {
        const pair = partCPairs[i];
        if (!pair || !pair.a || !pair.b) {
          alert(`Please complete both choices (a and b) for Question ${11 + i} in Part C.`);
          return;
        }
      }
    } else {
      const reqPartBCount = (isCAT && !is2025) ? 2 : 5;
      for (let i = 0; i < reqPartBCount; i++) {
        if (!selectedPartB[i] || !selectedPartB[i].a || !selectedPartB[i].b) {
          alert(`Please complete both choices (a and b) for Question ${getPartBQuestionNo(config.exam_type, i, config.regulation)} in Part B.`);
          return;
        }
      }

      const singlePartC = Array.isArray(selectedPartC) ? selectedPartC[0] : selectedPartC;
      if (!singlePartC || !singlePartC.a || !singlePartC.b) {
        alert(`Please complete both choices (a and b) for Question ${getPartCQuestionNo(config.exam_type, 0, config.regulation)} in Part C.`);
        return;
      }
    }

    // Check for missing KL in chosen questions
    const missingKlQuestions = [];
    selectedPartA.slice(0, reqPartA).forEach((q, idx) => {
      if (q && (!q.kl || String(q.kl).trim() === '')) {
        missingKlQuestions.push(`Part A Q${idx + 1}`);
      }
    });

    if (is2025) {
      selectedPartB.slice(0, 5).forEach((slot, idx) => {
        const item = (slot?.a || slot?.b || (slot?.text ? slot : null));
        if (item && (!item.kl || String(item.kl).trim() === '')) {
          missingKlQuestions.push(`Part B Q${6 + idx}`);
        }
      });
      const partCPairs = Array.isArray(selectedPartC) ? selectedPartC.slice(0, 3) : [selectedPartC];
      partCPairs.forEach((pair, idx) => {
        if (pair?.a && (!pair.a.kl || String(pair.a.kl).trim() === '')) missingKlQuestions.push(`Part C Q${11 + idx}(a)`);
        if (pair?.b && (!pair.b.kl || String(pair.b.kl).trim() === '')) missingKlQuestions.push(`Part C Q${11 + idx}(b)`);
      });
    } else {
      const reqPartBCount = (isCAT && !is2025) ? 2 : 5;
      for (let i = 0; i < reqPartBCount; i++) {
        const qNo = getPartBQuestionNo(config.exam_type, i, config.regulation);
        if (selectedPartB[i]?.a && (!selectedPartB[i].a.kl || String(selectedPartB[i].a.kl).trim() === '')) missingKlQuestions.push(`Part B Q${qNo}(a)`);
        if (selectedPartB[i]?.b && (!selectedPartB[i].b.kl || String(selectedPartB[i].b.kl).trim() === '')) missingKlQuestions.push(`Part B Q${qNo}(b)`);
      }
      const singlePartC = Array.isArray(selectedPartC) ? selectedPartC[0] : selectedPartC;
      const qNoC = getPartCQuestionNo(config.exam_type, 0, config.regulation);
      if (singlePartC?.a && (!singlePartC.a.kl || String(singlePartC.a.kl).trim() === '')) missingKlQuestions.push(`Part C Q${qNoC}(a)`);
      if (singlePartC?.b && (!singlePartC.b.kl || String(singlePartC.b.kl).trim() === '')) missingKlQuestions.push(`Part C Q${qNoC}(b)`);
    }

    if (missingKlQuestions.length > 0) {
      const proceed = window.confirm(
        `⚠️ Warning: Knowledge Level (KL) is missing for:\n• ${missingKlQuestions.join('\n• ')}\n\nTable of Specifications (ToS) cannot be calculated accurately without KL.\n\nClick 'OK' to Generate Anyway, or 'Cancel' to edit KL in the Preview.`
      );
      if (!proceed) {
        return;
      }
    }

    setDownloading(true);
    try {
      const reqPartBCount = (isCAT && !is2025) ? 2 : 5;
      const payload = {
        config,
        part_a: filledPartA,
        part_b: is2025 
          ? selectedPartB.slice(0, 5).map(slot => (slot?.a || slot?.b || (slot?.text ? slot : null))).filter(Boolean)
          : selectedPartB.slice(0, reqPartBCount).map(slot => [slot.a, slot.b]),
        part_c: is2025
          ? (Array.isArray(selectedPartC) ? selectedPartC.slice(0, 3) : [selectedPartC]).map(pair => [pair?.a, pair?.b])
          : [[(Array.isArray(selectedPartC) ? selectedPartC[0] : selectedPartC)?.a, (Array.isArray(selectedPartC) ? selectedPartC[0] : selectedPartC)?.b]]
      };

      const res = await fetch(`${API_BASE}/generate-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Question_Paper_${config.subject_code}_${config.set || 'SET-I'}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        let errorDetail = 'Unknown error';
        try {
          const errData = await res.json();
          if (typeof errData.detail === 'string') {
            errorDetail = errData.detail;
          } else if (Array.isArray(errData.detail)) {
            errorDetail = errData.detail.map(d => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg}`).join('\n');
          } else if (errData.detail) {
            errorDetail = JSON.stringify(errData.detail);
          } else {
            errorDetail = JSON.stringify(errData);
          }
        } catch (_) {
          errorDetail = await res.text().catch(() => 'Server error');
        }
        alert(`Generation failed: ${errorDetail}`);
      }
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) {
        alert('Network Error: Unable to connect to backend server.\n\nPlease start the backend server by running:\npython run.py (or python backend/run.py)');
      } else {
        alert(`Network error during generation: ${err.message}`);
      }
    } finally {
      setDownloading(false);
    }
  };

  return { downloading, generatePaper };
}
