import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Loader2, BarChart3, Target, TrendingUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/lib/user-context";
import { useBackendUserId } from "@/hooks/use-backend-user-id";
import { getStudentResults, type StudentResult } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { PageHeader, AnimatedCard, StatCard } from "@/components/shared";
import { toast } from "sonner";

const gradeColors: Record<string, string> = {
  "Excellent": "bg-success/10 text-success border-success/30",
  "Good": "bg-primary/10 text-primary border-primary/30",
  "Satisfactory": "bg-warning/10 text-warning border-warning/30",
  "Needs Improvement": "bg-warning/10 text-warning border-warning/30",
  "Poor": "bg-destructive/10 text-destructive border-destructive/30",
};

const gradeIcons: Record<string, string> = {
  "Excellent": "🏆", "Good": "⭐", "Satisfactory": "👍", "Needs Improvement": "📚", "Poor": "💪",
};

const StudentResults = () => {
  const { currentUser } = useUser();
  const { userId, loading: userLoading } = useBackendUserId();
  const navigate = useNavigate();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use hook value or fall back to localStorage directly
    const resolvedId = userId || localStorage.getItem("user_id");
    console.log("[StudentResults] userId:", userId, "resolvedId:", resolvedId, "userLoading:", userLoading);
    if (!resolvedId || resolvedId === "undefined" || resolvedId === "null") return;
    getStudentResults(resolvedId)
      .then((data) => setResults(data.results))
      .catch((err) => {
        console.error("Failed to fetch results:", err);
        toast.error("Failed to load results");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (!currentUser) { navigate("/select-role"); return null; }

  // Compute stats
  const completed = results.filter((r) => r.scoring_status === "completed");
  const avgScore = completed.length > 0 ? Math.round(completed.reduce((a, r) => a + (r.max_marks > 0 ? (r.total_score / r.max_marks) * 100 : 0), 0) / completed.length) : 0;
  const bestScore = completed.length > 0 ? Math.max(...completed.map((r) => r.total_score)) : 0;
  const pending = results.filter((r) => r.scoring_status !== "completed" && r.scoring_status !== "failed").length;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader title="My Results" description="Track your performance across all assessments" />

        {(loading || userLoading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : results.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-heading text-xl font-semibold mb-2">No Results Yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">Complete an assessment to see your scores and detailed analysis here.</p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Stats overview */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={BarChart3} label="Assessments" value={results.length} />
              <StatCard icon={Target} label="Average Score" value={`${avgScore}%`} color="primary" />
              <StatCard icon={TrendingUp} label="Best Score" value={bestScore} color="success" />
              <StatCard icon={Clock} label="Pending" value={pending} color="warning" />
            </motion.div>

            {/* Results list */}
            <div className="space-y-3">
              {results.map((r, i) => {
                const percent = r.max_marks > 0 ? Math.round((r.total_score / r.max_marks) * 100) : 0;
                const gradeClass = gradeColors[r.grade_label] || "";
                const icon = gradeIcons[r.grade_label] || "📋";
                const isPending = r.scoring_status !== "completed" && r.scoring_status !== "failed";

                return (
                  <motion.div
                    key={r.submission_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <AnimatedCard
                      className="p-6 cursor-pointer"
                      onClick={() => navigate(`/student/submissions/${r.submission_id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-2xl">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-heading font-semibold truncate">{r.topic_title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(r.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {isPending ? (
                                <Badge variant="secondary" className="animate-pulse">
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  {r.scoring_status}
                                </Badge>
                              ) : r.scoring_status === "failed" ? (
                                <Badge variant="destructive">Failed</Badge>
                              ) : (
                                <>
                                  <div className="text-right hidden sm:block">
                                    <p className="font-heading text-2xl font-bold">{r.total_score}<span className="text-sm text-muted-foreground">/{r.max_marks}</span></p>
                                  </div>
                                  <Badge className={`border ${gradeClass}`}>{r.grade_label}</Badge>
                                </>
                              )}
                            </div>
                          </div>
                          {r.scoring_status === "completed" && (
                            <div className="flex items-center gap-3 mt-3">
                              <Progress value={percent} className="h-2 flex-1" />
                              <span className="text-xs font-medium text-muted-foreground w-10 text-right">{percent}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </AnimatedCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentResults;
