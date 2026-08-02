import os
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import dns.resolver

# Configure dns.resolver to use Google and Cloudflare public DNS nameservers
# to bypass the failing local DNS resolver (192.168.156.48)
try:
    dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
    dns.resolver.default_resolver.nameservers = ['8.8.8.8', '1.1.1.1']
except Exception as dns_err:
    print("Failed to configure custom DNS resolver in database.py:", dns_err)

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings  # type: ignore

logger = logging.getLogger("app.database")

client: Optional[AsyncIOMotorClient] = None
db = None

def format_bytes(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    elif size < 1024 * 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} MB"
    else:
        return f"{size / (1024 * 1024 * 1024):.1f} GB"

async def init_db():
    global client, db
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI} (DB: {settings.DATABASE_NAME})")
    # Pass tlsAllowInvalidCertificates=True to bypass Windows local SSL check issues
    client = AsyncIOMotorClient(settings.MONGODB_URI, tlsAllowInvalidCertificates=True)
    db = client[settings.DATABASE_NAME]

    try:
        await db["subjects"].create_index([("code", 1), ("uploaded_by", 1)], unique=True)
        await db["questions"].create_index([("subject_code", 1), ("semester", 1), ("uploaded_by", 1), ("part", 1), ("unit", 1)])
        await db["questions"].create_index([("uploader_name", 1)])
        await db["users"].create_index([("username", 1)], unique=True)
        logger.info("MongoDB indexes initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to create MongoDB indexes: {e}")

    # Seed Default Admin if no admin user exists
    await seed_default_admin()

async def seed_default_admin():
    from app.auth import hash_password  # type: ignore
    database = get_db()
    existing_admin = await database["users"].find_one({"role": "admin"})
    if not existing_admin:
        logger.info(f"Seeding default Admin user ('{settings.DEFAULT_ADMIN_USERNAME}')...")
        admin_doc = {
            "username": settings.DEFAULT_ADMIN_USERNAME,
            "name": settings.DEFAULT_ADMIN_NAME,
            "email": "admin@jaya.edu",
            "password_hash": hash_password(settings.DEFAULT_ADMIN_PASSWORD),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await database["users"].insert_one(admin_doc)
        logger.info("Default Admin account created successfully.")

async def close_db():
    global client
    if client:
        logger.info("Closing MongoDB connection pool.")
        client.close()

def get_db():
    global db
    if db is None:
        raise RuntimeError("Database not initialized. Ensure init_db() was called on startup.")
    return db

# --- User Management Operations ---

async def create_user(user_data: dict) -> Dict[str, Any]:
    database = get_db()
    existing = await database["users"].find_one({"username": user_data["username"]})
    if existing:
        raise ValueError(f"Username '{user_data['username']}' is already registered.")
        
    await database["users"].insert_one(user_data)
    user_data.pop("password_hash", None)
    return user_data

async def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    database = get_db()
    user = await database["users"].find_one({"username": username})
    if user:
        user["_id"] = str(user["_id"])
    return user

async def get_user_by_username_or_email(identifier: str) -> Optional[Dict[str, Any]]:
    database = get_db()
    identifier = identifier.strip().lower()
    user = await database["users"].find_one({
        "$or": [
            {"username": identifier},
            {"email": identifier}
        ]
    })
    if user:
        user["_id"] = str(user["_id"])
    return user

async def get_all_users_list() -> List[Dict[str, Any]]:
    database = get_db()
    cursor = database["users"].find({}, {"password_hash": 0})
    users = await cursor.to_list(length=1000)
    for u in users:
        u["_id"] = str(u["_id"])
    return users

async def delete_user(username: str, uploaded_dir: str) -> bool:
    database = get_db()
    
    # 1. Find all subjects uploaded by this user
    cursor = database["subjects"].find({"uploaded_by": username})
    subjects = await cursor.to_list(length=1000)
    
    # 2. Cascade delete all question banks (deletes subjects, questions, and physical files)
    for sub in subjects:
        try:
            await delete_question_bank(sub["code"], sub["semester"], uploaded_dir)
        except Exception as ex:
            logger.error(f"Error cascade deleting subject {sub.get('code')} for user {username}: {ex}")
            
    # 3. Delete user account
    result = await database["users"].delete_one({"username": username})
    return result.deleted_count > 0


# --- Subject & Question Operations ---

async def get_subjects(uploaded_by: Optional[str] = None) -> List[Dict[str, Any]]:
    database = get_db()
    query = {}
    if uploaded_by:
        query["uploaded_by"] = uploaded_by
    cursor = database["subjects"].find(query, {"_id": 0})
    return await cursor.to_list(length=1000)

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
    if os.path.exists(uploaded_dir):
        for f in os.listdir(uploaded_dir):
            fp = os.path.join(uploaded_dir, f)
            if os.path.isfile(fp):
                total_storage_bytes += os.path.getsize(fp)

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
            # Fallback for legacy database records: try matching uploader_name to registered usernames case-insensitively
            uploader_name_lower = (sub.get("uploader_name") or "").lower()
            if uploader_name_lower in users_map:
                uploaded_by = uploader_name_lower
            else:
                uploaded_by = "admin"  # Default fallback for system/admin uploads
                
        if uploaded_by not in users_map:
            # Create a guest/legacy entry for unregistered uploader
            users_map[uploaded_by] = {
                "username": uploaded_by,
                "uploader_name": sub.get("uploader_name") or uploaded_by,
                "role": "guest",
                "subjects_count": 0,
                "questions_count": 0,
                "storage_bytes": 0,
                "subjects": []
            }
            
        users_map[uploaded_by]["subjects_count"] += 1
        
        # Count only questions uploaded by this uploader for this subject
        q_count = await database["questions"].count_documents({
            "subject_code": sub["code"],
            "semester": sub["semester"],
            "uploaded_by": sub.get("uploaded_by")
        })
        users_map[uploaded_by]["questions_count"] += q_count
        
        file_size = 0
        qb_filename = sub.get("qb_filename")
        if qb_filename:
            fp = os.path.join(uploaded_dir, qb_filename)
            if os.path.exists(fp):
                file_size = os.path.getsize(fp)
                
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

    user_list = [u for u in users_map.values() if u.get("role") != "guest"]
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
        
        file_size = 0
        qb_filename = sub.get("qb_filename")
        if qb_filename:
            fp = os.path.join(uploaded_dir, qb_filename)
            if os.path.exists(fp):
                file_size = os.path.getsize(fp)
                
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
                logger.warning(f"Failed to delete file {fp}: {e}")
                
    return True
