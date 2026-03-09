import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/lib/user-context";
import { Sparkles, LayoutDashboard, BookOpen, BarChart3, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

const teacherNav = [
  { path: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { path: "/teacher/topics", label: "Topics", icon: BookOpen },
];

const studentNav = [
  { path: "/student", label: "Dashboard", icon: LayoutDashboard },
  { path: "/student/topics", label: "My Topics", icon: BookOpen },
  { path: "/student/results", label: "Results", icon: BarChart3 },
];

const AppLayout = ({ children }: Props) => {
  const { currentUser, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const isTeacher = currentUser?.role === "teacher";
  const nav = isTeacher ? teacherNav : studentNav;

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 inset-x-0 z-50 glass-card border-b h-16">
        <div className="h-full px-6 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <img src="/logo.png" alt="EduAssess" className="h-8 w-8" />
              <span className="font-heading font-bold hidden sm:block">EduAssess</span>
            </button>
            <div className="hidden md:flex items-center gap-1">
              {nav.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{currentUser?.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{currentUser?.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-card border-t">
        <div className="flex items-center justify-around h-14">
          {nav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="pt-16 pb-20 md:pb-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default AppLayout;
