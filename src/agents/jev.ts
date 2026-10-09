// Jev adapter — TypeSafe AI System One (https://docs.typesafe.ai).
// Jev returns typed judgments (noul / choice / score), not chat text.
// Endpoint + key are configurable; defaults point at the official API.

import type { JevAnswer, JevQuestion, JevResult } from '../types';

export async function askJev(opts: {
  endpoint: string;
  apiKey: string;
  model?: string;
  state: string | Record<string, unknown>;
  questions: Record<string, JevQuestion>;
}): Promise<JevResult> {
  const { endpoint, apiKey, state, questions } = opts;
  const model = opts.model || 'jev-latest';
  if (!apiKey) throw new Error('Missing TypeSafe API key — add it in Settings.');

  const res = await fetch(endpoint.replace(/\/$/, ''), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ state, model, questions }),
  });

  if (res.status === 401) throw new Error('Jev rejected the key (401). Check it in Settings.');
  if (res.status === 429) throw new Error('Jev rate limit hit (429). Wait a beat and retry.');
  if (!res.ok) throw new Error(`Jev error ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = await res.json();
  if (!data.answers) throw new Error('Jev returned an unexpected shape (no answers map).');
  return data as JevResult;
}

/** Tiny health probe: a known-greeting noul question. */
export async function probeJev(endpoint: string, apiKey: string): Promise<string> {
  const r = await askJev({
    endpoint,
    apiKey,
    state: 'ping',
    questions: { ok: { type: 'noul', instructions: 'Is this text a short greeting?' } },
  });
  return `Jev is live (model ${r.model}).`;
}

/** Human-friendly rendering of one answer. */
export function formatAnswer(id: string, a: JevAnswer): string {
  if (a.type === 'noul' && typeof a.noul === 'number') {
    const p = a.noul;
    const verdict = p >= 0.66 ? 'YES' : p <= 0.33 ? 'NO' : 'UNCERTAIN';
    return `${id}: ${verdict} (${(p * 100).toFixed(1)}%)`;
  }
  if (a.type === 'choice') {
    const pick = (a as Record<string, unknown>).choice ?? (a as Record<string, unknown>).answer;
    const conf = (a as Record<string, unknown>).confidence;
    return `${id}: chose "${String(pick)}"${typeof conf === 'number' ? ` (${(conf * 100).toFixed(1)}% conf)` : ''}`;
  }
  if (a.type === 'score' && typeof a.score === 'number') {
    return `${id}: score ${a.score}`;
  }
  return `${id}: ${JSON.stringify(a).slice(0, 180)}`;
}
