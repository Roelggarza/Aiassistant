// Core domain types for the harness.

export type AgentId = 'hermes' | 'jev' | 'muse';

export type AgentStatus = 'ready' | 'needs-key' | 'offline' | 'handoff';

export interface AgentMeta {
  id: AgentId;
  name: string;
  tagline: string;
  status: AgentStatus;
  statusNote: string;
}

export interface RunEntry {
  id: string;
  ts: number;
  agent: AgentId;
  kind: 'ask' | 'probe' | 'handoff' | 'note';
  input: string;
  output: string;
  ok: boolean;
  // ---- trace fields (Overmind-ready fine-tune data) ----
  /** Narrow task label, e.g. 'triage.route', 'judge.workbench', 'handoff.build'. */
  task?: string;
  /** Serving model id, when known (e.g. Jev's model). */
  model?: string;
  /** Wall-clock latency of the run in ms. */
  latencyMs?: number;
  /** Human quality signal — the label that makes a trace training-grade. */
  verdict?: RunVerdict;
  /** Corrected output when verdict === 'edited'. */
  editedOutput?: string;
  /** Groups runs from one app session. */
  sessionId?: string;
  /** Harness version that produced the run. */
  appVersion?: string;
}

/** Human quality signal on a run. Unset = not yet judged. */
export type RunVerdict = 'good' | 'edited' | 'rejected';

// ---- Jev (TypeSafe System One) wire types ----
export type JevQuestionType = 'noul' | 'choice' | 'score';

export interface JevQuestion {
  type: JevQuestionType;
  instructions: string;
  /** choice: map of option key -> label. score: ordered level labels. */
  criteria?: Record<string, string> | string[];
}

export interface JevAnswer {
  type: JevQuestionType;
  [k: string]: unknown;
}

export interface JevResult {
  model: string;
  answers: Record<string, JevAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
}
