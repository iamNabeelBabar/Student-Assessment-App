import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Brain, Loader2, Users, FileText, CheckCircle, AlertCircle, Mail, BarChart3, Download, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getTopicDetail, generateAssessment, getTeacherAssessment, updateTopicStatus,
  enrollByEmail, enrollById, getEnrolledStudents, getTopicResults,
  pollUntil,
  type Assessment, type TopicResults, type EnrolledStudent
} from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { PageHeader, AnimatedCard, StatCard } from "@/components/shared";
import { toast } from "sonner";

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default", draft: "secondary", closed: "destructive",
};

const TopicDetail = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<any>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [results, setResults] = useState<TopicResults | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState("");
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [tab, setTab] = useState<string>("overview");

  const loadData = useCallback(async () => {
    if (!topicId) return;
    try {
      const detail = await getTopicDetail(topicId);
      setTopic(detail.topic);
      setAssessment(detail.assessment);

      if (detail.assessment && detail.assessment.generation_status === "completed") {
        try {
          const full = await getTeacherAssessment(topicId);
          setAssessment(full.assessment);
        } catch {}
      } else if (detail.assessment && (detail.assessment.generation_status === "pending" || detail.assessment.generation_status === "generating")) {
        setGenerating(true);
      }

      try {
        const r = await getTopicResults(topicId);
        setResults(r);
      } catch {}

      try {
        const e = await getEnrolledStudents(topicId);
        setEnrolledStudents(e.students);
      } catch {}
    } catch {
      toast.error("Failed to load topic");
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll for assessment generation
  useEffect(() => {
    if (!generating || !topicId) return;
    const interval = setInterval(async () => {
      try {
        const detail = await getTopicDetail(topicId);
        if (detail.assessment?.generation_status === "completed") {
          setGenerating(false);
          toast.success("Assessment generated successfully! 🎉");
          try {
            const full = await getTeacherAssessment(topicId);
            setAssessment(full.assessment);
          } catch {
            setAssessment(detail.assessment);
          }
          setTopic(detail.topic);
          setTab("assessment");
        } else if (detail.assessment?.generation_status === "failed") {
          setGenerating(false);
          toast.error("Assessment generation failed. You can retry.");
          setAssessment(detail.assessment);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [generating, topicId]);

  const handleGenerate = async () => {
    if (!topicId) return;
    setGenerating(true);
    try {
      await generateAssessment(topicId);
      toast.info("Assessment generation started... this may take 30–60 seconds.");
    } catch (e: any) {
      toast.error(e.message);
      setGenerating(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!topicId) return;
    try {
      await updateTopicStatus(topicId, status);
      setTopic((t: any) => ({ ...t, status }));
      toast.success(`Status updated to ${status}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEnrollByEmail = async () => {
    if (!topicId || !enrollEmail) return;
    setEnrolling(true);
    try {
      await enrollByEmail(topicId, enrollEmail);
      toast.success("Student enrolled!");
      setEnrollEmail("");
      const e = await getEnrolledStudents(topicId);
      setEnrolledStudents(e.students);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleEnrollById = async () => {
    if (!topicId || !enrollStudentId) return;
    setEnrolling(true);
    try {
      await enrollById(topicId, enrollStudentId);
      toast.success("Student enrolled!");
      setEnrollStudentId("");
      const e = await getEnrolledStudents(topicId);
      setEnrolledStudents(e.students);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEnrolling(false);
    }
  };

  const downloadCSV = () => {
    if (!results?.submissions.length) return;
    const headers = ["Student Name", "Email", "MCQ Score", "Short Score", "Total Score", "Grade", "Status", "Submitted At"];
    const rows = results.submissions.map((s) => [
      s.users?.full_name || "Unknown",
      s.users?.email || "",
      s.mcq_score,
      s.short_score,
      s.total_score,
      s.feedback?.grade_label || "N/A",
      s.scoring_status,
      s.submitted_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results-${topicId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </AppLayout>
  );

  if (!topic) return null;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          title={topic.title}
          description={topic.description}
          action={
            <div className="flex items-center gap-3">
              <Select value={topic.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant={statusColors[topic.status]}>{topic.status}</Badge>
            </div>
          }
        />

        {/* Tabs */}
        <div className="flex gap-1 mb-8 glass-card rounded-lg p-1 w-fit">
          {["overview", "assessment", "students", "results"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Enroll students */}
              <AnimatedCard className="p-6">
                <h3 className="font-heading font-semibold flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" /> Enroll Student
                </h3>
                <Tabs defaultValue="email" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="email" className="flex-1">By Email</TabsTrigger>
                    <TabsTrigger value="id" className="flex-1">By Student ID</TabsTrigger>
                  </TabsList>
                  <TabsContent value="email" className="space-y-3 mt-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="student@school.edu"
                        value={enrollEmail}
                        onChange={(e) => setEnrollEmail(e.target.value)}
                      />
                      <Button onClick={handleEnrollByEmail} disabled={enrolling}>
                        {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="id" className="space-y-3 mt-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Student ID"
                        value={enrollStudentId}
                        onChange={(e) => setEnrollStudentId(e.target.value)}
                      />
                      <Button onClick={handleEnrollById} disabled={enrolling}>
                        {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </AnimatedCard>

              {/* Generate Assessment */}
              <AnimatedCard className="p-6">
                <h3 className="font-heading font-semibold flex items-center gap-2 mb-4">
                  <Brain className="h-5 w-5 text-primary" /> AI Assessment
                </h3>
                {assessment && assessment.generation_status === "completed" ? (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Assessment generated ({assessment.total_marks} marks)</span>
                  </div>
                ) : assessment && assessment.generation_status === "failed" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Generation failed</span>
                    </div>
                    <Button onClick={handleGenerate} className="w-full" variant="destructive">
                      <Brain className="h-4 w-4 mr-2" /> Retry Generation
                    </Button>
                  </div>
                ) : generating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Generating assessment… this may take 30–60 seconds</span>
                  </div>
                ) : (
                  <Button onClick={handleGenerate} className="w-full">
                    <Brain className="h-4 w-4 mr-2" /> Generate Assessment
                  </Button>
                )}
              </AnimatedCard>
            </div>

            {topic.material_filename && (
              <AnimatedCard className="p-6">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Attached Material</p>
                    <p className="text-xs text-muted-foreground">{topic.material_filename}</p>
                  </div>
                </div>
              </AnimatedCard>
            )}
          </div>
        )}

        {tab === "assessment" && (
          <div>
            {!assessment || assessment.generation_status !== "completed" ? (
              <div className="text-center py-20">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {assessment?.generation_status === "failed"
                    ? "Assessment generation failed."
                    : generating
                    ? "Assessment is being generated..."
                    : "No assessment generated yet."}
                </p>
                {!generating && (
                  <Button onClick={handleGenerate} className="mt-4">
                    <Brain className="h-4 w-4 mr-2" /> {assessment?.generation_status === "failed" ? "Retry" : "Generate Now"}
                  </Button>
                )}
                {generating && <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mt-4" />}
              </div>
            ) : (
              <div className="space-y-6">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-success shrink-0" />
                  <div>
                    <p className="font-heading font-semibold text-success">Assessment Generated Successfully!</p>
                    <p className="text-sm text-muted-foreground">
                      {assessment.mcq_questions.length} MCQ and {assessment.short_questions.length} Short Answer questions · Total: {assessment.total_marks} marks
                    </p>
                  </div>
                </motion.div>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard icon={FileText} label="Total Marks" value={assessment.total_marks} />
                  <StatCard icon={CheckCircle} label="MCQ Marks" value={assessment.mcq_marks} color="success" />
                  <StatCard icon={FileText} label="Short Marks" value={assessment.short_marks} color="warning" />
                </div>

                <h3 className="font-heading font-semibold text-lg">MCQ Questions</h3>
                <div className="space-y-4">
                  {assessment.mcq_questions.map((q, i) => (
                    <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <AnimatedCard className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-sm font-medium text-muted-foreground">Q{i + 1} · {q.marks} mark(s)</span>
                          {q.difficulty && <Badge variant="secondary">{q.difficulty}</Badge>}
                        </div>
                        <p className="font-medium mb-3">{q.question}</p>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {Object.entries(q.options).map(([k, v]) => (
                            <div key={k} className={`px-3 py-2 rounded-lg text-sm ${k === q.correct_answer ? "bg-success/10 text-success font-medium border border-success/30" : "bg-secondary"}`}>
                              <span className="font-semibold mr-2">{k}.</span>{v}
                            </div>
                          ))}
                        </div>
                        {q.explanation && <p className="text-sm text-muted-foreground italic">{q.explanation}</p>}
                      </AnimatedCard>
                    </motion.div>
                  ))}
                </div>

                <h3 className="font-heading font-semibold text-lg mt-8">Short Answer Questions</h3>
                <div className="space-y-4">
                  {assessment.short_questions.map((q, i) => (
                    <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <AnimatedCard className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-sm font-medium text-muted-foreground">Q{i + 1} · {q.marks} mark(s){q.word_limit ? ` · ${q.word_limit} words` : ""}</span>
                          {q.cognitive_level && <Badge variant="secondary">{q.cognitive_level}</Badge>}
                        </div>
                        <p className="font-medium mb-3">{q.question}</p>
                        {q.model_answer && (
                          <div className="bg-secondary rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Model Answer</p>
                            <p className="text-sm">{q.model_answer}</p>
                          </div>
                        )}
                        {q.key_points && q.key_points.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {q.key_points.map((p, j) => <Badge key={j} variant="outline" className="text-xs">{p}</Badge>)}
                          </div>
                        )}
                      </AnimatedCard>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "students" && (
          <div>
            {enrolledStudents.length === 0 ? (
              <div className="text-center py-20">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No students enrolled yet.</p>
              </div>
            ) : (
              <AnimatedCard className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-secondary/50">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Enrolled At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="p-4 text-sm font-medium">{s.users.full_name}</td>
                        <td className="p-4 text-sm text-muted-foreground">{s.users.email}</td>
                        <td className="p-4 text-sm text-muted-foreground">{new Date(s.enrolled_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AnimatedCard>
            )}
          </div>
        )}

        {tab === "results" && (
          <div>
            {!results || results.submissions.length === 0 ? (
              <div className="text-center py-20">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No submissions yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard icon={Users} label="Students" value={results.stats.total_students} />
                  <StatCard icon={BarChart3} label="Average" value={results.stats.average_score?.toFixed(1) ?? "—"} color="primary" />
                  <StatCard icon={CheckCircle} label="Highest" value={results.stats.highest_score} color="success" />
                  <StatCard icon={AlertCircle} label="Lowest" value={results.stats.lowest_score} color="destructive" />
                  <StatCard icon={FileText} label="Pass Rate" value={`${results.stats.pass_rate}%`} color="success" />
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={downloadCSV} className="gap-2">
                    <Download className="h-4 w-4" /> Download CSV
                  </Button>
                </div>

                <AnimatedCard className="overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-secondary/50">
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Student</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">MCQ</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Short</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Total</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Grade</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.submissions.map((s) => (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-secondary/30 transition-colors">
                          <td className="p-4">
                            <p className="font-medium text-sm">{s.users?.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{s.users?.email}</p>
                          </td>
                          <td className="p-4 text-sm">{s.mcq_score ?? "—"}</td>
                          <td className="p-4 text-sm">{s.short_score ?? "—"}</td>
                          <td className="p-4 text-sm font-semibold">{s.total_score ?? "—"}</td>
                          <td className="p-4"><Badge>{s.feedback?.grade_label || "N/A"}</Badge></td>
                          <td className="p-4">
                            <Badge variant={s.scoring_status === "completed" ? "default" : s.scoring_status === "failed" ? "destructive" : "secondary"}>
                              {s.scoring_status}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{new Date(s.submitted_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </AnimatedCard>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TopicDetail;
