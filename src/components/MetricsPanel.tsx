"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Metric } from "@/lib/types";

function MetricCard({ metric }: { metric: Metric }) {
  const isBreaching = metric.threshold !== undefined && metric.value > metric.threshold;
  const trendIcon = {
    up: <TrendingUp className="w-3 h-3" />,
    down: <TrendingDown className="w-3 h-3" />,
    stable: <Minus className="w-3 h-3" />,
  }[metric.trend];

  const trendColor = {
    up: isBreaching ? "text-destructive" : "text-warning",
    down: isBreaching ? "text-destructive" : "text-primary",
    stable: "text-muted-foreground",
  }[metric.trend];

  return (
    <div
      className={cn(
        "relative p-3 rounded-lg border transition-all",
        isBreaching
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-surface-1"
      )}
    >
      {isBreaching && (
        <div className="absolute top-2 right-2">
          <span className="relative flex h-2 w-2">
            <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
          </span>
        </div>
      )}
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
        {metric.name}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-xl font-display font-bold tabular-nums",
            isBreaching ? "text-destructive" : "text-foreground"
          )}
        >
          {typeof metric.value === "number" ? metric.value.toLocaleString() : metric.value}
        </span>
        <span className="text-xs text-muted-foreground">{metric.unit}</span>
      </div>
      {metric.threshold !== undefined && (
        <div className="flex items-center gap-1 mt-1.5">
          <span className={cn("flex items-center gap-0.5 text-[10px] font-mono", trendColor)}>
            {trendIcon}
            {metric.trend}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            / threshold: {metric.threshold}{metric.unit}
          </span>
        </div>
      )}
    </div>
  );
}

export function MetricsPanel({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-info" />
        Live Metrics
      </h3>
      <div className="grid grid-cols-2 gap-2 stagger-children">
        {metrics.map((metric, i) => (
          <MetricCard key={i} metric={metric} />
        ))}
      </div>
    </div>
  );
}
