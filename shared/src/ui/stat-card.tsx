import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@shared/ui/card";

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
      <Card className="glass h-full bg-card/75 interactive-surface">
        <CardContent className="p-5">
          <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold sm:text-3xl">{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
