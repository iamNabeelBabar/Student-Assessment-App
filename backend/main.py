"""
AI Assessment MVP — FastAPI Backend
No authentication. Pass user IDs directly in requests.
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from api.users import router as users_router
from api.teacher import router as teacher_router
from api.student import router as student_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Assessment MVP",
    description="""
AI-powered assessment system using LangGraph agentic workflows.

## No Authentication
All endpoints are open. Pass `user_id`, `teacher_id`, or `student_id` directly in requests.

## Workflow
1. **Create users** → `POST /api/users`
2. **Teacher creates topic** → `POST /api/teacher/topics`
3. **Trigger AI generation** → `POST /api/teacher/topics/{id}/generate-assessment`
4. **Poll for assessment** → `GET /api/teacher/topics/{id}` (wait until `assessment` is not null)
5. **Enroll student** → `POST /api/teacher/topics/{id}/enroll?student_id=...`
6. **Student fetches questions** → `GET /api/student/topics/{id}/assessment`
7. **Student submits** → `POST /api/student/submit`
8. **Poll for results** → `GET /api/student/submissions/{id}` (wait until `scoring_status == completed`)

## Models
- `gpt-4o-mini` — question generation, semantic scoring, feedback
- `gpt-4.1-nano` — routing, validation, planning decisions
    """,
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router, prefix="/api")
app.include_router(teacher_router, prefix="/api")
app.include_router(student_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": "AI Assessment MVP",
        "version": "1.0.0",
        "docs": "/docs",
        "models": {
            "main": settings.MAIN_MODEL,
            "decision": settings.DECISION_MODEL
        }
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup():
    logger.info(f"Starting AI Assessment MVP")
    logger.info(f"Main model: {settings.MAIN_MODEL} | Decision model: {settings.DECISION_MODEL}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
