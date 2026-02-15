"use client";

import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bot,
  Search,
  Wrench,
  MessageSquare,
  ArrowRightLeft,
} from "lucide-react";
import type { TimelineEvent } from "@/lib/types";

const typeConfig: Record<
  TimelineEvent["type"],
  { icon: React.ReactNode; color: string; borderColor: string }
> = {
  alert: {
    icon: <AlertTriangle className="w-3 h-3" />,
    color: "text-destructive",
    borderColor: "border-destructive/30",
  },
  agent_action: {
    icon: <Search className="w-3 h-3" />,
    color: "text-info",
    borderColor: "border-info/30",
  },
  diagnosis: {
    icon: <Bot className="w-3 h-3" />,
    color: "text-accent",
    borderColor: "border-accent/30",
  },
  remediation: {
    icon: <Wrench className="w-3 h-3" />,
    color: "text-primary",
    borderColor: "border-primary/30",
  },
  user_message: {
    icon: <MessageSquare className="w-3 h-3" />,
    color: "text-foreground",
    borderColor: "border-foreground/30",
  },
  status_change: {
    icon: <ArrowRightLeft className="w-3 h-3" />,
    color: "text-warning",
    borderColor: "border-warning/30",
  },
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-accent" />
        Investigation Timeline
      </h3>
      <div className="space-y-0">
        {events.map((event, i) => {
          const config = typeConfig[event.type];
          return (
            <div key={event.id} className="flex gap-3 group">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 bg-surface-1",
                    config.borderColor,
                    config.color
                  )}
                >
                  {config.icon}
                </div>
                {i < events.length - 1 && (
                  <div className="w-px h-full min-h-[20px] bg-border" />
                )}
              </div>
              {/* Content */}
              <div className="pb-4 -mt-0.5 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn("text-xs font-medium", config.color)}>
                    {event.title}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/50">
                    {new Date(event.timestamp).toLocaleTimeString("en-US", {
                      hour12: false,
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {event.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
