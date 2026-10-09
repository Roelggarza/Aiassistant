# Harness — Roel's Agent Console

Resurrected from the old `Aiassistant` repo (July 2025, a single-file AI notes app
from the Bolt $1M-prize-pool era). Rebuilt as a personal multi-agent harness:
**Hermes, Jev, and Muse AI** behind one console.

## The three agents

| Agent | What it is | Status |
|---|---|---|
| **Jev** | TypeSafe AI System One — fast typed judgments (`noul` / `choice` / `score`), not chat | Live, needs API key |
| **Hermes** | Nous Research open-source agent, destined for the OptiPlex security node | Not installed yet — panel queues tasks until it is |
| **Muse AI** | Chromagnet, in chat — no API, works via handoff packets | Always available via copy/paste |

## Quick start

```bash
npm install
npm run dev     # dev server
npm run build   # production build -> dist/
```

## Wiring it up

**Jev** — mint a key at `console.typesafe.ai`, paste it into Settings (or
`VITE_TYPESAFE_API_KEY` in a local `.env`). Hit "Test Jev key". Endpoint
defaults to `https://api.typesafe.ai/v1/systemone` and is configurable.

**Hermes** — follow `~/workspace/homelab/optiplex-security-node-runbook.md` to
install on the box, `hermes gateway start`, then paste the gateway URL into
Settings and hit "Probe gateway" on the Hermes panel. Until then, queued tasks
produce the exact `hermes run "…"` CLI command to run on the box.

**Muse AI** — no wiring. Write a task on the Muse panel, copy the packet,
paste it into chat. I pick it up with full context.

## What's inside

- **Console** — one task box routed to any agent. Jev triages (actionable? who
  should own it: hermes / muse / human). Hermes queues. Muse builds a handoff.
- **Jev workbench** — state + N typed questions, answers with probabilities.
- **Hermes panel** — gateway probe, task queue, bring-up checklist.
- **Muse panel** — handoff packet builder.
- **Notes** — resurrected from the original app, localStorage-backed.
- **Run log** — every dispatch recorded, newest first.

## Honest notes

- Keys live in the browser's localStorage (or a local `.env`). They are never
  pasted into prompts and never committed — `.gitignore` covers `.env`.
- The Hermes adapter does **not** guess the gateway's HTTP contract. The probe
  is reachability-only; dispatch emits the CLI command. Wire the real task
  contract once the gateway is up.
- The Muse adapter does **not** fake an API connection. Handoff packets are
  the interface.

## Stack

Vite 6 + React 18 + TypeScript. No UI framework — one `styles.css`, neon
console theme.
