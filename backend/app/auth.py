import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
import bcrypt
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.database import get_user_by_username, get_user_by_username_or_email, create_user

logger = logging.getLogger("app.auth")
security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def create_access_token(data: dict, expires_minutes: Optional[int] = None) -> str:
    to_encode = data.copy()
    expire_delta = timedelta(minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expire_delta
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    # 1. Try decoding with local secret key
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except Exception:
        pass

    # 2. Try unverified decode for Firebase ID tokens
    try:
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        if unverified_payload and ("sub" in unverified_payload or "user_id" in unverified_payload):
            sub = unverified_payload.get("sub") or unverified_payload.get("user_id")
            email = unverified_payload.get("email", "")
            username = email.split("@")[0] if email else sub
            return {
                "sub": username,
                "email": email,
                "name": unverified_payload.get("name", username),
                "role": "admin" if email.lower().startswith("admin") else "user",
                "firebase_uid": sub
            }
    except Exception as err:
        logger.warning(f"Failed to decode token: {err}")

    return None

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )
        
    username = payload["sub"]
    user = await get_user_by_username_or_email(username)
    
    # Auto-provision user record if authenticated via Firebase
    if not user:
        try:
            user_doc = {
                "username": username,
                "name": payload.get("name", username),
                "email": payload.get("email", ""),
                "password_hash": "",
                "role": payload.get("role", "user"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            user = await create_user(user_doc)
        except Exception:
            user = {
                "username": username,
                "name": payload.get("name", username),
                "email": payload.get("email", ""),
                "role": payload.get("role", "user")
            }
        
    return user

async def get_current_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin privileges required."
        )
    return current_user
