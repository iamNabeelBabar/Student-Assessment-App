"""
User management — simple CRUD, no auth/passwords
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.database import create_user, get_user_by_id, get_user_by_email, list_users

router = APIRouter(prefix="/users", tags=["Users"])


class CreateUserRequest(BaseModel):
    email: str
    full_name: str
    role: str   # "teacher" or "student"


@router.post("")
async def create_user_endpoint(req: CreateUserRequest):
    """Create a teacher or student user."""
    if req.role not in ("teacher", "student"):
        raise HTTPException(status_code=400, detail="role must be 'teacher' or 'student'")

    existing = await get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = await create_user(email=req.email, full_name=req.full_name, role=req.role)
    if not user:
        raise HTTPException(status_code=500, detail="Failed to create user")

    return {"success": True, "user": user}


@router.get("")
async def list_all_users(role: Optional[str] = None):
    """List all users. Optionally filter by role=teacher|student."""
    if role and role not in ("teacher", "student"):
        raise HTTPException(status_code=400, detail="role must be 'teacher' or 'student'")
    users = await list_users(role=role)
    return {"users": users, "count": len(users)}


@router.get("/by-email")
async def get_user_by_email_endpoint(email: str):
    """Look up a user by email (useful for teacher to find student to enroll)."""
    user = await get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": {k: v for k, v in user.items() if k != "password_hash"}}


@router.get("/{user_id}")
async def get_user(user_id: str):
    """Get a user by ID."""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": {k: v for k, v in user.items() if k != "password_hash"}}