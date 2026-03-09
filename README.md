# AI Assessment MVP - Complete Student Assessment App

**Video Demo:** [complete student assessment app.mp4](./complete%20student%20assessment%20app.mp4)

## Overview

This is a full-stack AI-powered student assessment application that enables teachers to create, manage, and grade student assessments automatically using AI agents. Students can complete assessments and receive instant feedback.

## Project Structure

```
ai-assessment-mvp/
├── backend/           # Python FastAPI backend
│   ├── agents/        # AI scoring and generation agents
│   ├── api/           # API endpoints (student, teacher, users)
│   ├── services/      # Database and extraction services
│   ├── core/          # Configuration and schema
│   └── main.py        # Application entry point
└── frontend/          # React + TypeScript frontend
    ├── src/
    │   ├── components/  # React components
    │   ├── pages/       # Page components
    │   ├── hooks/       # Custom React hooks
    │   └── lib/         # Utilities and API client
    └── public/          # Static assets
```

## Features

- **AI-Powered Assessment Generation** - Automatically generate assessments using AI agents
- **Intelligent Scoring** - AI-based automatic grading of student responses
- **Dual Role Support** - Separate interfaces for students and teachers
- **MCQ & Short Answer Support** - Multiple choice questions and short answer assessments
- **Real-time Results** - Instant feedback and score reports
- **Student Dashboard** - View progress and assessment history
- **Teacher Dashboard** - Manage students and assessments

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Run the development server:
   ```bash
   python main.py
   ```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run the development server:
   ```bash
   bun run dev
   ```

The frontend will be available at `http://localhost:5173`

## API Documentation

### Student Endpoints
- `GET /api/student/assessments` - Get student's available assessments
- `POST /api/student/submit` - Submit assessment response

### Teacher Endpoints
- `GET /api/teacher/students` - Get teacher's students list
- `POST /api/teacher/create-assessment` - Create new assessment
- `GET /api/teacher/results` - Get assessment results

### User Endpoints
- `POST /api/users/login` - User authentication
- `POST /api/users/register` - User registration

## Technology Stack

### Backend
- **Python 3.x**
- **FastAPI** - Web framework
- **SQLite/SQL Database** - Data persistence
- **AI Agents** - Assessment generation and scoring

### Frontend
- **React 18+**
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation

## Development

### Run Tests (Frontend)
```bash
cd frontend
bun run test
```

### Code Quality
The project uses:
- ESLint for JavaScript/TypeScript linting
- TypeScript for type checking

## Database

The application uses SQLite with a schema defined in `backend/core/schema.sql`. To initialize the database:

```bash
sqlite3 assessment.db < backend/core/schema.sql
```

## Environment Variables

Create a `.env` file in the backend directory with:
```
DATABASE_URL=sqlite:///./assessment.db
API_KEY=your_api_key_here
SECRET_KEY=your_secret_key_here
```

## Contributing

1. Create a feature branch (`git checkout -b feature/improvement`)
2. Commit your changes (`git commit -am 'Add improvement'`)
3. Push to the branch (`git push origin feature/improvement`)
4. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, bugs, or questions, please open an issue in the project repository.
