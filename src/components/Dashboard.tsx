"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Shield,
  AlertTriangle,
  Plus,
  RefreshCw,
  Activity,
  Clock,
  Server,
  ChevronRight,
  Zap,
} from "lucide-react";
import type { Incident } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { IncidentDetail } from "./IncidentDetail";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-surface-1/50 hover:bg-surface-1 transition-colors group">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-3.5 h-3.5", color)} />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className={cn("text-2xl font-display font-bold tabular-nums", color)}>
        {value}
      </span>
    </div>
  );
}

function IncidentRow({
  incident,
  onClick,
}: {
  incident: Incident;
  onClick: () => void;
}) {
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-all group hover:scale-[1.005]",
        incident.severity === "critical"
          ? "border-destructive/20 bg-destructive/[0.02] hover:bg-destructive/[0.05] hover:border-destructive/30"
          : incident.severity === "high"
          ? "border-warning/15 bg-warning/[0.02] hover:bg-warning/[0.04] hover:border-warning/25"
          : "border-border bg-surface-1/30 hover:bg-surface-1/60 hover:border-border-bright"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Severity indicator line */}
        <div
          className={cn(
            "w-0.5 h-full min-h-[60px] rounded-full shrink-0",
            incident.severity === "critical"
              ? "bg-destructive"
              : incident.severity === "high"
              ? "bg-warning"
              : incident.severity === "medium"
              ? "bg-info"
              : "bg-muted-foreground"
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          <h3 className="text-sm font-display font-semibold text-foreground truncate mb-1 group-hover:text-primary transition-colors">
            {incident.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {incident.description}
          </p>
          <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(incident.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3" />
              {incident.service}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {incident.affectedServices.length} affected
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0 mt-2" />
      </div>
    </button>
  );
}

export function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch("/api/incidents");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setIncidents(data);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const simulateIncident = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to simulate");
      const newIncident = await res.json();
      setIncidents((prev) => [newIncident, ...prev]);
      setSelectedId(newIncident.id);
    } catch (err) {
      console.error("Failed to simulate incident:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (selectedId) {
    return (
      <IncidentDetail
        incidentId={selectedId}
        onBack={() => {
          setSelectedId(null);
          fetchIncidents();
        }}
      />
    );
  }

  const criticalCount = incidents.filter((i) => i.severity === "critical").length;
  const activeCount = incidents.filter(
    (i) => i.status !== "resolved" && i.status !== "mitigated"
  ).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 border-b border-border bg-surface-0/80 backdrop-blur-sm">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-6 h-6 text-primary" />
              {criticalCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-[8px] font-bold text-white flex items-center justify-center">
                  {criticalCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-base font-display font-bold text-foreground tracking-tight flex items-center gap-2">
                SENTINEL
                <span className="text-[10px] font-mono font-normal text-primary/60 tracking-widest">
                  v0.1
                </span>
              </h1>
              <p className="text-[10px] font-mono text-muted-foreground tracking-wider">
                AI-NATIVE INCIDENT RESPONSE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchIncidents}
              className="p-2 rounded-lg hover:bg-surface-2 transition-colors text-muted-foreground hover:text-foreground"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={simulateIncident}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-display font-medium hover:bg-primary/15 transition-colors disabled:opacity-50"
            >
              {isSimulating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Simulate Incident
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 stagger-children">
            <StatCard
              label="Active Incidents"
              value={activeCount}
              icon={AlertTriangle}
              color={activeCount > 0 ? "text-destructive" : "text-primary"}
            />
            <StatCard
              label="Critical"
              value={criticalCount}
              icon={Zap}
              color={criticalCount > 0 ? "text-destructive" : "text-muted-foreground"}
            />
            <StatCard
              label="Total Incidents"
              value={incidents.length}
              icon={Activity}
              color="text-info"
            />
            <StatCard
              label="Mean Time to Detect"
              value="< 1m"
              icon={Clock}
              color="text-primary"
            />
          </div>

          {/* Incidents list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-destructive status-pulse" />
                Active Incidents
              </h2>
              <span className="text-[10px] font-mono text-muted-foreground/50">
                {incidents.length} total
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Shield className="w-10 h-10 text-primary/30 mb-3" />
                <p className="text-sm font-display text-foreground/80">All Clear</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No active incidents. Simulate one to see Sentinel in action.
                </p>
              </div>
            ) : (
              <div className="space-y-2 stagger-children">
                {incidents.map((incident) => (
                  <IncidentRow
                    key={incident.id}
                    incident={incident}
                    onClick={() => setSelectedId(incident.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <footer className="shrink-0 border-t border-border bg-surface-0/50 px-6 py-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground/50">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          System Operational
        </span>
        <span>Powered by Claude &middot; TreeHacks 2026</span>
      </footer>
    </div>
  );
}
