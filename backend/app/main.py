import os
import re
import shutil
import json
import logging
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
import anyio
import anyio.to_thread

from app.config import settings
from app.models import Subject, Question, PaperConfig, GenerateRequest, LoginRequest, RegisterRequest, TokenResponse, AdminCreateUserRequest
from app.database import (
    init_db,
    close_db,
    get_subjects,
    add_subject,
    add_questions,
    get_questions,
    get_common_questions_pool,
    get_admin_stats,
    get_user_storage_breakdown,
    get_all_uploads_detailed,
    delete_question_bank,
    get_db,
    create_user,
    delete_user,
    get_user_by_username,
    get_user_by_username_or_email
)
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_admin
)
from app.parser import (
    parse_question_bank_docx,
    parse_question_bank_pdf,
    extract_text_from_docx,
    extract_text_from_pdf,
    parse_text_metadata,
    convert_doc_to_docx
)
from app.generator import generate_question_paper
import hashlib

# Configure Logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("app.main")

UPLOADED_QBS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploaded_qbs"))
TEMPLATES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "templates"))
CURRICULUM_PATH = os.path.join(os.path.dirname(__file__), "curriculum.json")

os.makedirs(UPLOADED_QBS_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

TEMPLATE_NAME = "MODEL QUESTION.docx"
TEMPLATE_PATH = os.path.join(TEMPLATES_DIR, TEMPLATE_NAME)
PARENT_TEMPLATE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "MODEL  QUESTION.docx"))

CAT_TEMPLATE_NAME = "cat.docx"
CAT_TEMPLATE_PATH = os.path.join(TEMPLATES_DIR, CAT_TEMPLATE_NAME)
PARENT_CAT_TEMPLATE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "cat.docx"))

if not os.path.exists(TEMPLATE_PATH) and os.path.exists(PARENT_TEMPLATE_PATH):
    shutil.copy(PARENT_TEMPLATE_PATH, TEMPLATE_PATH)
    logger.info(f"Copied template file from parent directory to: {TEMPLATE_PATH}")

if not os.path.exists(CAT_TEMPLATE_PATH) and os.path.exists(PARENT_CAT_TEMPLATE_PATH):
    shutil.copy(PARENT_CAT_TEMPLATE_PATH, CAT_TEMPLATE_PATH)
    logger.info(f"Copied CAT template file from parent directory to: {CAT_TEMPLATE_PATH}")

def sanitize_filename(name: str) -> str:
    return re.sub(r'[^\w\s-]', '', name).strip()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application starting up...")
    await init_db()
    yield
    logger.info("Application shutting down...")
    await close_db()

app = FastAPI(
    title="Question Paper Generator API",
    version="2.0.0",
    description="Production-Grade API for Question Bank Parsing & Paper Generation with Auth",
    lifespan=lifespan
)

# CORS Configuration
allowed_cors_origins = settings.CORS_ORIGINS if "*" not in settings.CORS_ORIGINS else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Question Paper Generator API",
        "version": "2.0.0"
    }


# Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "detail": exc.detail}
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"status": "error", "detail": "An internal server error occurred."}
    )


# --- Authentication Routes ---

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(payload: RegisterRequest):
    try:
        user_doc = {
            "username": payload.username.strip().lower(),
            "name": payload.name.strip(),
            "email": payload.email.strip() if payload.email else "",
            "password_hash": hash_password(payload.password),
            "role": payload.role if payload.role in ["user", "admin"] else "user",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        created_user = await create_user(user_doc)
        
        token = create_access_token({"sub": created_user["username"], "role": created_user["role"]})
        user_info = {
            "username": created_user["username"],
            "name": created_user["name"],
            "email": created_user.get("email", ""),
            "role": created_user["role"]
        }
        return {"access_token": token, "token_type": "bearer", "user": user_info}
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(status_code=500, detail="Failed to register user account.")

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    username = payload.username.strip().lower()
    user = await get_user_by_username_or_email(username)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )
        
    token = create_access_token({"sub": user["username"], "role": user.get("role", "user")})
    user_info = {
        "username": user["username"],
        "name": user["name"],
        "email": user.get("email", ""),
        "role": user.get("role", "user")
    }
    return {"access_token": token, "token_type": "bearer", "user": user_info}

@app.get("/api/auth/me")
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "name": current_user["name"],
        "email": current_user.get("email", ""),
        "role": current_user.get("role", "user")
    }


# --- Core API Routes ---

