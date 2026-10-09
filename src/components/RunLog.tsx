import type { RunEntry } from '../types';

function time(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function RunLog({ runs }: { runs: RunEntry[] }) {
  if (!runs.length) return <p className="dim">No runs yet. Dispatch something above.</p>;
  return (
    <div>
      {runs.map((r) => (
        <div key={r.id} className={`run ${r.ok ? 'okay' : 'bad'}`}>
          <div className="meta">
            {time(r.ts)} · {r.agent} · {r.kind} · {r.ok ? 'ok' : 'failed'}
          </div>
          <div className="q">{r.input}</div>
          <div className="a">{r.output}</div>
        </div>
      ))}
    </div>
  );
}
