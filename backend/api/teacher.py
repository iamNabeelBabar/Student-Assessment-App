"""
Teacher API routes — teacher_id passed in request body/query
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Union
import logging

from services.database import (
    create_topic,
    get_topics_by_teacher,
    get_topic_by_id,
    create_assessment,
    get_assessment_by_topic,
    update_topic_status,
    update_assessment_status,
    get_submissions_by_topic,
    enroll_student,
    get_user_by_email,
    get_user_by_id,
)

from services.extractor import extract_text_from_file
from agents.generation_agent import run_generation_workflow

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/teacher", tags=["Teacher"])


# ============================================================
# TOPICS
# ============================================================

@router.post("/topics")
async def create_topic_endpoint(
    teacher_id: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    requested_mcq_count: int = Form(7),
    requested_short_count: int = Form(4),
    material: Optional[Union[UploadFile, str]] = File(None),
):
    """
    Create a new topic with teacher-specified question counts.
    - requested_mcq_count: number of MCQs to generate (default 7, max 20)
    - requested_short_count: number of short-answer questions (default 4, max 10)
    - material: optional PDF/DOCX/TXT file. If not provided, AI generates from title+description.
    """
    if not (1 <= requested_mcq_count <= 20):
        raise HTTPException(status_code=400, detail="requested_mcq_count must be between 1 and 20")
    if not (1 <= requested_short_count <= 10):
        raise HTTPException(status_code=400, detail="requested_short_count must be between 1 and 10")

    material_text = ""
    material_filename = ""

    try:
        if isinstance(material, UploadFile) and material.filename:
            allowed_types = [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/plain"
            ]
            if material.content_type not in allowed_types:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported file type. Allowed: PDF, DOCX, TXT"
                )
            content = await material.read()
            if content:
                material_text = await extract_text_from_file(content, material.filename)
                material_filename = material.filename

        topic = await create_topic(
            teacher_id=teacher_id,
            title=title,
            description=description,
            material_text=material_text,
            material_filename=material_filename,
            requested_mcq_count=requested_mcq_count,
            requested_short_count=requested_short_count,
        )

        if not topic:
            raise HTTPException(status_code=500, detail="Failed to create topic")

        return {
            "success": True,
            "message": "Topic created successfully",
            "topic": topic,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Topic creation failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/topics")
async def list_topics(teacher_id: str):
    """List all topics for a teacher."""
    topics = await get_topics_by_teacher(teacher_id)
    return {"topics": topics}


@router.get("/topics/{topic_id}")
async def get_topic(topic_id: str):
    """Get topic details including generated assessment (with correct answers — teacher only)."""
    topic = await get_topic_by_id(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    assessment = await get_assessment_by_topic(topic_id)
    return {"topic": topic, "assessment": assessment}


@router.patch("/topics/{topic_id}/status")
async def update_status(topic_id: str, status: str):
    """Update topic status: draft | active | closed"""
    topic = await get_topic_by_id(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if status not in ("draft", "active", "closed"):
        raise HTTPException(status_code=400, detail="status must be draft | active | closed")
    updated = await update_topic_status(topic_id, status)
    return {"success": True, "topic": updated}


# ============================================================
# ASSESSMENT GENERATION
# ============================================================

@router.post("/topics/{topic_id}/generate-assessment")
async def generate_assessment(topic_id: str, background_tasks: BackgroundTasks):
    """
    Trigger LangGraph assessment generation workflow in the background.
    Uses topic's requested_mcq_count and requested_short_count.
    Poll GET /teacher/topics/{topic_id} to check assessment status.
    """
    topic = await get_topic_by_id(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    existing = await get_assessment_by_topic(topic_id)
    if existing and existing.get("generation_status") == "completed":
        return {
            "success": True,
            "assessment": existing,
            "message": "Assessment already generated",
        }

    # Mark as generating
    await update_assessment_status(topic_id, "generating")
    background_tasks.add_task(_run_generation_background, topic)

    return {
        "success": True,
        "message": "Assessment generation started. Poll GET /teacher/topics/{topic_id} for status.",
        "topic_id": topic_id,
    }


async def _run_generation_background(topic: dict):
    try:
        logger.info(f"Starting generation for topic: {topic['id']}")

        result = await run_generation_workflow(
            topic_title=topic["title"],
            topic_description=topic["description"],
            material_text=topic.get("material_text", ""),
            requested_mcq_count=topic.get("requested_mcq_count", 7),
            requested_short_count=topic.get("requested_short_count", 4),
        )

        if result["success"]:
            assessment = await create_assessment(
                topic_id=topic["id"],
                mcq_questions=result["mcq_questions"],
                short_questions=result["short_questions"],
                metadata=result.get("metadata", {}),
            )
            await update_topic_status(topic["id"], "active")
            logger.info(f"Assessment created: {assessment['id']}")
        else:
            await update_assessment_status(topic["id"], "failed", result.get("error"))
            logger.error(f"Generation failed: {result.get('error')}")

    except Exception as e:
        logger.error(f"Background generation error: {e}")
        await update_assessment_status(topic["id"], "failed", str(e))


@router.get("/topics/{topic_id}/assessment")
async def get_assessment(topic_id: str):
    """
    Get the full generated assessment (teacher view — includes correct answers and model answers).
    """
    assessment = await get_assessment_by_topic(topic_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not yet generated")
    return {"assessment": assessment}


# ============================================================
# STUDENT ENROLLMENT
# ============================================================

@router.post("/topics/{topic_id}/enroll")
async def enroll_student_by_id(topic_id: str, student_id: str):
    """Enroll a student in a topic by student_id."""
    topic = await get_topic_by_id(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    student = await get_user_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student["role"] != "student":
        raise HTTPException(status_code=400, detail="User is not a student")
    enrollment = await enroll_student(topic_id, student_id)
    return {"success": True, "enrollment": enrollment}


@router.post("/topics/{topic_id}/enroll-by-email")
async def enroll_by_email(topic_id: str, student_email: str):
    """Enroll a student in a topic by email address."""
    topic = await get_topic_by_id(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    student = await get_user_by_email(student_email)
    if not student:
        raise HTTPException(status_code=404, detail="No user found with that email")
    if student["role"] != "student":
        raise HTTPException(status_code=400, detail="User is not a student")
    enrollment = await enroll_student(topic_id, student["id"])
    return {"success": True, "enrollment": enrollment}


@router.get("/topics/{topic_id}/enrolled-students")
async def get_enrolled_students(topic_id: str):
    """List all students enrolled in a topic."""
    from services.database import get_enrolled_students_for_topic
    topic = await get_topic_by_id(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    students = await get_enrolled_students_for_topic(topic_id)
    return {"students": students, "count": len(students)}


# ============================================================
# RESULTS / DASHBOARD
# ============================================================

@router.get("/topics/{topic_id}/results")
async def get_topic_results(topic_id: str):
    """
    Get all student submission results for a topic.
    Includes per-question score details and AI feedback.
    """
    topic = await get_topic_by_id(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    submissions = await get_submissions_by_topic(topic_id)
    assessment = await get_assessment_by_topic(topic_id)

    if not submissions:
        return {"submissions": [], "stats": {}, "topic": topic, "assessment": assessment}

    completed = [s for s in submissions if s["scoring_status"] == "completed"]
    scores = [s["total_score"] for s in completed] if completed else []
    max_marks = assessment["total_marks"] if assessment else 20

    stats = {
        "total_students": len(submissions),
        "completed_count": len(completed),
        "pending_count": len([s for s in submissions if s["scoring_status"] in ("pending", "scoring")]),
        "failed_count": len([s for s in submissions if s["scoring_status"] == "failed"]),
        "average_score": round(sum(scores) / len(scores), 2) if scores else 0,
        "highest_score": max(scores) if scores else 0,
        "lowest_score": min(scores) if scores else 0,
        "max_marks": max_marks,
        "pass_rate": round(
            len([s for s in scores if s >= max_marks * 0.5]) / len(scores) * 100, 1
        ) if scores else 0,
    }

    return {
        "submissions": submissions,
        "stats": stats,
        "topic": topic,
        "assessment": assessment
    }


@router.get("/dashboard")
async def teacher_dashboard(teacher_id: str):
    """Teacher dashboard overview."""
    teacher = await get_user_by_id(teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    topics = await get_topics_by_teacher(teacher_id)
    summary = {
        "total_topics": len(topics),
        "active_topics": len([t for t in topics if t["status"] == "active"]),
        "draft_topics": len([t for t in topics if t["status"] == "draft"]),
        "closed_topics": len([t for t in topics if t["status"] == "closed"]),
    }

    return {
        "teacher": {k: v for k, v in teacher.items() if k != "password_hash"},
        "summary": summary,
        "topics": topics,
    }