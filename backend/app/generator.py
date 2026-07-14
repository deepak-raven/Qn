import os
import docx
from docx.shared import Pt
from typing import List, Dict
from app.models import PaperConfig, Question

def set_cell_text_preserve_style(cell, text: str):
    """
    Clears the text in a cell while preserving its original cell borders and styles.
    Overwrites the text of the first run in the first paragraph, and removes other runs.
    """
    if len(cell.paragraphs) == 0:
        cell.add_paragraph()
    p = cell.paragraphs[0]
    
    # We want to keep the font formatting of the first run if it exists
    if len(p.runs) > 0:
        first_run = p.runs[0]
        first_run.text = text
        # Remove any extra runs to avoid duplicate text
        for r in p.runs[1:]:
            r.text = ""
    else:
        # Create a new run with default style if no run exists
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(12)

def replace_text_runs(doc, old_text: str, new_text: str):
    """
    Replaces old_text with new_text inside the runs of the document,
    handling cases where old_text is split across multiple runs.
    """
    if not old_text:
        return
        
    def replace_in_paragraph(paragraph, old, new):
        if old not in paragraph.text:
            return
        
        while old in paragraph.text:
            runs = paragraph.runs
            text = "".join(run.text for run in runs)
            start_idx = text.find(old)
            end_idx = start_idx + len(old)
            
            current_len = 0
            start_run_idx = -1
            start_run_offset = -1
            end_run_idx = -1
            end_run_offset = -1
            
            for i, run in enumerate(runs):
                run_len = len(run.text)
                if start_run_idx == -1 and current_len <= start_idx < current_len + run_len:
                    start_run_idx = i
                    start_run_offset = start_idx - current_len
                if current_len <= end_idx <= current_len + run_len:
                    end_run_idx = i
                    end_run_offset = end_idx - current_len
                    break
                current_len += run_len
                
            if start_run_idx != -1 and end_run_idx != -1:
                if start_run_idx == end_run_idx:
                    run = runs[start_run_idx]
                    run.text = run.text[:start_run_offset] + new + run.text[end_run_offset:]
                else:
                    start_run = runs[start_run_idx]
                    start_run.text = start_run.text[:start_run_offset] + new
                    
                    for r_idx in range(start_run_idx + 1, end_run_idx):
                        runs[r_idx].text = ""
                        
                    end_run = runs[end_run_idx]
                    end_run.text = end_run.text[end_run_offset:]
            else:
                break

    # Search in document paragraphs
    for p in doc.paragraphs:
        replace_in_paragraph(p, old_text, new_text)
                
    # Search in all table cells
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    replace_in_paragraph(p, old_text, new_text)

