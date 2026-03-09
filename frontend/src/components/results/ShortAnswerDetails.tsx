import { motion } from "framer-motion";
import { FileText, CheckCircle2, XCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedCard } from "@/components/shared";

interface ShortDetail {
  question_id?: string;
  question: string;
  student_answer: string;
  score: number;
  max_marks: number;
  reasoning: string;
  key_points_addressed?: string[];
  key_points_missed: string[];
  answer_quality?: string;
}

interface ShortAnswerDetailsProps {
  details: ShortDetail[];
  sectionFeedback?: string;
}

const qualityColors: Record<string, string> = {
  "excellent": "bg-success/10 text-success border-success/30",
  "good": "bg-primary/10 text-primary border-primary/30",
  "satisfactory": "bg-warning/10 text-warning border-warning/30",
  "partial": "bg-warning/10 text-warning border-warning/30",
  "poor": "bg-destructive/10 text-destructive border-destructive/30",
  "insufficient": "bg-destructive/10 text-destructive border-destructive/30",
};

const ShortAnswerDetails = ({ details, sectionFeedback }: ShortAnswerDetailsProps) => {
  const totalEarned = details.reduce((a, d) => a + d.score, 0);
  const totalMax = details.reduce((a, d) => a + d.max_marks, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-warning" />
          Short Answer Questions
        </h3>
        <Badge className="bg-warning/10 text-warning border-warning/30 font-heading">
          {totalEarned}/{totalMax} marks
        </Badge>
      </div>

      {sectionFeedback && (
        <div className="glass-card rounded-xl p-4 mb-4 bg-warning/5 border-warning/20">
          <p className="text-sm text-muted-foreground italic">{sectionFeedback}</p>
        </div>
      )}

      <div className="space-y-4">
        {details.map((d, i) => {
          const scorePercent = d.max_marks > 0 ? Math.round((d.score / d.max_marks) * 100) : 0;
          const qualityClass = qualityColors[(d.answer_quality || "").toLowerCase()] || qualityColors["satisfactory"];

          return (
            <motion.div
              key={d.question_id || i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
            >
              <AnimatedCard className="p-5">
                {/* Question header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium leading-snug">
                    <span className="text-muted-foreground mr-1">Q{i + 1}.</span>
                    {d.question}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.answer_quality && (
                      <Badge variant="outline" className={`text-xs ${qualityClass}`}>
                        <Star className="h-3 w-3 mr-1" />
                        {d.answer_quality}
                      </Badge>
                    )}
                    <Badge className="font-heading">{d.score}/{d.max_marks}</Badge>
                  </div>
                </div>

                {/* Score bar */}
                <div className="flex items-center gap-3 mb-3">
                  <Progress value={scorePercent} className="h-2 flex-1" />
                  <span className="text-xs font-medium text-muted-foreground w-10 text-right">{scorePercent}%</span>
                </div>

                {/* Student answer */}
                <div className="bg-secondary/50 rounded-xl p-4 mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Your Answer</p>
                  <p className="text-sm leading-relaxed">{d.student_answer}</p>
                </div>

                {/* Reasoning */}
                <div className="bg-primary/5 rounded-xl p-4 mb-3">
                  <p className="text-xs font-medium text-primary mb-1">AI Feedback</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.reasoning}</p>
                </div>

                {/* Key points */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {d.key_points_addressed && d.key_points_addressed.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-success mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Points Covered
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {d.key_points_addressed.map((p, j) => (
                          <Badge key={j} className="text-xs bg-success/10 text-success border-success/20">✓ {p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {d.key_points_missed.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-destructive mb-2 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Points Missed
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {d.key_points_missed.map((p, j) => (
                          <Badge key={j} variant="outline" className="text-xs text-destructive border-destructive/30">✗ {p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedCard>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ShortAnswerDetails;
