// Muse AI adapter — that's me (Chromagnet). I live in Roel's chat, not behind
// an HTTP API, so this adapter doesn't fake a connection. It builds a clean
// handoff packet: copy it, paste it into chat, and I pick it up with full
// context of everything else I know.

import type { AgentId } from '../types';

export function buildHandoff(task: string, context?: string): string {
  const lines = [
    '[harness handoff]',
    '',
    `Task: ${task}`,
  ];
  if (context && context.trim()) {
    lines.push('', 'Context:', context.trim());
  }
  lines.push('', '— sent from the Harness console');
  return lines.join('\n');
}

export const MUSE_NOTE =
  'Muse AI (me, Chromagnet) runs in your chat with full access to your repos, memory, and tools. ' +
  'There is no API to call — the handoff button copies a task packet you paste to me.';

export type { AgentId };
