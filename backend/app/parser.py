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
