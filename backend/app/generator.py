import os
import re
import logging
import docx
from docx.shared import Pt
from typing import List, Dict, Any
from app.models import PaperConfig, Question

logger = logging.getLogger("app.generator")

def normalize_unit(unit_str: str) -> str:
    if not unit_str:
        return "Unit I"
    u = str(unit_str).strip().upper()
    if "III" in u or u == "UNIT 3" or u == "3":
        return "Unit III"
    if "II" in u or u == "UNIT 2" or u == "2":
        return "Unit II"
    if "IV" in u or u == "UNIT 4" or u == "4":
        return "Unit IV"
    if "V" in u or u == "UNIT 5" or u == "5":
        return "Unit V"
    if "I" in u or u == "UNIT 1" or u == "1":
        return "Unit I"
    return "Unit I"

def normalize_kl(kl_str: str) -> str:
    if not kl_str:
        return "K1"
    k = str(kl_str).strip().upper()
    if "K1" in k or "REMEMBER" in k: return "K1"
    if "K2" in k or "UNDERSTAND" in k: return "K2"
    if "K3" in k or "APPLY" in k or "APPLI" in k: return "K3"
    if "K4" in k or "ANALY" in k: return "K4"
    if "K5" in k or "EVALUAT" in k: return "K5"
    if "K6" in k or "CREAT" in k: return "K6"
    digits = re.findall(r'\d', k)
    if digits and 1 <= int(digits[0]) <= 6:
        return f"K{digits[0]}"
    return "K1"

def set_cell_text_preserve_style(cell, text: str):
    """
    Clears the text in a cell while preserving its original cell borders and styles.
    Overwrites the text of the first run in the first paragraph, and removes other runs.
    """
    if len(cell.paragraphs) == 0:
        cell.add_paragraph()
    p = cell.paragraphs[0]
    
    if len(p.runs) > 0:
        first_run = p.runs[0]
        first_run.text = text
        for r in p.runs[1:]:
            r.text = ""
    else:
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(12)

def replace_text_runs(doc, old_text: str, new_text: str):
    if not old_text:
        return
    if old_text == new_text:
        return
        
    def replace_in_paragraph(paragraph, old, new):
        if old not in paragraph.text:
            return
        
        search_start = 0
        while True:
            runs = paragraph.runs
            text = "".join(run.text for run in runs)
            start_idx = text.find(old, search_start)
            if start_idx == -1:
                break
                
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
                
                search_start = start_idx + len(new)
            else:
                break

    for p in doc.paragraphs:
        replace_in_paragraph(p, old_text, new_text)
                
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    replace_in_paragraph(p, old_text, new_text)

def remove_table_rows(table, start_row_idx: int):
    """
    Safely removes rows from start_row_idx to the end of the table.
    """
    for row_idx in range(len(table.rows) - 1, start_row_idx - 1, -1):
        tr = table.rows[row_idx]._tr
        tr.getparent().remove(tr)

