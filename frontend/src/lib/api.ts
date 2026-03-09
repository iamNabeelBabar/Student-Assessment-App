const BASE_URL = "https://superimproved-verla-coincident.ngrok-free.dev/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

// Polling utility
export async function pollUntil<T>(
  fn: () => Promise<T>,
  condition: (result: T) => boolean,
  intervalMs = 5000,
  maxAttempts = 24
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await fn();
    if (condition(result)) return result;
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error("Polling timed out");
}

// Users
export const getUsers = (role?: string) =>
  request<{ users: User[] }>(`/users${role ? `?role=${role}` : ""}`);

export const getUser = (id: string) =>
  request<{ user: User }>(`/users/${id}`);

export const getUserByEmail = (email: string) =>
  request<User>(`/users/by-email?email=${encodeURIComponent(email)}`);

export const createUser = (data: { email: string; full_name: string; role: "teacher" | "student" }) =>
  request<{ user: User }>("/users", { method: "POST", body: JSON.stringify(data) });

// Teacher
export const getTeacherDashboard = (teacherId: string) =>
  request<TeacherDashboard>(`/teacher/dashboard?teacher_id=${teacherId}`);

export const getTeacherTopics = (teacherId: string) =>
  request<{ topics: Topic[] }>(`/teacher/topics?teacher_id=${teacherId}`);

export const createTopic = (formData: FormData) =>
  request<{ topic: Topic }>("/teacher/topics", { method: "POST", body: formData });

export const getTopicDetail = (topicId: string) =>
  request<{ topic: Topic; assessment: Assessment | null }>(`/teacher/topics/${topicId}`);

export const updateTopicStatus = (topicId: string, status: string) =>
  request<{ success: boolean; topic: Topic }>(`/teacher/topics/${topicId}/status?status=${status}`, { method: "PATCH" });

export const generateAssessment = (topicId: string) =>
  request<{ success: boolean; message: string; topic_id?: string }>(`/teacher/topics/${topicId}/generate-assessment`, { method: "POST" });

export const getTeacherAssessment = (topicId: string) =>
  request<{ assessment: Assessment }>(`/teacher/topics/${topicId}/assessment`);

export const enrollByEmail = (topicId: string, email: string) =>
  request<{ success: boolean; enrollment: any }>(`/teacher/topics/${topicId}/enroll-by-email?student_email=${encodeURIComponent(email)}`, { method: "POST" });

export const enrollById = (topicId: string, studentId: string) =>
  request<{ success: boolean; enrollment: any }>(`/teacher/topics/${topicId}/enroll?student_id=${studentId}`, { method: "POST" });

export const getEnrolledStudents = (topicId: string) =>
  request<{ students: EnrolledStudent[]; count: number }>(`/teacher/topics/${topicId}/enrolled-students`);

export const getTopicResults = (topicId: string) =>
  request<TopicResults>(`/teacher/topics/${topicId}/results`);

// Student
export const getStudentDashboard = (studentId: string) =>
  request<StudentDashboard>(`/student/dashboard?student_id=${studentId}`);

export const getStudentTopics = (studentId: string) =>
  request<{ topics: StudentTopic[] }>(`/student/topics?student_id=${studentId}`);

export const getStudentAssessment = (topicId: string, studentId: string) =>
  request<StudentAssessmentView>(`/student/topics/${topicId}/assessment?student_id=${studentId}`);

export const submitAssessment = (data: SubmissionPayload) =>
  request<{ submission_id: string; message: string }>("/student/submit", { method: "POST", body: JSON.stringify(data) });

export const getSubmission = (submissionId: string, studentId: string) =>
  request<SubmissionResponse>(`/student/submissions/${submissionId}?student_id=${studentId}`);

export const getStudentResults = async (studentId: string): Promise<{ results: StudentResult[] }> => {
  const raw = await request<any>(`/student/results?student_id=${studentId}`);
  const list = raw.results || raw.submissions || [];
  // Map API submission shape to StudentResult
  const results: StudentResult[] = list.map((s: any) => ({
    submission_id: s.submission_id || s.id,
    topic_title: s.topic_title || s.topics?.title || "Untitled",
    total_score: s.total_score ?? 0,
    max_marks: s.max_marks ?? s.max_total_marks ?? s.assessments?.total_marks ?? 0,
    grade_label: s.grade_label || s.feedback?.grade_label || "N/A",
    submitted_at: s.submitted_at,
    scoring_status: s.scoring_status || "pending",
    mcq_score: s.mcq_score ?? 0,
    short_score: s.short_score ?? 0,
  }));
  return { results };
};

// Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "teacher" | "student";
  created_at?: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  status: "draft" | "active" | "closed";
  requested_mcq_count?: number;
  requested_short_count?: number;
  material_filename?: string;
  created_at?: string;
}

export interface StudentTopic extends Topic {
  assessment_ready?: boolean;
  enrolled_at?: string;
}

export interface EnrolledStudent {
  id: string;
  enrolled_at: string;
  users: { id: string; full_name: string; email: string };
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  correct_answer?: string;
  explanation?: string;
  marks: number;
  difficulty?: string;
}

export interface ShortQuestion {
  id: string;
  question: string;
  model_answer?: string;
  key_points?: string[];
  marks: number;
  word_limit?: number;
  cognitive_level?: string;
}

export interface Assessment {
  id: string;
  topic_id: string;
  total_marks: number;
  mcq_marks: number;
  short_marks: number;
  mcq_questions: MCQQuestion[];
  short_questions: ShortQuestion[];
  generation_status?: "pending" | "generating" | "completed" | "failed";
  mcq_count?: number;
  short_count?: number;
}

export interface TeacherDashboard {
  teacher: User;
  summary: {
    total_topics: number;
    active_topics: number;
    draft_topics: number;
    closed_topics: number;
  };
  topics: Topic[];
}

export interface TopicResults {
  topic: { id: string; title: string };
  assessment?: Assessment;
  stats: {
    total_students: number;
    completed_count?: number;
    pending_count?: number;
    failed_count?: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
    max_marks: number;
  };
  submissions: SubmissionSummary[];
}

export interface SubmissionSummary {
  id: string;
  student_id: string;
  mcq_score: number;
  short_score: number;
  total_score: number;
  scoring_status: string;
  submitted_at: string;
  feedback?: { grade_label: string };
  users?: { full_name: string; email: string };
}

export interface StudentDashboard {
  student: User;
  enrolled_count: number;
  completed_assessments: number;
  pending_assessments?: number;
  average_score: number;
  topics: StudentTopic[];
  recent_submissions: {
    id: string;
    scoring_status: string;
    total_score: number;
    submitted_at: string;
    topics: { title: string };
  }[];
}

export interface StudentAssessmentView {
  assessment_id: string;
  topic: { id: string; title: string; description?: string };
  total_marks: number;
  mcq_marks?: number;
  short_marks?: number;
  mcq_count?: number;
  short_count?: number;
  mcq_questions: MCQQuestion[];
  short_questions: ShortQuestion[];
}

export interface SubmissionPayload {
  assessment_id: string;
  student_id: string;
  mcq_answers: { question_id: string; selected_option: string }[];
  short_answers: { question_id: string; answer_text: string }[];
}

export interface SubmissionResponse {
  submission: any;
  scoring_status: string;
  scores?: {
    mcq_score: number;
    short_score: number;
    total_score: number;
  };
  feedback?: SubmissionFeedback;
}

export interface SubmissionFeedback {
  overall_comment: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  mcq_feedback?: string;
  short_feedback?: string;
  grade_label: string;
  encouragement: string;
  section_feedback?: { mcq: string; short: string };
  mcq_score_details: {
    question_id?: string;
    question: string;
    student_answer: string;
    correct_answer: string;
    is_correct: boolean;
    earned: number;
    max_marks: number;
    explanation: string;
  }[];
  short_score_details: {
    question_id?: string;
    question: string;
    student_answer: string;
    score: number;
    max_marks: number;
    reasoning: string;
    key_points_addressed?: string[];
    key_points_missed: string[];
    answer_quality?: string;
  }[];
}

export interface StudentResult {
  submission_id: string;
  topic_title: string;
  total_score: number;
  max_marks: number;
  grade_label: string;
  submitted_at: string;
  scoring_status: string;
  mcq_score?: number;
  short_score?: number;
}
