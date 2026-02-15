import { v4 as uuidv4 } from "uuid";
import type { Incident, LogEntry, Metric, TimelineEvent, Severity, IncidentStatus } from "./types";

// In-memory incident store
const incidents = new Map<string, Incident>();

// Realistic incident scenarios
const INCIDENT_SCENARIOS = [
  {
    title: "Database Connection Pool Exhaustion",
    description: "PostgreSQL connection pool at 98% capacity. New connections being rejected. Multiple services reporting timeouts.",
    service: "postgres-primary",
    severity: "critical" as Severity,
    affectedServices: ["api-gateway", "user-service", "payment-service", "postgres-primary"],
    logs: [
      { level: "error" as const, service: "postgres-primary", message: "Connection pool exhausted: 196/200 active connections" },
      { level: "error" as const, service: "api-gateway", message: "Upstream timeout after 30000ms connecting to user-service" },
      { level: "warn" as const, service: "user-service", message: "Failed to acquire database connection within 5000ms" },
      { level: "error" as const, service: "payment-service", message: "Transaction failed: could not serialize access due to connection timeout" },
      { level: "info" as const, service: "postgres-primary", message: "Oldest idle connection: 847s (threshold: 300s)" },
      { level: "warn" as const, service: "postgres-primary", message: "Long-running query detected: SELECT * FROM orders JOIN... (running for 312s)" },
      { level: "error" as const, service: "api-gateway", message: "Circuit breaker OPEN for payment-service (failures: 23/25)" },
      { level: "warn" as const, service: "user-service", message: "Health check degraded: db_ping latency 4200ms (threshold: 100ms)" },
      { level: "error" as const, service: "postgres-primary", message: "FATAL: remaining connection slots are reserved for non-replication superuser connections" },
      { level: "info" as const, service: "postgres-primary", message: "WAL write latency: 45ms (normal: 2ms)" },
    ],
    metrics: [
      { name: "Active DB Connections", value: 196, unit: "connections", threshold: 200, trend: "up" as const },
      { name: "Query Latency (p99)", value: 4200, unit: "ms", threshold: 100, trend: "up" as const },
      { name: "API Error Rate", value: 34.2, unit: "%", threshold: 1, trend: "up" as const },
      { name: "Requests/sec", value: 127, unit: "req/s", threshold: undefined, trend: "down" as const },
      { name: "CPU Usage (DB)", value: 94, unit: "%", threshold: 80, trend: "up" as const },
      { name: "Memory Usage (DB)", value: 87, unit: "%", threshold: 85, trend: "up" as const },
    ],
  },
  {
    title: "Memory Leak in Auth Service",
    description: "Authentication service memory usage growing unbounded. OOMKill events triggered. Users experiencing 503 errors.",
    service: "auth-service",
    severity: "critical" as Severity,
    affectedServices: ["auth-service", "api-gateway", "web-frontend", "mobile-api"],
    logs: [
      { level: "error" as const, service: "auth-service", message: "Container OOMKilled: memory limit 2Gi exceeded (current: 2.1Gi)" },
      { level: "warn" as const, service: "auth-service", message: "GC pressure: heap used 1.8Gi / 2Gi, GC pause 340ms" },
      { level: "error" as const, service: "api-gateway", message: "503 Service Unavailable: auth-service not responding" },
      { level: "info" as const, service: "auth-service", message: "JWT token cache size: 2.4M entries (expected: ~100K)" },
      { level: "warn" as const, service: "auth-service", message: "Event listener count: 48,000 (leak detected in WebSocket handler)" },
      { level: "error" as const, service: "web-frontend", message: "Login endpoint returning 503: 342 requests affected in last 60s" },
      { level: "info" as const, service: "auth-service", message: "Memory growth rate: +50Mi/min (abnormal)" },
      { level: "warn" as const, service: "auth-service", message: "Heap snapshot: Retained size for SessionManager: 890MB" },
    ],
    metrics: [
      { name: "Memory Usage", value: 2100, unit: "MB", threshold: 2048, trend: "up" as const },
      { name: "GC Pause Time", value: 340, unit: "ms", threshold: 50, trend: "up" as const },
      { name: "Auth Latency (p99)", value: 8500, unit: "ms", threshold: 200, trend: "up" as const },
      { name: "OOMKill Events", value: 3, unit: "events", threshold: 0, trend: "up" as const },
      { name: "Login Success Rate", value: 62, unit: "%", threshold: 99, trend: "down" as const },
      { name: "Active Sessions", value: 2400000, unit: "sessions", threshold: undefined, trend: "up" as const },
    ],
  },
  {
    title: "Kubernetes Pod CrashLoopBackOff",
    description: "Payment processing pods entering CrashLoopBackOff. Deployment rollout stuck at 2/5 replicas.",
    service: "payment-processor",
    severity: "high" as Severity,
    affectedServices: ["payment-processor", "checkout-service", "notification-service"],
    logs: [
      { level: "error" as const, service: "payment-processor", message: "Pod payment-processor-7f8b9c-x4k2p: CrashLoopBackOff (restart count: 7)" },
      { level: "error" as const, service: "payment-processor", message: "Error: ECONNREFUSED 10.0.4.52:6379 - Redis connection failed" },
      { level: "warn" as const, service: "payment-processor", message: "Readiness probe failed: HTTP probe failed with statuscode: 503" },
      { level: "info" as const, service: "payment-processor", message: "Container started with image: payment-processor:v2.14.0-rc3" },
      { level: "error" as const, service: "payment-processor", message: "Missing required env var: STRIPE_WEBHOOK_SECRET" },
      { level: "warn" as const, service: "checkout-service", message: "Payment processing timeout: 15 orders pending for >5 minutes" },
      { level: "error" as const, service: "payment-processor", message: "Liveness probe failed: connection refused" },
    ],
    metrics: [
      { name: "Ready Replicas", value: 2, unit: "pods", threshold: 5, trend: "down" as const },
      { name: "Pod Restarts", value: 7, unit: "restarts", threshold: 0, trend: "up" as const },
      { name: "Payment Success Rate", value: 41, unit: "%", threshold: 99, trend: "down" as const },
      { name: "Pending Orders", value: 15, unit: "orders", threshold: 0, trend: "up" as const },
      { name: "Redis Connection Errors", value: 342, unit: "errors/min", threshold: 0, trend: "up" as const },
    ],
  },
  {
    title: "SSL Certificate Expiry - API Gateway",
    description: "TLS certificate for api.example.com expires in 2 hours. HTTPS connections starting to fail for some clients.",
    service: "api-gateway",
    severity: "high" as Severity,
    affectedServices: ["api-gateway", "cdn", "mobile-api"],
    logs: [
      { level: "error" as const, service: "api-gateway", message: "TLS handshake failed: certificate has expired or is not yet valid" },
      { level: "warn" as const, service: "api-gateway", message: "Certificate for api.example.com expires at 2026-02-15T16:00:00Z" },
      { level: "info" as const, service: "api-gateway", message: "cert-manager: renewal attempt failed: ACME challenge timeout" },
      { level: "error" as const, service: "cdn", message: "Origin connection failed: SSL_ERROR_EXPIRED_CERT_ALERT" },
      { level: "warn" as const, service: "mobile-api", message: "Client certificate pinning failures increasing: 2,340 in last 5 min" },
      { level: "info" as const, service: "api-gateway", message: "Let's Encrypt rate limit: 5 failed attempts in 1 hour" },
    ],
    metrics: [
      { name: "TLS Error Rate", value: 23, unit: "%", threshold: 0, trend: "up" as const },
      { name: "Certificate TTL", value: 2, unit: "hours", threshold: 24, trend: "down" as const },
      { name: "Failed Handshakes", value: 890, unit: "/min", threshold: 0, trend: "up" as const },
      { name: "Client Errors (4xx)", value: 18, unit: "%", threshold: 2, trend: "up" as const },
    ],
  },
  {
    title: "Spike in Latency - Search Service",
    description: "Elasticsearch cluster experiencing high search latency. Bulk indexing job consuming excessive resources.",
    service: "search-service",
    severity: "medium" as Severity,
    affectedServices: ["search-service", "product-catalog", "recommendation-engine"],
    logs: [
      { level: "warn" as const, service: "search-service", message: "Search latency p99: 3400ms (SLA: 500ms)" },
      { level: "info" as const, service: "search-service", message: "Bulk indexing job started: reindexing 2.4M documents" },
      { level: "warn" as const, service: "search-service", message: "Thread pool search queue: 847 (limit: 1000)" },
      { level: "error" as const, service: "search-service", message: "Circuit breaker triggered: parent data too large, 89% of JVM heap" },
      { level: "warn" as const, service: "product-catalog", message: "Search fallback activated: returning cached results" },
      { level: "info" as const, service: "search-service", message: "Index merge in progress: 12 segments -> 4 segments" },
    ],
    metrics: [
      { name: "Search Latency (p99)", value: 3400, unit: "ms", threshold: 500, trend: "up" as const },
      { name: "JVM Heap Usage", value: 89, unit: "%", threshold: 75, trend: "up" as const },
      { name: "Search Queue Depth", value: 847, unit: "queries", threshold: 100, trend: "up" as const },
      { name: "Index Rate", value: 45000, unit: "docs/s", threshold: undefined, trend: "up" as const },
      { name: "Search Success Rate", value: 94, unit: "%", threshold: 99, trend: "down" as const },
    ],
  },
];

