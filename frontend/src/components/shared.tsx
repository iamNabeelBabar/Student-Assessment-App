import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const AnimatedCard = ({ children, className = "", onClick }: Props) => (
  <motion.div
    onClick={onClick}
    whileHover={{ y: -4, boxShadow: "0 20px 40px -12px hsl(220 90% 56% / 0.12)" }}
    transition={{ duration: 0.3 }}
    className={`glass-card rounded-xl ${className}`}
  >
    {children}
  </motion.div>
);

export const StatCard = ({ icon: Icon, label, value, color = "primary" }: {
  icon: any;
  label: string;
  value: string | number;
  color?: "primary" | "success" | "warning" | "destructive";
}) => {
  const colors = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <AnimatedCard className="p-6">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl ${colors[color]} flex items-center justify-center`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-heading font-bold">{value}</p>
        </div>
      </div>
    </AnimatedCard>
  );
};

export const PageHeader = ({ title, description, action }: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <h1 className="font-heading text-2xl md:text-3xl font-bold">{title}</h1>
      {description && <p className="text-muted-foreground mt-1">{description}</p>}
    </div>
    {action}
  </div>
);
