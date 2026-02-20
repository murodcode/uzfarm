import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  bgClass?: string;
  iconColorClass?: string;
}

export default function StatCard({ icon: Icon, label, value, bgClass = "bg-farm-green-light", iconColorClass = "text-primary" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="farm-card flex items-center gap-2 overflow-hidden"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bgClass}`}>
        <Icon className={`h-4 w-4 ${iconColorClass}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-muted-foreground truncate">{label}</p>
        <p className="text-base font-bold text-foreground truncate">{value}</p>
      </div>
    </motion.div>
  );
}