function generateTimestamp(minutesAgo: number): string {
  const date = new Date(Date.now() - minutesAgo * 60 * 1000);
  return date.toISOString();
}

function addTimestampsToLogs(logs: Omit<LogEntry, "timestamp">[]): LogEntry[] {
  return logs.map((log, i) => ({
    ...log,
    timestamp: generateTimestamp(logs.length - i),
  }));
}

export function createIncident(scenarioIndex?: number): Incident {
  const idx = scenarioIndex ?? Math.floor(Math.random() * INCIDENT_SCENARIOS.length);
  const scenario = INCIDENT_SCENARIOS[idx % INCIDENT_SCENARIOS.length];
  const id = uuidv4();
  const now = new Date().toISOString();

  const incident: Incident = {
    id,
    title: scenario.title,
    description: scenario.description,
    severity: scenario.severity,
    status: "triggered",
    service: scenario.service,
    createdAt: generateTimestamp(Math.floor(Math.random() * 10) + 5),
    updatedAt: now,
    logs: addTimestampsToLogs(scenario.logs),
    metrics: scenario.metrics,
    affectedServices: scenario.affectedServices,
    timeline: [
      {
        id: uuidv4(),
        timestamp: generateTimestamp(5),
        type: "alert",
        title: "Incident Triggered",
        content: `Alert fired: ${scenario.title}. Severity: ${scenario.severity}. Affected services: ${scenario.affectedServices.join(", ")}.`,
        actor: "system",
      },
      {
        id: uuidv4(),
        timestamp: generateTimestamp(4),
        type: "agent_action",
        title: "Sentinel Agent Activated",
        content: "Autonomous investigation initiated. Analyzing logs, metrics, and service dependencies.",
        actor: "agent",
      },
    ],
  };

  incidents.set(id, incident);
  return incident;
}

export function getIncident(id: string): Incident | undefined {
  return incidents.get(id);
}

export function getAllIncidents(): Incident[] {
  return Array.from(incidents.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function updateIncidentStatus(id: string, status: IncidentStatus): Incident | undefined {
  const incident = incidents.get(id);
  if (!incident) return undefined;
  incident.status = status;
  incident.updatedAt = new Date().toISOString();
  incident.timeline.push({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    type: "status_change",
    title: `Status changed to ${status}`,
    content: `Incident status updated to: ${status}`,
    actor: "agent",
  });
  return incident;
}

export function addTimelineEvent(id: string, event: Omit<TimelineEvent, "id" | "timestamp">): Incident | undefined {
  const incident = incidents.get(id);
  if (!incident) return undefined;
  incident.timeline.push({
    ...event,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  });
  incident.updatedAt = new Date().toISOString();
  return incident;
}

// Seed some initial incidents
export function seedIncidents(): void {
  if (incidents.size === 0) {
    createIncident(0);
    createIncident(1);
    createIncident(2);
  }
}
