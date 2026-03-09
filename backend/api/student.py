"""
Student API routes — student_id passed in request body/query
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List
import logging
import uuid

from services.database import (
    get_enrolled_topics,
    get_topic_by_id,
    get_assessment_by_topic,
    get_assessment_by_id,
    create_submission,
    update_submission_scores,
    update_submission_status,
    get_submission_by_id,
    get_submissions_by_student,
    get_user_by_id,
    check_enrollment,
)
from agents.scoring_agent import run_scoring_workflow

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/student", tags=["Student"])


# ============================================================
# GUARD
# ============================================================
def _require_uuid(value: str, name: str = "student_id") -> str:
    """
    Raises HTTP 400 immediately if value is missing, 'undefined', 'null',
    or not a valid UUID — before it ever reaches Supabase.
    Prevents: APIError 22P02 invalid input syntax for type uuid: "undefined"
    """
    if not value or value.strip().lower() in ("undefined", "null", "none", ""):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Missing or invalid {name}. "
                "The frontend must read it from localStorage before calling this endpoint."
            )
        )
    try:
        uuid.UUID(value.strip())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid UUID format for {name}: {value!r}"
        )
    return value.strip()


def _enrich_submission(submission: dict, assessment: dict | None) -> dict:
    """
    Attach max_marks fields directly onto the submission dict so the
    frontend never has to make a second API call to get total_marks.

    Also computes max_marks from score_details as a reliable fallback
    in case the assessment join is null or marks haven't been set yet.
    """
    # Try to get marks from assessment row first
    if assessment:
        mcq_marks   = assessment.get("mcq_marks", 0) or 0
        short_marks = assessment.get("short_marks", 0) or 0
        total_marks = assessment.get("total_marks", 0) or 0
    else:
        mcq_marks = short_marks = total_marks = 0

    # Fallback: calculate from score_details if assessment marks are 0
    if total_marks == 0:
        mcq_details   = submission.get("mcq_score_details") or []
        short_details = submission.get("short_score_details") or []
        mcq_marks   = sum(int(q.get("max_marks", 1)) for q in mcq_details)
        short_marks = sum(int(q.get("max_marks", 2)) for q in short_details)
        total_marks = mcq_marks + short_marks

    return {
        **submission,
        "max_mcq_marks":   mcq_marks,
        "max_short_marks": short_marks,
        "max_total_marks": total_marks,
    }


# ============================================================
# REQUEST MODELS
# ============================================================
class MCQAnswer(BaseModel):
    question_id: str
    selected_option: str


class ShortAnswer(BaseModel):
    question_id: str
    answer_text: str


class SubmissionRequest(BaseModel):
    assessment_id: str
    student_id: str
    mcq_answers: List[MCQAnswer]
    short_answers: List[ShortAnswer]


# ============================================================
# TOPICS / ASSESSMENTS
# ============================================================

@router.get("/topics")
async def get_my_topics(student_id: str):
    _require_uuid(student_id)

    student = await get_user_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    enrollments = await get_enrolled_topics(student_id)
    topics = []
    for e in enrollments:
        topic = e.get("topics", {})
        if topic and topic.get("status") == "active":
            assessment = await get_assessment_by_topic(topic["id"])
            topics.append({
                **topic,
                "assessment_ready": (
                    assessment is not None
                    and assessment.get("generation_status") == "completed"
                ),
                "enrolled_at": e.get("enrolled_at")
            })

    return {"topics": topics}


@router.get("/topics/{topic_id}/assessment")
async def get_assessment_for_student(topic_id: str, student_id: str):
    _require_uuid(student_id)
    _require_uuid(topic_id, "topic_id")

    enrolled = await check_enrollment(topic_id, student_id)
    if not enrolled:
        raise HTTPException(status_code=403, detail="You are not enrolled in this topic")

    topic = await get_topic_by_id(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if topic["status"] != "active":
        raise HTTPException(status_code=400, detail=f"Topic is not active (status: {topic['status']})")

    assessment = await get_assessment_by_topic(topic_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not yet available for this topic")
    if assessment.get("generation_status") != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Assessment is not ready yet (status: {assessment.get('generation_status', 'pending')})"
        )

    # Strip correct answers — students never see them
    safe_mcq = [
        {
            "id":         q["id"],
            "question":   q["question"],
            "options":    q["options"],
            "marks":      q.get("marks", 1),
            "difficulty": q.get("difficulty", "medium"),
        }
        for q in assessment.get("mcq_questions", [])
    ]

    # Strip model_answer and key_points
    safe_short = [
        {
            "id":              q["id"],
            "question":        q["question"],
            "marks":           q.get("marks", 2),
            "word_limit":      q.get("word_limit", 100),
            "cognitive_level": q.get("cognitive_level", "understand"),
        }
        for q in assessment.get("short_questions", [])
    ]

    return {
        "assessment_id":   assessment["id"],
        "topic": {
            "id":          topic["id"],
            "title":       topic["title"],
            "description": topic["description"]
        },
        "mcq_questions":   safe_mcq,
        "short_questions": safe_short,
        "total_marks":     assessment.get("total_marks", 0),
        "mcq_marks":       assessment.get("mcq_marks", 0),
        "short_marks":     assessment.get("short_marks", 0),
        "mcq_count":       len(safe_mcq),
        "short_count":     len(safe_short),
    }


# ============================================================
# SUBMISSION & SCORING
# ============================================================

@router.post("/submit")
async def submit_assessment(req: SubmissionRequest, background_tasks: BackgroundTasks):
    _require_uuid(req.student_id)
    _require_uuid(req.assessment_id, "assessment_id")

    assessment = await get_assessment_by_id(req.assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment.get("generation_status") != "completed":
        raise HTTPException(status_code=400, detail="Assessment is not ready for submissions")

    topic = await get_topic_by_id(assessment["topic_id"])
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    enrolled = await check_enrollment(topic["id"], req.student_id)
    if not enrolled:
        raise HTTPException(status_code=403, detail="You are not enrolled in this topic")

    submission = await create_submission(
        assessment_id=req.assessment_id,
        student_id=req.student_id,
        topic_id=assessment["topic_id"],
        mcq_answers=[a.dict() for a in req.mcq_answers],
        short_answers=[a.dict() for a in req.short_answers]
    )
    if not submission:
        raise HTTPException(status_code=500, detail="Failed to record submission")

    background_tasks.add_task(
        _run_scoring_background,
        submission_id=submission["id"],
        assessment=assessment,
        topic_title=topic["title"],
        student_id=req.student_id,
        mcq_answers=[a.dict() for a in req.mcq_answers],
        short_answers=[a.dict() for a in req.short_answers]
    )

    return {
        "success":       True,
        "submission_id": submission["id"],
        "message":       "Submission received. Poll GET /student/submissions/{submission_id} for results.",
        "status":        "pending"
    }


async def _run_scoring_background(
    submission_id: str,
    assessment: dict,
    topic_title: str,
    student_id: str,
    mcq_answers: list,
    short_answers: list
):
    try:
        await update_submission_status(submission_id, "scoring")

        result = await run_scoring_workflow(
            assessment_id=assessment["id"],
            submission_id=submission_id,
            student_id=student_id,
            topic_title=topic_title,
            mcq_questions=assessment.get("mcq_questions", []),
            short_questions=assessment.get("short_questions", []),
            mcq_answers=mcq_answers,
            short_answers=short_answers
        )

        if result["success"]:
            feedback = {
                **result.get("feedback", {}),
                "mcq_score_details":   result.get("mcq_score_details", []),
                "short_score_details": result.get("short_score_details", []),
                "section_feedback":    result.get("section_feedback", {}),
                "strengths":           result.get("strengths", []),
                "weaknesses":          result.get("weaknesses", []),
                "recommendations":     result.get("recommendations", []),
                "workflow_steps":      result.get("steps", [])
            }
            await update_submission_scores(
                submission_id=submission_id,
                mcq_score=result["mcq_score"],
                short_score=result["short_score"],
                feedback=feedback
            )
            logger.info(f"✅ Scored submission {submission_id}: {result.get('total_score', 0)}")
        else:
            await update_submission_status(submission_id, "failed", result.get("error"))

    except Exception as e:
        logger.error(f"Scoring error for {submission_id}: {e}", exc_info=True)
        await update_submission_status(submission_id, "failed", str(e))


# ============================================================
# RESULTS
# ============================================================

@router.get("/submissions/{submission_id}")
async def get_submission_result(submission_id: str, student_id: str):
    _require_uuid(student_id)
    _require_uuid(submission_id, "submission_id")

    submission = await get_submission_by_id(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission["student_id"] != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Fetch assessment separately to get reliable max_marks
    assessment = await get_assessment_by_id(submission["assessment_id"])
    enriched   = _enrich_submission(submission, assessment)

    return {
        "submission":     enriched,
        "scoring_status": enriched.get("scoring_status"),
        "scores": {
            "mcq_score":       enriched.get("mcq_score", 0),
            "short_score":     enriched.get("short_score", 0),
            "total_score":     enriched.get("total_score", 0),
            "max_mcq_marks":   enriched.get("max_mcq_marks", 0),
            "max_short_marks": enriched.get("max_short_marks", 0),
            "max_total_marks": enriched.get("max_total_marks", 0),
        },
        "feedback": enriched.get("feedback", {}),
    }


@router.get("/results")
async def get_all_results(student_id: str):
    _require_uuid(student_id)

    student = await get_user_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Fetch raw submissions
    submissions = await get_submissions_by_student(student_id)

    if not submissions:
        return {"submissions": [], "total": 0, "completed": 0}

    # Enrich each submission with max_marks.
    # get_submissions_by_student joins assessments via PostgREST but the join
    # can silently return null if the FK isn't recognised — so we enrich manually.
    enriched = []
    assessment_cache: dict = {}  # avoid fetching same assessment twice

    for sub in submissions:
        assessment_id = sub.get("assessment_id")
        if assessment_id and assessment_id not in assessment_cache:
            assessment_cache[assessment_id] = await get_assessment_by_id(assessment_id)
        assessment = assessment_cache.get(assessment_id)
        enriched.append(_enrich_submission(sub, assessment))

    return {
        "submissions": enriched,
        "total":       len(enriched),
        "completed":   len([s for s in enriched if s.get("scoring_status") == "completed"]),
    }


@router.get("/dashboard")
async def student_dashboard(student_id: str):
    _require_uuid(student_id)

    student = await get_user_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    enrollments = await get_enrolled_topics(student_id)
    submissions = await get_submissions_by_student(student_id)

    completed = [s for s in submissions if s.get("scoring_status") == "completed"]
    avg_score = (
        round(sum(float(s.get("total_score", 0)) for s in completed) / len(completed), 2)
        if completed else 0
    )

    # Enrich topics with assessment_ready flag
    topics = []
    for e in enrollments:
        topic = e.get("topics", {})
        if not topic:
            continue
        assessment = await get_assessment_by_topic(topic["id"])
        topics.append({
            **topic,
            "assessment_ready": (
                assessment is not None
                and assessment.get("generation_status") == "completed"
            ),
            "enrolled_at": e.get("enrolled_at"),
        })

    return {
        "student":               {k: v for k, v in student.items() if k != "password_hash"},
        "enrolled_count":        len(enrollments),
        "completed_assessments": len(completed),
        "pending_assessments":   len([s for s in submissions if s.get("scoring_status") in ("pending", "scoring")]),
        "average_score":         avg_score,
        "recent_submissions":    submissions[:5],
        "topics":                topics,
    }