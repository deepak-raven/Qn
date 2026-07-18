import io
import docx
import pdfplumber
from typing import List, Dict

def parse_question_bank_docx(file_bytes: bytes, subject_code: str, semester: str) -> List[Dict]:
    doc = docx.Document(io.BytesIO(file_bytes))
    questions = []
    
    # 5 Units, 3 tables per unit (2 marks, 13 marks, 15 marks)
    # Total of 15 tables expected in the question bank.
    units = ["Unit I", "Unit II", "Unit III", "Unit IV", "Unit V"]
    parts = ["A", "B", "C"]
    marks_list = [2, 13, 15]

    for table_idx, table in enumerate(doc.tables):
        if table_idx >= 15:
            break  # Only expect 15 tables matching standard syllabus layout
            
        unit_name = units[table_idx // 3]
        part_name = parts[table_idx % 3]
        marks = marks_list[table_idx % 3]
        
        for row_idx, row in enumerate(table.rows):
            if row_idx == 0:
                continue  # Skip table header row
                
            cells = row.cells
            if len(cells) < 4:
                continue
                
            # Column mapping: 
            # 0: S.No, 1: Question, 2: Knowledge Level, 3: Course Outcome
            question_text = cells[1].text.strip()
            kl = cells[2].text.strip()
            co = cells[3].text.strip()
            
            # If the question text is empty (e.g. padding row), skip it
            if not question_text:
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
            
    return questions


def parse_question_bank_pdf(file_bytes: bytes, subject_code: str, semester: str) -> List[Dict]:
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

    # Stitch split tables together by serial numbers
    stitched_tables = []
    for table in all_tables:
        if not table:
            continue
            
        # Check if first row is a header row
        has_header = False
        first_row = table[0]
        if len(first_row) >= 2:
            val = (first_row[1] or "").lower()
            if "question" in val or "questions" in val or "q.no" in val:
                has_header = True
                
        data_rows = table[1:] if has_header else table
        if not data_rows:
            continue
            
        # Get the first serial number of this table block
        first_sno = None
        try:
            sno_str = str(data_rows[0][0] or "").strip().rstrip(".")
            first_sno = int(sno_str)
        except ValueError:
            pass
            
        # If S.No continues from previous table (first_sno > 1 or couldn't parse as int), stitch it!
        if (first_sno is None or first_sno > 1) and stitched_tables:
            stitched_tables[-1].extend(data_rows)
        else:
            # New table starts
            new_table = [["S.No", "Question", "KL", "CO"]] + data_rows
            stitched_tables.append(new_table)

    # Process standard 15 tables
    for table_idx, table in enumerate(stitched_tables):
        if table_idx >= 15:
            break
            
        unit_name = units[table_idx // 3]
        part_name = parts[table_idx % 3]
        marks = marks_list[table_idx % 3]
        
        for row_idx, row in enumerate(table):
            if row_idx == 0:
                continue  # Skip header row
                
            if len(row) < 4:
                continue
                
            # Column mapping: 0: S.No, 1: Question, 2: Knowledge Level, 3: Course Outcome
            question_text = (row[1] or "").strip()
            kl = (row[2] or "").strip()
            co = (row[3] or "").strip()
            
            if not question_text:
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
            
    return questions


import re

def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    full_text = []
    # Extract from first 30 paragraphs
    for p in doc.paragraphs[:30]:
        if p.text.strip():
            full_text.append(p.text.strip())
            
    # Also extract from first few rows of first table if it exists
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
    
    # 1. Subject Code & Subject Name
    # Look for "Sub. Code/Sub.Name: OCS353/ Data Science fundamentals"
    match_both = re.search(r'(?:Sub\.\s*Code/Sub\.\s*Name|Sub\s*Code\s*/\s*Sub\s*Name)\s*:\s*([A-Za-z0-9\-]+)\s*/\s*([^\n\r]+)', text, re.IGNORECASE)
    if match_both:
        metadata["subject_code"] = match_both.group(1).strip()
        metadata["subject_name"] = match_both.group(2).strip()
    else:
        # Look for "Subject Code   : OCS353"
        match_code = re.search(r'Subject\s*Code\s*:\s*([A-Za-z0-9\-]+)', text, re.IGNORECASE)
        if match_code:
            metadata["subject_code"] = match_code.group(1).strip()
            
        # Look for "Subject  : Data Science fundamentals" (avoiding Staff In Charge)
        match_name = re.search(r'Subject\s*:\s*([^:\n\r\t]+)', text, re.IGNORECASE)
        if match_name:
            name_val = match_name.group(1).strip()
            # Clean up if tab or multiple spaces followed by Staff or other fields
            name_val = re.split(r'\s{2,}', name_val)[0]
            metadata["subject_name"] = name_val.strip()

    # 2. Semester
    # Look for Sem: IV/VII or Sem: VII or Degree/Branch/Sem: .../VII
    match_sem_line = re.search(r'(?:Sem|Semester|Year\s*/\s*Sem)\s*:\s*([^\n\r\t]+)', text, re.IGNORECASE)
    if match_sem_line:
        sem_str = match_sem_line.group(1).strip()
        # Clean up multiple spaces
        sem_str = re.split(r'\s{2,}', sem_str)[0]
        # If it has a slash (e.g. IV/VII), extract the last part
        if "/" in sem_str:
            sem_str = sem_str.split("/")[-1].strip()
        metadata["semester"] = sem_str
    else:
        # Fallback to searching for Roman numerals or words in the branch sem line
        match_branch_sem = re.search(r'(?:Degree\s*/\s*Branch\s*/\s*Sem)\s*:\s*([^\n\r]+)', text, re.IGNORECASE)
        if match_branch_sem:
            sem_str = match_branch_sem.group(1).strip().split("/")[-1].strip()
            metadata["semester"] = sem_str

    # 3. Regulation
    # Look for "Regulation    : 2021" or "2021-Regulation"
    match_reg = re.search(r'Regulation\s*:\s*(\d{4})', text, re.IGNORECASE)
    if match_reg:
        metadata["regulation"] = match_reg.group(1).strip()
    else:
        match_reg_dash = re.search(r'(\d{4})\s*-\s*Regulation', text, re.IGNORECASE)
        if match_reg_dash:
            metadata["regulation"] = match_reg_dash.group(1).strip()
            
    return metadata