def generate_question_paper(
    template_path: str,
    output_path: str,
    config: PaperConfig,
    part_a: List[Question],
    part_b: List[List[Question]],
    part_c: List[Question]
):
    doc = docx.Document(template_path)
    
    # 1. Replace metadata placeholders in the document
    replace_text_runs(doc, "OCS353", config.subject_code)
    replace_text_runs(doc, "Data Science fundamentals", config.subject_name)
    replace_text_runs(doc, "2021-Regulation", config.regulation)
    replace_text_runs(doc, "ODD SEMESTER-2025-26", config.semester)
    replace_text_runs(doc, "BE/BTECH/ CIVIL/AERO/MECH/EEE/TEXT/VII", config.degree_branch_sem)
    replace_text_runs(doc, "3 Hours", config.time)
    replace_text_runs(doc, "Maximum Marks: 100", f"Maximum Marks: {config.max_marks}")
    replace_text_runs(doc, "SET-III", config.set)
    replace_text_runs(doc, "MODEL EXAMINATION", config.exam_name)
    if config.date:
        replace_text_runs(doc, "Date:", f"Date: {config.date}")
        
    # 2. Populate Part A (Table 1)
    # Table 1: Rows: 11, Cols: 4
    # Columns: [Q.No, Questions, KL, CO Attainment]
    t1 = doc.tables[1]
    for idx, q in enumerate(part_a):
        if idx >= 10:
            break
        row_idx = 1 + idx
        if row_idx < len(t1.rows):
            # Column 0 is Q.No (uses auto-numbering, so leave it untouched)
            set_cell_text_preserve_style(t1.rows[row_idx].cells[1], q.text)
            set_cell_text_preserve_style(t1.rows[row_idx].cells[2], q.kl)
            set_cell_text_preserve_style(t1.rows[row_idx].cells[3], q.co)
            
    # 3. Populate Part B (Table 2)
    # Table 2: Rows: 16, Cols: 5
    # Columns: [Q.No, Sub-Q, Questions, KL, CO Attainment]
    # Each slot i has:
    #   Row 1 + i*3: a.
    #   Row 2 + i*3: (OR)
    #   Row 3 + i*3: b.
    t2 = doc.tables[2]
    for idx, pair in enumerate(part_b):
        if idx >= 5:
            break
        row_a_idx = 1 + idx * 3
        row_b_idx = 3 + idx * 3
        
        # Populate Question a
        if row_a_idx < len(t2.rows) and len(pair) > 0:
            q_a = pair[0]
            set_cell_text_preserve_style(t2.rows[row_a_idx].cells[2], q_a.text)
            set_cell_text_preserve_style(t2.rows[row_a_idx].cells[3], q_a.kl)
            set_cell_text_preserve_style(t2.rows[row_a_idx].cells[4], q_a.co)
            
        # Populate Question b
        if row_b_idx < len(t2.rows) and len(pair) > 1:
            q_b = pair[1]
            set_cell_text_preserve_style(t2.rows[row_b_idx].cells[2], q_b.text)
            set_cell_text_preserve_style(t2.rows[row_b_idx].cells[3], q_b.kl)
            set_cell_text_preserve_style(t2.rows[row_b_idx].cells[4], q_b.co)
            
    # 4. Populate Part C (Table 3)
    # Table 3: Rows: 4, Cols: 5
    # Columns: [Q.No, Sub-Q, Questions, KL, CO Attainment]
    t3 = doc.tables[3]
    if len(part_c) >= 2:
        # Populate Question a (Row 1)
        set_cell_text_preserve_style(t3.rows[1].cells[2], part_c[0].text)
        set_cell_text_preserve_style(t3.rows[1].cells[3], part_c[0].kl)
        set_cell_text_preserve_style(t3.rows[1].cells[4], part_c[0].co)
        # Populate Question b (Row 3)
        set_cell_text_preserve_style(t3.rows[3].cells[2], part_c[1].text)
        set_cell_text_preserve_style(t3.rows[3].cells[3], part_c[1].kl)
        set_cell_text_preserve_style(t3.rows[3].cells[4], part_c[1].co)

    # 5. Compute Table of Specifications (TOS)
    units_map = {"Unit I": 0, "Unit II": 1, "Unit III": 2, "Unit IV": 3, "Unit V": 4}
    kls_map = {"K1": 0, "K2": 1, "K3": 2, "K4": 3, "K5": 4, "K6": 5}
    
    # Initialize count and mark matrices
    tos_counts = [[0 for _ in range(6)] for _ in range(5)]
    tos_marks = [[0 for _ in range(6)] for _ in range(5)]
    
    # Collect all questions actually written to the document
    all_selected_questions = []
    all_selected_questions.extend(part_a)
    for pair in part_b:
        all_selected_questions.extend(pair)
    all_selected_questions.extend(part_c)
    
    for q in all_selected_questions:
        unit_idx = units_map.get(q.unit)
        # Standardize KL keys (e.g. "K2" or "K2 Understanding" -> "K2")
        kl_key = q.kl.split()[0].strip() if q.kl else "K1"
        kl_idx = kls_map.get(kl_key)
        
        if unit_idx is not None and kl_idx is not None:
            tos_counts[unit_idx][kl_idx] += 1
            tos_marks[unit_idx][kl_idx] += q.marks

    # 6. Populate Table 4 (Question-Wise TOS)
    # Table 4: Rows: 8, Cols: 8
    # Row 0, 1 are headers.
    # Row 2 to 6 are Unit I to V.
    # Row 7 is total.
    # Col 0 is unit name. Col 1 to 6 are K1 to K6. Col 7 is total.
    t4 = doc.tables[4]
    for u_idx in range(5):
        row_idx = 2 + u_idx
        row_sum = 0
        for k_idx in range(6):
            val = tos_counts[u_idx][k_idx]
            val_str = str(val) if val > 0 else ""
            set_cell_text_preserve_style(t4.rows[row_idx].cells[1 + k_idx], val_str)
            row_sum += val
        # Set Row Total
        set_cell_text_preserve_style(t4.rows[row_idx].cells[7], str(row_sum))
        
    # Calculate Column Totals for Table 4
    col_sums_t4 = [0] * 6
    grand_total_t4 = 0
    for k_idx in range(6):
        col_sum = sum(tos_counts[u_idx][k_idx] for u_idx in range(5))
        col_sums_t4[k_idx] = col_sum
        grand_total_t4 += col_sum
        set_cell_text_preserve_style(t4.rows[7].cells[1 + k_idx], str(col_sum) if col_sum > 0 else "0")
    set_cell_text_preserve_style(t4.rows[7].cells[7], str(grand_total_t4))

    # 7. Populate Table 5 (Marks-Wise TOS)
    t5 = doc.tables[5]
    for u_idx in range(5):
        row_idx = 2 + u_idx
        row_sum = 0
        for k_idx in range(6):
            val = tos_marks[u_idx][k_idx]
            val_str = str(val) if val > 0 else ""
            set_cell_text_preserve_style(t5.rows[row_idx].cells[1 + k_idx], val_str)
            row_sum += val
        set_cell_text_preserve_style(t5.rows[row_idx].cells[7], str(row_sum))
        
    # Calculate Column Totals for Table 5
    col_sums_t5 = [0] * 6
    grand_total_t5 = 0
    for k_idx in range(6):
        col_sum = sum(tos_marks[u_idx][k_idx] for u_idx in range(5))
        col_sums_t5[k_idx] = col_sum
        grand_total_t5 += col_sum
        set_cell_text_preserve_style(t5.rows[7].cells[1 + k_idx], str(col_sum) if col_sum > 0 else "0")
    set_cell_text_preserve_style(t5.rows[7].cells[7], str(grand_total_t5))
    
    # 8. Save output
    doc.save(output_path)
