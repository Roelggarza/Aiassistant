// Trace export: turns judged run-log entries into training-grade JSONL,
// ready for an Overmind-style dataset -> evals -> fine-tune loop.
// Traces never leave the browser except through the explicit export button.

import type { RunEntry, RunVerdict } from './types';

export const TRACE_VERSION = 1;

export interface TraceRecord {
  trace_version: number;
  id: string;
  ts: string; // ISO
  agent: RunEntry['agent'];
  task: string;
  kind: RunEntry['kind'];
  input: string;
  output: string;
  /** The output to train on: the human correction when edited, else the raw output. */
  gold_output: string;
  verdict: RunVerdict;
  ok: boolean;
  model: string | null;
  latency_ms: number | null;
  session_id: string | null;
  app_version: string | null;
}

export function toTraceRecord(r: RunEntry): TraceRecord | null {
  if (!r.verdict) return null;
  return {
    trace_version: TRACE_VERSION,
    id: r.id,
    ts: new Date(r.ts).toISOString(),
    agent: r.agent,
    task: r.task || r.kind,
    kind: r.kind,
    input: r.input,
    output: r.output,
    gold_output: r.verdict === 'edited' && r.editedOutput ? r.editedOutput : r.output,
    verdict: r.verdict,
    ok: r.ok,
    model: r.model ?? null,
    latency_ms: r.latencyMs ?? null,
    session_id: r.sessionId ?? null,
    app_version: r.appVersion ?? null,
  };
}

/** Labeled (verdict-bearing) runs, newest first. */
export function labeledRuns(runs: RunEntry[]): RunEntry[] {
  return runs.filter((r) => r.verdict);
}

export function tracesToJSONL(runs: RunEntry[]): string {
  return labeledRuns(runs)
    .map((r) => JSON.stringify(toTraceRecord(r)))
    .join('\n');
}

export function downloadTracesJSONL(runs: RunEntry[]) {
  const jsonl = tracesToJSONL(runs);
  if (!jsonl) return;
  const blob = new Blob([jsonl + '\n'], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href = url;
  a.download = `harness-traces-${stamp}.jsonl`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
