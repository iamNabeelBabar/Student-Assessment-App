import { motion } from "framer-motion";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AnimatedCard } from "@/components/shared";

interface MCQDetail {
  question_id?: string;
  question: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  earned: number;
  max_marks: number;
  explanation: string;
}

interface MCQDetailsProps {
  details: MCQDetail[];
  sectionFeedback?: string;
}

const MCQDetails = ({ details, sectionFeedback }: MCQDetailsProps) => {
  const correct = details.filter((d) => d.is_correct).length;
  const total = details.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Multiple Choice Questions
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-heading">
            {correct}/{total} correct
          </Badge>
          <Badge className="bg-primary/10 text-primary border-primary/30">
            {details.reduce((a, d) => a + d.earned, 0)}/{details.reduce((a, d) => a + d.max_marks, 0)} marks
          </Badge>
        </div>
      </div>

      {sectionFeedback && (
        <div className="glass-card rounded-xl p-4 mb-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground italic">{sectionFeedback}</p>
        </div>
      )}

      <div className="space-y-3">
        {details.map((d, i) => (
          <motion.div
            key={d.question_id || i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.04 }}
          >
            <AnimatedCard className={`p-5 border-l-4 ${d.is_correct ? "border-l-success" : "border-l-destructive"}`}>
              <div className="flex items-start gap-3">
                <div className={`shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center ${d.is_correct ? "bg-success/10" : "bg-destructive/10"}`}>
                  {d.is_correct
                    ? <CheckCircle2 className="h-4 w-4 text-success" />
                    : <XCircle className="h-4 w-4 text-destructive" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-medium leading-snug">
                      <span className="text-muted-foreground mr-1">Q{i + 1}.</span>
                      {d.question}
                    </p>
                    <Badge className={`shrink-0 ${d.is_correct ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>
                      {d.earned}/{d.max_marks}
                    </Badge>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2 mb-2">
                    <div className={`px-3 py-2 rounded-lg text-sm ${d.is_correct ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"}`}>
                      <span className="text-xs text-muted-foreground block mb-0.5">Your Answer</span>
                      <span className="font-medium">{d.student_answer}</span>
                    </div>
                    {!d.is_correct && (
                      <div className="px-3 py-2 rounded-lg text-sm bg-success/10 border border-success/20">
                        <span className="text-xs text-muted-foreground block mb-0.5">Correct Answer</span>
                        <span className="font-medium text-success">{d.correct_answer}</span>
                      </div>
                    )}
                  </div>

                  {d.explanation && (
                    <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-secondary/50">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{d.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default MCQDetails;
