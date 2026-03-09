import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/user-context";
import { useBackendUserId } from "@/hooks/use-backend-user-id";
import { getSubmission, type SubmissionResponse } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { PageHeader } from "@/components/shared";
import ScoreOverview from "@/components/results/ScoreOverview";
import InsightsPanel from "@/components/results/InsightsPanel";
import MCQDetails from "@/components/results/MCQDetails";
import ShortAnswerDetails from "@/components/results/ShortAnswerDetails";
import { toast } from "sonner";

const SubmissionDetail = () => {
  const { submissionId } = useParams();
  const { currentUser } = useUser();
  const { userId, loading: userLoading } = useBackendUserId();
  const navigate = useNavigate();
  const [data, setData] = useState<SubmissionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!submissionId || !userId) {
      if (!userLoading) setLoading(false);
      return;
    }

    const fetchSubmission = async () => {
      try {
        const res = await getSubmission(submissionId, userId);
        setData(res);
        if (res.scoring_status === "pending" || res.scoring_status === "scoring") {
          setPolling(true);
        }
      } catch (err) {
        console.error("[SubmissionDetail] API error:", err);
        toast.error("Failed to load submission");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [submissionId, userId, userLoading]);

  useEffect(() => {
    if (!polling || !data || !submissionId || !userId) return;
    const interval = setInterval(async () => {
      try {
        const res = await getSubmission(submissionId, userId);
        setData(res);
        if (res.scoring_status === "completed" || res.scoring_status === "failed") {
          setPolling(false);
          if (res.scoring_status === "completed") toast.success("Scoring complete!");
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [polling, data, submissionId, userId]);

  if (!currentUser) { navigate("/select-role"); return null; }

  if (loading || userLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </AppLayout>
  );

  if (!data) return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-muted-foreground text-center py-20">Submission not found.</p>
      </div>
    </AppLayout>
  );

  // Still scoring
  if (data.scoring_status !== "completed") {
    const statusMessages: Record<string, string> = {
      pending: "Your submission is queued…",
      scoring: "AI is grading your answers… (this takes 15–30 seconds)",
      failed: "Grading failed. Contact your teacher.",
    };
    return (
      <AppLayout>
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          {data.scoring_status === "failed" ? (
            <>
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="font-heading text-xl font-bold mb-2">Scoring Failed</h2>
              <p className="text-muted-foreground mb-2">{statusMessages["failed"]}</p>
              {data.submission?.scoring_error && (
                <p className="text-sm text-destructive mb-4">{data.submission.scoring_error}</p>
              )}
              <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
            </>
          ) : (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="font-heading text-xl font-bold mb-2">Scoring Your Assessment</h2>
              <p className="text-muted-foreground mb-4">
                {statusMessages[data.scoring_status] || "Processing…"}
              </p>
              <Badge>{data.scoring_status}</Badge>
            </>
          )}
        </div>
      </AppLayout>
    );
  }

  // ── Extract data using CORRECT paths ──
  const submission = data.submission;
  const scores = data.scores;
  const feedback = submission?.feedback || data.feedback;

  // Score details are on submission directly, NOT inside feedback
  const mcqDetails = submission?.mcq_score_details || [];
  const shortDetails = submission?.short_score_details || [];

  if (!feedback || !scores) return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 text-center">
        <p className="text-muted-foreground">No feedback available yet.</p>
      </div>
    </AppLayout>
  );

  // Calculate max marks from score_details arrays (Option B — self-contained)
  const mcqMarks = mcqDetails.reduce((s: number, q: any) => s + q.max_marks, 0);
  const shortMarks = shortDetails.reduce((s: number, q: any) => s + q.max_marks, 0);
  const totalMarks = mcqMarks + shortMarks;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/student/results")}>
          <ArrowLeft className="h-4 w-4" /> Back to Results
        </Button>

        <PageHeader title="Assessment Results" />

        <div className="space-y-8">
          {/* Score Overview */}
          <ScoreOverview
            totalScore={scores.total_score}
            mcqScore={scores.mcq_score}
            shortScore={scores.short_score}
            maxMarks={totalMarks}
            gradeLabel={feedback.grade_label}
            overallComment={feedback.overall_comment}
          />

          {/* Insights */}
          <InsightsPanel
            strengths={feedback.strengths || []}
            weaknesses={feedback.weaknesses || []}
            recommendations={feedback.recommendations || []}
            encouragement={feedback.encouragement}
          />

          {/* MCQ Details — from submission.mcq_score_details */}
          {mcqDetails.length > 0 && (
            <MCQDetails
              details={mcqDetails}
              sectionFeedback={feedback.section_feedback?.mcq}
            />
          )}

          {/* Short Answer Details — from submission.short_score_details */}
          {shortDetails.length > 0 && (
            <ShortAnswerDetails
              details={shortDetails}
              sectionFeedback={feedback.section_feedback?.short}
            />
          )}

          {/* Encouragement */}
          {feedback.encouragement && (
            <div className="text-center py-4">
              <p className="text-muted-foreground italic text-sm">{feedback.encouragement}</p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-4">
            <Button onClick={() => navigate("/student")} size="lg">Back to Dashboard</Button>
            <Button variant="outline" onClick={() => navigate("/student/results")} size="lg">View All Results</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SubmissionDetail;
