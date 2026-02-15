# Haggle — AI-Native Marketplace

Craigslist reimagined for 2026. A marketplace where AI agents negotiate for you.

## What it does

- **AI Listing Generation**: Describe your item in plain English, and Claude generates an optimized listing with title, description, pricing, and a negotiation personality for your AI seller agent.
- **AI-Powered Search**: Semantic search that understands intent ("something to game on") not just keywords.
- **Real-Time AI Negotiation**: Two AI agents (buyer and seller) negotiate in real-time with distinct personalities, strategies, and counter-offers streamed via SSE.
- **Live Price Tracker**: Watch the negotiation gap close in real-time with a visual progress bar.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- **AI**: Anthropic Claude (via Vercel AI SDK) for listing generation, search, and negotiation
- **Streaming**: Server-Sent Events for real-time negotiation updates
- **Runtime**: Bun

## Getting Started

```bash
bun install
bun dev
```

Requires `ANTHROPIC_API_KEY_ALPHA` environment variable.

## Architecture

- `/api/listings` — CRUD + AI listing generation
- `/api/search` — Semantic search with Claude
- `/api/negotiate` — SSE endpoint where buyer/seller AI agents negotiate in real-time
- In-memory data store with seed listings

## TreeHacks 2026

Built for the YC Challenge (reimagining Craigslist, YC W06) and targeting:
- YC "Build an Iconic Company with AI" track
- Anthropic Human Flourishing track
- Greylock Best Multi-Turn Agent
- Most Creative / Grand Prize
