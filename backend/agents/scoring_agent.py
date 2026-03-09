"""
LangGraph Agentic Workflow: Submission Scoring

Fixes applied:
1. All mutable state fields use Annotated[type, _replace] — no hashing of dicts/lists.
2. steps_completed uses Annotated[list, add] — safe parallel appends.
3. generate_feedback builds prompt data variables OUTSIDE the f-string.
   Dict literals using {{ }} inside f-strings are parsed as Python set literals,
   not dict literals — causing TypeError: unhashable type: 'dict'.
"""

import json
import logging
from typing import TypedDict, Optional
from typing_extensions import Annotated
from operator import add

from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

from core.config import settings

logger = logging.getLogger(__name__)


# ============================================================
# MODELS
# ============================================================
main_llm = ChatOpenAI(
    model=settings.MAIN_MODEL,
    api_key=settings.OPENAI_API_KEY,
    temperature=0.3,
)
decision_llm = ChatOpenAI(
    model=settings.DECISION_MODEL,
    api_key=settings.OPENAI_API_KEY,
    temperature=0.1,
)


# ============================================================
# REDUCER
# ============================================================
def _replace(old, new):
    """Store new value by reference — never hashes contents."""
    return new


# ============================================================
# STATE
# str/int/float/bool  → no annotation (hashable)
# list[dict] or dict  → Annotated[type, _replace]
# steps_completed     → Annotated[list, add]
# ============================================================
class ScoringState(TypedDict):
    # Inputs
    assessment_id: str
    submission_id: str
    student_id:   str
    topic_title:  str

    mcq_questions:  Annotated[list, _replace]
    short_questions: Annotated[list, _replace]
    mcq_answers:    Annotated[list, _replace]
    short_answers:  Annotated[list, _replace]

    # Pipeline
    scoring_plan: Annotated[dict, _replace]

    # Outputs
    mcq_score_details:   Annotated[list, _replace]
    short_score_details: Annotated[list, _replace]
    mcq_total:   float
    short_total: float

    strengths:        Annotated[list, _replace]
    weaknesses:       Annotated[list, _replace]
    recommendations:  Annotated[list, _replace]
    section_feedback: Annotated[dict, _replace]
    final_feedback:   Annotated[dict, _replace]

    steps_completed: Annotated[list, add]
    error: Optional[str]


# ============================================================
# HELPERS
# ============================================================
def _parse_json(text: str, fallback):
    try:
        t = text.strip()
        if "```" in t:
            parts = t.split("```")
            inner = parts[1]
            t = inner[4:].strip() if inner.startswith("json") else inner.strip()
        return json.loads(t)
    except Exception:
        return fallback


# ============================================================
# NODE: route_scoring_task
# ============================================================
async def route_scoring_task(state: ScoringState) -> dict:
    logger.info("🔀 [Scoring] Routing scoring task...")

    prompt = (
        "Analyze this student submission and create a scoring plan.\n\n"
        f"Topic: {state['topic_title']}\n"
        f"MCQ questions: {len(state['mcq_questions'])}\n"
        f"Short questions: {len(state['short_questions'])}\n"
        f"MCQ answers submitted: {len(state['mcq_answers'])}\n"
        f"Short answers submitted: {len(state['short_answers'])}\n\n"
        "Return ONLY JSON, no markdown:\n"
        '{"has_mcq_answers": true, "has_short_answers": true, '
        '"short_answer_quality": "detailed|brief|minimal|empty", '
        '"scoring_approach": "standard|lenient|strict", "notes": ""}'
    )

    response = await decision_llm.ainvoke([
        SystemMessage(content="Scoring coordinator. Valid JSON only, no markdown."),
        HumanMessage(content=prompt),
    ])

    fallback = {
        "has_mcq_answers":      len(state["mcq_answers"]) > 0,
        "has_short_answers":    len(state["short_answers"]) > 0,
        "short_answer_quality": "standard",
        "scoring_approach":     "standard",
        "notes":                "",
    }
    plan = _parse_json(response.content, fallback)
    if not isinstance(plan, dict):
        plan = fallback

    return {
        "scoring_plan":    plan,
        "steps_completed": ["route_scoring_task"],
    }


