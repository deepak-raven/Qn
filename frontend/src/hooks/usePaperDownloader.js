import { useState } from 'react';
import { API_BASE } from '../config';

export function usePaperDownloader() {
  const [downloading, setDownloading] = useState(false);

  const generatePaper = async (config, selectedPartA, selectedPartB, selectedPartC) => {
    const isIAT = config.exam_type === 'CAT-1' || config.exam_type === 'CAT-2' || config.exam_type === 'IAT-1' || config.exam_type === 'IAT-2';
    const reqPartA = isIAT ? 5 : 10;
    const reqPartB = isIAT ? 2 : 5;

    const filledPartA = selectedPartA.filter(Boolean);
    if (filledPartA.length !== reqPartA) {
      alert(`Please select exactly ${reqPartA} questions for Part A (currently chosen: ${filledPartA.length})`);
      return;
    }
    
    for (let i = 0; i < reqPartB; i++) {
      if (!selectedPartB[i] || !selectedPartB[i].a || !selectedPartB[i].b) {
        alert(`Please complete both choices (a and b) for Question ${11 + i} in Part B.`);
        return;
      }
    }

    if (!selectedPartC.a || !selectedPartC.b) {
      alert('Please complete both choices (a and b) for Question 16 in Part C.');
      return;
    }

    setDownloading(true);
    try {
      const payload = {
        config,
        part_a: filledPartA,
        part_b: selectedPartB.slice(0, reqPartB).map(slot => [slot.a, slot.b]),
        part_c: [selectedPartC.a, selectedPartC.b]
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
        const errData = await res.json();
        alert(`Generation failed: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Network error during generation: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return { downloading, generatePaper };
}
