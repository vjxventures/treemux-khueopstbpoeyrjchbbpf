"use client";

import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";

const severityConfig: Record<Severity, { label: string; className: string; dotClass: string }> = {
  critical: {
    label: "CRITICAL",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    dotClass: "bg-destructive",
  },
  high: {
    label: "HIGH",
    className: "bg-warning/10 text-warning border-warning/30",
    dotClass: "bg-warning",
  },
  medium: {
    label: "MEDIUM",
    className: "bg-info/10 text-info border-info/30",
    dotClass: "bg-info",
  },
  low: {
    label: "LOW",
    className: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/30",
    dotClass: "bg-muted-foreground",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const config = severityConfig[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-semibold tracking-wider border",
        config.className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dotClass, severity === "critical" && "status-pulse")} />
      {config.label}
    </span>
  );
}
