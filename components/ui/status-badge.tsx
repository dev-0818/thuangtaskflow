import type { DueState, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: DueState | TaskStatus | "neutral" | "warning" | "success";
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-3 py-1 text-label-sm font-semibold",
        tone === "overdue" && "border-error/35 bg-error/10 text-error",
        (tone === "today" || tone === "soon" || tone === "warning") && "border-primary/35 bg-primary/10 text-primary",
        (tone === "completed" || tone === "success") && "border-secondary/20 bg-secondary/10 text-on-surface-variant",
        tone === "active" && "border-primary/25 bg-primary/10 text-primary",
        tone === "archived" && "border-secondary/20 bg-secondary/10 text-on-surface-variant",
        tone === "neutral" && "border-secondary/20 bg-surface-container-high text-on-surface"
      )}
    >
      {label}
    </span>
  );
}
