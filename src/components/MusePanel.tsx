import { useState } from 'react';
import type { RunEntry } from '../types';
import { buildHandoff, MUSE_NOTE } from '../agents/muse';
import { uid } from '../store';

export default function MusePanel({ addRun }: { addRun: (r: RunEntry) => void }) {
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [packet, setPacket] = useState('');
  const [copied, setCopied] = useState(false);

  const build = () => {
    if (!task.trim()) return;
    const p = buildHandoff(task.trim(), context);
    setPacket(p);
    setCopied(false);
    addRun({ id: uid(), ts: Date.now(), agent: 'muse', kind: 'handoff', input: task.trim().slice(0, 300), output: 'Handoff packet built — paste it into chat.', ok: true });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(packet);
      setCopied(true);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div>
      <h2>Muse AI — that's me</h2>
      <p className="sub">{MUSE_NOTE}</p>

      <div className="panel">
        <h3>Send me a task</h3>
        <label className="f">Task</label>
        <textarea value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Draft the Hermes gateway bring-up checklist as a runbook section." />
        <label className="f">Context (optional)</label>
        <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Anything I should know — links, constraints, prior decisions…" style={{ minHeight: 60 }} />
        <div className="btn-row">
          <button className="btn" onClick={build}>Build handoff</button>
        </div>
        {packet && (
          <>
            <pre className="out">{packet}</pre>
            <div className="btn-row">
              <button className="btn ghost" onClick={copy}>{copied ? 'Copied ✓' : 'Copy packet'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
