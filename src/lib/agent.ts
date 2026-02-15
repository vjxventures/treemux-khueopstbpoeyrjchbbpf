import { streamText, tool, stepCountIs } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { Incident } from "./types";
import { updateIncidentStatus, addTimelineEvent } from "./incidents";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_ALPHA,
});

function formatIncidentContext(incident: Incident): string {
  const logsStr = incident.logs
    .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.service}] ${l.message}`)
    .join("\n");

  const metricsStr = incident.metrics
    .map((m) => {
      const thresholdInfo = m.threshold ? ` (threshold: ${m.threshold}${m.unit})` : "";
      return `- ${m.name}: ${m.value}${m.unit} [${m.trend}]${thresholdInfo}`;
    })
    .join("\n");

  return `
# Incident: ${incident.title}
**ID:** ${incident.id}
**Severity:** ${incident.severity}
**Status:** ${incident.status}
**Primary Service:** ${incident.service}
**Affected Services:** ${incident.affectedServices.join(", ")}
**Created:** ${incident.createdAt}

## Description
${incident.description}

## Recent Logs
\`\`\`
${logsStr}
\`\`\`

## Current Metrics
${metricsStr}

## Timeline
${incident.timeline.map((t) => `- [${t.timestamp}] [${t.actor}] ${t.title}: ${t.content}`).join("\n")}
`;
}