# ============================================================
# NODE: score_mcq  (deterministic)
# ============================================================
async def score_mcq(state: ScoringState) -> dict:
    logger.info("🔢 [Scoring] Scoring MCQ answers...")

    student_map = {
        a["question_id"]: a["selected_option"]
        for a in (state["mcq_answers"] or [])
    }

    score_details = []
    total_earned  = 0.0

    for q in (state["mcq_questions"] or []):
        qid        = str(q.get("id", ""))
        correct    = str(q.get("correct_answer", "")).strip().upper()
        student    = str(student_map.get(qid, "")).strip().upper()
        marks      = int(q.get("marks", 1))
        is_correct = bool(student and student == correct)
        earned     = marks if is_correct else 0
        total_earned += earned

        score_details.append({
            "question_id":    qid,
            "question":       str(q.get("question", "")),
            "student_answer": student_map.get(qid, ""),
            "correct_answer": q.get("correct_answer", ""),
            "is_correct":     is_correct,
            "earned":         earned,
            "max_marks":      marks,
            "explanation":    str(q.get("explanation", "")),
        })

    max_mcq = sum(int(q.get("marks", 1)) for q in (state["mcq_questions"] or []))
    logger.info(f"✅ MCQ: {total_earned}/{max_mcq}")

    return {
        "mcq_score_details": score_details,
        "mcq_total":         total_earned,
        "steps_completed":   ["score_mcq"],
    }


# ============================================================
# NODE: score_short_answers  (semantic)
# ============================================================
async def score_short_answers(state: ScoringState) -> dict:
    logger.info("🤖 [Scoring] Scoring short answers...")

    approach    = (state.get("scoring_plan") or {}).get("scoring_approach", "standard")
    student_map = {
        a["question_id"]: a["answer_text"]
        for a in (state["short_answers"] or [])
    }

    score_details = []
    total_earned  = 0.0

    for q in (state["short_questions"] or []):
        qid         = str(q.get("id", ""))
        student_ans = str(student_map.get(qid, "")).strip()
        max_marks   = int(q.get("marks", 2))

        if not student_ans:
            score_details.append({
                "question_id":          qid,
                "question":             str(q.get("question", "")),
                "student_answer":       "",
                "score":                0,
                "max_marks":            max_marks,
                "reasoning":            "No answer provided",
                "key_points_addressed": [],
                "key_points_missed":    list(q.get("key_points") or []),
                "answer_quality":       "missing",
            })
            continue

        # Build prompt using string concatenation — avoids f-string dict literal issues
        prompt = (
            "Score this student's short answer.\n\n"
            f"Topic: {state['topic_title']}\n"
            f"Question: {q.get('question', '')}\n"
            f"Model Answer: {q.get('model_answer', '')}\n"
            f"Key Points: {json.dumps(q.get('key_points') or [])}\n"
            f"Max Marks: {max_marks}\n"
            f"Scoring Approach: {approach}\n\n"
            f"Student Answer: {student_ans}\n\n"
            "Scoring guide:\n"
            "- Full marks  : All key points covered, correct reasoning\n"
            "- Partial     : Some key points, generally correct\n"
            "- Minimal     : Attempted but mostly incorrect\n"
            "- 0           : Off-topic or blank\n\n"
            "Return ONLY JSON, no markdown:\n"
            '{"score": 0.0, "reasoning": "explanation", '
            '"key_points_addressed": ["..."], '
            '"key_points_missed": ["..."], '
            '"answer_quality": "excellent|good|partial|poor|missing"}'
        )

        response = await main_llm.ainvoke([
            SystemMessage(content="Fair academic grader. Valid JSON only, no markdown."),
            HumanMessage(content=prompt),
        ])

        fallback_r = {
            "score":                0,
            "reasoning":            "Scoring error",
            "key_points_addressed": [],
            "key_points_missed":    list(q.get("key_points") or []),
            "answer_quality":       "poor",
        }
        result = _parse_json(response.content, fallback_r)
        if not isinstance(result, dict):
            result = fallback_r

        try:
            score = float(result.get("score", 0))
            score = max(0.0, min(score, float(max_marks)))
        except (TypeError, ValueError):
            score = 0.0

        total_earned += score
        score_details.append({
            "question_id":          qid,
            "question":             str(q.get("question", "")),
            "student_answer":       student_ans,
            "score":                score,
            "max_marks":            max_marks,
            "reasoning":            str(result.get("reasoning", "")),
            "key_points_addressed": list(result.get("key_points_addressed") or []),
            "key_points_missed":    list(result.get("key_points_missed") or []),
            "answer_quality":       str(result.get("answer_quality", "partial")),
        })

    max_short = sum(int(q.get("marks", 2)) for q in (state["short_questions"] or []))
    logger.info(f"✅ Short: {total_earned}/{max_short}")

    return {
        "short_score_details": score_details,
        "short_total":         total_earned,
        "steps_completed":     ["score_short_answers"],
    }


