import io
import os
import re
import shutil
import logging
import platform
import subprocess
import docx
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


def parse_question_bank_docx(file_bytes: bytes, subject_code: str, semester: str) -> List[Dict[str, Any]]:
    doc = docx.Document(io.BytesIO(file_bytes))
    questions = []
    
    units = ["Unit I", "Unit II", "Unit III", "Unit IV", "Unit V"]
    parts = ["A", "B", "C"]
    marks_list = [2, 13, 15]

    for table_idx, table in enumerate(doc.tables):
        if table_idx >= 15:
            break  # Expect up to 15 standard unit tables
            
        unit_name = units[table_idx // 3]
        part_name = parts[table_idx % 3]
        marks = marks_list[table_idx % 3]
        
        for row_idx, row in enumerate(table.rows):
            if row_idx == 0:
                continue  # Skip header row
                
            cells = row.cells
            if len(cells) < 4:
                continue
                
            question_text = cells[1].text.strip()
            kl = cells[2].text.strip()
            co = cells[3].text.strip()
            
            if not question_text or question_text.lower().startswith("question"):
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

    all_tables = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            if tables:
                all_tables.extend(tables)

    stitched_tables = []
    for table in all_tables:
        if not table:
            continue
            
        has_header = False
        first_row = table[0]
        if len(first_row) >= 2:
            val = (first_row[1] or "").lower()
            if "question" in val or "questions" in val or "q.no" in val:
                has_header = True
                
        data_rows = table[1:] if has_header else table
        if not data_rows:
            continue
            
        first_sno = None
        try:
            sno_str = str(data_rows[0][0] or "").strip().rstrip(".")
            first_sno = int(sno_str)
        except ValueError:
            pass
            
        if (first_sno is None or first_sno > 1) and stitched_tables:
            stitched_tables[-1].extend(data_rows)
        else:
            new_table = [["S.No", "Question", "KL", "CO"]] + data_rows
            stitched_tables.append(new_table)

    for table_idx, table in enumerate(stitched_tables):
        if table_idx >= 15:
            break
            
        unit_name = units[table_idx // 3]
        part_name = parts[table_idx % 3]
        marks = marks_list[table_idx % 3]
        
        for row_idx, row in enumerate(table):
            if row_idx == 0:
                continue
                
            if len(row) < 4:
                continue
                
            question_text = (row[1] or "").strip()
            kl = (row[2] or "").strip()
            co = (row[3] or "").strip()
            
            if not question_text or question_text.lower().startswith("question"):
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
