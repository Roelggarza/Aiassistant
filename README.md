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
- **Run log** — every dispatch recorded, newest first. Each run carries a
  **trace record**: task label, model, latency, session id, and your **verdict**
  (👍 good / ✏️ edited / 👎 rejected). Judged runs export as JSONL —
  training-grade data for a future fine-tune loop.

## v1 — installable, learning, shippable

**Live:** https://roelggarza.github.io/Aiassistant/

**Install it:** open the URL in Chrome/Edge/Safari → *Add to Home Screen* (phone)
or *Install* (desktop address bar). Works offline after first load; the app
shell is cached, API calls always go to network.

**It learns from you:** past runs you judged 👍 for the same task are injected
as few-shot examples on the next dispatch (`src/learn.ts`). Toggle per panel
with the "📚 learn from…" checkbox. No training, no server — retrieval over
your own traces.

**Your data stays yours:** everything lives in this browser's localStorage
(cap 1000 runs, quota-guarded). Export traces any time as JSONL; clear them
via *Clear site data*. API keys are never included in traces or exports.

## Trace data → fine-tune (Overmind-style)

The run log is a future training set. Every run is stamped with a narrow
**task label** (`triage.route`, `judge.workbench:noul`, `handoff.build`,
`queue.hermes`, `probe.gateway`), the serving model, latency, session id,
and app version.

**To build the dataset:** use the console normally, then judge runs in the
log — 👍 trains on the output as-is, ✏️ prompts for your corrected version
(becomes `gold_output`), 👎 marks a negative example. Hit **Export traces
(.jsonl)** to download `harness-traces-YYYYMMDD.jsonl`:

```json
{"trace_version":1,"id":"...","ts":"2026-10-12T08:55:00.000Z","agent":"jev",
 "task":"triage.route","input":"...","output":"...","gold_output":"...",
 "verdict":"good","model":"...","latency_ms":1234}
```

That file feeds a dataset → evals → fine-tune loop (e.g.
[overmind-core/overmind](https://github.com/overmind-core/overmind)):
distill your most repetitive loop — task routing is the prime candidate —
into a small local model the Harness can call instead of a big API.

Traces stay in the browser's localStorage (cap 1000 runs, v2 schema with
automatic v1 migration). Nothing uploads anywhere — export is an explicit
button press, and API keys are never included in traces.

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