# ============================================================
# NODE: aggregate_scores
# ============================================================
async def aggregate_scores(state: ScoringState) -> dict:
    total = float(state.get("mcq_total") or 0) + float(state.get("short_total") or 0)
    logger.info(f"📊 [Scoring] Combined total: {total}")
    return {"steps_completed": ["aggregate_scores"]}


# ============================================================
# NODE: generate_feedback
# ============================================================
async def generate_feedback(state: ScoringState) -> dict:
    logger.info("💬 [Scoring] Generating feedback...")

    mcq_details   = list(state.get("mcq_score_details") or [])
    short_details = list(state.get("short_score_details") or [])
    mcq_total     = float(state.get("mcq_total") or 0)
    short_total   = float(state.get("short_total") or 0)
    total         = mcq_total + short_total

    max_mcq   = sum(int(q.get("marks", 1)) for q in (state["mcq_questions"] or []))
    max_short = sum(int(q.get("marks", 2)) for q in (state["short_questions"] or []))
    max_total = max_mcq + max_short
    pct       = (total / max_total * 100) if max_total > 0 else 0

    wrong_mcqs    = [d for d in mcq_details if not d.get("is_correct", False)]
    weak_shorts   = [d for d in short_details
                     if float(d.get("score", 0)) < float(d.get("max_marks", 2)) * 0.6]
    strong_shorts = [d for d in short_details
                     if d.get("answer_quality") in ("excellent", "good")]

    # ── Build all dynamic prompt values OUTSIDE the f-string ──────────────
    # IMPORTANT: Never use {{ "key": value }} inside an f-string.
    # Python parses {{ }} as escaped braces producing a literal { },
    # which makes {"key": value} a set literal → unhashable type: 'dict'.
    # Always pre-build dicts/lists as variables before the f-string.
    wrong_mcq_qs    = json.dumps([d["question"] for d in wrong_mcqs[:5]])
    weak_short_info = json.dumps([
        {"q": d["question"], "missed": d.get("key_points_missed", [])}
        for d in weak_shorts[:3]
    ])
    strong_short_qs = json.dumps([d["question"] for d in strong_shorts[:3]])
    # ──────────────────────────────────────────────────────────────────────

    prompt = (
        "Generate personalized assessment feedback.\n\n"
        f"Topic: {state['topic_title']}\n"
        f"Score: {total:.1f}/{max_total} ({pct:.0f}%)\n"
        f"MCQ: {mcq_total:.0f}/{max_mcq}\n"
        f"Short: {short_total:.1f}/{max_short}\n\n"
        f"Wrong MCQs ({len(wrong_mcqs)}): {wrong_mcq_qs}\n"
        f"Weak short answers: {weak_short_info}\n"
        f"Strong short answers: {strong_short_qs}\n\n"
        "Return ONLY JSON, no markdown:\n"
        "{\n"
        '  "overall_comment": "2-3 sentence summary",\n'
        '  "strengths": ["strength 1", "strength 2"],\n'
        '  "weaknesses": ["weakness 1"],\n'
        '  "recommendations": ["action 1", "action 2", "action 3"],\n'
        '  "mcq_feedback": "MCQ-specific feedback",\n'
        '  "short_feedback": "short answer feedback",\n'
        '  "grade_label": "Excellent|Good|Satisfactory|Needs Improvement|Poor",\n'
        '  "encouragement": "one motivating sentence"\n'
        "}"
    )

    response = await main_llm.ainvoke([
        SystemMessage(content="Supportive academic mentor. Valid JSON only, no markdown."),
        HumanMessage(content=prompt),
    ])

    fallback = {
        "overall_comment": f"You scored {total:.1f} out of {max_total}.",
        "strengths":       ["Attempted all questions"],
        "weaknesses":      ["Review core concepts"],
        "recommendations": ["Review the study material"],
        "mcq_feedback":    f"MCQ: {mcq_total:.0f}/{max_mcq}",
        "short_feedback":  f"Short: {short_total:.1f}/{max_short}",
        "grade_label":     "Satisfactory" if pct >= 60 else "Needs Improvement",
        "encouragement":   "Keep practicing!",
    }
    fd = _parse_json(response.content, fallback)
    if not isinstance(fd, dict):
        fd = fallback

    return {
        "strengths":        list(fd.get("strengths") or []),
        "weaknesses":       list(fd.get("weaknesses") or []),
        "recommendations":  list(fd.get("recommendations") or []),
        "section_feedback": {
            "mcq":   str(fd.get("mcq_feedback", "")),
            "short": str(fd.get("short_feedback", "")),
        },
        "final_feedback":  fd,
        "steps_completed": ["generate_feedback"],
    }


