import os
import re
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import List
import json

from app.models import Subject, Question, PaperConfig, GenerateRequest
from app.database import get_subjects, add_subject, add_questions, get_questions
from app.parser import parse_question_bank_docx, parse_question_bank_pdf, extract_text_from_docx, extract_text_from_pdf, parse_text_metadata
from app.generator import generate_question_paper

UPLOADED_QBS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploaded_qbs"))
os.makedirs(UPLOADED_QBS_DIR, exist_ok=True)

def sanitize_filename(name: str) -> str:
    # Remove characters that aren't letters, numbers, spaces, hyphens, or underscores
    return re.sub(r'[^\w\s-]', '', name).strip()

app = FastAPI(title="Question Paper Generator API")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure templates directory exists and copy the MODEL QUESTION file if available
TEMPLATES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "templates"))
os.makedirs(TEMPLATES_DIR, exist_ok=True)

TEMPLATE_NAME = "MODEL QUESTION.docx"
TEMPLATE_PATH = os.path.join(TEMPLATES_DIR, TEMPLATE_NAME)

# Self-healing copy of the template from parent directory
PARENT_TEMPLATE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "MODEL  QUESTION.docx"))
if not os.path.exists(TEMPLATE_PATH) and os.path.exists(PARENT_TEMPLATE_PATH):
    shutil.copy(PARENT_TEMPLATE_PATH, TEMPLATE_PATH)
    print(f"Copied template from parent directory to: {TEMPLATE_PATH}")

CURRICULUM_PATH = os.path.join(os.path.dirname(__file__), "curriculum.json")

@app.get("/api/curriculum")
def get_curriculum():
    try:
        with open(CURRICULUM_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/subjects")
def list_subjects():
    try:
        return get_subjects()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/subjects")
def create_subject(subject: Subject):
    try:
        add_subject(subject.dict())
        return {"status": "success", "message": f"Subject {subject.code} added successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def convert_doc_to_docx(doc_path: str, docx_path: str):
    import os
    import sys
    
    # Add pywin32 DLL directory to search path for Python 3.8+ on Windows
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
        doc = word.Documents.Open(os.path.abspath(doc_path))
        doc.SaveAs2(os.path.abspath(docx_path), FileFormat=16) # FileFormat=16 for .docx
        doc.Close()
    finally:
        if word:
            word.Quit()
        pythoncom.CoUninitialize()

@app.post("/api/upload-docx")
async def upload_question_bank(
    file: UploadFile = File(...),
    subject_code: str = Form(...),
    subject_name: str = Form(...),
    semester: str = Form(...),
    regulation: str = Form("2021"),
    uploader_name: str = Form("System")
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".docx", ".pdf", ".doc"]:
        raise HTTPException(status_code=400, detail="Only .docx, .pdf, and .doc files are supported.")
        
    try:
        # Read file bytes
        file_bytes = await file.read()
        
        # Save file under formatted name: <subcode> <Subject> QB <uploadername>.<ext>
        safe_subject_name = sanitize_filename(subject_name)
        safe_uploader = sanitize_filename(uploader_name)
        filename = f"{subject_code} {safe_subject_name} QB {safe_uploader}{ext}"
        file_path = os.path.join(UPLOADED_QBS_DIR, filename)
        
        with open(file_path, "wb") as f:
            f.write(file_bytes)
            
        # 1. Upsert Subject in database
        subject_data = {
            "code": subject_code,
            "name": subject_name,
            "semester": semester,
            "regulation": regulation,
            "uploader_name": uploader_name,
            "qb_filename": filename
        }
        add_subject(subject_data)
        
        # 2. Parse Question Bank Docx, Pdf, or Doc
        if ext == ".pdf":
            questions = parse_question_bank_pdf(file_bytes, subject_code, semester)
        elif ext == ".doc":
            docx_filename = f"{subject_code} {safe_subject_name} QB {safe_uploader}.docx"
            docx_file_path = os.path.join(UPLOADED_QBS_DIR, docx_filename)
            try:
                convert_doc_to_docx(file_path, docx_file_path)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to convert .doc to .docx: {str(e)}")
            
            with open(docx_file_path, "rb") as f:
                docx_bytes = f.read()
            questions = parse_question_bank_docx(docx_bytes, subject_code, semester)
            
            # Update database to point to the converted docx
            subject_data["qb_filename"] = docx_filename
            add_subject(subject_data)
        else:
            questions = parse_question_bank_docx(file_bytes, subject_code, semester)
        
        if not questions:
            raise HTTPException(status_code=400, detail="No questions were extracted from the document. Please verify the table structure.")
            
        # 3. Save questions to MongoDB
        add_questions(questions)
        
        return {
            "status": "success",
            "message": f"Question bank uploaded successfully. Parsed {len(questions)} questions.",
            "subject": subject_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".docx", ".pdf", ".doc"]:
        raise HTTPException(status_code=400, detail="Only .docx, .pdf, and .doc files are supported.")
        
    try:
        file_bytes = await file.read()
        
        # Save temp file for conversion if .doc
        if ext == ".doc":
            temp_doc_path = os.path.join(UPLOADED_QBS_DIR, f"temp_analyze_{file.filename}")
            temp_docx_path = temp_doc_path + "x"
            with open(temp_doc_path, "wb") as f:
                f.write(file_bytes)
            try:
                convert_doc_to_docx(temp_doc_path, temp_docx_path)
                with open(temp_docx_path, "rb") as f:
                    file_bytes = f.read()
                ext = ".docx"
            except Exception as conv_err:
                raise HTTPException(status_code=500, detail=f"Failed to convert .doc for analysis: {str(conv_err)}")
            finally:
                if os.path.exists(temp_doc_path):
                    try: os.remove(temp_doc_path)
                    except: pass
                if os.path.exists(temp_docx_path):
                    try: os.remove(temp_docx_path)
                    except: pass
                    
        # Extract text based on final file type (.docx or .pdf)
        if ext == ".pdf":
            text = extract_text_from_pdf(file_bytes)
        else:
            text = extract_text_from_docx(file_bytes)
            
        metadata = parse_text_metadata(text)
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/questions")
def fetch_questions(subject_code: str, semester: str):
    try:
        questions = get_questions(subject_code, semester)
        return questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-docx")
def generate_docx(payload: GenerateRequest):
    if not os.path.exists(TEMPLATE_PATH):
        raise HTTPException(
            status_code=500, 
            detail=f"Template file '{TEMPLATE_NAME}' not found in backend templates folder. Please upload or copy it there first."
        )
        
    try:
        output_filename = f"Generated_Paper_{payload.config.subject_code}.docx"
        output_path = os.path.join(TEMPLATES_DIR, output_filename)
        
        # Call the generator logic
        generate_question_paper(
            template_path=TEMPLATE_PATH,
            output_path=output_path,
            config=payload.config,
            part_a=payload.part_a,
            part_b=payload.part_b,
            part_c=payload.part_c
        )
        
        if not os.path.exists(output_path):
            raise HTTPException(status_code=500, detail="Document generation failed to produce output file.")
            
        return FileResponse(
            path=output_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=output_filename
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
