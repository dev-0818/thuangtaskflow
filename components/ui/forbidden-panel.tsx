import { ShieldAlert } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";

export function ForbiddenPanel() {
  return (
    <GlassPanel className="mx-auto max-w-xl p-8 text-center">
      <ShieldAlert className="mx-auto mb-5 h-10 w-10 text-primary" />
      <h1 className="text-headline-md font-semibold text-on-surface">Manager access required</h1>
      <p className="mt-3 text-body-md text-on-surface-variant">
        This workspace area is only available to managers.
      </p>
    </GlassPanel>
  );
}
