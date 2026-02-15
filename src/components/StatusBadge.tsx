"use client";

import { cn } from "@/lib/utils";
import type { IncidentStatus } from "@/lib/types";

const statusConfig: Record<IncidentStatus, { label: string; className: string }> = {
  triggered: { label: "Triggered", className: "text-destructive border-destructive/30 bg-destructive/5" },
  investigating: { label: "Investigating", className: "text-warning border-warning/30 bg-warning/5" },
  identified: { label: "Identified", className: "text-info border-info/30 bg-info/5" },
  mitigated: { label: "Mitigated", className: "text-primary border-primary/30 bg-primary/5" },
  resolved: { label: "Resolved", className: "text-muted-foreground border-muted-foreground/30 bg-muted-foreground/5" },
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-medium tracking-wider border uppercase",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
