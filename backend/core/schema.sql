"""
Supabase database client and helper functions
"""
from supabase import create_client, Client
from core.config import settings
import logging

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        )
    return _client


# ============================================================
# USER OPERATIONS
# ============================================================

async def create_user(email: str, full_name: str, role: str) -> dict | None:
    db = get_supabase()
    result = db.table("users").insert({
        "email": email,
        "full_name": full_name,
        "role": role
    }).execute()
    return result.data[0] if result.data else None


async def get_user_by_email(email: str) -> dict | None:
    db = get_supabase()
    result = db.table("users").select("*").eq("email", email).execute()
    return result.data[0] if result.data else None


async def get_user_by_id(user_id: str) -> dict | None:
    db = get_supabase()
    result = db.table("users").select("*").eq("id", user_id).execute()
    return result.data[0] if result.data else None


async def list_users(role: str = None) -> list:
    db = get_supabase()
    q = db.table("users").select("id, email, full_name, role, created_at")
    if role:
        q = q.eq("role", role)
    result = q.order("created_at", desc=True).execute()
    return result.data or []


# ============================================================
# TOPIC OPERATIONS
# ============================================================

async def create_topic(
    teacher_id: str,
    title: str,
    description: str,
    material_text: str = "",
    material_filename: str = "",
    requested_mcq_count: int = 7,
    requested_short_count: int = 4,
) -> dict | None:
    db = get_supabase()
    result = db.table("topics").insert({
        "teacher_id": teacher_id,
        "title": title,
        "description": description,
        "material_text": material_text,
        "material_filename": material_filename,
        "requested_mcq_count": requested_mcq_count,
        "requested_short_count": requested_short_count,
        "status": "draft"
    }).execute()
    return result.data[0] if result.data else None


