import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/lib/user-context";
import { getTeacherTopics, type Topic } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { PageHeader, AnimatedCard } from "@/components/shared";
import { toast } from "sonner";

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  draft: "secondary",
  closed: "destructive",
};

const TeacherTopics = () => {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    getTeacherTopics(currentUser.id)
      .then((d) => setTopics(d.topics))
      .catch(() => toast.error("Failed to load topics"))
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (!currentUser) { navigate("/select-role"); return null; }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          title="My Topics"
          description="Create and manage assessment topics"
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
        ) : topics.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">No topics yet</h3>
            <p className="text-muted-foreground mb-4">Create your first topic to get started.</p>
            <Button onClick={() => navigate("/teacher/topics/new")}>
              <Plus className="h-4 w-4 mr-2" /> Create Topic
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic, i) => (
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
                      {topic.material_filename && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {topic.material_filename}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading font-semibold text-lg mb-1">{topic.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{topic.description}</p>
                  </div>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TeacherTopics;
