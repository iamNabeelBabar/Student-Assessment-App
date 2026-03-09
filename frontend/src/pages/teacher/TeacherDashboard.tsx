import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, FileText, Users, BarChart3, Plus, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/lib/user-context";
import { getTeacherDashboard, type TeacherDashboard as TDash } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { StatCard, PageHeader, AnimatedCard } from "@/components/shared";
import { toast } from "sonner";

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  draft: "secondary",
  closed: "destructive",
};

const TeacherDashboard = () => {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [data, setData] = useState<TDash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    getTeacherDashboard(currentUser.id)
      .then(setData)
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (!currentUser) { navigate("/select-role"); return null; }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          title={`Welcome back, ${currentUser.full_name}`}
          description="Manage your topics and track student progress"
          action={
            <Button onClick={() => navigate("/teacher/topics/new")}>
              <Plus className="h-4 w-4 mr-2" /> New Topic
            </Button>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={BookOpen} label="Total Topics" value={data.summary.total_topics} />
              <StatCard icon={Sparkles} label="Active" value={data.summary.active_topics} color="success" />
              <StatCard icon={FileText} label="Drafts" value={data.summary.draft_topics} color="warning" />
              <StatCard icon={Users} label="Closed" value={data.summary.closed_topics} />
            </div>

            <h2 className="font-heading text-xl font-semibold mb-4">Recent Topics</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.topics.map((topic, i) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <AnimatedCard className="p-6 cursor-pointer" >
                    <div onClick={() => navigate(`/teacher/topics/${topic.id}`)}>
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant={statusColors[topic.status]}>{topic.status}</Badge>
                        {topic.material_filename && <FileText className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <h3 className="font-heading font-semibold text-lg mb-1">{topic.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{topic.description}</p>
                    </div>
                  </AnimatedCard>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">No data available.</p>
        )}
      </div>
    </AppLayout>
  );
};

export default TeacherDashboard;
