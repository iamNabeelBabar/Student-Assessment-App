import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/lib/user-context";
import { getUserByEmail, createUser, type User } from "@/lib/api";
import { toast } from "sonner";

const SelectRole = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useUser();
  const [step, setStep] = useState<"role" | "login" | "register">("role");
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const response = await getUserByEmail(email);
      console.log("getUserByEmail response:", JSON.stringify(response));
      // Handle both wrapped { user: {...} } and direct User responses
      const user = (response as any).user || response;
      if (!user || !user.id) {
        toast.error("User not found. Please register first.");
        setStep("register");
      } else {
        // Store user_id in localStorage for consistent backend access
        localStorage.setItem("user_id", user.id);
        localStorage.setItem("user_role", user.role);
        localStorage.setItem("user_name", user.full_name);
        localStorage.setItem("user_email", user.email);
        setCurrentUser(user);
        navigate(user.role === "teacher" ? "/teacher" : "/student");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error("User not found. Please register first.");
      setStep("register");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !fullName) return;
    setLoading(true);
    try {
      const { user } = await createUser({ email, full_name: fullName, role });
      // Store user_id in localStorage for consistent backend access
      localStorage.setItem("user_id", user.id);
      localStorage.setItem("user_role", user.role);
      localStorage.setItem("user_name", user.full_name);
      localStorage.setItem("user_email", user.email);
      setCurrentUser(user);
      toast.success("Account created!");
      navigate(role === "teacher" ? "/teacher" : "/student");
    } catch (e: any) {
      toast.error(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: "teacher" as const, icon: BookOpen, title: "Teacher", desc: "Create topics, generate assessments, and track results" },
    { value: "student" as const, icon: GraduationCap, title: "Student", desc: "Take assessments and get AI-powered feedback" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="EduAssess" className="h-10 w-10" />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-2">
            {step === "role" ? "Choose Your Role" : step === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === "role" ? "Select how you want to use EduAssess" : `Sign in as ${role}`}
          </p>
        </div>

        {step === "role" && (
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } }, hidden: {} }} className="space-y-4">
            {roles.map((r) => (
              <motion.button
                key={r.value}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                onClick={() => { setRole(r.value); setStep("login"); }}
                className="w-full group glass-card rounded-xl p-6 text-left hover-lift flex items-center gap-4"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors duration-300">
                  <r.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-semibold">{r.title}</h3>
                  <p className="text-sm text-muted-foreground">{r.desc}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </motion.button>
            ))}
          </motion.div>
        )}

        {(step === "login" || step === "register") && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-6 space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {step === "register" && (
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            )}
            <Button
              className="w-full"
              disabled={loading}
              onClick={step === "login" ? handleLogin : handleRegister}
            >
              {loading ? "Loading..." : step === "login" ? "Sign In" : "Create Account"}
            </Button>
            <div className="flex items-center justify-between">
              <button onClick={() => setStep("role")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Change role
              </button>
              <button
                onClick={() => setStep(step === "login" ? "register" : "login")}
                className="text-sm text-primary hover:underline"
              >
                {step === "login" ? "Create account" : "Already have an account?"}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default SelectRole;
