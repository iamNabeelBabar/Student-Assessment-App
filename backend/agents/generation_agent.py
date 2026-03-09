"""
LangGraph Agentic Workflow: Assessment Generation

Fix for: TypeError: unhashable type: 'dict'

All mutable fields (list[dict], dict) use Annotated[type, _replace].
steps_completed uses Annotated[list, add] for safe parallel appends.

Graph Flow:
  START
    └─► analyze_material
          └─► decide_strategy
               ├─► generate_mcqs            (parallel)
               └─► generate_short_answers   (parallel)
                    └─► join_questions       (fan-in)
                          └─► validate
                                ├─► regenerate  (max 1 retry)
                                └─► finalize
                                      └─► END
"""

import json
import logging
from typing import TypedDict, Optional, Literal, List
from typing_extensions import Annotated
from operator import add

from pydantic import BaseModel, Field, validator
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser

from core.config import settings

logger = logging.getLogger(__name__)


# ============================================================
# MODELS
# ============================================================
main_llm = ChatOpenAI(
    model=settings.MAIN_MODEL,
    api_key=settings.OPENAI_API_KEY,
    temperature=0.7,
)
decision_llm = ChatOpenAI(
    model=settings.DECISION_MODEL,
    api_key=settings.OPENAI_API_KEY,
    temperature=0.2,
)


# ============================================================
# PYDANTIC SCHEMAS
# ============================================================
class MCQOptions(BaseModel):
    A: str
    B: str
    C: str
    D: str


class MCQQuestion(BaseModel):
    id: str
    question: str
    options: MCQOptions
    correct_answer: str = Field(..., description="A, B, C, or D")
    explanation: str
    difficulty: str = "medium"
    concept_tested: str
    marks: int = 1

    @validator("correct_answer")
    def valid_answer(cls, v):
        v = v.strip().upper()
        if v not in ("A", "B", "C", "D"):
            raise ValueError(f"correct_answer must be A/B/C/D, got {v!r}")
        return v

    @validator("difficulty")
    def valid_difficulty(cls, v):
        v = v.strip().lower()
        return v if v in ("easy", "medium", "hard") else "medium"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "question": self.question,
            "options": {"A": self.options.A, "B": self.options.B,
                        "C": self.options.C, "D": self.options.D},
            "correct_answer": self.correct_answer,
            "explanation": self.explanation,
            "difficulty": self.difficulty,
            "concept_tested": self.concept_tested,
            "marks": self.marks,
        }


class ShortQuestion(BaseModel):
    id: str
    question: str
    model_answer: str
    key_points: List[str] = Field(default_factory=list)
    marks: int = 2
    cognitive_level: str = "understand"
    concept_tested: str
    word_limit: int = 100

    @validator("cognitive_level")
    def valid_level(cls, v):
        v = v.strip().lower()
        return v if v in ("remember", "understand", "apply", "analyze", "evaluate", "create") else "understand"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "question": self.question,
            "model_answer": self.model_answer,
            "key_points": [str(p) for p in self.key_points],
            "marks": self.marks,
            "cognitive_level": self.cognitive_level,
            "concept_tested": self.concept_tested,
            "word_limit": self.word_limit,
        }


mcq_parser   = JsonOutputParser(pydantic_object=MCQQuestion)
short_parser = JsonOutputParser(pydantic_object=ShortQuestion)


# ============================================================
# REDUCER
# ============================================================
def _replace(old, new):
    """Store new value by reference — never hashes contents."""
    return new


# ============================================================
# STATE
#
# Rules:
#   - str / int / float / bool  → no annotation needed (immutable, hashable)
#   - list[dict] or dict        → Annotated[type, _replace]  (mutable, unhashable)
#   - steps_completed           → Annotated[list, add]       (parallel-safe appends)
# ============================================================
class AssessmentGenerationState(TypedDict):
    # ── Inputs (immutable primitives) ───────────────────────
    topic_title: str
    topic_description: str
    material_text: str
    requested_mcq_count: int
    requested_short_count: int

    # ── Pipeline (mutable — use _replace) ───────────────────
    topic_analysis:    Annotated[dict, _replace]
    question_strategy: Annotated[dict, _replace]
    mcq_questions:     Annotated[list, _replace]
    short_questions:   Annotated[list, _replace]
    validation_result: Annotated[dict, _replace]

    # ── Scalar pipeline ──────────────────────────────────────
    regeneration_count: int

    # ── Final outputs (mutable — use _replace) ───────────────
    final_mcq_questions:  Annotated[list, _replace]
    final_short_questions: Annotated[list, _replace]
    generation_metadata:  Annotated[dict, _replace]

    # ── Tracking (parallel-safe append) ──────────────────────
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