def _generate_cat_paper(doc, config: PaperConfig, part_a: List[Question], part_b: List[List[Question]], part_c: List[Question]):
    # 1. Metadata Replacements
    if config.institution_name:
        replace_text_runs(doc, "NAME OF THE INSTITUTION:", config.institution_name.upper())

    exam_title = config.exam_name or ("CONTINUOUS ASSESSMENT TEST - II" if config.exam_type in ["CAT-2", "IAT-2"] else "CONTINUOUS ASSESSMENT TEST - I")
    replace_text_runs(doc, "CONTINUOUS ASSESSMENT TEST- II", exam_title)
    replace_text_runs(doc, "CONTINUOUS ASSESSMENT TEST - II", exam_title)
    replace_text_runs(doc, "CONTINUOUS ASSESSMENT TEST- I", exam_title)
    replace_text_runs(doc, "CONTINUOUS ASSESSMENT TEST - I", exam_title)
    
    if config.set:
        replace_text_runs(doc, "SET  I", config.set)
        replace_text_runs(doc, "SET - I", config.set)
        replace_text_runs(doc, "SET-I", config.set)
        
    if config.regulation:
        replace_text_runs(doc, "2021-REGULATION", f"{config.regulation}-REGULATION" if "REGULATION" not in config.regulation.upper() else config.regulation)
        
    if config.semester:
        replace_text_runs(doc, "ODD SEMESTER 2026-27", config.semester)
        
    # Table 1: Date
    if len(doc.tables) > 1 and len(doc.tables[1].rows) > 1 and len(doc.tables[1].rows[1].cells) > 3:
        if config.date:
            set_cell_text_preserve_style(doc.tables[1].rows[1].cells[3], f"DATE: {config.date}")

    # Table 2: Course & Exam Info
    if len(doc.tables) > 2:
        t2 = doc.tables[2]
        sub_code = (config.subject_code or "").strip()
        sub_name = (config.subject_name or "").strip()
        if sub_code and sub_name:
            sub_info = f"Sub. Code / Sub. Name  : {sub_code} / {sub_name}"
        elif sub_code:
            sub_info = f"Sub. Code / Sub. Name  : {sub_code}"
        elif sub_name:
            sub_info = f"Sub. Code / Sub. Name  : {sub_name}"
        else:
            sub_info = "Sub. Code / Sub. Name  :"

        if len(t2.rows) > 0 and len(t2.rows[0].cells) > 0:
            set_cell_text_preserve_style(t2.rows[0].cells[0], sub_info)
            
        deg_branch = (config.degree_branch_sem or "").strip()
        if len(t2.rows) > 1 and len(t2.rows[1].cells) > 0:
            deg_str = f"Degree / Branch: {deg_branch}" if deg_branch else "Degree / Branch:"
            set_cell_text_preserve_style(t2.rows[1].cells[0], deg_str)
            
        sem_val = (config.semester or "").strip()
        if len(t2.rows) > 1 and len(t2.rows[1].cells) > 1:
            sem_str = f"Year / Semester : {sem_val}" if sem_val else "Year / Semester :"
            set_cell_text_preserve_style(t2.rows[1].cells[1], sem_str)
            
        time_val = (config.time or "").strip() or "1.5 Hours"
        if len(t2.rows) > 2 and len(t2.rows[2].cells) > 0:
            set_cell_text_preserve_style(t2.rows[2].cells[0], f"Time: {time_val}")
            
        marks_val = str(config.max_marks) if config.max_marks else "50"
        if len(t2.rows) > 2 and len(t2.rows[2].cells) > 1:
            set_cell_text_preserve_style(t2.rows[2].cells[1], f"Maximum Marks: {marks_val}")

    # 2. Part A (Table 3)
    if len(doc.tables) > 3:
        t3 = doc.tables[3]
        for idx, q in enumerate(part_a[:5]):
            row_idx = 1 + idx
            if row_idx < len(t3.rows):
                if len(t3.rows[row_idx].cells) > 1:
                    set_cell_text_preserve_style(t3.rows[row_idx].cells[1], q.text)
                if len(t3.rows[row_idx].cells) > 2:
                    set_cell_text_preserve_style(t3.rows[row_idx].cells[2], q.kl)
                if len(t3.rows[row_idx].cells) > 3:
                    set_cell_text_preserve_style(t3.rows[row_idx].cells[3], q.co)

    # 3. Part B (Table 4)
    if len(doc.tables) > 4:
        t4 = doc.tables[4]
        for idx, pair in enumerate(part_b[:2]):
            row_a_idx = 1 + idx * 3
            row_b_idx = 3 + idx * 3
            if row_a_idx < len(t4.rows) and len(pair) > 0:
                q_a = pair[0]
                if len(t4.rows[row_a_idx].cells) > 2:
                    set_cell_text_preserve_style(t4.rows[row_a_idx].cells[2], q_a.text)
                if len(t4.rows[row_a_idx].cells) > 3:
                    set_cell_text_preserve_style(t4.rows[row_a_idx].cells[3], q_a.kl)
                if len(t4.rows[row_a_idx].cells) > 4:
                    set_cell_text_preserve_style(t4.rows[row_a_idx].cells[4], q_a.co)
            if row_b_idx < len(t4.rows) and len(pair) > 1:
                q_b = pair[1]
                if len(t4.rows[row_b_idx].cells) > 2:
                    set_cell_text_preserve_style(t4.rows[row_b_idx].cells[2], q_b.text)
                if len(t4.rows[row_b_idx].cells) > 3:
                    set_cell_text_preserve_style(t4.rows[row_b_idx].cells[3], q_b.kl)
                if len(t4.rows[row_b_idx].cells) > 4:
                    set_cell_text_preserve_style(t4.rows[row_b_idx].cells[4], q_b.co)

    # 4. Part C (Table 5)
    if len(doc.tables) > 5:
        t5 = doc.tables[5]
        if len(part_c) >= 1 and len(t5.rows) > 1:
            q_a = part_c[0]
            if len(t5.rows[1].cells) > 2:
                set_cell_text_preserve_style(t5.rows[1].cells[2], q_a.text)
            if len(t5.rows[1].cells) > 3:
                set_cell_text_preserve_style(t5.rows[1].cells[3], q_a.kl)
            if len(t5.rows[1].cells) > 4:
                set_cell_text_preserve_style(t5.rows[1].cells[4], q_a.co)
        if len(part_c) >= 2 and len(t5.rows) > 3:
            q_b = part_c[1]
            if len(t5.rows[3].cells) > 2:
                set_cell_text_preserve_style(t5.rows[3].cells[2], q_b.text)
            if len(t5.rows[3].cells) > 3:
                set_cell_text_preserve_style(t5.rows[3].cells[3], q_b.kl)
            if len(t5.rows[3].cells) > 4:
                set_cell_text_preserve_style(t5.rows[3].cells[4], q_b.co)

    # 5. Table of Specifications (TOS) for CAT
    is_cat2 = config.exam_type in ["CAT-2", "IAT-2"]
    target_units = ["Unit III", "Unit IV"] if is_cat2 else ["Unit I", "Unit II"]
    unit_labels = ["III", "IV"] if is_cat2 else ["I", "II"]

    kls_map = {"K1": 0, "K2": 1, "K3": 2, "K4": 3, "K5": 4, "K6": 5}
    tos_counts = [[0 for _ in range(6)] for _ in range(2)]
    tos_marks = [[0 for _ in range(6)] for _ in range(2)]

    all_questions = []
    all_questions.extend([q for q in part_a if q])
    for pair in part_b:
        if pair:
            all_questions.extend([q for q in pair if q])
    all_questions.extend([q for q in part_c if q])

    for q in all_questions:
        u_norm = normalize_unit(q.unit)
        if u_norm == target_units[0]:
            u_idx = 0
        elif u_norm == target_units[1]:
            u_idx = 1
        else:
            u_idx = 0
        
        kl_key = normalize_kl(q.kl)
        kl_idx = kls_map.get(kl_key, 0)

        if q in part_c:
            m_val = 14
        else:
            try:
                m_val = int(q.marks)
            except (ValueError, TypeError):
                m_val = 0

        if u_idx is not None and kl_idx is not None:
            tos_counts[u_idx][kl_idx] += 1
            tos_marks[u_idx][kl_idx] += m_val

    # Table 6 (Question-wise TOS)
    if len(doc.tables) > 6:
        t6 = doc.tables[6]
        for u_idx in range(2):
            row_idx = 3 + u_idx
            if row_idx < len(t6.rows):
                set_cell_text_preserve_style(t6.rows[row_idx].cells[0], unit_labels[u_idx])
                row_sum = 0
                for k_idx in range(6):
                    val = tos_counts[u_idx][k_idx]
                    set_cell_text_preserve_style(t6.rows[row_idx].cells[1 + k_idx], str(val) if val > 0 else "")
                    row_sum += val
                set_cell_text_preserve_style(t6.rows[row_idx].cells[7], str(row_sum))

        # Total row in Table 6 (row 5)
        if len(t6.rows) > 5:
            set_cell_text_preserve_style(t6.rows[5].cells[0], "Total")
            for k_idx in range(6):
                col_sum = sum(tos_counts[u_idx][k_idx] for u_idx in range(2))
                set_cell_text_preserve_style(t6.rows[5].cells[1 + k_idx], str(col_sum) if col_sum > 0 else "0")
            grand_total = sum(sum(r) for r in tos_counts)
            set_cell_text_preserve_style(t6.rows[5].cells[7], str(grand_total))

    # Table 7 (Marks-wise TOS)
    if len(doc.tables) > 7:
        t7 = doc.tables[7]
        for u_idx in range(2):
            row_idx = 3 + u_idx
            if row_idx < len(t7.rows):
                set_cell_text_preserve_style(t7.rows[row_idx].cells[0], unit_labels[u_idx])
                row_sum = 0
                for k_idx in range(6):
                    val = tos_marks[u_idx][k_idx]
                    set_cell_text_preserve_style(t7.rows[row_idx].cells[1 + k_idx], str(val) if val > 0 else "")
                    row_sum += val
                set_cell_text_preserve_style(t7.rows[row_idx].cells[7], str(row_sum))

        # Total row in Table 7 (row 5)
        if len(t7.rows) > 5:
            set_cell_text_preserve_style(t7.rows[5].cells[0], "Total")
            for k_idx in range(6):
                col_sum = sum(tos_marks[u_idx][k_idx] for u_idx in range(2))
                set_cell_text_preserve_style(t7.rows[5].cells[1 + k_idx], str(col_sum) if col_sum > 0 else "0")
            grand_total = sum(sum(r) for r in tos_marks)
            set_cell_text_preserve_style(t7.rows[5].cells[7], str(grand_total))


