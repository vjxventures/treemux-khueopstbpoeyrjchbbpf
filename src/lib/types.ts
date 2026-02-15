export type Severity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "triggered" | "investigating" | "identified" | "mitigated" | "resolved";

export interface LogEntry {
  timestamp: string;
  level: "error" | "warn" | "info" | "debug";
  service: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface Metric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  trend: "up" | "down" | "stable";
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  service: string;
  createdAt: string;
  updatedAt: string;
  logs: LogEntry[];
  metrics: Metric[];
  affectedServices: string[];
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "alert" | "agent_action" | "diagnosis" | "remediation" | "user_message" | "status_change";
  title: string;
  content: string;
  actor: "system" | "agent" | "user";
}

export interface AgentStep {
  id: string;
  type: "thinking" | "tool_call" | "observation" | "diagnosis" | "action" | "recommendation";
  title: string;
  content: string;
  timestamp: string;
  status: "running" | "completed" | "failed";
  toolName?: string;
  toolInput?: string;
  toolOutput?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  agentSteps?: AgentStep[];
}