export function createInvestigationStream(incident: Incident, userMessage?: string) {
  const systemPrompt = `You are Sentinel, an advanced AI incident response agent for a production infrastructure platform. You autonomously investigate, diagnose, and help remediate production incidents.

Your capabilities:
1. Analyze logs, metrics, and error patterns
2. Correlate symptoms across services to find root causes
3. Check service dependencies and configurations
4. Propose and execute remediation steps
5. Communicate findings clearly to the on-call engineer

When investigating an incident:
- Start by analyzing the available data systematically
- Use your tools to gather more information
- Identify patterns and correlations in the data
- Formulate hypotheses about root cause
- Propose concrete remediation steps with risk assessment
- Be direct and technical - the audience is an SRE/DevOps engineer

Always explain your reasoning and be transparent about confidence levels. If you're unsure, say so.`;

  const contextMessage = formatIncidentContext(incident);

  const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

  if (userMessage) {
    messages.push({
      role: "user",
      content: `${contextMessage}\n\n---\nUser message: ${userMessage}`,
    });
  } else {
    messages.push({
      role: "user",
      content: `${contextMessage}\n\n---\nPlease investigate this incident. Analyze the logs and metrics, identify the root cause, and provide remediation recommendations. Use your tools to gather additional information as needed.`,
    });
  }

  return streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages,
    tools: {
      analyzeLogPatterns: tool({
        description: "Analyze log entries for patterns, anomalies, and correlations. Performs statistical analysis on error frequency, timing patterns, and service-level correlations.",
        inputSchema: z.object({
          service: z.string().describe("Service name to analyze"),
          logLevel: z.enum(["error", "warn", "info", "all"]).describe("Log level filter"),
          timeRange: z.string().describe("Time range to analyze (e.g., 'last 15 minutes')"),
        }),
        execute: async ({ service, logLevel, timeRange }) => {
          // Simulated log analysis
          const relevantLogs = incident.logs.filter(
            (l) => (service === "all" || l.service === service) && (logLevel === "all" || l.level === logLevel)
          );
          const errorCount = relevantLogs.filter((l) => l.level === "error").length;
          const warnCount = relevantLogs.filter((l) => l.level === "warn").length;

          addTimelineEvent(incident.id, {
            type: "agent_action",
            title: `Analyzed logs for ${service}`,
            content: `Scanned ${relevantLogs.length} log entries (${errorCount} errors, ${warnCount} warnings) in ${timeRange}`,
            actor: "agent",
          });

          return {
            totalEntries: relevantLogs.length,
            errorCount,
            warnCount,
            patterns: [
              `High frequency errors in ${service}: ${errorCount} errors in analyzed window`,
              relevantLogs.length > 3
                ? `Error cascade pattern detected: errors propagating across ${new Set(relevantLogs.map((l) => l.service)).size} services`
                : "No cascade pattern detected",
              "Temporal correlation: errors cluster within 60-second windows",
            ],
            topMessages: relevantLogs.slice(0, 5).map((l) => ({
              level: l.level,
              service: l.service,
              message: l.message,
            })),
          };
        },
      }),

      checkServiceHealth: tool({
        description: "Check the current health status, resource utilization, and dependency status of a service",
        inputSchema: z.object({
          service: z.string().describe("Service name to check"),
        }),
        execute: async ({ service }) => {
          const isAffected = incident.affectedServices.includes(service);
          const serviceMetrics = incident.metrics.filter(
            (m) => m.name.toLowerCase().includes(service.toLowerCase().split("-")[0]) || isAffected
          );

          addTimelineEvent(incident.id, {
            type: "agent_action",
            title: `Health check: ${service}`,
            content: `Service status: ${isAffected ? "DEGRADED" : "HEALTHY"}. Checked ${serviceMetrics.length} metrics.`,
            actor: "agent",
          });

          return {
            service,
            status: isAffected ? "degraded" : "healthy",
            uptime: isAffected ? "4h 23m (last restart)" : "14d 6h 12m",
            cpu: isAffected ? `${70 + Math.floor(Math.random() * 25)}%` : `${10 + Math.floor(Math.random() * 30)}%`,
            memory: isAffected ? `${75 + Math.floor(Math.random() * 20)}%` : `${30 + Math.floor(Math.random() * 30)}%`,
            activeConnections: isAffected ? Math.floor(Math.random() * 500) + 200 : Math.floor(Math.random() * 50) + 10,
            errorRate: isAffected ? `${(Math.random() * 30 + 5).toFixed(1)}%` : `${(Math.random() * 0.5).toFixed(2)}%`,
            dependencies: incident.affectedServices.map((s) => ({
              name: s,
              status: s === service ? "self" : incident.affectedServices.includes(s) ? "degraded" : "healthy",
            })),
            recentEvents: isAffected
              ? ["High error rate detected", "Circuit breaker triggered", "Auto-scaling event"]
              : ["Normal operation"],
          };
        },
      }),

      queryMetrics: tool({
        description: "Query detailed time-series metrics for a service or infrastructure component",
        inputSchema: z.object({
          metricName: z.string().describe("Name of the metric to query"),
          service: z.string().describe("Service to query metrics for"),
          duration: z.string().describe("Duration to look back (e.g., '1h', '30m')"),
        }),
        execute: async ({ metricName, service, duration }) => {
          const matchingMetric = incident.metrics.find(
            (m) => m.name.toLowerCase().includes(metricName.toLowerCase())
          );

          addTimelineEvent(incident.id, {
            type: "agent_action",
            title: `Queried metrics: ${metricName}`,
            content: `Retrieved ${metricName} data for ${service} over ${duration}`,
            actor: "agent",
          });

          const currentValue = matchingMetric?.value ?? Math.floor(Math.random() * 100);
          const trend = matchingMetric?.trend ?? "stable";

          // Generate realistic time series
          const points = [];
          const intervals = 10;
          for (let i = intervals; i >= 0; i--) {
            const factor = trend === "up" ? (intervals - i) / intervals : trend === "down" ? i / intervals : 0.5;
            const value = currentValue * (0.3 + factor * 0.7) + (Math.random() * currentValue * 0.1);
            points.push({
              timestamp: new Date(Date.now() - i * 3 * 60 * 1000).toISOString(),
              value: Math.round(value * 100) / 100,
            });
          }

          return {
            metric: metricName,
            service,
            current: currentValue,
            unit: matchingMetric?.unit ?? "units",
            threshold: matchingMetric?.threshold,
            trend,
            breachingThreshold: matchingMetric?.threshold ? currentValue > matchingMetric.threshold : false,
            timeSeries: points,
            analysis: trend === "up" && matchingMetric?.threshold && currentValue > matchingMetric.threshold
              ? `ALERT: ${metricName} has breached threshold (${currentValue} > ${matchingMetric.threshold}). Consistent upward trend over ${duration}.`
              : `${metricName} is ${trend === "stable" ? "within normal range" : `trending ${trend}`}.`,
          };
        },
      }),

      checkRecentDeployments: tool({
        description: "Check recent deployments and configuration changes that may have caused the incident",
        inputSchema: z.object({
          service: z.string().describe("Service to check deployments for"),
        }),
        execute: async ({ service }) => {
          addTimelineEvent(incident.id, {
            type: "agent_action",
            title: `Checked deployments: ${service}`,
            content: "Reviewed recent deployment history and configuration changes",
            actor: "agent",
          });

          return {
            recentDeployments: [
              {
                version: "v2.14.0-rc3",
                timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
                author: "deploy-bot",
                changes: ["Updated connection pooling library", "Added new API endpoint /v2/batch", "Bumped dependency versions"],
                status: "deployed",
              },
              {
                version: "v2.13.2",
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                author: "ci-pipeline",
                changes: ["Bug fix: race condition in session handler", "Updated logging format"],
                status: "stable",
              },
            ],
            configChanges: [
              {
                timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                change: "Updated MAX_POOL_SIZE from 150 to 200",
                source: "config-map",
              },
            ],
            rollbackAvailable: true,
            previousStableVersion: "v2.13.2",
          };
        },
      }),

      executeRemediation: tool({
        description: "Execute a remediation action to resolve the incident. This will simulate the action and update the incident status.",
        inputSchema: z.object({
          action: z.enum(["restart_service", "rollback_deployment", "scale_up", "clear_cache", "kill_query", "rotate_certificate", "drain_connections"]).describe("Remediation action to execute"),
          service: z.string().describe("Service to apply the action to"),
          reason: z.string().describe("Reason for executing this action"),
        }),
        execute: async ({ action, service, reason }) => {
          updateIncidentStatus(incident.id, "mitigated");

          addTimelineEvent(incident.id, {
            type: "remediation",
            title: `Executed: ${action} on ${service}`,
            content: `Action: ${action}. Reason: ${reason}. Status: Successfully executed.`,
            actor: "agent",
          });

          const actionResults: Record<string, string> = {
            restart_service: `Service ${service} restarted successfully. New pod healthy and accepting traffic.`,
            rollback_deployment: `Rolled back ${service} to v2.13.2. Deployment stable with 5/5 replicas ready.`,
            scale_up: `Scaled ${service} from 3 to 6 replicas. All new pods healthy.`,
            clear_cache: `Cleared cache for ${service}. Cache hit rate normalizing.`,
            kill_query: `Terminated long-running queries on ${service}. Connection pool freeing up.`,
            rotate_certificate: `Certificate rotated for ${service}. New cert valid for 90 days.`,
            drain_connections: `Drained idle connections on ${service}. Pool utilization dropping.`,
          };

          return {
            action,
            service,
            status: "success",
            result: actionResults[action] || `Action ${action} executed successfully.`,
            newStatus: "mitigated",
            nextSteps: [
              "Monitor metrics for 15 minutes to confirm stability",
              "Review root cause and create post-mortem ticket",
              "Update runbook with findings",
            ],
          };
        },
      }),

      correlateIncidents: tool({
        description: "Check for correlations with past incidents and known issues",
        inputSchema: z.object({
          symptoms: z.string().describe("Description of current symptoms to correlate"),
        }),
        execute: async ({ symptoms }) => {
          addTimelineEvent(incident.id, {
            type: "agent_action",
            title: "Correlated with historical incidents",
            content: "Searched incident history for similar patterns and known issues",
            actor: "agent",
          });

          return {
            similarIncidents: [
              {
                id: "INC-2024-1847",
                date: "2025-12-03",
                title: "Database connection pool exhaustion during peak traffic",
                rootCause: "Long-running analytical queries blocking connection pool",
                resolution: "Killed long-running queries, implemented query timeout, separated OLAP and OLTP workloads",
                similarity: 0.87,
              },
              {
                id: "INC-2025-0234",
                date: "2026-01-15",
                title: "Service degradation after deployment of v2.12.0",
                rootCause: "Connection pool library upgrade introduced connection leak",
                resolution: "Rolled back to v2.11.3, patched connection pool library",
                similarity: 0.72,
              },
            ],
            knownIssues: [
              {
                ticket: "INFRA-4521",
                title: "Connection pool library v3.x has known leak under high concurrency",
                status: "open",
                workaround: "Set MAX_IDLE_TIME=300 and enable connection validation",
              },
            ],
            recommendation: "High correlation with past connection pool incidents. Root cause likely related to the recent deployment (v2.14.0-rc3) which updated the connection pooling library. Recommend investigating the connection pool library upgrade and considering rollback.",
          };
        },
      }),
    },
    stopWhen: stepCountIs(8),
  });
}
