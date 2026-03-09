import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, BarChart3, Trophy, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/lib/user-context";
import { useBackendUserId } from "@/hooks/use-backend-user-id";
import { getStudentDashboard, type StudentDashboard as SDash } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { StatCard, PageHeader, AnimatedCard } from "@/components/shared";
import { toast } from "sonner";

const StudentDashboard = () => {
  const { currentUser } = useUser();
  const { userId, loading: userLoading } = useBackendUserId();
  const navigate = useNavigate();
  const [data, setData] = useState<SDash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getStudentDashboard(userId)
      .then(setData)
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!currentUser) { navigate("/select-role"); return null; }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader title={`Hey, ${currentUser.full_name} 👋`} description="Your learning dashboard" />

        {(loading || userLoading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={BookOpen} label="Enrolled" value={data.enrolled_count} />
              <StatCard icon={Trophy} label="Completed" value={data.completed_assessments} color="success" />
              <StatCard icon={Clock} label="Pending" value={data.pending_assessments ?? 0} color="warning" />
              <StatCard icon={BarChart3} label="Avg Score" value={data.average_score?.toFixed(1) || "—"} color="primary" />
            </div>

            <h2 className="font-heading text-xl font-semibold mb-4">My Topics</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {data.topics.map((topic, i) => (
                <motion.div key={topic.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <AnimatedCard className="p-6">
                    <Badge className="mb-3">{topic.status}</Badge>
                    <h3 className="font-heading font-semibold text-lg mb-1">{topic.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{topic.description}</p>
                    {topic.assessment_ready ? (
                      <Button size="sm" className="w-full" onClick={() => navigate(`/student/topics/${topic.id}`)}>
                        Start Assessment
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center">Assessment not ready yet</p>
                    )}
                  </AnimatedCard>
                </motion.div>
              ))}
            </div>

            {data.recent_submissions.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-semibold">Recent Submissions</h2>
                  <Button variant="outline" size="sm" onClick={() => navigate("/student/results")}>
                    View All Results
                  </Button>
                </div>
                <div className="space-y-3">
                  {data.recent_submissions.map((sub) => (
                    <AnimatedCard key={sub.id} className="p-4 flex items-center justify-between cursor-pointer" onClick={() => navigate(`/student/submissions/${sub.id}`)}>
                      <div>
                        <p className="font-medium text-sm">{sub.topics.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sub.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading font-bold text-lg">{sub.total_score}</p>
                        <Badge variant={sub.scoring_status === "completed" ? "default" : "secondary"}>
                          {sub.scoring_status}
                        </Badge>
                      </div>
                    </AnimatedCard>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">No data available.</p>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentDashboard;