@app.get("/api/curriculum")
async def get_curriculum():
    if not os.path.exists(CURRICULUM_PATH):
        raise HTTPException(status_code=404, detail="Curriculum database file not found.")
    try:
        def read_json():
            with open(CURRICULUM_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        return await anyio.to_thread.run_sync(read_json)
    except Exception as e:
        logger.error(f"Error reading curriculum: {e}")
        raise HTTPException(status_code=500, detail="Failed to load curriculum data.")

@app.get("/api/subjects")
async def list_all_subjects(uploaded_by: Optional[str] = None):
    try:
        return await get_subjects(uploaded_by)
    except Exception as e:
        logger.error(f"Error listing subjects: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve subjects from database.")

@app.post("/api/subjects")
async def create_new_subject(subject: Subject):
    try:
        await add_subject(subject.model_dump())
        return {"status": "success", "message": f"Subject {subject.code} added successfully."}
    except Exception as e:
        logger.error(f"Error creating subject: {e}")
        raise HTTPException(status_code=500, detail="Failed to create subject in database.")

@app.post("/api/upload-docx")
async def upload_question_bank(
    file: UploadFile = File(...),
    subject_code: str = Form(...),
    subject_name: str = Form(...),
    semester: str = Form(...),
    regulation: str = Form("2021"),
    uploader_name: str = Form("System"),
    uploaded_by: str = Form(...)
):
    uploaded_filename = file.filename or "unknown"
    ext = os.path.splitext(uploaded_filename)[1].lower()
    if ext not in [".docx", ".pdf", ".doc"]:
        raise HTTPException(status_code=400, detail="Only .docx, .pdf, and .doc files are supported.")
        
    try:
        file_bytes = await file.read()
        
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=400, 
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        safe_subject_name = sanitize_filename(subject_name)
        safe_uploader = sanitize_filename(uploader_name)
        filename = f"{subject_code} {safe_subject_name} QB {safe_uploader}{ext}"
        file_path = os.path.join(UPLOADED_QBS_DIR, filename)
        
        def save_file():
            with open(file_path, "wb") as f:
                f.write(file_bytes)
        await anyio.to_thread.run_sync(save_file)
            
        subject_data = {
            "code": subject_code,
            "name": subject_name,
            "semester": semester,
            "regulation": regulation,
            "uploader_name": uploader_name,
            "uploaded_by": uploaded_by,
            "qb_filename": filename
        }
        await add_subject(subject_data)
        
        if ext == ".pdf":
            questions = await anyio.to_thread.run_sync(parse_question_bank_pdf, file_bytes, subject_code, semester)
        elif ext == ".doc":
            docx_filename = f"{subject_code} {safe_subject_name} QB {safe_uploader}.docx"
            docx_file_path = os.path.join(UPLOADED_QBS_DIR, docx_filename)
            try:
                await anyio.to_thread.run_sync(convert_doc_to_docx, file_path, docx_file_path)
            except Exception as conv_err:
                raise HTTPException(status_code=500, detail=f"Failed to convert .doc file: {str(conv_err)}")
            
            def read_converted():
                with open(docx_file_path, "rb") as f:
                    return f.read()
            docx_bytes = await anyio.to_thread.run_sync(read_converted)
            questions = await anyio.to_thread.run_sync(parse_question_bank_docx, docx_bytes, subject_code, semester)
            
            subject_data["qb_filename"] = docx_filename
            await add_subject(subject_data)
        else:
            questions = await anyio.to_thread.run_sync(parse_question_bank_docx, file_bytes, subject_code, semester)
        
        if not questions:
            raise HTTPException(
                status_code=400, 
                detail="No questions could be parsed from the uploaded document. Please check the document table structure."
            )
            
        # Inject uploaded_by into questions
        for q in questions:
            q["uploaded_by"] = uploaded_by

        await add_questions(questions, uploader_name)
        
        return {
            "status": "success",
            "message": f"Question bank uploaded successfully. Parsed {len(questions)} questions.",
            "subject": subject_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during question bank upload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload processing failed: {str(e)}")

@app.post("/api/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    uploaded_filename = file.filename or "unknown"
    ext = os.path.splitext(uploaded_filename)[1].lower()
    if ext not in [".docx", ".pdf", ".doc"]:
        raise HTTPException(status_code=400, detail="Only .docx, .pdf, and .doc files are supported.")
        
    try:
        file_bytes = await file.read()
        
        if ext == ".doc":
            temp_doc_path = os.path.join(UPLOADED_QBS_DIR, f"temp_analyze_{sanitize_filename(uploaded_filename)}.doc")
            temp_docx_path = temp_doc_path + "x"
            
            def save_temp():
                with open(temp_doc_path, "wb") as f:
                    f.write(file_bytes)
            await anyio.to_thread.run_sync(save_temp)
            
            try:
                await anyio.to_thread.run_sync(convert_doc_to_docx, temp_doc_path, temp_docx_path)
                def read_temp_docx():
                    with open(temp_docx_path, "rb") as f:
                        return f.read()
                file_bytes = await anyio.to_thread.run_sync(read_temp_docx)
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
                    
        if ext == ".pdf":
            text = await anyio.to_thread.run_sync(extract_text_from_pdf, file_bytes)
        else:
            text = await anyio.to_thread.run_sync(extract_text_from_docx, file_bytes)
            
        metadata = parse_text_metadata(text)
        return metadata
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing file metadata: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to analyze document metadata.")

@app.get("/api/questions")
async def fetch_questions(subject_code: str, semester: str, uploaded_by: str):
    try:
        return await get_questions(subject_code, semester, uploaded_by)
    except Exception as e:
        logger.error(f"Error fetching questions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch questions from database.")

@app.get("/api/questions/common")
async def fetch_common_questions(
    part: str,
    unit: str = "All",
    search: str = "",
    exclude_subject_code: str = ""
):
    try:
        return await get_common_questions_pool(
            part=part,
            unit=unit,
            search=search,
            exclude_subject_code=exclude_subject_code
        )
    except Exception as e:
        logger.error(f"Error fetching common questions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch common questions pool.")


@app.post("/api/generate-docx")
async def generate_docx(payload: GenerateRequest):
    exam_type = (payload.config.exam_type or "").upper()
    is_cat = exam_type in ["CAT-1", "CAT-2", "IAT-1", "IAT-2"]
    
    template_to_use = CAT_TEMPLATE_PATH if (is_cat and os.path.exists(CAT_TEMPLATE_PATH)) else TEMPLATE_PATH
    
    if not os.path.exists(template_to_use):
        raise HTTPException(
            status_code=500, 
            detail=f"Template file '{os.path.basename(template_to_use)}' not found in backend templates folder."
        )
        
    try:
        output_filename = f"Generated_Paper_{payload.config.subject_code}_{sanitize_filename(payload.config.set)}.docx"
        output_path = os.path.join(TEMPLATES_DIR, output_filename)
        
        await anyio.to_thread.run_sync(
            generate_question_paper,
            template_to_use,
            output_path,
            payload.config,
            payload.part_a,
            payload.part_b,
            payload.part_c
        )
        
        if not os.path.exists(output_path):
            raise HTTPException(status_code=500, detail="Document generation failed to produce output file.")
            
        return FileResponse(
            path=output_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=output_filename
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating paper: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate paper: {str(e)}")


# --- Admin Routes (Protected with Admin Auth) ---

@app.get("/api/admin/stats")
async def admin_stats(admin_user: Dict[str, Any] = Depends(get_current_admin)):
    try:
        return await get_admin_stats(UPLOADED_QBS_DIR)
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch system statistics.")

@app.get("/api/admin/users")
async def admin_users(admin_user: Dict[str, Any] = Depends(get_current_admin)):
    try:
        return await get_user_storage_breakdown(UPLOADED_QBS_DIR)
    except Exception as e:
        logger.error(f"Error fetching admin users breakdown: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user storage breakdown.")

@app.get("/api/admin/uploads")
async def admin_uploads(admin_user: Dict[str, Any] = Depends(get_current_admin)):
    try:
        return await get_all_uploads_detailed(UPLOADED_QBS_DIR)
    except Exception as e:
        logger.error(f"Error fetching admin uploads list: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch upload list.")

@app.delete("/api/admin/subjects/{subject_code}/{semester}")
async def delete_subject_bank(subject_code: str, semester: str, admin_user: Dict[str, Any] = Depends(get_current_admin)):
    try:
        success = await delete_question_bank(subject_code, semester, UPLOADED_QBS_DIR)
        if not success:
            raise HTTPException(status_code=404, detail="Question bank not found.")
        return {"status": "success", "message": f"Question bank {subject_code} deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting question bank: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete question bank.")

@app.delete("/api/subjects/{subject_code}/{semester}")
async def delete_user_subject_bank(
    subject_code: str,
    semester: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        database = get_db()
        subject = await database["subjects"].find_one({"code": subject_code, "semester": semester})
        if not subject:
            subject = await database["subjects"].find_one({"code": subject_code})
            
        if not subject:
            raise HTTPException(status_code=404, detail="Question bank not found.")
            
        is_admin = current_user.get("role") == "admin"
        is_owner = subject.get("uploaded_by") == current_user["username"]
        
        if not (is_admin or is_owner):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this question bank. It was uploaded by another user."
            )
            
        success = await delete_question_bank(subject["code"], subject["semester"], UPLOADED_QBS_DIR)
        if not success:
            raise HTTPException(status_code=404, detail="Question bank not found.")
            
        return {"status": "success", "message": f"Question bank {subject_code} deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting question bank: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete question bank.")

@app.post("/api/admin/users")
async def create_user_by_admin(
    payload: AdminCreateUserRequest,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    try:
        existing = await get_user_by_username(payload.username)
        if existing:
            raise HTTPException(status_code=400, detail=f"Username '{payload.username}' already exists.")
        user_doc = {
            "username": payload.username.strip().lower(),
            "name": payload.name.strip(),
            "email": "",
            "password_hash": hash_password(payload.password),
            "role": payload.role if payload.role in ["user", "admin"] else "user",
            "created_at": datetime.utcnow().isoformat()
        }
        user_data = await create_user(user_doc)
        return {"status": "success", "message": f"User '{payload.username}' created successfully.", "user": user_data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user by admin: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@app.delete("/api/admin/users/{username}")
async def remove_user_by_admin(
    username: str,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    if username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete default system administrator account.")
        
    try:
        success = await delete_user(username, UPLOADED_QBS_DIR)
        if not success:
            raise HTTPException(status_code=404, detail=f"User '{username}' not found.")
        return {"status": "success", "message": f"User '{username}' deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")
