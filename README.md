<div align="center">

# 🎓 AI Assessment MVP

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite"/>
  <img src="https://img.shields.io/badge/LangGraph-FF6B6B?style=for-the-badge&logo=chainlink&logoColor=white" alt="LangGraph"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License"/>
</p>

<br/>

> **A full-stack AI-powered assessment platform where teachers generate intelligent quizzes and students receive instant, personalized feedback — all powered by agentic AI workflows.**

<br/>

[🚀 Features](#-features) · [🏗️ Architecture](#-architecture) · [⚡ Quick Start](#-quick-start) · [📡 API Reference](#-api-reference) · [🗄️ Database](#-database)

</div>

---

## 🌟 Features

<table>
<tr>
<td width="50%">

### 👨‍🏫 For Teachers
- 📝 **AI Assessment Generation** — Upload a PDF/DOCX/TXT or just provide a topic title and let AI generate MCQs and short-answer questions
- ⚙️ **Full Control** — Set exact question counts (1–20 MCQs, 1–10 short answers)
- 👥 **Student Enrollment** — Enroll students by email or ID
- 📊 **Results Dashboard** — View per-student scores, breakdowns, and AI feedback

</td>
<td width="50%">

### 🎓 For Students
- 📋 **Clean Assessment UI** — Distraction-free MCQ + short answer experience
- ⏱️ **Instant AI Grading** — Semantic scoring of short answers in real time
- 💬 **Personalized Feedback** — Strengths, weaknesses, recommendations, and grade labels
- 📈 **Progress Tracking** — History of all past submissions and scores

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
ai-assessment-mvp/
├── 🐍 backend/
│   ├── agents/
│   │   ├── generation_agent.py   # LangGraph parallel MCQ + short answer generation
│   │   └── scoring_agent.py      # LangGraph semantic scoring pipeline
│   ├── api/
│   │   ├── teacher.py            # Teacher endpoints
│   │   ├── student.py            # Student endpoints
│   │   └── user.py               # User CRUD
│   ├── services/
│   │   └── database.py           # Supabase client + all DB helpers
│   ├── core/
│   │   └── config.py             # Environment config
│   └── main.py                   # FastAPI app entry point
│
└── ⚛️  frontend/
    └── src/
        ├── components/           # Reusable UI components
        ├── pages/                # Route-level page components
        ├── hooks/                # Custom React hooks
        └── lib/                  # API client + utilities
```

### 🤖 AI Agent Pipelines

**Generation Agent** (LangGraph — parallel)
```
analyze_material → decide_strategy → ┌─ generate_mcqs
                                     └─ generate_short_answers
                                              ↓
                                       join_questions → validate → finalize
```

**Scoring Agent** (LangGraph — sequential)
```
route_scoring_task → score_mcq → score_short_answers → aggregate → generate_feedback → finalize
```

---

## ⚡ Quick Start

### Prerequisites

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)
![Node](https://img.shields.io/badge/Node-18+-green?logo=node.js&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-latest-black?logo=bun&logoColor=white)

### 🐍 Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your keys (see Environment Variables section)

# 5. Start the server
python main.py
```

> 🟢 Backend runs at **http://localhost:8000**
> 📖 API docs at **http://localhost:8000/docs**

### ⚛️ Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
bun install

# 3. Start dev server
bun run dev
```

> 🟢 Frontend runs at **http://localhost:5173**

---

## 🔑 Environment Variables

Create `backend/.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Models
MAIN_MODEL=gpt-4o-mini          # Used for question generation and scoring
DECISION_MODEL=gpt-4.1-nano     # Used for routing and strategy decisions
```

---

## 📡 API Reference

### 👤 User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/users` | Register new teacher or student |
| `GET` | `/api/users` | List all users (optional `?role=teacher`) |
| `GET` | `/api/users/{id}` | Get user by ID |
| `GET` | `/api/users/by-email` | Lookup user by email |

### 👨‍🏫 Teacher Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/teacher/topics` | Create topic + upload material |
| `GET` | `/api/teacher/topics` | List all topics |
| `GET` | `/api/teacher/topics/{id}` | Topic detail + assessment |
| `POST` | `/api/teacher/topics/{id}/generate-assessment` | Trigger AI generation |
| `PATCH` | `/api/teacher/topics/{id}/status` | Update topic status |
| `POST` | `/api/teacher/topics/{id}/enroll` | Enroll student by ID |
| `POST` | `/api/teacher/topics/{id}/enroll-by-email` | Enroll student by email |
| `GET` | `/api/teacher/topics/{id}/enrolled-students` | List enrolled students |
| `GET` | `/api/teacher/topics/{id}/results` | All submissions + stats |
| `GET` | `/api/teacher/dashboard` | Teacher dashboard summary |

### 🎓 Student Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/student/topics` | Get enrolled topics |
| `GET` | `/api/student/topics/{id}/assessment` | Get assessment (answers stripped) |
| `POST` | `/api/student/submit` | Submit answers |
| `GET` | `/api/student/submissions/{id}` | Poll for scoring result |
| `GET` | `/api/student/results` | All past submissions |
| `GET` | `/api/student/dashboard` | Student dashboard |

> ⚠️ **Note:** Assessment generation and scoring are **async**. Poll the relevant endpoint every 5 seconds until `generation_status` or `scoring_status` is `"completed"`.

---

## 🗄️ Database

**Supabase (PostgreSQL)** with 5 tables:

```
users ──────────────────────────────────┐
  │                                     │
  │ (teacher_id)                        │ (student_id)
  ▼                                     │
topics ──────────────────────────────── │ ─── enrollments
  │                                     │
  │ (topic_id)                          │
  ▼                                     ▼
assessments ────────────────────── submissions
  │                (assessment_id)      │
  └─────────────────────────────────────┘
```

| Table | Purpose |
|-------|---------|
| `users` | Teachers and students |
| `topics` | Teacher-created topics with optional material |
| `assessments` | AI-generated questions + marks (one per topic) |
| `enrollments` | Student ↔ Topic membership |
| `submissions` | Student answers + AI scores + feedback |

To set up or repair FK links, run `fix_schema.sql` in Supabase SQL Editor.

---

## 🛠️ Tech Stack

### Backend
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-FF6B6B?logo=chainlink&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI_GPT--4o--mini-412991?logo=openai&logoColor=white)
![Pydantic](https://img.shields.io/badge/Pydantic-E92063?logo=pydantic&logoColor=white)

### Frontend
![React](https://img.shields.io/badge/React_18-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-B73BFE?logo=vite&logoColor=FFD62E)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?logo=react-router&logoColor=white)

---

## 🤝 Contributing

```bash
# 1. Fork the repo and create your branch
git checkout -b feature/your-feature

# 2. Make your changes and commit
git commit -am 'Add your feature'

# 3. Push and open a Pull Request
git push origin feature/your-feature
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ using **FastAPI** + **LangGraph** + **React**

</div>