import io
import os
import re
import shutil
import logging
import platform
import subprocess
import docx
from docx.text.paragraph import Paragraph
from docx.table import Table
import pdfplumber
from typing import List, Dict, Any, Optional

logger = logging.getLogger("app.parser")


def parse_unit_from_text(text: str):
    if not text:
        return None
    for line in text.split('\n'):
        line_clean = re.sub(r'\s+', ' ', line.upper()).strip()
        m = re.search(r'\bUNIT\s*[-–:]?\s*([IVX\d]+)\b', line_clean)
        if m:
            u = m.group(1)
            mapping = {
                'I': 'Unit I', '1': 'Unit I',
                'II': 'Unit II', '2': 'Unit II',
                'III': 'Unit III', '3': 'Unit III',
                'IV': 'Unit IV', '4': 'Unit IV',
                'V': 'Unit V', '5': 'Unit V'
            }
            if u in mapping:
                return mapping[u]
    return None


def parse_part_marks_from_text(text: str):
    if not text:
        return None, None
    for line in text.split('\n'):
        line_clean = re.sub(r'\s+', ' ', line.lower()).strip()
        if len(line_clean) <= 150:
            # Check Part A / 1 or 2 Marks
            if (re.search(r'\b(one|1)\s*marks?\b', line_clean) or 
                re.search(r'\b(two|2)\s*marks?\b', line_clean) or 
                re.search(r'\bpart\s*[-–:]?\s*a\b', line_clean)):
                m_val = 1 if ('one' in line_clean or '1' in line_clean) else 2
                return 'A', m_val

            # Check Part B / 3 or 13 Marks
            if (re.search(r'\b(three|3)\s*marks?\b', line_clean) or 
                re.search(r'\b(thirteen|13)\s*marks?\b', line_clean) or 
                re.search(r'\bpart\s*[-–:]?\s*b\b', line_clean)):
                m_val = 3 if ('three' in line_clean or '3' in line_clean) else 13
                return 'B', m_val

            # Check Part C / 10, 12, 14, 15, 16 Marks
            if (re.search(r'\b(ten|10)\s*marks?\b', line_clean) or 
                re.search(r'\b(twelve|12)\s*marks?\b', line_clean) or 
                re.search(r'\b(fourteen|14)\s*marks?\b', line_clean) or 
                re.search(r'\b(fifteen|15)\s*marks?\b', line_clean) or 
                re.search(r'\b(sixteen|16)\s*marks?\b', line_clean) or 
                re.search(r'\bpart\s*[-–:]?\s*c\b', line_clean)):
                if 'ten' in line_clean or '10' in line_clean:
                    m_val = 10
                elif 'twelve' in line_clean or '12' in line_clean:
                    m_val = 12
                elif 'fourteen' in line_clean or '14' in line_clean:
                    m_val = 14
                elif 'sixteen' in line_clean or '16' in line_clean:
                    m_val = 16
                else:
                    m_val = 15
                return 'C', m_val
    return None, None


def clean_pdf_cell_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
    text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', text)
    return re.sub(r'\s+', ' ', text).strip()


def merge_continuation_text(prev_text: str, new_text: str) -> str:
    if not prev_text:
        return new_text
    if not new_text:
        return prev_text
    if prev_text.endswith('-'):
        return prev_text[:-1] + new_text
    return prev_text + ' ' + new_text


def is_pdf_table_header_row(cells: List[str]) -> bool:
    if not cells:
        return False
    c0 = cells[0].strip().lower()
    if re.match(r'^(s|q|sl)[\.\s]*no[\.]?$|^question(s)?$', c0):
        return True
    if re.match(r'^\d+[a-z]?$', c0):
        return False
    row_str = " ".join(cells).lower()
    if ('question' in row_str or 'description' in row_str) and ('kl' in row_str or 'co' in row_str or 'level' in row_str or 'bloom' in row_str):
        return True
    return False