def _generate_model_paper(doc, config: PaperConfig, part_a: List[Question], part_b: List[List[Question]], part_c: List[Question]):
    # 1. Replace metadata placeholders
    sub_code = (config.subject_code or "").strip()
    sub_name = (config.subject_name or "").strip()
    deg_branch = (config.degree_branch_sem or "").strip()
    sem_val = (config.semester or "").strip()

    for p in doc.paragraphs:
        p_text = p.text
        if "Sub. Code" in p_text or "Sub.Code" in p_text or "Sub.Name" in p_text:
            if sub_code and sub_name:
                p.text = f"Sub. Code/Sub.Name: {sub_code}/ {sub_name}"
            elif sub_code:
                p.text = f"Sub. Code/Sub.Name: {sub_code}"
            elif sub_name:
                p.text = f"Sub. Code/Sub.Name: {sub_name}"
        elif "Degree/Branch/Sem" in p_text or ("Degree" in p_text and "Branch" in p_text):
            parts = []
            if deg_branch:
                parts.append(deg_branch)
            if sem_val and sem_val not in deg_branch:
                parts.append(sem_val)
            full_deg = " / ".join(parts) if parts else "BE/BTECH"
            p.text = f"Degree/Branch/Sem: {full_deg}"

    if config.subject_code:
        replace_text_runs(doc, "OCS353", config.subject_code)
    if config.subject_name:
        replace_text_runs(doc, "Data Science fundamentals", config.subject_name)
    if config.regulation:
        replace_text_runs(doc, "2021-Regulation", config.regulation)
    if config.semester:
        replace_text_runs(doc, "ODD SEMESTER-2025-26", config.semester)
    if config.time:
        replace_text_runs(doc, "3 Hours", config.time)
    if config.max_marks:
        replace_text_runs(doc, "Maximum Marks: 100", f"Maximum Marks: {config.max_marks}")
    if config.set:
        replace_text_runs(doc, "SET-III", config.set)
    if config.exam_name:
        replace_text_runs(doc, "MODEL EXAMINATION", config.exam_name)
    if config.date:
        replace_text_runs(doc, "Date:", f"Date: {config.date}")
        
    # 2. Populate Part A (Table 1)
    t1 = doc.tables[1]
    for idx, q in enumerate(part_a):
        row_idx = 1 + idx
        if row_idx < len(t1.rows):
            set_cell_text_preserve_style(t1.rows[row_idx].cells[1], q.text)
            set_cell_text_preserve_style(t1.rows[row_idx].cells[2], q.kl)
            set_cell_text_preserve_style(t1.rows[row_idx].cells[3], q.co)

    # If Part A has fewer questions (e.g. 5 for CAT-1/CAT-2), trim extra rows
    if len(part_a) < 10 and len(t1.rows) > (1 + len(part_a)):
        remove_table_rows(t1, 1 + len(part_a))
            
    # 3. Populate Part B (Table 2)
    t2 = doc.tables[2]
    for idx, pair in enumerate(part_b):
        row_a_idx = 1 + idx * 3
        row_b_idx = 3 + idx * 3
        
        if row_a_idx < len(t2.rows) and len(pair) > 0:
            q_a = pair[0]
            set_cell_text_preserve_style(t2.rows[row_a_idx].cells[2], q_a.text)
            set_cell_text_preserve_style(t2.rows[row_a_idx].cells[3], q_a.kl)
            set_cell_text_preserve_style(t2.rows[row_a_idx].cells[4], q_a.co)
            
        if row_b_idx < len(t2.rows) and len(pair) > 1:
            q_b = pair[1]
            set_cell_text_preserve_style(t2.rows[row_b_idx].cells[2], q_b.text)
            set_cell_text_preserve_style(t2.rows[row_b_idx].cells[3], q_b.kl)
            set_cell_text_preserve_style(t2.rows[row_b_idx].cells[4], q_b.co)

    # If Part B has fewer pairs (e.g. 2 for CAT-1/CAT-2), trim extra rows
    if len(part_b) < 5 and len(t2.rows) > (1 + len(part_b) * 3):
        remove_table_rows(t2, 1 + len(part_b) * 3)

    # 4. Populate Part C (Table 3)
    t3 = doc.tables[3]
    if len(part_c) >= 2:
        set_cell_text_preserve_style(t3.rows[1].cells[2], part_c[0].text)
        set_cell_text_preserve_style(t3.rows[1].cells[3], part_c[0].kl)
        set_cell_text_preserve_style(t3.rows[1].cells[4], part_c[0].co)
        
        set_cell_text_preserve_style(t3.rows[3].cells[2], part_c[1].text)
        set_cell_text_preserve_style(t3.rows[3].cells[3], part_c[1].kl)
        set_cell_text_preserve_style(t3.rows[3].cells[4], part_c[1].co)

    # 5. Compute Table of Specifications (TOS)
    units_map = {"Unit I": 0, "Unit II": 1, "Unit III": 2, "Unit IV": 3, "Unit V": 4}
    kls_map = {"K1": 0, "K2": 1, "K3": 2, "K4": 3, "K5": 4, "K6": 5}
    
    tos_counts = [[0 for _ in range(6)] for _ in range(5)]
    tos_marks = [[0 for _ in range(6)] for _ in range(5)]
    
    all_selected_questions = []
    all_selected_questions.extend([q for q in part_a if q])
    for pair in part_b:
        if pair:
            all_selected_questions.extend([q for q in pair if q])
    all_selected_questions.extend([q for q in part_c if q])
    
    for q in all_selected_questions:
        u_norm = normalize_unit(q.unit)
        unit_idx = units_map.get(u_norm)
        kl_key = normalize_kl(q.kl)
        kl_idx = kls_map.get(kl_key)

        try:
            m_val = int(q.marks)
        except (ValueError, TypeError):
            m_val = 0
        
        if unit_idx is not None and kl_idx is not None:
            tos_counts[unit_idx][kl_idx] += 1
            tos_marks[unit_idx][kl_idx] += m_val

    # 6. Populate Table 4 (Question-Wise TOS)
    t4 = doc.tables[4]
    for u_idx in range(5):
        row_idx = 2 + u_idx
        row_sum = 0
        for k_idx in range(6):
            val = tos_counts[u_idx][k_idx]
            val_str = str(val) if val > 0 else ""
            set_cell_text_preserve_style(t4.rows[row_idx].cells[1 + k_idx], val_str)
            row_sum += val
        set_cell_text_preserve_style(t4.rows[row_idx].cells[7], str(row_sum))
        
    for k_idx in range(6):
        col_sum = sum(tos_counts[u_idx][k_idx] for u_idx in range(5))
        set_cell_text_preserve_style(t4.rows[7].cells[1 + k_idx], str(col_sum) if col_sum > 0 else "0")
    grand_total_t4 = sum(sum(row) for row in tos_counts)
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
        
    for k_idx in range(6):
        col_sum = sum(tos_marks[u_idx][k_idx] for u_idx in range(5))
        set_cell_text_preserve_style(t5.rows[7].cells[1 + k_idx], str(col_sum) if col_sum > 0 else "0")
    grand_total_t5 = sum(sum(row) for row in tos_marks)
    set_cell_text_preserve_style(t5.rows[7].cells[7], str(grand_total_t5))


def generate_question_paper(
    template_path: str,
    output_path: str,
    config: PaperConfig,
    part_a: List[Question],
    part_b: List[List[Question]],
    part_c: List[Question]
):
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template Word document not found at '{template_path}'")

    doc = docx.Document(template_path)
    
    if len(doc.tables) < 6:
        raise ValueError(f"Template document structure invalid. Expected at least 6 tables, found {len(doc.tables)}.")

    logger.info(f"Generating question paper for {config.subject_code} ({config.set}) - Exam Type: {config.exam_type}")

    is_cat_template = len(doc.tables) >= 9 or "cat" in os.path.basename(template_path).lower()
    
    if is_cat_template:
        _generate_cat_paper(doc, config, part_a, part_b, part_c)
    else:
        _generate_model_paper(doc, config, part_a, part_b, part_c)
        
    doc.save(output_path)
    logger.info(f"Successfully generated question paper document at: {output_path}")
