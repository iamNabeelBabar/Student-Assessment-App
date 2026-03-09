# AI Assessment MVP — Backend

FastAPI backend with LangGraph agentic workflows, managed by **uv**.

## Requirements

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) — `curl -LsSf https://astral.sh/uv/install.sh | sh`

## Setup

```bash
# 1. Clone / enter the backend directory
cd backend

# 2. Copy env and fill in your keys
cp .env.example .env

# 3. Install all dependencies (uv creates .venv automatically)
uv sync

# 4. Run dev server with hot reload
uv run dev

# OR production server
uv run start
```

API docs available at: http://localhost:8000/docs

## Dev tools

```bash
# Lint
uv run ruff check .
uv run ruff format .

# Tests
uv run pytest
```

## Add / remove packages

```bash
uv add some-package          # add runtime dep
uv add --dev some-package    # add dev dep
uv remove some-package       # remove dep
uv sync                      # re-sync .venv after manual pyproject.toml edits
```

## Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `MAIN_MODEL` | Model for generation/scoring (default: `gpt-4o-mini`) |
| `DECISION_MODEL` | Model for routing/decisions (default: `gpt-4.1-nano`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (used by backend) |

## API Overview

| Method | Path | Description |
|---|---|---|
| POST | `/api/users` | Create teacher or student |
| GET | `/api/users` | List all users |
| GET | `/api/users/{id}` | Get user by ID |
| POST | `/api/teacher/topics` | Create topic (multipart) |
| GET | `/api/teacher/topics?teacher_id=` | List teacher's topics |
| GET | `/api/teacher/topics/{id}` | Get topic + assessment |
| PATCH | `/api/teacher/topics/{id}/status` | Update topic status |
| POST | `/api/teacher/topics/{id}/generate-assessment` | Trigger LangGraph generation |
| GET | `/api/teacher/topics/{id}/assessment` | Get full assessment (with answers) |
| POST | `/api/teacher/topics/{id}/enroll?student_id=` | Enroll student |
| GET | `/api/teacher/topics/{id}/results` | All student results |
| GET | `/api/student/topics?student_id=` | Student's enrolled topics |
| GET | `/api/student/topics/{id}/assessment` | Questions (no answers) |
| POST | `/api/student/submit` | Submit answers → triggers scoring |
| GET | `/api/student/submissions/{id}` | Poll for scored result |
| GET | `/api/student/results?student_id=` | All student submissions |
