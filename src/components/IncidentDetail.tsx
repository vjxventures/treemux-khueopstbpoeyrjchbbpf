"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  Server,
  RefreshCw,
} from "lucide-react";
import type { Incident } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { MetricsPanel } from "./MetricsPanel";
import { LogStream } from "./LogStream";
import { Timeline } from "./Timeline";
import { AgentChat } from "./AgentChat";
import { ServiceGraph } from "./ServiceGraph";

export function IncidentDetail({
  incidentId,
  onBack,
}: {
  incidentId: string;
  onBack: () => void;
}) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "timeline">("overview");
  const [error, setError] = useState<string | null>(null);

  const fetchIncident = useCallback(async () => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`);
      if (!res.ok) throw new Error("Failed to fetch incident");
      const data = await res.json();
      setIncident(data);
    } catch {
      setError("Failed to load incident");
    }
  }, [incidentId]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  const refreshIncident = () => {
    fetchIncident();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive text-sm">
        {error}
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-surface-0/80 px-6 py-4">
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="mt-1 p-1.5 rounded-lg hover:bg-surface-2 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="text-lg font-display font-bold text-foreground truncate">
              {incident.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {incident.description}
            </p>
            <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-muted-foreground/70">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(incident.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Server className="w-3 h-3" />
                {incident.service}
              </span>
              <span>
                {incident.affectedServices.length} services affected
              </span>
            </div>
          </div>
          <button
            onClick={refreshIncident}
            className="mt-1 p-1.5 rounded-lg hover:bg-surface-2 transition-colors text-muted-foreground hover:text-foreground"
            title="Refresh incident data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left side - Data panels */}
        <div className="w-1/2 border-r border-border overflow-y-auto">
          {/* Tab navigation */}
          <div className="sticky top-0 z-10 bg-surface-0/90 backdrop-blur-sm border-b border-border/50 px-4">
            <div className="flex gap-0">
              {(["overview", "logs", "timeline"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider transition-colors border-b-2",
                    activeTab === tab
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-6">
            {activeTab === "overview" && (
              <>
                <MetricsPanel metrics={incident.metrics} />
                <ServiceGraph
                  services={incident.affectedServices}
                  primaryService={incident.service}
                />
                <LogStream logs={incident.logs.slice(0, 5)} />
              </>
            )}
            {activeTab === "logs" && <LogStream logs={incident.logs} />}
            {activeTab === "timeline" && (
              <Timeline events={incident.timeline} />
            )}
          </div>
        </div>

        {/* Right side - Agent Chat */}
        <div className="w-1/2 flex flex-col bg-surface-0/30">
          <AgentChat
            incidentId={incidentId}
            onInvestigate={refreshIncident}
          />
        </div>
      </div>
    </div>
  );
}
