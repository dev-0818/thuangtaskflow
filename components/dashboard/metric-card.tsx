import type { LucideIcon } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: "primary" | "error" | "neutral";
  meta?: string;
};

export function MetricCard({ label, value, icon: Icon, accent = "primary", meta }: MetricCardProps) {
  return (
    <GlassPanel
      className={cn(
        "flex min-h-[150px] flex-col justify-between p-6",
        accent === "error" && "border-error/25 bg-error/5"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-label-md font-semibold uppercase text-on-surface-variant", accent === "error" && "text-error")}>
          {label}
        </span>
        <Icon className={cn("h-6 w-6 text-primary", accent === "error" && "text-error", accent === "neutral" && "text-on-surface-variant")} strokeWidth={1.7} />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="text-display-lg font-semibold text-on-surface">{value}</div>
        {meta ? (
          <span className="rounded bg-surface-container-high px-3 py-2 text-label-sm font-semibold text-on-surface">
            {meta}
          </span>
        ) : null}
      </div>
    </GlassPanel>
  );
}