async def get_topics_by_teacher(teacher_id: str) -> list:
    db = get_supabase()
    result = (
        db.table("topics")
        .select("*")
        .eq("teacher_id", teacher_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


async def get_topic_by_id(topic_id: str) -> dict | None:
    db = get_supabase()
    result = db.table("topics").select("*").eq("id", topic_id).execute()
    return result.data[0] if result.data else None


async def update_topic_status(topic_id: str, status: str) -> dict | None:
    db = get_supabase()
    result = (
        db.table("topics")
        .update({"status": status})
        .eq("id", topic_id)
        .execute()
    )
    return result.data[0] if result.data else None


# ============================================================
# ENROLLMENT OPERATIONS
# ============================================================

async def get_enrolled_topics(student_id: str) -> list:
    """Return all enrollments for a student, joined with topic data."""
    db = get_supabase()
    result = (
        db.table("enrollments")
        .select("*, topics(*)")
        .eq("student_id", student_id)
        .order("enrolled_at", desc=True)
        .execute()
    )
    return result.data or []


async def get_enrolled_students_for_topic(topic_id: str) -> list:
    """Return all students enrolled in a topic, joined with user data."""
    db = get_supabase()
    result = (
        db.table("enrollments")
        .select("*, users(id, email, full_name, role)")
        .eq("topic_id", topic_id)
        .order("enrolled_at", desc=True)
        .execute()
    )
    return result.data or []


async def enroll_student(topic_id: str, student_id: str, enrolled_by: str = "teacher") -> dict | None:
    """Enroll a student in a topic. Silently ignores duplicate enrollments."""
    db = get_supabase()
    result = (
        db.table("enrollments")
        .upsert(
            {"topic_id": topic_id, "student_id": student_id, "enrolled_by": enrolled_by},
            on_conflict="topic_id,student_id"
        )
        .execute()
    )
    return result.data[0] if result.data else None


async def check_enrollment(topic_id: str, student_id: str) -> bool:
    """Return True if the student is enrolled in the topic."""
    db = get_supabase()
    result = (
        db.table("enrollments")
        .select("id")
        .eq("topic_id", topic_id)
        .eq("student_id", student_id)
        .execute()
    )
    return bool(result.data)


# ============================================================
# ASSESSMENT OPERATIONS
# ============================================================

async def create_assessment(
    topic_id: str,
    mcq_questions: list,
    short_questions: list,
    metadata: dict = {},
) -> dict | None:
    db = get_supabase()

    mcq_marks = sum(q.get("marks", 1) for q in mcq_questions)
    short_marks = sum(q.get("marks", 2) for q in short_questions)

    result = db.table("assessments").insert({
        "topic_id": topic_id,
        "mcq_questions": mcq_questions,
        "short_questions": short_questions,
        "mcq_marks": mcq_marks,
        "short_marks": short_marks,
        "total_marks": mcq_marks + short_marks,
        "metadata": metadata,
        "generation_status": "completed",
    }).execute()
    return result.data[0] if result.data else None


async def get_assessment_by_topic(topic_id: str) -> dict | None:
    db = get_supabase()
    result = (
        db.table("assessments")
        .select("*")
        .eq("topic_id", topic_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def get_assessment_by_id(assessment_id: str) -> dict | None:
    db = get_supabase()
    result = db.table("assessments").select("*").eq("id", assessment_id).execute()
    return result.data[0] if result.data else None


async def update_assessment_status(
    topic_id: str, status: str, error: str = None
) -> dict | None:
    """
    Upsert the assessment generation_status for a topic.
    Creates a placeholder row if none exists yet (pending → generating),
    or updates the existing row (generating → completed/failed).
    """
    db = get_supabase()

    existing = await get_assessment_by_topic(topic_id)

    if existing:
        data: dict = {"generation_status": status}
        if error:
            data["generation_error"] = error
        result = (
            db.table("assessments")
            .update(data)
            .eq("id", existing["id"])
            .execute()
        )
    else:
        # Create placeholder row so the frontend can poll status
        data = {
            "topic_id": topic_id,
            "mcq_questions": [],
            "short_questions": [],
            "generation_status": status,
        }
        if error:
            data["generation_error"] = error
        result = db.table("assessments").insert(data).execute()

    return result.data[0] if result.data else None


# ============================================================
# SUBMISSION OPERATIONS
# ============================================================

async def create_submission(
    assessment_id: str,
    student_id: str,
    topic_id: str,
    mcq_answers: list,
    short_answers: list,
) -> dict | None:
    db = get_supabase()
    result = db.table("submissions").insert({
        "assessment_id": assessment_id,
        "student_id": student_id,
        "topic_id": topic_id,
        "mcq_answers": mcq_answers,
        "short_answers": short_answers,
        "scoring_status": "pending",
    }).execute()
    return result.data[0] if result.data else None


async def update_submission_scores(
    submission_id: str,
    mcq_score: float,
    short_score: float,
    feedback: dict,
) -> dict | None:
    """Write final scores, per-question details, and AI feedback. Sets status=completed."""
    db = get_supabase()

    # Pull per-question details out of the feedback blob so they live in
    # their own columns (easier to query from teacher results view).
    mcq_score_details  = feedback.pop("mcq_score_details", [])
    short_score_details = feedback.pop("short_score_details", [])

    from datetime import datetime, timezone
    result = (
        db.table("submissions")
        .update({
            "mcq_score": mcq_score,
            "short_score": short_score,
            "total_score": mcq_score + short_score,
            "mcq_score_details": mcq_score_details,
            "short_score_details": short_score_details,
            "feedback": feedback,
            "scoring_status": "completed",
            "scored_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", submission_id)
        .execute()
    )
    return result.data[0] if result.data else None


async def update_submission_status(
    submission_id: str, status: str, error: str = None
) -> dict | None:
    db = get_supabase()
    data: dict = {"scoring_status": status}
    if error:
        data["scoring_error"] = error
    result = (
        db.table("submissions")
        .update(data)
        .eq("id", submission_id)
        .execute()
    )
    return result.data[0] if result.data else None


async def get_submission_by_id(submission_id: str) -> dict | None:
    db = get_supabase()
    result = db.table("submissions").select("*").eq("id", submission_id).execute()
    return result.data[0] if result.data else None


async def get_submissions_by_student(student_id: str) -> list:
    db = get_supabase()
    result = (
        db.table("submissions")
        .select("*, topics(title, description), assessments(mcq_marks, short_marks, total_marks)")
        .eq("student_id", student_id)
        .order("submitted_at", desc=True)
        .execute()
    )
    return result.data or []


async def get_submissions_by_topic(topic_id: str) -> list:
    """Return all submissions for a topic (all statuses) joined with student info."""
    db = get_supabase()
    result = (
        db.table("submissions")
        .select("*, users(id, full_name, email)")
        .eq("topic_id", topic_id)
        .order("submitted_at", desc=True)
        .execute()
    )
    return result.data or []