# ============================================================
# NODE: finalize_results
# ============================================================
async def finalize_results(state: ScoringState) -> dict:
    total = float(state.get("mcq_total") or 0) + float(state.get("short_total") or 0)
    logger.info(f"🏁 [Scoring] Finalized — total: {total}")
    return {"steps_completed": ["finalize_results"]}


# ============================================================
# BUILD GRAPH
# ============================================================
def build_scoring_graph() -> StateGraph:
    wf = StateGraph(ScoringState)

    wf.add_node("route_scoring_task",  route_scoring_task)
    wf.add_node("score_mcq",           score_mcq)
    wf.add_node("score_short_answers", score_short_answers)
    wf.add_node("aggregate_scores",    aggregate_scores)
    wf.add_node("generate_feedback",   generate_feedback)
    wf.add_node("finalize_results",    finalize_results)

    wf.add_edge(START,                 "route_scoring_task")
    wf.add_edge("route_scoring_task",  "score_mcq")
    wf.add_edge("score_mcq",           "score_short_answers")
    wf.add_edge("score_short_answers", "aggregate_scores")
    wf.add_edge("aggregate_scores",    "generate_feedback")
    wf.add_edge("generate_feedback",   "finalize_results")
    wf.add_edge("finalize_results",    END)

    return wf.compile()


# ============================================================
# ENTRY POINT
# ============================================================
async def run_scoring_workflow(
    assessment_id: str,
    submission_id: str,
    student_id: str,
    topic_title: str,
    mcq_questions: list,
    short_questions: list,
    mcq_answers: list,
    short_answers: list,
) -> dict:
    graph = build_scoring_graph()

    initial_state: ScoringState = {
        "assessment_id":      assessment_id,
        "submission_id":      submission_id,
        "student_id":         student_id,
        "topic_title":        topic_title,
        "mcq_questions":      mcq_questions   or [],
        "short_questions":    short_questions or [],
        "mcq_answers":        mcq_answers     or [],
        "short_answers":      short_answers   or [],
        "scoring_plan":       {},
        "mcq_score_details":  [],
        "short_score_details": [],
        "mcq_total":          0.0,
        "short_total":        0.0,
        "strengths":          [],
        "weaknesses":         [],
        "recommendations":    [],
        "section_feedback":   {},
        "final_feedback":     {},
        "steps_completed":    [],
        "error":              None,
    }

    try:
        final_state = await graph.ainvoke(initial_state)

        mcq_score   = float(final_state.get("mcq_total") or 0)
        short_score = float(final_state.get("short_total") or 0)

        logger.info(
            f"✅ Scoring complete — MCQ: {mcq_score}, "
            f"Short: {short_score}, Total: {mcq_score + short_score}"
        )

        return {
            "success":             True,
            "mcq_score":           mcq_score,
            "short_score":         short_score,
            "total_score":         mcq_score + short_score,
            "mcq_score_details":   final_state.get("mcq_score_details")   or [],
            "short_score_details": final_state.get("short_score_details") or [],
            "feedback":            final_state.get("final_feedback")      or {},
            "strengths":           final_state.get("strengths")           or [],
            "weaknesses":          final_state.get("weaknesses")          or [],
            "recommendations":     final_state.get("recommendations")     or [],
            "section_feedback":    final_state.get("section_feedback")    or {},
            "steps":               final_state.get("steps_completed")     or [],
        }

    except Exception as e:
        logger.error(f"Scoring workflow error: {e}", exc_info=True)
        return {
            "success":     False,
            "error":       str(e),
            "mcq_score":   0,
            "short_score": 0,
            "total_score": 0,
            "feedback":    {},
        }