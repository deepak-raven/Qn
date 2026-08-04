from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime
import re

ALLOWED_DOMAINS = {
    'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 
    'icloud.com', 'zoho.com', 'proton.me', 'protonmail.com'
}

class Subject(BaseModel):
    code: str = Field(..., description="Subject code, e.g., OCS353")
    name: str = Field(..., description="Subject name, e.g., Data Science fundamentals")
    semester: str = Field(..., description="Semester, e.g., VII")
    regulation: str = Field("2021", description="Regulation year, e.g., 2021")
    degree: Optional[str] = Field("B.E", description="Degree, e.g., B.E")
    branch: Optional[str] = Field("CSE", description="Branch, e.g., CSE")
    year: Optional[str] = Field(None, description="Year, e.g., II")
    uploader_name: Optional[str] = Field(None, description="Name of the person who uploaded this subject")
    uploaded_by: Optional[str] = Field(None, description="Email address of the staff member who uploaded this subject")
    qb_filename: Optional[str] = Field(None, description="Filename of the uploaded question bank docx")

    model_config = ConfigDict(populate_by_name=True)

from typing import List, Optional, Any

class Question(BaseModel):
    id: Optional[str] = Field(None, alias="_id", description="MongoDB ObjectId string")
    subject_code: Optional[str] = None
    semester: Optional[str] = None
    text: str
    unit: Optional[str] = "Unit I"
    part: Optional[str] = "A"
    marks: Optional[int] = 2
    kl: Optional[str] = "K1"
    co: Optional[str] = "CO1"
    uploaded_by: Optional[str] = Field(None, description="Email address of the staff member who uploaded this question")

    model_config = ConfigDict(populate_by_name=True)

class PaperConfig(BaseModel):
    institution_name: str = "JAYA EDUCATIONAL TRUST"
    exam_type: str = "MODEL EXAMINATION"
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
    part_a: List[Question]
    part_b: List[Any]
    part_c: List[Any]

    model_config = ConfigDict(populate_by_name=True)

# Authentication Models
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    email: str
    role: Optional[str] = "user" # "user" or "admin"

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        username = v.strip().lower()
        if not re.match(r'^[a-zA-Z0-9_\-\.]{3,30}$', username):
            raise ValueError('Username must be 3-30 characters long and contain only letters, numbers, underscores, hyphens, or dots.')
        return username

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        email = v.strip().lower()
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
            raise ValueError('Please enter a valid email address.')
        return email

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class AdminCreateUserRequest(BaseModel):
    username: str
    password: str
    name: str
    role: str = "user" # "user" or "admin"

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        username = v.strip().lower()
        if not re.match(r'^[a-zA-Z0-9_\-\.]{3,30}$', username):
            raise ValueError('Username must be 3-30 characters long and contain only letters, numbers, underscores, hyphens, or dots.')
        return username
