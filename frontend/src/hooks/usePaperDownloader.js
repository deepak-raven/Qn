import { useState } from 'react';

const API_BASE = 'http://localhost:8000/api';

export function usePaperDownloader() {
  const [downloading, setDownloading] = useState(false);

  const generatePaper = async (config, selectedPartA, selectedPartB, selectedPartC) => {
    const filledPartA = selectedPartA.filter(Boolean);
    if (filledPartA.length !== 10) {
      alert(`Please select exactly 10 questions for Part A (currently chosen: ${filledPartA.length})`);
      return;
    }
    
    for (let i = 0; i < 5; i++) {
      if (!selectedPartB[i].a || !selectedPartB[i].b) {
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
        part_b: selectedPartB.map(slot => [slot.a, slot.b]),
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
        a.download = `Question_Paper_${config.subject_code}.docx`;
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
