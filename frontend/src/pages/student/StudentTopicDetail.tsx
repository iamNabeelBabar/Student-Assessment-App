import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Play, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/user-context";
import { useBackendUserId } from "@/hooks/use-backend-user-id";
import { getStudentAssessment, type StudentAssessmentView } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { PageHeader, AnimatedCard } from "@/components/shared";
import { toast } from "sonner";

const StudentTopicDetail = () => {
  const { topicId } = useParams();
  const { currentUser } = useUser();
  const { userId, loading: userLoading } = useBackendUserId();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<StudentAssessmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAssessment, setNoAssessment] = useState(false);

  useEffect(() => {
    if (!topicId || !userId) return;
    getStudentAssessment(topicId, userId)
      .then(setAssessment)
      .catch(() => setNoAssessment(true))
      .finally(() => setLoading(false));
  }, [topicId, userId]);

  if (!currentUser) { navigate("/select-role"); return null; }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/student/topics")}>
          <ArrowLeft className="h-4 w-4" /> Back to Topics
        </Button>

        {(loading || userLoading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : noAssessment || !assessment ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <AnimatedCard className="p-12 text-center">
              <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-heading text-xl font-bold mb-2">Assessment Not Ready</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Your teacher hasn't generated the assessment for this topic yet. Please check back later.
              </p>
            </AnimatedCard>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <PageHeader title={assessment.topic.title} description={assessment.topic.description || "Ready to take this assessment"} />

            <div className="grid grid-cols-3 gap-4">
              <AnimatedCard className="p-6 text-center">
                <p className="text-3xl font-heading font-bold text-primary">{assessment.total_marks}</p>
                <p className="text-sm text-muted-foreground">Total Marks</p>
              </AnimatedCard>
              <AnimatedCard className="p-6 text-center">
                <p className="text-3xl font-heading font-bold">{assessment.mcq_questions.length}</p>
                <p className="text-sm text-muted-foreground">MCQ Questions</p>
              </AnimatedCard>
              <AnimatedCard className="p-6 text-center">
                <p className="text-3xl font-heading font-bold">{assessment.short_questions.length}</p>
                <p className="text-sm text-muted-foreground">Short Questions</p>
              </AnimatedCard>
            </div>

            <AnimatedCard className="p-6">
              <h3 className="font-heading font-semibold mb-3">📋 Instructions</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />Answer all multiple choice and short answer questions</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />Short answers have word limits — stay within them</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />Your submission will be scored by AI with detailed feedback</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />You can view your results in the Results section after scoring</li>
              </ul>
            </AnimatedCard>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Button size="lg" className="w-full group" onClick={() => navigate(`/student/assessment/${topicId}`)}>
                <Play className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                Start Assessment
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentTopicDetail;
