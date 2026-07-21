import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  index?: number;
  className?: string;
};

export function StatCard({ label, value, icon: Icon, index = 0, className }: StatCardProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={className}
      initial={{ opacity: 0, y: 16 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className="glass rounded-lg border bg-card/70 p-5">
        <Icon className="mb-4 h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold">{value}</p>
      </div>
    </motion.div>
  );
}