def _extract_list(parsed) -> list:
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        for v in parsed.values():
            if isinstance(v, list):
                return v
    return []


def _sanitise_mcqs(raw: list) -> list:
    clean = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            continue
        opts = item.get("options", {})
        if not isinstance(opts, dict):
            opts = {}
        item["options"] = {
            "A": str(opts.get("A", "")),
            "B": str(opts.get("B", "")),
            "C": str(opts.get("C", "")),
            "D": str(opts.get("D", "")),
        }
        item.setdefault("id", f"mcq_{i+1}")
        item.setdefault("marks", 1)
        item.setdefault("explanation", "")
        item.setdefault("difficulty", "medium")
        item.setdefault("concept_tested", "")
        try:
            clean.append(MCQQuestion(**item).to_dict())
        except Exception as e:
            logger.warning(f"Skipping invalid MCQ [{i}]: {e}")
    return clean


def _sanitise_shorts(raw: list) -> list:
    clean = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            continue
        item.setdefault("id", f"short_{i+1}")
        item.setdefault("marks", 2)
        item.setdefault("word_limit", 100)
        item.setdefault("cognitive_level", "understand")
        item.setdefault("concept_tested", "")
        kp = item.get("key_points", [])
        item["key_points"] = kp if isinstance(kp, list) else []
        try:
            clean.append(ShortQuestion(**item).to_dict())
        except Exception as e:
            logger.warning(f"Skipping invalid short [{i}]: {e}")
    return clean


# ============================================================
# NODE: analyze_material
# ============================================================
async def analyze_material(state: AssessmentGenerationState) -> dict:
    logger.info("🔍 [Agent] Analyzing material...")

    material = (state.get("material_text") or "")[:3000]
    has_mat  = bool(material.strip())

    prompt = f"""Analyze this educational topic.

Topic: {state['topic_title']}
Description: {state['topic_description']}
{'Material:\n' + material if has_mat else 'No material — use topic title and description only.'}

Return a single JSON object, no markdown fences:
{{
  "key_concepts": ["concept1", "concept2"],
  "difficulty_level": "intermediate",
  "subject_domain": "domain",
  "bloom_levels": ["understand", "apply"],
  "material_available": {str(has_mat).lower()}
}}"""

    response = await decision_llm.ainvoke([
        SystemMessage(content="Educational content analyst. Valid JSON only, no markdown."),
        HumanMessage(content=prompt),
    ])

    fallback = {
        "key_concepts": [state["topic_title"]],
        "difficulty_level": "intermediate",
        "subject_domain": "general",
        "bloom_levels": ["understand", "apply"],
        "material_available": has_mat,
    }
    analysis = _parse_json(response.content, fallback)
    if not isinstance(analysis, dict):
        analysis = fallback

    # Remove any nested dict fields that could cause issues
    analysis.pop("concept_weights", None)

    for k in ("key_concepts", "bloom_levels"):
        if not isinstance(analysis.get(k), list):
            analysis[k] = fallback[k]
        else:
            analysis[k] = [str(v) for v in analysis[k]]

    return {
        "topic_analysis":  analysis,
        "steps_completed": ["analyze_material"],
    }


