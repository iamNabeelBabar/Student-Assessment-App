import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useUser } from "@/lib/user-context";
import { useBackendUserId } from "@/hooks/use-backend-user-id";
import { getStudentAssessment, submitAssessment, getSubmission, type StudentAssessmentView } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { PageHeader, AnimatedCard } from "@/components/shared";
import { toast } from "sonner";

const TakeAssessment = () => {
  const { topicId } = useParams();
  const { currentUser } = useUser();
  const { userId, loading: userLoading } = useBackendUserId();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<StudentAssessmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [scoringStatus, setScoringStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId || !userId) return;
    getStudentAssessment(topicId, userId)
      .then(setAssessment)
      .catch(() => toast.error("Failed to load assessment"))
      .finally(() => setLoading(false));
  }, [topicId, userId]);

  // Poll for scoring
  useEffect(() => {
    if (!submissionId || !userId) return;
    const interval = setInterval(async () => {
      try {
        const res = await getSubmission(submissionId, userId);
        setScoringStatus(res.scoring_status);
        if (res.scoring_status === "completed") {
          clearInterval(interval);
          toast.success("Scoring complete!");
          navigate(`/student/submissions/${submissionId}`);
        } else if (res.scoring_status === "failed") {
          clearInterval(interval);
          toast.error("Scoring failed. Please contact your teacher.");
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [submissionId, userId, navigate]);

  if (!currentUser) { navigate("/select-role"); return null; }

  const handleSubmit = async () => {
    if (!assessment || !userId) return;
    setSubmitting(true);
    try {
      const payload = {
        assessment_id: assessment.assessment_id,
        student_id: userId,
        mcq_answers: Object.entries(mcqAnswers).map(([question_id, selected_option]) => ({ question_id, selected_option })),
        short_answers: Object.entries(shortAnswers).map(([question_id, answer_text]) => ({ question_id, answer_text })),
      };
      const { submission_id } = await submitAssessment(payload);
      setSubmissionId(submission_id);
      setScoringStatus("pending");
      toast.info("Submitted! Your answers are being graded by AI…");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || userLoading) return (
    <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>
  );

  if (!assessment) return (
    <AppLayout><div className="text-center py-20 text-muted-foreground">No assessment available for this topic.</div></AppLayout>
  );

  // Show scoring in progress
  if (submissionId && scoringStatus && scoringStatus !== "completed") {
    const statusMessages: Record<string, string> = {
      pending: "Your submission is queued…",
      scoring: "AI is grading your answers… (this takes 15–30 seconds)",
      failed: "Grading failed. Contact your teacher.",
    };
    return (
      <AppLayout>
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          {scoringStatus === "failed" ? (
            <>
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="font-heading text-xl font-bold mb-2">Scoring Failed</h2>
              <p className="text-muted-foreground mb-4">{statusMessages["failed"]}</p>
              <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
            </>
          ) : (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="font-heading text-xl font-bold mb-2">Scoring Your Assessment</h2>
              <p className="text-muted-foreground mb-4">
                {statusMessages[scoringStatus] || "Processing…"}
              </p>
              <Badge>{scoringStatus}</Badge>
            </>
          )}
        </div>
      </AppLayout>
    );
  }

  const totalQuestions = assessment.mcq_questions.length + assessment.short_questions.length;
  const answered = Object.keys(mcqAnswers).length + Object.keys(shortAnswers).filter((k) => shortAnswers[k].trim()).length;
  const progress = totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0;
  const allMcqAnswered = Object.keys(mcqAnswers).length === assessment.mcq_questions.length;

  const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <PageHeader title={assessment.topic.title} description={`Total marks: ${assessment.total_marks}`} />

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{answered}/{totalQuestions} answered</span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* MCQ */}
        {assessment.mcq_questions.length > 0 && (
          <>
            <h2 className="font-heading text-xl font-semibold mb-4">Multiple Choice Questions</h2>
            <div className="space-y-4 mb-8">
              {assessment.mcq_questions.map((q, i) => (
                <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <AnimatedCard className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Question {i + 1} · {q.marks} mark(s)</p>
                      {q.difficulty && <Badge variant="secondary">{q.difficulty}</Badge>}
                    </div>
                    <p className="font-medium mb-4">{q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(q.options).map(([key, val]) => (
                        <button
                          key={key}
                          onClick={() => setMcqAnswers((a) => ({ ...a, [q.id]: key }))}
                          className={`text-left px-4 py-3 rounded-lg border text-sm transition-all duration-200 ${
                            mcqAnswers[q.id] === key
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/30 hover:bg-secondary/50"
                          }`}
                        >
                          <span className="font-semibold mr-2">{key}.</span>{val}
                        </button>
                      ))}
                    </div>
                  </AnimatedCard>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Short Answer */}
        {assessment.short_questions.length > 0 && (
          <>
            <h2 className="font-heading text-xl font-semibold mb-4">Short Answer Questions</h2>
            <div className="space-y-4 mb-8">
              {assessment.short_questions.map((q, i) => {
                const words = wordCount(shortAnswers[q.id] || "");
                const limit = q.word_limit || 200;
                const overLimit = words > limit;
                return (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <AnimatedCard className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">
                          Question {i + 1} · {q.marks} mark(s) · Max {limit} words
                        </p>
                        {q.cognitive_level && <Badge variant="secondary">{q.cognitive_level}</Badge>}
                      </div>
                      <p className="font-medium mb-4">{q.question}</p>
                      <Textarea
                        placeholder="Type your answer here..."
                        value={shortAnswers[q.id] || ""}
                        onChange={(e) => setShortAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        rows={4}
                      />
                      <div className={`flex justify-end mt-1 text-xs ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
                        {words}/{limit} words
                      </div>
                    </AnimatedCard>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" className="w-full" disabled={submitting || !allMcqAnswered}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Assessment
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to submit? You answered {answered} of {totalQuestions} questions. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {!allMcqAnswered && (
            <p className="text-xs text-muted-foreground text-center mt-2">Answer all MCQ questions to enable submission.</p>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default TakeAssessment;
