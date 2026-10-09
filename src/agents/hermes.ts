// Hermes adapter — Nous Research's open-source agent (MIT) running on the
// OptiPlex security node. Hermes isn't installed yet, so this adapter is
// honest: configure the gateway URL, probe it, queue tasks until it answers.
//
// We intentionally do NOT guess the gateway's HTTP contract. The probe is a
// plain reachability check; dispatch builds the exact CLI command so Roel can
// run it on the box, and queues the task in the run log.

export interface HermesProbe {
  ok: boolean;
  message: string;
}

export async function probeHermes(baseUrl: string, timeoutMs = 6000): Promise<HermesProbe> {
  const url = baseUrl.replace(/\/$/, '');
  if (!url) return { ok: false, message: 'No gateway URL configured — set it in Settings.' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // Reachability only: many gateways answer / or /health; a 404 still proves
    // something is listening, which is what we report.
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal, mode: 'cors' });
    return {
      ok: true,
      message: `Something is listening at ${url} (HTTP ${res.status}). Wire the task contract once Hermes gateway is up.`,
    };
  } catch (e) {
    const reason = e instanceof Error && e.name === 'AbortError' ? 'timed out' : 'unreachable';
    return {
      ok: false,
      message: `${url} is ${reason}. Hermes isn't up yet — install it on the OptiPlex, then retry.`,
    };
  } finally {
    clearTimeout(t);
  }
}

/** The exact command to run a task on the box once Hermes is installed. */
export function hermesCliCommand(task: string): string {
  const safe = task.replace(/"/g, '\\"');
  return `hermes run "${safe}"`;
}
