"use client";

import { cn } from "@/lib/utils";
import type { LogEntry } from "@/lib/types";

const levelColors: Record<string, string> = {
  error: "text-destructive",
  warn: "text-warning",
  info: "text-info",
  debug: "text-muted-foreground",
};

const levelBg: Record<string, string> = {
  error: "bg-destructive/8",
  warn: "bg-warning/5",
  info: "bg-transparent",
  debug: "bg-transparent",
};

export function LogStream({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-warning" />
        Log Stream
      </h3>
      <div className="bg-surface-0 border border-border rounded-lg overflow-hidden">
        <div className="max-h-[350px] overflow-y-auto p-1">
          {logs.map((log, i) => (
            <div
              key={i}
              className={cn(
                "log-entry flex items-start gap-2 px-2 py-1 rounded font-mono text-[11px] leading-relaxed hover:bg-surface-2 transition-colors",
                levelBg[log.level]
              )}
            >
              <span className="text-muted-foreground/60 shrink-0 tabular-nums">
                {new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false })}
              </span>
              <span
                className={cn(
                  "shrink-0 uppercase w-[42px] font-semibold",
                  levelColors[log.level]
                )}
              >
                {log.level}
              </span>
              <span className="text-accent/70 shrink-0 w-[140px] truncate">
                {log.service}
              </span>
              <span className="text-foreground/80 break-all">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
