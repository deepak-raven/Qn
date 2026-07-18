from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime

class Subject(BaseModel):
    code: str = Field(..., description="Subject code, e.g., OCS353")
    name: str = Field(..., description="Subject name, e.g., Data Science fundamentals")
    semester: str = Field(..., description="Semester, e.g., VII")
    regulation: str = Field("2021", description="Regulation year, e.g., 2021")
    uploader_name: Optional[str] = Field(None, description="Name of the person who uploaded this subject")
    qb_filename: Optional[str] = Field(None, description="Filename of the uploaded question bank docx")

    model_config = ConfigDict(populate_by_name=True)

class Question(BaseModel):
    id: Optional[str] = Field(None, alias="_id", description="MongoDB ObjectId string")
    subject_code: str
    semester: str
    text: str
    unit: str  # Unit I, Unit II, Unit III, Unit IV, Unit V
    part: str  # A, B, C
    marks: int # 2, 13, 15
    kl: str    # K1, K2, K3, K4, K5, K6
    co: str    # CO1, CO2, CO3, CO4, CO5

    model_config = ConfigDict(populate_by_name=True)

class PaperConfig(BaseModel):
    institution_name: str = "JAYA EDUCATIONAL TRUST"
    exam_name: str = "MODEL EXAMINATION"
    regulation: str = "2021-Regulation"
    semester: str = "ODD SEMESTER-2025-26"
    subject_code: str = "OCS353"
    subject_name: str = "Data Science fundamentals"
    degree_branch_sem: str = "BE/BTECH/ CIVIL/AERO/MECH/EEE/TEXT/VII"
    time: str = "3 Hours"
    max_marks: int = 100
    set: str = "SET-III"
    date: str = ""

    model_config = ConfigDict(populate_by_name=True)

class GenerateRequest(BaseModel):
    config: PaperConfig
    part_a: List[Question]  # Exactly 10 questions
    part_b: List[List[Question]]  # 5 pairs of questions [[Q11a, Q11b], [Q12a, Q12b], ...]
    part_c: List[Question]  # Exactly 2 questions [Q16a, Q16b]

    model_config = ConfigDict(populate_by_name=True)

# Authentication Models
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    email: Optional[str] = ""
    role: Optional[str] = "user" # "user" or "admin"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
