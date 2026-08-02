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
from typing import List, Dict, Any

logger = logging.getLogger("app.parser")

def convert_doc_to_docx(doc_path: str, docx_path: str):
    """
    Converts .doc file to .docx format.
    Supports LibreOffice (Linux/macOS/Windows) and MS Word COM Automation (Windows).
    """
    doc_path_abs = os.path.abspath(doc_path)
    docx_path_abs = os.path.abspath(docx_path)
    
    # 1. Try LibreOffice CLI if installed
    soffice_cmd = shutil.which("soffice") or shutil.which("libreoffice")
    if soffice_cmd:
        try:
            output_dir = os.path.dirname(docx_path_abs)
            cmd = [soffice_cmd, "--headless", "--convert-to", "docx", doc_path_abs, "--outdir", output_dir]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
            if res.returncode == 0 and os.path.exists(docx_path_abs):
                logger.info("Successfully converted .doc to .docx using LibreOffice.")
                return
        except Exception as e:
            logger.warning(f"LibreOffice conversion attempted but failed: {e}")

    # 2. Try Windows MS Word COM Automation
    if platform.system() == "Windows":
        try:
            import sys
            for p in sys.path:
                candidate = os.path.join(p, "pywin32_system32")
                if os.path.isdir(candidate):
                    try:
                        os.add_dll_directory(candidate)
                        break
                    except Exception:
                        pass
            import pythoncom
            import win32com.client

            pythoncom.CoInitialize()
            word = None
            try:
                word = win32com.client.Dispatch("Word.Application")
                word.Visible = False
                doc = word.Documents.Open(doc_path_abs)
                doc.SaveAs2(docx_path_abs, FileFormat=16) # FileFormat 16 = .docx
                doc.Close()
                logger.info("Successfully converted .doc to .docx using MS Word COM.")
                return
            finally:
                if word:
                    word.Quit()
                pythoncom.CoUninitialize()
        except Exception as win_err:
            raise RuntimeError(f"Windows Word COM conversion failed: {win_err}. Ensure MS Word or LibreOffice is installed.")

    raise RuntimeError("No conversion tool available: Please install Microsoft Word or LibreOffice on the server to process legacy .doc files.")


def parse_unit_from_text(text: str):
    if not text:
        return None
    for line in text.split('\n'):
        line_clean = re.sub(r'\s+', ' ', line.upper()).strip()
        if len(line_clean) <= 120:
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
        if len(line_clean) <= 120:
            if 'two mark' in line_clean or '2 mark' in line_clean or re.search(r'\bpart\s*[-–:]?\s*a\b', line_clean):
                return 'A', 2
            if 'thirteen mark' in line_clean or '13 mark' in line_clean or re.search(r'\bpart\s*[-–:]?\s*b\b', line_clean):
                return 'B', 13
            if 'fifteen mark' in line_clean or '15 mark' in line_clean or 'fourteen mark' in line_clean or '14 mark' in line_clean or re.search(r'\bpart\s*[-–:]?\s*c\b', line_clean):
                return 'C', 15
    return None, None

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
            
            # Check if Row 0 itself is an in-cell header
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
                continue  # Skip cover/metadata tables with fewer than 3 columns unless it's an in-cell section header
                
            if not found_any_heading:
                unit_name = units[min(table_counter // 3, 4)]
                part_name = parts[table_counter % 3]
                marks = marks_list[table_counter % 3]
            else:
                unit_name = current_unit
                part_name = current_part
                marks = current_marks

            table_counter += 1

            # Determine column positions dynamically
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
                
                # Check for in-cell heading rows
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
                    continue  # Skip header row
                    
                if (u_row or p_part_row) and (len(cells) <= q_idx or len(cells[q_idx]) < 20):
                    continue  # Skip divider heading rows inside table

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

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            lines = page_text.split('\n')
            for line in lines:
                u = parse_unit_from_text(line)
                if u:
                    current_unit = u
                    found_any_heading = True
                p_part, p_marks = parse_part_marks_from_text(line)
                if p_part:
                    current_part = p_part
                    current_marks = p_marks
                    found_any_heading = True

            tables = page.extract_tables()
            for table in (tables or []):
                if not table or not table[0]:
                    continue
                    
                header_row = [(c or "").strip().lower() for c in table[0]]
                row0_text = " ".join(header_row)
                u_r0 = parse_unit_from_text(row0_text)
                if u_r0:
                    current_unit = u_r0
                    found_any_heading = True
                p_part_r0, p_marks_r0 = parse_part_marks_from_text(row0_text)
                if p_part_r0:
                    current_part = p_part_r0
                    current_marks = p_marks_r0
                    found_any_heading = True

                if len(header_row) < 3 and not (u_r0 or p_part_r0):
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
                has_header = False
                
                for idx, c_text in enumerate(header_row):
                    if 'question' in c_text or 'q.no' in c_text or 'description' in c_text or 's.no' in c_text:
                        has_header = True
                    if 'question' in c_text or 'q.no' in c_text or 'description' in c_text:
                        q_idx = idx
                    elif 'kl' in c_text or 'knowledge' in c_text or 'bloom' in c_text:
                        kl_idx = idx
                    elif 'co' in c_text or 'outcome' in c_text:
                        co_idx = idx

                data_rows = table[1:] if has_header else table

                for row in data_rows:
                    cells = [(c or "").strip() for c in row]
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


def parse_text_metadata(text: str) -> dict:
    metadata = {
        "subject_code": None,
        "subject_name": None,
        "semester": None,
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

    match_sem_line = re.search(r'(?:Sem|Semester|Year[ \t]*/[ \t]*Sem)[ \t]*:[ \t]*([^\n\r\t]+)', text, re.IGNORECASE)
    if match_sem_line:
        sem_str = match_sem_line.group(1).strip()
        sem_str = re.split(r'\s{2,}', sem_str)[0]
        if "/" in sem_str:
            sem_str = sem_str.split("/")[-1].strip()
        metadata["semester"] = sem_str
    else:
        match_branch_sem = re.search(r'(?:Degree[ \t]*/[ \t]*Branch[ \t]*/[ \t]*Sem)[ \t]*:[ \t]*([^\n\r]+)', text, re.IGNORECASE)
        if match_branch_sem:
            sem_str = match_branch_sem.group(1).strip().split("/")[-1].strip()
            metadata["semester"] = sem_str

    match_reg = re.search(r'Regulation[ \t]*:[ \t]*(\d{4})', text, re.IGNORECASE)
    if match_reg:
        metadata["regulation"] = match_reg.group(1).strip()
    else:
        match_reg_dash = re.search(r'(\d{4})[ \t]*-[ \t]*Regulation', text, re.IGNORECASE)
        if match_reg_dash:
            metadata["regulation"] = match_reg_dash.group(1).strip()
            
    return metadata
