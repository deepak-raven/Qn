import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import motor.motor_asyncio
from bson import ObjectId

from app.config import settings

logger = logging.getLogger("app.database")

client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
db: Optional[motor.motor_asyncio.AsyncIOMotorDatabase] = None

def format_bytes(size: int) -> str:
    if size <= 0:
        return "0 B"
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} PB"

async def init_db():
    global client, db
    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGO_URI}...")
        client = motor.motor_asyncio.AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000
        )
        db = client[settings.MONGO_DB_NAME]
        
        # Ping the database
        await client.admin.command('ping')
        logger.info("Successfully connected to MongoDB.")

        # Create Indexes for fast lookup
        await db["subjects"].create_index([("code", 1), ("semester", 1), ("uploaded_by", 1)])
        await db["questions"].create_index([("subject_code", 1), ("semester", 1), ("uploaded_by", 1)])
        await db["users"].create_index("username", unique=True)
        
        # Seed default admin if not existing
        admin_user = await db["users"].find_one({"username": "admin"})
        if not admin_user:
            import bcrypt
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw("admin123".encode("utf-8"), salt).decode("utf-8")
            await db["users"].insert_one({
                "username": "admin",
                "name": "System Administrator",
                "email": "admin@jaya.edu.in",
                "password_hash": hashed,
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info("Default admin user created: admin / admin123")
            
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise e

async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")

def get_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    if db is None:
        raise RuntimeError("Database is not initialized. Call init_db() first.")
    return db


# --- User Database Helpers ---

async def create_user(user_data: dict) -> dict:
    database = get_db()
    existing = await database["users"].find_one({"username": user_data["username"]})
    if existing:
        raise ValueError(f"Username '{user_data['username']}' already exists.")
        
    await database["users"].insert_one(user_data)
    user_data["_id"] = str(user_data["_id"])
    return user_data

async def get_user_by_username(username: str) -> Optional[dict]:
    database = get_db()
    user = await database["users"].find_one({"username": username.strip().lower()})
    if user:
        user["_id"] = str(user["_id"])
    return user

async def get_user_by_username_or_email(identifier: str) -> Optional[dict]:
    database = get_db()
    clean_id = identifier.strip().lower()
    user = await database["users"].find_one({
        "$or": [
            {"username": clean_id},
            {"email": clean_id}
        ]
    })
    if user:
        user["_id"] = str(user["_id"])
    return user

async def delete_user(username: str, uploaded_dir: str) -> bool:
    database = get_db()
    clean_username = username.strip().lower()
    
    # 1. Delete user document
    result = await database["users"].delete_one({"username": clean_username})
    if result.deleted_count == 0:
        return False
        
    # 2. Clean up user's subjects and questions
    user_subjects = await database["subjects"].find({"uploaded_by": clean_username}).to_list(length=1000)
    for sub in user_subjects:
        qb_filename = sub.get("qb_filename")
        if qb_filename:
            fp = os.path.join(uploaded_dir, qb_filename)
            if os.path.exists(fp):
                try:
                    os.remove(fp)
                except Exception:
                    pass
                    
    await database["subjects"].delete_many({"uploaded_by": clean_username})
    await database["questions"].delete_many({"uploaded_by": clean_username})
    return True


# --- Subject & Question Database Helpers ---

async def get_subjects(uploaded_by: Optional[str] = None) -> List[Dict[str, Any]]:
    database = get_db()
    query = {}
    if uploaded_by:
        query["uploaded_by"] = uploaded_by

    cursor = database["subjects"].find(query)
    subjects = await cursor.to_list(length=1000)
    for sub in subjects:
        if "_id" in sub:
            sub["_id"] = str(sub["_id"])
    return subjects

async def add_subject(subject_data: dict):
    database = get_db()
    await database["subjects"].update_one(
        {"code": subject_data["code"], "uploaded_by": subject_data.get("uploaded_by")},
        {"$set": subject_data},
        upsert=True
    )

async def add_questions(questions: list, uploader_name: str = "System"):
    if not questions:
        return
    
    database = get_db()
    subject_code = questions[0]["subject_code"]
    semester = questions[0]["semester"]
    uploaded_by = questions[0].get("uploaded_by")

    for q in questions:
        q["uploader_name"] = uploader_name

    # Delete existing questions for this subject/semester/user
    await database["questions"].delete_many({
        "subject_code": subject_code, 
        "semester": semester,
        "uploaded_by": uploaded_by
    })
    await database["questions"].insert_many(questions)

async def get_questions(subject_code: str, semester: str, uploaded_by: str) -> List[Dict[str, Any]]:
    database = get_db()
    cursor = database["questions"].find({
        "subject_code": subject_code, 
        "semester": semester,
        "uploaded_by": uploaded_by
    })
    q_list = await cursor.to_list(length=2000)
    for q in q_list:
        if "_id" in q:
            q["_id"] = str(q["_id"])
    return q_list


# --- Admin Analytics & Storage Management ---

async def get_admin_stats(uploaded_dir: str) -> Dict[str, Any]:
    database = get_db()
    total_subjects = await database["subjects"].count_documents({})
    total_questions = await database["questions"].count_documents({})
    total_users = await database["users"].count_documents({})

    total_storage_bytes = 0
    # 1. Sum size of files on disk
    if os.path.exists(uploaded_dir):
        for f in os.listdir(uploaded_dir):
            fp = os.path.join(uploaded_dir, f)
            if os.path.isfile(fp):
                total_storage_bytes += os.path.getsize(fp)

    # 2. Fallback: if files aren't on disk (or deleted on ephemeral host), sum from subjects/questions DB
    if total_storage_bytes == 0:
        subjects = await database["subjects"].find({}, {"_id": 0, "file_size": 1}).to_list(length=1000)
        db_file_bytes = sum(s.get("file_size", 0) for s in subjects if s.get("file_size"))
        if db_file_bytes > 0:
            total_storage_bytes = db_file_bytes
        else:
            # Estimate storage: ~1.85 KB per parsed question in DB
            total_storage_bytes = total_questions * 1850

    return {
        "total_subjects": total_subjects,
        "total_questions": total_questions,
        "total_users": total_users,
        "total_storage_bytes": total_storage_bytes,
        "total_storage_formatted": format_bytes(total_storage_bytes)
    }

async def get_user_storage_breakdown(uploaded_dir: str) -> List[Dict[str, Any]]:
    database = get_db()
    
    # Fetch all registered users
    users = await database["users"].find({}).to_list(length=1000)
    
    users_map: Dict[str, Dict[str, Any]] = {}
    for u in users:
        username = u["username"]
        users_map[username] = {
            "username": username,
            "uploader_name": u.get("name") or username,
            "role": u.get("role", "user"),
            "subjects_count": 0,
            "questions_count": 0,
            "storage_bytes": 0,
            "subjects": []
        }
        
    # Fetch all subjects
    subjects = await database["subjects"].find({}, {"_id": 0}).to_list(length=1000)
    
    for sub in subjects:
        uploaded_by = sub.get("uploaded_by")
        if not uploaded_by:
            uploader_name_lower = (sub.get("uploader_name") or "").lower()
            if uploader_name_lower in users_map:
                uploaded_by = uploader_name_lower
            else:
                uploaded_by = "admin"
                
        if uploaded_by not in users_map:
            users_map[uploaded_by] = {
                "username": uploaded_by,
                "uploader_name": sub.get("uploader_name") or uploaded_by,
                "role": "user",
                "subjects_count": 0,
                "questions_count": 0,
                "storage_bytes": 0,
                "subjects": []
            }
            
        users_map[uploaded_by]["subjects_count"] += 1
        
        q_count = await database["questions"].count_documents({
            "subject_code": sub["code"],
            "semester": sub["semester"],
            "uploaded_by": sub.get("uploaded_by")
        })
        users_map[uploaded_by]["questions_count"] += q_count
        
        file_size = sub.get("file_size", 0)
        qb_filename = sub.get("qb_filename")
        if qb_filename:
            fp = os.path.join(uploaded_dir, qb_filename)
            if os.path.exists(fp):
                file_size = os.path.getsize(fp)
                
        if not file_size and q_count > 0:
            file_size = q_count * 1850  # ~1.85 KB per parsed question fallback
            
        users_map[uploaded_by]["storage_bytes"] += file_size
        users_map[uploaded_by]["subjects"].append({
            "code": sub["code"],
            "name": sub["name"],
            "semester": sub["semester"],
            "regulation": sub.get("regulation", "2021"),
            "qb_filename": qb_filename,
            "questions_count": q_count,
            "file_size_bytes": file_size,
            "file_size_formatted": format_bytes(file_size)
        })

    user_list = list(users_map.values())
    for u in user_list:
        u["storage_formatted"] = format_bytes(u["storage_bytes"])
        
    return user_list

async def get_all_uploads_detailed(uploaded_dir: str) -> List[Dict[str, Any]]:
    database = get_db()
    subjects = await database["subjects"].find({}, {"_id": 0}).to_list(length=1000)
    
    uploads = []
    for sub in subjects:
        q_count = await database["questions"].count_documents({
            "subject_code": sub["code"],
            "semester": sub["semester"],
            "uploaded_by": sub.get("uploaded_by")
        })
        
        file_size = sub.get("file_size", 0)
        qb_filename = sub.get("qb_filename")
        if qb_filename:
            fp = os.path.join(uploaded_dir, qb_filename)
            if os.path.exists(fp):
                file_size = os.path.getsize(fp)
                
        if not file_size and q_count > 0:
            file_size = q_count * 1850
                
        uploads.append({
            "code": sub["code"],
            "name": sub["name"],
            "semester": sub["semester"],
            "regulation": sub.get("regulation", "2021"),
            "uploader_name": sub.get("uploader_name") or "System",
            "qb_filename": qb_filename,
            "questions_count": q_count,
            "file_size_bytes": file_size,
            "file_size_formatted": format_bytes(file_size)
        })
        
    return uploads

async def delete_question_bank(subject_code: str, semester: str, uploaded_dir: str) -> bool:
    database = get_db()
    subject = await database["subjects"].find_one({"code": subject_code, "semester": semester})
    if not subject:
        subject = await database["subjects"].find_one({"code": subject_code})
        
    if not subject:
        return False
        
    qb_filename = subject.get("qb_filename")
    
    # Delete subject and questions matching this uploader/code
    await database["subjects"].delete_many({"code": subject["code"], "uploaded_by": subject.get("uploaded_by")})
    await database["questions"].delete_many({"subject_code": subject["code"], "uploaded_by": subject.get("uploaded_by")})
    
    if qb_filename:
        fp = os.path.join(uploaded_dir, qb_filename)
        if os.path.exists(fp):
            try:
                os.remove(fp)
                logger.info(f"Deleted physical question bank file: {fp}")
            except Exception as e:
                logger.error(f"Error removing file {fp}: {e}")
                
    return True