def parse_question_bank_docx(file_bytes: bytes, subject_code: str, semester: str) -> List[Dict[str, Any]]:
    doc = docx.Document(io.BytesIO(file_bytes))
    questions = []
    
    units = ["Unit I", "Unit II", "Unit III", "Unit IV", "Unit V"]
    parts = ["A", "B", "C"]
    marks_list = [2, 13, 15]

    current_unit = "Unit I"
    current_part = "A"
    current_marks = 2
    found_any_heading = False
    table_counter = 0

    for element in doc.element.body:
        tag = element.tag.split('}')[-1]
        
        if tag == 'p':
            p = Paragraph(element, doc)
            text = p.text.strip()
            if not text:
                continue
                
            u = parse_unit_from_text(text)
            if u:
                current_unit = u
                found_any_heading = True
                
            p_part, p_marks = parse_part_marks_from_text(text)
            if p_part:
                current_part = p_part
                current_marks = p_marks
                found_any_heading = True

        elif tag == 'tbl':
            table = Table(element, doc)
            if not table.rows:
                continue
                
            header_cells = [c.text.strip().lower() for c in table.rows[0].cells]
            
            row0_text = " ".join([c.text.strip() for c in table.rows[0].cells if c.text.strip()])
            u_r0 = parse_unit_from_text(row0_text)
            if u_r0:
                current_unit = u_r0
                found_any_heading = True
            p_part_r0, p_marks_r0 = parse_part_marks_from_text(row0_text)
            if p_part_r0:
                current_part = p_part_r0
                current_marks = p_marks_r0
                found_any_heading = True

            if len(header_cells) < 3 and not (u_r0 or p_part_r0):
                continue
                
            if not found_any_heading:
                unit_name = units[min(table_counter // 3, 4)]
                part_name = parts[table_counter % 3]
                marks = marks_list[table_counter % 3]
            else:
                unit_name = current_unit
                part_name = current_part
                marks = current_marks

            table_counter += 1

            q_idx = 1
            kl_idx = 2
            co_idx = 3
            
            for idx, c_text in enumerate(header_cells):
                if 'question' in c_text or 'q.no' in c_text or 'description' in c_text:
                    q_idx = idx
                elif 'kl' in c_text or 'knowledge' in c_text or 'bloom' in c_text:
                    kl_idx = idx
                elif 'co' in c_text or 'outcome' in c_text:
                    co_idx = idx

            for row_idx, row in enumerate(table.rows):
                cells = [c.text.strip() for c in row.cells]
                row_text = " ".join([c for c in cells if c])
                
                u_row = parse_unit_from_text(row_text)
                if u_row:
                    current_unit = u_row
                    unit_name = current_unit
                    found_any_heading = True
                p_part_row, p_marks_row = parse_part_marks_from_text(row_text)
                if p_part_row:
                    current_part = p_part_row
                    current_marks = p_marks_row
                    part_name = current_part
                    marks = current_marks
                    found_any_heading = True
                    
                if row_idx == 0:
                    continue
                    
                if (u_row or p_part_row) and (len(cells) <= q_idx or len(cells[q_idx]) < 20):
                    continue

                if len(cells) <= q_idx:
                    continue
                    
                question_text = cells[q_idx]
                kl = cells[kl_idx] if len(cells) > kl_idx else ""
                co = cells[co_idx] if len(cells) > co_idx else ""
                
                if not question_text or question_text.lower().startswith("question") or question_text.lower() == "s. no":
                    continue
                    
                questions.append({
                    "subject_code": subject_code,
                    "semester": semester,
                    "text": question_text,
                    "unit": unit_name,
                    "part": part_name,
                    "marks": marks,
                    "kl": kl,
                    "co": co
                })

    logger.info(f"Parsed {len(questions)} questions from DOCX file.")
    return questions


def parse_question_bank_pdf(file_bytes: bytes, subject_code: str, semester: str) -> List[Dict[str, Any]]:
    questions = []
    
    units = ["Unit I", "Unit II", "Unit III", "Unit IV", "Unit V"]
    parts = ["A", "B", "C"]
    marks_list = [2, 13, 15]

    current_unit = "Unit I"
    current_part = "A"
    current_marks = 2
    found_any_heading = False
    table_counter = 0

    def _process_pdf_pages(pdf_doc, table_settings=None):
        nonlocal current_unit, current_part, current_marks, found_any_heading, table_counter
        parsed_q = []

        for page in pdf_doc.pages:
            tables = page.find_tables(table_settings=table_settings) if table_settings else page.find_tables()
            text_lines = page.extract_text_lines() or []

            items = []
            for l in text_lines:
                items.append(('text', l['top'], l['text']))
            for t in (tables or []):
                items.append(('table', t.bbox[1], t))

            items.sort(key=lambda x: x[1])

            for item_type, top_y, item in items:
                if item_type == 'text':
                    text_str = item.strip()
                    u = parse_unit_from_text(text_str)
                    if u:
                        current_unit = u
                        found_any_heading = True
                    p_part, p_marks = parse_part_marks_from_text(text_str)
                    if p_part:
                        current_part = p_part
                        current_marks = p_marks
                        found_any_heading = True

                elif item_type == 'table':
                    table_obj = item
                    table_data = table_obj.extract()
                    if not table_data or not table_data[0]:
                        continue

                    header_row = [clean_pdf_cell_text(c).lower() for c in table_data[0]]

                    # Check for 1 or 2 column metadata / syllabus / title boxes
                    if len(header_row) < 3:
                        full_tbl_text = " ".join([" ".join([clean_pdf_cell_text(c) for c in row if c]) for row in table_data])
                        u_full = parse_unit_from_text(full_tbl_text)
                        if u_full:
                            current_unit = u_full
                            found_any_heading = True
                        p_part_full, p_marks_full = parse_part_marks_from_text(full_tbl_text)
                        if p_part_full:
                            current_part = p_part_full
                            current_marks = p_marks_full
                            found_any_heading = True
                        continue

                    row0_text = " ".join([c for c in header_row if c])
                    u_r0 = parse_unit_from_text(row0_text)
                    if u_r0:
                        current_unit = u_r0
                        found_any_heading = True
                    p_part_r0, p_marks_r0 = parse_part_marks_from_text(row0_text)
                    if p_part_r0:
                        current_part = p_part_r0
                        current_marks = p_marks_r0
                        found_any_heading = True

                    if not found_any_heading:
                        unit_name = units[min(table_counter // 3, 4)]
                        part_name = parts[table_counter % 3]
                        marks = marks_list[table_counter % 3]
                    else:
                        unit_name = current_unit
                        part_name = current_part
                        marks = current_marks

                    table_counter += 1

                    q_idx = 1
                    kl_idx = 2
                    co_idx = 3

                    first_row_cells = [clean_pdf_cell_text(c) for c in table_data[0]]
                    if is_pdf_table_header_row(first_row_cells):
                        for idx, c_text in enumerate(header_row):
                            if 'question' in c_text or 'q.no' in c_text or 'description' in c_text:
                                q_idx = idx
                            elif 'kl' in c_text or 'knowledge' in c_text or 'bloom' in c_text:
                                kl_idx = idx
                            elif 'co' in c_text or 'outcome' in c_text:
                                co_idx = idx

                    for row in table_data:
                        cells = [clean_pdf_cell_text(c) for c in row]
                        if is_pdf_table_header_row(cells):
                            for idx, c_text in enumerate([c.lower() for c in cells]):
                                if 'question' in c_text or 'q.no' in c_text or 'description' in c_text:
                                    q_idx = idx
                                elif 'kl' in c_text or 'knowledge' in c_text or 'bloom' in c_text:
                                    kl_idx = idx
                                elif 'co' in c_text or 'outcome' in c_text:
                                    co_idx = idx
                            continue

                        row_text = " ".join([c for c in cells if c])
                        u_row = parse_unit_from_text(row_text)
                        if u_row:
                            current_unit = u_row
                            unit_name = current_unit
                            found_any_heading = True
                        p_part_row, p_marks_row = parse_part_marks_from_text(row_text)
                        if p_part_row:
                            current_part = p_part_row
                            current_marks = p_marks_row
                            part_name = current_part
                            marks = current_marks
                            found_any_heading = True

                        if u_row or p_part_row:
                            continue

                        if len(cells) <= q_idx:
                            continue

                        sno_cell = cells[0] if len(cells) > 0 else ""
                        question_text = cells[q_idx]
                        kl = cells[kl_idx] if len(cells) > kl_idx else ""
                        co = cells[co_idx] if len(cells) > co_idx else ""

                        if not question_text or question_text.lower().startswith("question") or question_text.lower() == "s. no":
                            continue

                        is_new_q = bool(re.match(r'^\d+[a-z]?$', sno_cell.lower()))

                        if not is_new_q and parsed_q:
                            parsed_q[-1]["text"] = merge_continuation_text(parsed_q[-1]["text"], question_text)
                            if kl and not parsed_q[-1]["kl"]:
                                parsed_q[-1]["kl"] = kl
                            if co and not parsed_q[-1]["co"]:
                                parsed_q[-1]["co"] = co
                        else:
                            parsed_q.append({
                                "subject_code": subject_code,
                                "semester": semester,
                                "text": question_text,
                                "unit": unit_name,
                                "part": part_name,
                                "marks": marks,
                                "kl": kl,
                                "co": co
                            })
        return parsed_q

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        questions = _process_pdf_pages(pdf)
        
        # Fallback 1: Text-based table strategy if line strategy yields 0 questions
        if not questions:
            logger.info("Default table extraction returned 0 questions. Trying text-strategy table extraction...")
            questions = _process_pdf_pages(pdf, table_settings={"vertical_strategy": "text", "horizontal_strategy": "text"})

        # Fallback 2: Text-line extraction if PDF has no tables at all
        if not questions:
            logger.info("Table extraction returned 0 questions. Trying text-line question parser fallback...")
            c_unit = "Unit I"
            c_part = "A"
            c_marks = 2

            for page in pdf.pages:
                page_text = page.extract_text() or ""
                for line in page_text.split('\n'):
                    line_str = line.strip()
                    if not line_str:
                        continue
                    u = parse_unit_from_text(line_str)
                    if u:
                        c_unit = u
                        continue
                    p_p, p_m = parse_part_marks_from_text(line_str)
                    if p_p:
                        c_part = p_p
                        c_marks = p_m
                        continue

                    # Look for numbered questions: "1. What is...", "1) Explain...", "Q1. ..."
                    q_match = re.match(r'^(?:Q\.?\s*)?(\d+)[\.\)]\s+(.*)', line_str, re.IGNORECASE)
                    if q_match and len(q_match.group(2).strip()) > 10:
                        q_body = q_match.group(2).strip()
                        # Extract trailing KL / CO if present e.g. "(K1, CO1)"
                        kl_match = re.search(r'\b(K[1-6])\b', q_body, re.IGNORECASE)
                        co_match = re.search(r'\b(CO[1-6])\b', q_body, re.IGNORECASE)
                        kl_val = kl_match.group(1).upper() if kl_match else ""
                        co_val = co_match.group(1).upper() if co_match else ""
                        
                        questions.append({
                            "subject_code": subject_code,
                            "semester": semester,
                            "text": q_body,
                            "unit": c_unit,
                            "part": c_part,
                            "marks": c_marks,
                            "kl": kl_val,
                            "co": co_val
                        })
                    elif questions and not line_str.lower().startswith("page ") and not line_str.lower().startswith("question bank"):
                        # Append continuation line to previous question
                        questions[-1]["text"] = merge_continuation_text(questions[-1]["text"], line_str)

    logger.info(f"Parsed {len(questions)} questions from PDF file.")
    return questions


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    full_text = []
    for p in doc.paragraphs[:30]:
        if p.text.strip():
            full_text.append(p.text.strip())
            
    if doc.tables:
        for row in doc.tables[0].rows[:10]:
            row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
            if row_text:
                full_text.append(row_text)
                
    return "\n".join(full_text)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        if pdf.pages:
            return pdf.pages[0].extract_text() or ""
    return ""


ROMAN_TO_NUM = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8}
NUM_TO_ROMAN = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII'}
YEAR_ROMAN = {1: 'I', 2: 'II', 3: 'III', 4: 'IV'}

def derive_year_from_semester(sem_val: Optional[str]) -> str:
    if not sem_val:
        return "II"
    s = sem_val.strip().upper()
    if s in ROMAN_TO_NUM:
        sem_num = ROMAN_TO_NUM[s]
    elif s.isdigit():
        sem_num = int(s)
    else:
        sem_num = None
        for rom, num in ROMAN_TO_NUM.items():
            if re.search(rf'\b{rom}\b', s):
                sem_num = num
                break
        if not sem_num:
            digits = re.findall(r'\d+', s)
            if digits:
                sem_num = int(digits[0])

    if sem_num:
        year_num = (sem_num + 1) // 2
        return YEAR_ROMAN.get(year_num, "II")
    return "II"


def parse_text_metadata(text: str) -> dict:
    metadata = {
        "subject_code": None,
        "subject_name": None,
        "semester": None,
        "year": None,
        "degree": None,
        "branch": None,
        "degree_branch": None,
        "degree_branch_sem": None,
        "regulation": None
    }
    
    match_both = re.search(r'(?:Sub\.[ \t]*Code/Sub\.[ \t]*Name|Sub[ \t]*Code[ \t]*/[ \t]*Sub[ \t]*Name)[ \t]*:[ \t]*([A-Za-z0-9\-]+)[ \t]*/[ \t]*([^\n\r]+)', text, re.IGNORECASE)
    if match_both:
        metadata["subject_code"] = match_both.group(1).strip()
        metadata["subject_name"] = match_both.group(2).strip()
    else:
        match_code = re.search(r'Subject[ \t]*Code[ \t]*:[ \t]*([A-Za-z0-9\-]+)', text, re.IGNORECASE)
        if match_code:
            metadata["subject_code"] = match_code.group(1).strip()
            
        match_name = re.search(r'Subject[ \t]*:[ \t]*([^:\n\r\t]+)', text, re.IGNORECASE)
        if match_name:
            name_val = match_name.group(1).strip()
            name_val = re.split(r'\s{2,}', name_val)[0]
            metadata["subject_name"] = name_val.strip()

    match_deg_br = re.search(r'(?:Degree[ \t]*/[ \t]*Branch)[ \t]*:[ \t]*([^\n\r\t]+)', text, re.IGNORECASE)
    if match_deg_br:
        val = match_deg_br.group(1).strip()
        val = re.split(r'\s{2,}', val)[0]
        parts = [p.strip() for p in val.split('/') if p.strip()]
        if len(parts) >= 2:
            metadata["degree"] = parts[0]
            metadata["branch"] = parts[1]
            metadata["degree_branch"] = f"{parts[0]}/{parts[1]}"
        elif len(parts) == 1:
            metadata["degree_branch"] = parts[0]
            if any(w in parts[0].upper() for w in ["B.E", "BE", "B.TECH", "BTECH"]):
                metadata["degree"] = parts[0]
            else:
                metadata["branch"] = parts[0]
    else:
        match_deg_br_sem = re.search(r'(?:Degree[ \t]*/[ \t]*Branch[ \t]*/[ \t]*Sem)[ \t]*:[ \t]*([^\n\r\t]+)', text, re.IGNORECASE)
        if match_deg_br_sem:
            val = match_deg_br_sem.group(1).strip()
            parts = [p.strip() for p in val.split('/') if p.strip()]
            if len(parts) >= 2:
                metadata["degree"] = parts[0]
                metadata["branch"] = parts[1]
                metadata["degree_branch"] = f"{parts[0]}/{parts[1]}"
            if len(parts) >= 3:
                metadata["semester"] = parts[2]
        else:
            match_deg = re.search(r'Degree[ \t]*:[ \t]*([^\n\r\t]+)', text, re.IGNORECASE)
            match_br = re.search(r'Branch[ \t]*:[ \t]*([^\n\r\t]+)', text, re.IGNORECASE)
            if match_deg:
                metadata["degree"] = match_deg.group(1).strip().split()[0]
            if match_br:
                metadata["branch"] = match_br.group(1).strip().split()[0]
            if metadata["degree"] or metadata["branch"]:
                metadata["degree_branch"] = f"{metadata.get('degree') or 'B.E'}/{metadata.get('branch') or 'CSE'}"

    match_yr_sem = re.search(r'(?:Year[ \t]*/[ \t]*Sem|Year[ \t]*/[ \t]*Semester)[ \t]*:[ \t]*([^\n\r\t]+)', text, re.IGNORECASE)
    if match_yr_sem:
        val = match_yr_sem.group(1).strip()
        val = re.split(r'\s{2,}', val)[0]
        parts = [p.strip() for p in val.split('/') if p.strip()]
        if len(parts) >= 2:
            metadata["year"] = parts[0]
            metadata["semester"] = parts[1]
        elif len(parts) == 1:
            metadata["semester"] = parts[0]

    if not metadata["semester"]:
        match_sem_line = re.search(r'(?:Sem|Semester)[ \t]*:[ \t]*([^\n\r\t]+)', text, re.IGNORECASE)
        if match_sem_line:
            sem_str = match_sem_line.group(1).strip()
            sem_str = re.split(r'\s{2,}', sem_str)[0]
            if "/" in sem_str:
                sem_str = sem_str.split("/")[-1].strip()
            metadata["semester"] = sem_str

    if metadata["semester"]:
        sem_clean = metadata["semester"].strip().upper()
        if sem_clean in ROMAN_TO_NUM:
            metadata["semester"] = sem_clean
        elif sem_clean.isdigit() and int(sem_clean) in NUM_TO_ROMAN:
            metadata["semester"] = NUM_TO_ROMAN[int(sem_clean)]

    if metadata["semester"] and not metadata["year"]:
        metadata["year"] = derive_year_from_semester(metadata["semester"])
    elif not metadata["year"]:
        metadata["year"] = "II"

    if not metadata["degree"]:
        metadata["degree"] = "B.E"
    if not metadata["branch"]:
        metadata["branch"] = "CSE"
    if not metadata["degree_branch"]:
        metadata["degree_branch"] = f"{metadata['degree']}/{metadata['branch']}"

    if metadata["semester"]:
        metadata["degree_branch_sem"] = f"{metadata['degree_branch']} / {metadata['semester']}"
    else:
        metadata["degree_branch_sem"] = metadata['degree_branch']

    match_reg = re.search(r'Regulation[ \t]*:[ \t]*(\d{4})', text, re.IGNORECASE)
    if match_reg:
        metadata["regulation"] = match_reg.group(1).strip()
    else:
        match_reg_dash = re.search(r'(\d{4})[ \t]*-[ \t]*Regulation', text, re.IGNORECASE)
        if match_reg_dash:
            metadata["regulation"] = match_reg_dash.group(1).strip()
        else:
            match_reg_paren = re.search(r'\((\d{4})[ \t]*-[ \t]*REGULATION\)', text, re.IGNORECASE)
            if match_reg_paren:
                metadata["regulation"] = match_reg_paren.group(1).strip()
            else:
                match_reg_word = re.search(r'Regulation[ \t]*(\d{4})', text, re.IGNORECASE)
                if match_reg_word:
                    metadata["regulation"] = match_reg_word.group(1).strip()

    return metadata
