import { motion } from "framer-motion";
import { CheckCircle, XCircle, Lightbulb, Sparkles } from "lucide-react";
import { AnimatedCard } from "@/components/shared";

interface InsightsPanelProps {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  encouragement?: string;
}

const InsightsPanel = ({ strengths, weaknesses, recommendations, encouragement }: InsightsPanelProps) => (
  <div className="space-y-6">
    {/* Encouragement */}
    {encouragement && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="glass-card rounded-xl p-5 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-primary leading-relaxed">{encouragement}</p>
          </div>
        </div>
      </motion.div>
    )}

    {/* Strengths & Weaknesses */}
    <div className="grid md:grid-cols-2 gap-4">
      <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
        <AnimatedCard className="p-6 h-full">
          <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            Strengths
          </h3>
          <ul className="space-y-3">
            {strengths.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="text-sm flex items-start gap-2 leading-relaxed"
              >
                <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                {s}
              </motion.li>
            ))}
          </ul>
        </AnimatedCard>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
        <AnimatedCard className="p-6 h-full">
          <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
            Areas to Improve
          </h3>
          <ul className="space-y-3">
            {weaknesses.map((w, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="text-sm text-muted-foreground flex items-start gap-2 leading-relaxed"
              >
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                {w}
              </motion.li>
            ))}
          </ul>
        </AnimatedCard>
      </motion.div>
    </div>

    {/* Recommendations */}
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <AnimatedCard className="p-6">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-warning" />
          </div>
          Recommendations
        </h3>
        <ol className="space-y-3">
          {recommendations.map((r, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className="text-sm text-muted-foreground flex items-start gap-3 leading-relaxed"
            >
              <span className="h-6 w-6 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0 text-xs font-bold">
                {i + 1}
              </span>
              {r}
            </motion.li>
          ))}
        </ol>
      </AnimatedCard>
    </motion.div>
  </div>
);

export default InsightsPanel;
