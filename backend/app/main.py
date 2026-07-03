import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import List
import json

from app.models import Subject, Question, PaperConfig, GenerateRequest
from app.database import get_subjects, add_subject, add_questions, get_questions
from app.parser import parse_question_bank_docx
from app.generator import generate_question_paper

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

@app.post("/api/upload-docx")
async def upload_question_bank(
    file: UploadFile = File(...),
    subject_code: str = Form(...),
    subject_name: str = Form(...),
    semester: str = Form(...),
    regulation: str = Form("2021")
):
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported.")
        
    try:
        # 1. Upsert Subject in database
        subject_data = {
            "code": subject_code,
            "name": subject_name,
            "semester": semester,
            "regulation": regulation
        }
        add_subject(subject_data)
        
        # 2. Parse Question Bank Docx
        file_bytes = await file.read()
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
