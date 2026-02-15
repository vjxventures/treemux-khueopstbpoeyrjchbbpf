# Sentinel - AI-Native Incident Response

> Reimagining PagerDuty (YC W10) for the AI era. Instead of just alerting humans, Sentinel deploys autonomous AI agents that investigate, diagnose, and remediate production incidents in real-time.

## The Problem

When production incidents occur, on-call engineers spend 30-60 minutes on repetitive tasks: scanning logs, checking metrics, reviewing deployments, and cross-referencing past incidents. PagerDuty alerts you about problems — but in 2026, AI should be solving them.

## The Solution

Sentinel is an AI-native incident response platform where autonomous Claude-powered agents are the first responders. When an incident fires:

1. **The agent investigates automatically** — analyzing log patterns, checking service health, querying time-series metrics
2. **It correlates with historical incidents** — matching symptoms against past outages to identify patterns
3. **It diagnoses the root cause** — using multi-step reasoning across data from multiple services
4. **It proposes and executes remediation** — rolling back deployments, killing queries, scaling services
5. **Engineers collaborate in real-time** — watching the agent's reasoning stream and asking follow-up questions

## Key Features

- **Multi-turn AI Agent** with 6 specialized tools (log analysis, health checks, metrics, deployments, incident correlation, remediation)
- **Real-time streaming** of agent reasoning, tool calls, and responses via SSE
- **Interactive chat** — ask the agent questions about any incident mid-investigation
- **Service dependency visualization** — see affected service topology at a glance
- **Realistic incident simulation** — 5 production-grade incident scenarios (DB pool exhaustion, memory leaks, CrashLoopBackOff, SSL expiry, search latency)

## Tech Stack

- **Next.js 16** (App Router + Turbopack)
- **Vercel AI SDK v6** with Claude (Anthropic)
- **Tailwind CSS v4** with custom operations-center dark theme
- **Custom SSE streaming** protocol for rich agent interaction
- **TypeScript** end-to-end

## Running Locally

```bash
# Set your API key
export ANTHROPIC_API_KEY_ALPHA=your_key_here

# Install & run
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard. Click any incident, then "Start Investigation" to watch the AI agent work.

## Prize Categories

- **YC Challenge**: Reimagining PagerDuty (YC W10) as AI-native
- **Anthropic - Best Use of Claude Agent SDK**: Multi-turn autonomous agent with tool calling
- **Greylock - Best Multi-Turn Agent**: Complex, multi-step incident investigation
- **Most Technically Complex**: Real-time streaming AI agent with tool execution
- **Vercel - Best Deployed on Vercel**: Production-grade Next.js deployment

## Built at TreeHacks 2026
