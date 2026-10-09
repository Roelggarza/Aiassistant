import { useState } from 'react';
import type { AgentId, RunEntry } from '../types';
import { AGENTS, agentMeta } from '../agents/registry';
import { askJev, formatAnswer } from '../agents/jev';
import { hermesCliCommand } from '../agents/hermes';
import { buildHandoff } from '../agents/muse';
import { loadSettings, uid } from '../store';
import RunLog from './RunLog';

/**
 * Console: one task box, routed to whichever agent you pick.
 * - jev: triages the task itself — is it actionable, and who should own it?
 * - hermes: queues with the CLI command (until the gateway is up).
 * - muse: builds a handoff packet to paste into chat.
 */
export default function ConsolePanel({ runs, addRun }: { runs: RunEntry[]; addRun: (r: RunEntry) => void }) {
  const [agent, setAgent] = useState<AgentId>('jev');
  const [task, setTask] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);

  const dispatch = async () => {
    const t = task.trim();
    if (!t) return;
    const s = loadSettings();
    setBusy(true);
    setOut('Working…');
    try {
      if (agent === 'jev') {
        const r = await askJev({
          endpoint: s.jevEndpoint,
          apiKey: s.jevKey,
          state: t,
          questions: {
            actionable: { type: 'noul', instructions: 'Is this task clear and actionable as written?' },
            owner: {
              type: 'choice',
              instructions: 'Which agent should own this task?',
              criteria: {
                hermes: 'needs a terminal on the home box (sweeps, files, system)',
                muse: 'needs research, code, writing, or multi-step work in chat',
                human: 'needs Roel himself (physical world, approvals, accounts)',
              },
            },
          },
        });
        const text = Object.entries(r.answers).map(([id, a]) => formatAnswer(id, a)).join('\n');
        setOut(text);
        addRun({ id: uid(), ts: Date.now(), agent, kind: 'ask', input: t.slice(0, 300), output: text, ok: true });
      } else if (agent === 'hermes') {
        const cmd = hermesCliCommand(t);
        const text = `Queued for Hermes. Run on the box:\n${cmd}`;
        setOut(text);
        addRun({ id: uid(), ts: Date.now(), agent, kind: 'handoff', input: t.slice(0, 300), output: text, ok: true });
      } else {
        const packet = buildHandoff(t);
        setOut(packet + '\n\n(Copy this into chat with Muse AI.)');
        addRun({ id: uid(), ts: Date.now(), agent, kind: 'handoff', input: t.slice(0, 300), output: 'Handoff packet built.', ok: true });
        try { await navigator.clipboard.writeText(packet); } catch { /* noop */ }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOut(msg);
      addRun({ id: uid(), ts: Date.now(), agent, kind: 'ask', input: t.slice(0, 300), output: msg, ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>Console</h2>
      <p className="sub">Route one task to one agent. Jev triages, Hermes queues, Muse takes the handoff.</p>

      <div className="panel">
        <div className="qrow">
          <div>
            <select value={agent} onChange={(e) => setAgent(e.target.value as AgentId)}>
              {AGENTS.map((id) => {
                const m = agentMeta(id);
                return <option key={id} value={id}>{m.name} — {m.statusNote.slice(0, 42)}…</option>;
              })}
            </select>
          </div>
          <div className="grow">
            <textarea value={task} onChange={(e) => setTask(e.target.value)} placeholder="What needs doing?" style={{ minHeight: 64 }} />
          </div>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={dispatch} disabled={busy || !task.trim()}>
            {busy ? 'Dispatching…' : `Dispatch to ${agentMeta(agent).name}`}
          </button>
        </div>
        {out && <pre className="out">{out}</pre>}
      </div>

      <div className="panel">
        <h3>Run log</h3>
        <RunLog runs={runs} />
      </div>
    </div>
  );
}
