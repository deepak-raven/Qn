import os
from pymongo import MongoClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = "question_paper_generator"

client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]

subjects_col = db["subjects"]
questions_col = db["questions"]

def get_subjects():
    return list(subjects_col.find({}, {"_id": 0}))

def add_subject(subject_data: dict):
    # Upsert subject based on code
    subjects_col.update_one(
        {"code": subject_data["code"]},
        {"$set": subject_data},
        upsert=True
    )

def add_questions(questions: list):
    if not questions:
        return
    # Delete existing questions for this subject/semester to avoid duplicates on re-upload
    subject_code = questions[0]["subject_code"]
    semester = questions[0]["semester"]
    questions_col.delete_many({"subject_code": subject_code, "semester": semester})
    
    # Bulk insert
    questions_col.insert_many(questions)

def get_questions(subject_code: str, semester: str):
    q_list = list(questions_col.find({"subject_code": subject_code, "semester": semester}))
    for q in q_list:
        q["_id"] = str(q["_id"])  # Convert ObjectId to string for JSON serialization
    return q_list
