import { useState } from 'react';
import type { RunEntry } from '../types';
import { probeHermes, hermesCliCommand } from '../agents/hermes';
import { loadSettings, uid } from '../store';

export default function HermesPanel({ addRun }: { addRun: (r: RunEntry) => void }) {
  const [probeOut, setProbeOut] = useState('');
  const [probing, setProbing] = useState(false);
  const [task, setTask] = useState('');
  const [queued, setQueued] = useState('');

  const probe = async () => {
    const s = loadSettings();
    setProbing(true);
    setProbeOut('Probing…');
    const r = await probeHermes(s.hermesUrl);
    setProbeOut(r.message);
    addRun({ id: uid(), ts: Date.now(), agent: 'hermes', kind: 'probe', input: s.hermesUrl || '(no url)', output: r.message, ok: r.ok });
    setProbing(false);
  };

  const queue = () => {
    if (!task.trim()) return;
    const cmd = hermesCliCommand(task.trim());
    setQueued(cmd);
    addRun({
      id: uid(), ts: Date.now(), agent: 'hermes', kind: 'handoff',
      input: task.trim().slice(0, 300),
      output: `Queued (Hermes not reachable yet). Run on the box:\n${cmd}`,
      ok: true,
    });
    setTask('');
  };

  const copy = async (t: string) => {
    try { await navigator.clipboard.writeText(t); } catch { /* clipboard unavailable */ }
  };

  return (
    <div>
      <h2>Hermes — your box agent</h2>
      <p className="sub">Nous Research's open-source agent, destined for the OptiPlex security node. Not installed yet — this panel is ready for the day it is.</p>

      <div className="panel">
        <h3>Connection</h3>
        <p className="dim" style={{ fontSize: 13, margin: '0 0 8px' }}>
          Set the gateway URL in <code className="inline">Settings</code>, then probe it. Until Hermes answers, tasks queue here with the exact CLI command.
        </p>
        <div className="btn-row">
          <button className="btn ghost" onClick={probe} disabled={probing}>{probing ? 'Probing…' : 'Probe gateway'}</button>
        </div>
        {probeOut && <pre className="out">{probeOut}</pre>}
      </div>

      <div className="panel">
        <h3>Queue a task</h3>
        <label className="f">What should Hermes do once it's up?</label>
        <textarea value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Sweep the box for failed SSH logins in the last 24h and summarize." />
        <div className="btn-row">
          <button className="btn" onClick={queue}>Queue task</button>
        </div>
        {queued && (
          <>
            <pre className="out">{queued}</pre>
            <div className="btn-row">
              <button className="btn ghost" onClick={() => copy(queued)}>Copy command</button>
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h3>Bring-up checklist</h3>
        <ol className="steps">
          <li>Run the install runbook: <code className="inline">~/workspace/homelab/optiplex-security-node-runbook.md</code></li>
          <li><code className="inline">hermes setup</code> on the box, point it at your provider keys</li>
          <li><code className="inline">hermes gateway start</code> so this console can reach it</li>
          <li>Paste the gateway URL into Settings here, then hit Probe</li>
        </ol>
      </div>
    </div>
  );
}