# ============================================================
# NODE: decide_strategy
# ============================================================
async def decide_strategy(state: AssessmentGenerationState) -> dict:
    logger.info("🧠 [Agent] Deciding strategy...")

    analysis = state["topic_analysis"]
    mcq_n    = int(state.get("requested_mcq_count") or 7)
    short_n  = int(state.get("requested_short_count") or 4)
    easy     = max(1, mcq_n // 3)
    hard     = max(1, mcq_n // 4)
    medium   = mcq_n - easy - hard

    prompt = f"""Create a question generation strategy.

Topic: {state['topic_title']}
Key concepts: {', '.join(analysis.get('key_concepts', [])[:6])}
Difficulty: {analysis.get('difficulty_level', 'intermediate')}
Material available: {analysis.get('material_available', False)}
MCQ count: {mcq_n} | Short count: {short_n}

Return a single JSON object, no markdown fences:
{{
  "mcq_count": {mcq_n},
  "short_count": {short_n},
  "mcq_focus": ["focus 1", "focus 2"],
  "short_focus": ["focus 1", "focus 2"],
  "mcq_difficulty_distribution": {{"easy": {easy}, "medium": {medium}, "hard": {hard}}},
  "special_instructions": ""
}}"""

    response = await decision_llm.ainvoke([
        SystemMessage(content="Assessment design expert. Valid JSON only, no markdown."),
        HumanMessage(content=prompt),
    ])

    fallback = {
        "mcq_count": mcq_n,
        "short_count": short_n,
        "mcq_focus": ["core concepts", "application"],
        "short_focus": ["understanding", "analysis"],
        "mcq_difficulty_distribution": {"easy": easy, "medium": medium, "hard": hard},
        "special_instructions": "",
    }
    strategy = _parse_json(response.content, fallback)
    if not isinstance(strategy, dict):
        strategy = fallback

    strategy["mcq_count"]   = mcq_n
    strategy["short_count"] = short_n

    return {
        "question_strategy": strategy,
        "steps_completed":   ["decide_strategy"],
    }


# ============================================================
# NODE: generate_mcqs  (parallel branch A)
# ============================================================
async def generate_mcqs(state: AssessmentGenerationState) -> dict:
    logger.info("📝 [Agent] Generating MCQs (parallel)...")

    strategy = state.get("question_strategy") or {}
    analysis = state.get("topic_analysis") or {}
    mcq_n    = int(strategy.get("mcq_count") or state.get("requested_mcq_count") or 7)
    material = (state.get("material_text") or "")[:4000]
    has_mat  = bool(material.strip())
    dist     = strategy.get("mcq_difficulty_distribution", {"easy": 2, "medium": 3, "hard": 2})

    prompt = f"""Generate exactly {mcq_n} multiple-choice questions.

Topic: {state['topic_title']}
Description: {state['topic_description']}
{'Material:\n' + material if has_mat else 'No material — use your knowledge of this topic.'}
Key concepts: {', '.join(analysis.get('key_concepts', [])[:8])}
Difficulty: easy={dist.get('easy',2)}, medium={dist.get('medium',3)}, hard={dist.get('hard',2)}
Focus: {', '.join(strategy.get('mcq_focus', ['core concepts']))}

Schema for each item:
{mcq_parser.get_format_instructions()}

Output a JSON ARRAY of exactly {mcq_n} objects. No markdown fences. No extra text.
IDs: "mcq_1", "mcq_2", ... "mcq_{mcq_n}"
correct_answer must be exactly A, B, C, or D."""

    response = await main_llm.ainvoke([
        SystemMessage(content="Expert assessment creator. Raw JSON array only. No markdown."),
        HumanMessage(content=prompt),
    ])

    raw   = _parse_json(response.content, [])
    raw   = _extract_list(raw)
    clean = _sanitise_mcqs(raw)
    logger.info(f"✅ MCQs: {len(clean)}/{mcq_n}")

    return {
        "mcq_questions":   clean,
        "steps_completed": ["generate_mcqs"],
    }


# ============================================================
# NODE: generate_short_answers  (parallel branch B)
# ============================================================
async def generate_short_answers(state: AssessmentGenerationState) -> dict:
    logger.info("✍️ [Agent] Generating short answers (parallel)...")

    strategy = state.get("question_strategy") or {}
    analysis = state.get("topic_analysis") or {}
    short_n  = int(strategy.get("short_count") or state.get("requested_short_count") or 4)
    material = (state.get("material_text") or "")[:4000]
    has_mat  = bool(material.strip())

    prompt = f"""Generate exactly {short_n} short-answer questions.

Topic: {state['topic_title']}
Description: {state['topic_description']}
{'Material:\n' + material if has_mat else 'No material — use your knowledge of this topic.'}
Key concepts: {', '.join(analysis.get('key_concepts', [])[:8])}
Bloom levels: {', '.join(analysis.get('bloom_levels', ['understand', 'apply']))}
Focus: {', '.join(strategy.get('short_focus', ['understanding']))}

Schema for each item:
{short_parser.get_format_instructions()}

Output a JSON ARRAY of exactly {short_n} objects. No markdown fences. No extra text.
IDs: "short_1", "short_2", ... "short_{short_n}"
model_answer must be 2-5 complete sentences.
key_points must have at least 2 items."""

    response = await main_llm.ainvoke([
        SystemMessage(content="Expert assessment creator. Raw JSON array only. No markdown."),
        HumanMessage(content=prompt),
    ])

    raw   = _parse_json(response.content, [])
    raw   = _extract_list(raw)
    clean = _sanitise_shorts(raw)
    logger.info(f"✅ Short answers: {len(clean)}/{short_n}")

    return {
        "short_questions": clean,
        "steps_completed": ["generate_short_answers"],
    }


# ============================================================
# NODE: join_questions  (fan-in)
# ============================================================
async def join_questions(state: AssessmentGenerationState) -> dict:
    logger.info(
        f"🔗 [Agent] Joined: {len(state.get('mcq_questions') or [])} MCQs "
        f"+ {len(state.get('short_questions') or [])} short answers"
    )
    return {"steps_completed": ["join_questions"]}


# ============================================================
# NODE: validate_questions
# ============================================================
async def validate_questions(state: AssessmentGenerationState) -> dict:
    logger.info("✅ [Agent] Validating...")

    mcq     = state.get("mcq_questions") or []
    short   = state.get("short_questions") or []
    exp_mcq = int(state.get("requested_mcq_count") or 7)
    exp_sh  = int(state.get("requested_short_count") or 4)

    issues = []
    if len(mcq) < exp_mcq:
        issues.append(f"MCQ shortfall: {len(mcq)}/{exp_mcq}")
    if len(short) < exp_sh:
        issues.append(f"Short shortfall: {len(short)}/{exp_sh}")

    bad = [q["id"] for q in mcq if q.get("correct_answer") not in ("A","B","C","D")]
    if bad:
        issues.append(f"Invalid correct_answer: {bad}")

    empty_opts = [q["id"] for q in mcq
                  if not all(q.get("options", {}).get(k) for k in ("A","B","C","D"))]
    if empty_opts:
        issues.append(f"Empty options: {empty_opts}")

    is_valid = len(issues) == 0
    if is_valid:
        logger.info("✅ Validation passed")
    else:
        logger.warning(f"⚠️ Validation issues: {issues}")

    return {
        "validation_result": {
            "is_valid": is_valid,
            "recommendation": "pass" if is_valid else "regenerate_all",
            "quality_score": 0.95 if is_valid else 0.4,
            "issues": issues,
        },
        "steps_completed": ["validate_questions"],
    }


# ============================================================
# NODE: regenerate
# ============================================================
async def regenerate(state: AssessmentGenerationState) -> dict:
    logger.info("🔄 [Agent] Clearing for regeneration...")
    return {
        "mcq_questions":    [],
        "short_questions":  [],
        "regeneration_count": int(state.get("regeneration_count") or 0) + 1,
        "steps_completed":  ["regenerate"],
    }


# ============================================================
# NODE: finalize_assessment
# ============================================================
async def finalize_assessment(state: AssessmentGenerationState) -> dict:
    logger.info("🎯 [Agent] Finalizing...")

    mcq   = state.get("mcq_questions") or []
    short = state.get("short_questions") or []
    mcq_marks   = sum(int(q.get("marks", 1)) for q in mcq)
    short_marks = sum(int(q.get("marks", 2)) for q in short)

    metadata = {
        "mcq_count":         len(mcq),
        "short_count":       len(short),
        "mcq_total_marks":   mcq_marks,
        "short_total_marks": short_marks,
        "total_marks":       mcq_marks + short_marks,
        "material_used":     bool((state.get("material_text") or "").strip()),
        "generated_by":      settings.MAIN_MODEL,
        "decided_by":        settings.DECISION_MODEL,
        "difficulty_level":  (state.get("topic_analysis") or {}).get("difficulty_level", "intermediate"),
        "key_concepts":      (state.get("topic_analysis") or {}).get("key_concepts", []),
    }

    logger.info(
        f"🎓 Ready: {len(mcq)} MCQs ({mcq_marks}m) "
        f"+ {len(short)} short ({short_marks}m) = {mcq_marks+short_marks} total"
    )

    return {
        "final_mcq_questions":   mcq,
        "final_short_questions": short,
        "generation_metadata":   metadata,
        "steps_completed":       ["finalize_assessment"],
    }


# ============================================================
# ROUTING
# ============================================================
def route_after_validation(
    state: AssessmentGenerationState,
) -> Literal["finalize_assessment", "regenerate"]:
    if int(state.get("regeneration_count") or 0) >= 1:
        return "finalize_assessment"
    v = state.get("validation_result") or {}
    return "finalize_assessment" if v.get("is_valid", True) else "regenerate"


# ============================================================
# BUILD GRAPH
# ============================================================
def build_generation_graph() -> StateGraph:
    wf = StateGraph(AssessmentGenerationState)

    wf.add_node("analyze_material",       analyze_material)
    wf.add_node("decide_strategy",        decide_strategy)
    wf.add_node("generate_mcqs",          generate_mcqs)
    wf.add_node("generate_short_answers", generate_short_answers)
    wf.add_node("join_questions",         join_questions)
    wf.add_node("validate_questions",     validate_questions)
    wf.add_node("regenerate",             regenerate)
    wf.add_node("finalize_assessment",    finalize_assessment)

    wf.add_edge(START,              "analyze_material")
    wf.add_edge("analyze_material", "decide_strategy")

    # Fan-out — both run in parallel
    wf.add_edge("decide_strategy",  "generate_mcqs")
    wf.add_edge("decide_strategy",  "generate_short_answers")

    # Fan-in — join waits for both
    wf.add_edge("generate_mcqs",          "join_questions")
    wf.add_edge("generate_short_answers", "join_questions")

    wf.add_edge("join_questions", "validate_questions")

    wf.add_conditional_edges(
        "validate_questions",
        route_after_validation,
        {"finalize_assessment": "finalize_assessment", "regenerate": "regenerate"},
    )

    # Retry fan-out
    wf.add_edge("regenerate", "generate_mcqs")
    wf.add_edge("regenerate", "generate_short_answers")

    wf.add_edge("finalize_assessment", END)

    return wf.compile()


# ============================================================
# ENTRY POINT
# ============================================================
async def run_generation_workflow(
    topic_title: str,
    topic_description: str,
    material_text: str = "",
    requested_mcq_count: int = 7,
    requested_short_count: int = 4,
) -> dict:
    graph = build_generation_graph()

    initial_state: AssessmentGenerationState = {
        "topic_title":           topic_title,
        "topic_description":     topic_description,
        "material_text":         material_text or "",
        "requested_mcq_count":   requested_mcq_count,
        "requested_short_count": requested_short_count,
        "topic_analysis":        {},
        "question_strategy":     {},
        "mcq_questions":         [],
        "short_questions":       [],
        "validation_result":     {},
        "regeneration_count":    0,
        "final_mcq_questions":   [],
        "final_short_questions": [],
        "generation_metadata":   {},
        "steps_completed":       [],
        "error":                 None,
    }

    try:
        final_state = await graph.ainvoke(initial_state)
        mcq   = final_state.get("final_mcq_questions") or []
        short = final_state.get("final_short_questions") or []
        meta  = final_state.get("generation_metadata") or {}
        logger.info(f"✅ Done: {len(mcq)} MCQs + {len(short)} short, {meta.get('total_marks',0)} marks")
        return {
            "success":         True,
            "mcq_questions":   mcq,
            "short_questions": short,
            "metadata":        meta,
            "steps":           final_state.get("steps_completed") or [],
        }
    except Exception as e:
        logger.error(f"Generation workflow error: {e}", exc_info=True)
        return {
            "success":         False,
            "error":           str(e),
            "mcq_questions":   [],
            "short_questions": [],
            "metadata":        {},
            "steps":           [],
        }