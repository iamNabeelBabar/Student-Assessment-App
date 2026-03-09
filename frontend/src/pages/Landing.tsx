import { motion } from "framer-motion";
import { BookOpen, Brain, BarChart3, Users, Sparkles, ArrowRight, GraduationCap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.png";

const features = [
  { icon: Brain, title: "AI-Powered Assessments", description: "Generate comprehensive assessments from your course materials using advanced AI" },
  { icon: Target, title: "Instant Grading", description: "Automated scoring with detailed feedback for both MCQ and short-answer questions" },
  { icon: BarChart3, title: "Analytics Dashboard", description: "Track student performance with rich statistics and visual insights" },
  { icon: Users, title: "Easy Enrollment", description: "Enroll students by email or ID with seamless topic management" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 inset-x-0 z-50 glass-card border-b"
      >
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="EduAssess" className="h-9 w-9" />
            <span className="font-heading text-xl font-bold">EduAssess</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How It Works</a>
          </div>
          <Button onClick={() => navigate("/select-role")} size="sm">
            Get Started <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 dot-pattern opacity-40" />
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              animate="show"
              variants={stagger}
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered Education Platform
              </motion.div>
              <motion.h1 variants={fadeUp} className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
                Smarter <span className="gradient-text">Assessments</span>,{" "}
                Better Learning
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
                Create AI-generated assessments from your course materials. Automated grading with detailed feedback helps students learn faster.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => navigate("/select-role")} className="group">
                  Start Now
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                  Learn More
                </Button>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <img src={heroBg} alt="AI Assessment Platform" className="w-full h-auto" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              </div>
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 glass-card rounded-xl p-4 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-semibold">92% Pass Rate</p>
                  <p className="text-xs text-muted-foreground">Across all topics</p>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -top-4 -right-4 glass-card rounded-xl p-4 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">AI Grading</p>
                  <p className="text-xs text-muted-foreground">Instant feedback</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Powerful tools for teachers and students to create, take, and analyze assessments.</p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="group glass-card rounded-xl p-6 hover-lift cursor-default"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <f.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-6 bg-secondary/50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Three simple steps to transform your teaching workflow.</p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
            {[
              { step: "01", icon: BookOpen, title: "Upload Materials", desc: "Upload your course content — PDFs, docs, or text files." },
              { step: "02", icon: Brain, title: "AI Generates", desc: "Our AI agent creates MCQ and short-answer questions automatically." },
              { step: "03", icon: GraduationCap, title: "Students Learn", desc: "Students take assessments and receive instant AI-powered feedback." },
            ].map((item) => (
              <motion.div key={item.step} variants={fadeUp} className="text-center group">
                <div className="relative mx-auto mb-6">
                  <div className="h-20 w-20 rounded-2xl bg-card border border-border mx-auto flex items-center justify-center group-hover:border-primary/50 group-hover:shadow-lg transition-all duration-300">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl bg-primary p-12 md:p-16 text-center"
          >
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-4 relative z-10">
              Ready to Transform Your Assessments?
            </h2>
            <p className="text-primary-foreground/80 max-w-md mx-auto mb-8 relative z-10">
              Join educators who are already using AI to create better learning experiences.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/select-role")}
              className="relative z-10 group"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="EduAssess" className="h-6 w-6" />
            <span className="font-heading font-semibold">EduAssess</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 EduAssess. Intelligent assessment platform.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
