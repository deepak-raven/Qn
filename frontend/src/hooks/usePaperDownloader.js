import { useState } from 'react';
import { API_BASE } from '../config';

export function usePaperDownloader() {
  const [downloading, setDownloading] = useState(false);

  const generatePaper = async (config, selectedPartA, selectedPartB, selectedPartC) => {
    const subCode = (config?.subject_code || '').trim();
    const subName = (config?.subject_name || '').trim();

    const isSubCodeValid = subCode !== '' && subCode !== 'SUB CODE' && subCode !== 'ENTER SUBJECT CODE';
    const isSubNameValid = subName !== '' && subName !== 'SUBJECT NAME' && subName !== 'ENTER SUBJECT NAME';

    if (!isSubCodeValid && !isSubNameValid) {
      alert('Please fill in both Subject Code and Subject Name before downloading the question paper.');
      return;
    }
    if (!isSubCodeValid) {
      alert('Please fill in the Subject Code before downloading the question paper.');
      return;
    }
    if (!isSubNameValid) {
      alert('Please fill in the Subject Name before downloading the question paper.');
      return;
    }

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
