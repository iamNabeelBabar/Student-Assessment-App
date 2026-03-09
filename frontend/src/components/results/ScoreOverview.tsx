import { motion } from "framer-motion";
import { Trophy, Target, TrendingUp, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const gradeConfig: Record<string, { color: string; bg: string; icon: string }> = {
  "Excellent": { color: "text-success", bg: "bg-success/10 border-success/30", icon: "🏆" },
  "Good": { color: "text-primary", bg: "bg-primary/10 border-primary/30", icon: "⭐" },
  "Satisfactory": { color: "text-warning", bg: "bg-warning/10 border-warning/30", icon: "👍" },
  "Needs Improvement": { color: "text-warning", bg: "bg-warning/10 border-warning/30", icon: "📚" },
  "Poor": { color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", icon: "💪" },
};

interface ScoreOverviewProps {
  totalScore: number;
  mcqScore: number;
  shortScore: number;
  maxMarks: number;
  gradeLabel: string;
  overallComment: string;
}

const ScoreOverview = ({ totalScore, mcqScore, shortScore, maxMarks, gradeLabel, overallComment }: ScoreOverviewProps) => {
  const percent = maxMarks > 0 ? Math.round((totalScore / maxMarks) * 100) : 0;
  const grade = gradeConfig[gradeLabel] || gradeConfig["Satisfactory"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl p-8 border ${grade.bg} relative overflow-hidden`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 opacity-5">
        <Trophy className="w-full h-full" />
      </div>

      <div className="relative z-10">
        {/* Grade badge */}
        <div className="flex items-center justify-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="text-center"
          >
            <span className="text-5xl mb-2 block">{grade.icon}</span>
            <Badge className={`text-lg px-6 py-2 font-heading font-bold ${grade.bg} ${grade.color} border`}>
              {gradeLabel}
            </Badge>
          </motion.div>
        </div>

        {/* Score circle */}
        <div className="flex items-center justify-center mb-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
            className="relative"
          >
            <div className="w-32 h-32 rounded-full border-4 border-primary/20 flex items-center justify-center bg-card">
              <div className="text-center">
                <p className="font-heading text-4xl font-bold">{totalScore}</p>
                <p className="text-sm text-muted-foreground">/ {maxMarks}</p>
              </div>
            </div>
            <svg className="absolute inset-0 w-32 h-32 -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64" cy="64" r="58"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${percent * 3.64} 364`}
                className="transition-all duration-1000"
              />
            </svg>
          </motion.div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center p-3 rounded-xl bg-card/50">
            <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="font-heading text-xl font-bold">{percent}%</p>
            <p className="text-xs text-muted-foreground">Percentage</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="text-center p-3 rounded-xl bg-card/50">
            <Award className="h-5 w-5 mx-auto mb-1 text-success" />
            <p className="font-heading text-xl font-bold">{mcqScore}</p>
            <p className="text-xs text-muted-foreground">MCQ Score</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-center p-3 rounded-xl bg-card/50">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-warning" />
            <p className="font-heading text-xl font-bold">{shortScore}</p>
            <p className="text-xs text-muted-foreground">Short Score</p>
          </motion.div>
        </div>

        {/* Progress bar */}
        <Progress value={percent} className="h-3 mb-4" />

        {/* Overall comment */}
        <blockquote className="text-muted-foreground italic border-l-4 border-primary pl-4 text-sm leading-relaxed">
          {overallComment}
        </blockquote>
      </div>
    </motion.div>
  );
};

export default ScoreOverview;
