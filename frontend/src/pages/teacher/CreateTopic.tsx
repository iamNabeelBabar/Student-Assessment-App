import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/lib/user-context";
import { createTopic, generateAssessment } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { PageHeader } from "@/components/shared";
import { toast } from "sonner";

const CreateTopic = () => {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mcqCount, setMcqCount] = useState(7);
  const [shortCount, setShortCount] = useState(4);
  const [loading, setLoading] = useState(false);

  if (!currentUser) { navigate("/select-role"); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("teacher_id", currentUser.id);
      fd.append("title", title);
      fd.append("description", description);
      fd.append("requested_mcq_count", String(mcqCount));
      fd.append("requested_short_count", String(shortCount));
      if (file) fd.append("material", file);
      const { topic } = await createTopic(fd);
      toast.success("Topic created! Generating assessment...");
      try {
        await generateAssessment(topic.id);
        toast.info("AI is generating your assessment. This may take 30–60 seconds.");
      } catch {
        toast.warning("Topic created but assessment generation failed. You can retry from topic detail.");
      }
      navigate(`/teacher/topics/${topic.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create topic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <PageHeader title="Create New Topic" description="Add a topic with optional course material" />
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="glass-card rounded-xl p-6 space-y-6"
        >
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="e.g., Introduction to Machine Learning" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Describe the topic..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number of MCQ Questions (1–20)</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={mcqCount}
                onChange={(e) => setMcqCount(Math.min(20, Math.max(1, Number(e.target.value))))}
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Short Answer Questions (1–10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={shortCount}
                onChange={(e) => setShortCount(Math.min(10, Math.max(1, Number(e.target.value))))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Upload Study Material (optional — PDF, DOCX, TXT)</Label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                {file ? file.name : "Upload PDF, DOCX, or TXT"}
              </span>
              <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <p className="text-xs text-muted-foreground italic">
              If no file is uploaded, AI will generate questions from the topic title and description.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Topic
          </Button>
        </motion.form>
      </div>
    </AppLayout>
  );
};

export default CreateTopic;
