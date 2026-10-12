// Per-user learning: retrieval over the user's own judged traces.
// When dispatching, past runs the user marked 👍 for the same task are
// injected as few-shot examples. No training, no server — the console gets
// smarter the more you judge. Fully local.

import type { RunEntry } from './types';

export interface Example {
  input: string;
  output: string;
}

/** Past good runs for the exact task label, newest first. */
export function findExamples(runs: RunEntry[], task: string, limit = 3): Example[] {
  return runs
    .filter((r) => r.task === task && r.verdict === 'good' && r.ok)
    .slice(0, limit)
    .map((r) => ({ input: r.input, output: r.output }));
}

export function formatExamples(exs: Example[]): string {
  return exs
    .map(
      (e, i) =>
        `[Example ${i + 1} — a past run you judged GOOD]\nInput: ${e.input}\nOutput: ${e.output}`
    )
    .join('\n\n');
}

/**
 * Build the state actually sent to the model: past examples first,
 * then the live input, clearly delimited.
 */
export function withExamples(state: string, exs: Example[]): string {
  if (!exs.length) return state;
  return (
    `The following are examples of GOOD past judgments for this exact task. ` +
    `Match their style and rigor.\n\n${formatExamples(exs)}\n\n` +
    `--- NOW JUDGE THIS ---\n${state}`
  );
}
