import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/lib/user-context";
import { useBackendUserId } from "@/hooks/use-backend-user-id";
import { getStudentTopics, type StudentTopic } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { PageHeader, AnimatedCard } from "@/components/shared";
import { toast } from "sonner";

const StudentTopics = () => {
  const { currentUser } = useUser();
  const { userId, loading: userLoading } = useBackendUserId();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<StudentTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getStudentTopics(userId)
      .then((d) => setTopics(d.topics))
      .catch(() => toast.error("Failed to load topics"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!currentUser) { navigate("/select-role"); return null; }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader title="My Topics" description="Topics you're enrolled in" />

        {(loading || userLoading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">You're not enrolled in any topics yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic, i) => (
              <motion.div key={topic.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <AnimatedCard className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge>{topic.status}</Badge>
                    {topic.assessment_ready && <Badge variant="secondary" className="text-xs">Ready</Badge>}
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-1">{topic.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{topic.description}</p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/student/topics/${topic.id}`)}
                  >
                    {topic.assessment_ready ? "View Assessment" : "View Topic"}
                  </Button>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentTopics;
