import type { RunEntry, RunVerdict } from '../types';
import { downloadTracesJSONL, labeledRuns } from '../traces';

function time(ts: number) {
  return new Date(ts).toLocaleString();
}

const VERDICTS: { v: RunVerdict; label: string; title: string }[] = [
  { v: 'good', label: '👍', title: 'Good — train on this as-is' },
  { v: 'edited', label: '✏️', title: 'Edited — I corrected the output' },
  { v: 'rejected', label: '👎', title: 'Rejected — negative example' },
];

export default function RunLog({
  runs,
  updateRun,
}: {
  runs: RunEntry[];
  updateRun: (id: string, patch: Partial<RunEntry>) => void;
}) {
  const labeled = labeledRuns(runs);

  const judge = (r: RunEntry, v: RunVerdict) => {
    if (v === 'edited') {
      const fix = window.prompt('Paste your corrected version of the output:', r.output);
      if (fix === null) return; // cancelled
      updateRun(r.id, { verdict: 'edited', editedOutput: fix });
    } else {
      // tapping the active verdict clears it
      updateRun(r.id, r.verdict === v ? { verdict: undefined, editedOutput: undefined } : { verdict: v, editedOutput: undefined });
    }
  };

  return (
    <div>
      <div className="btn-row" style={{ marginBottom: 10 }}>
        <button
          className="btn ghost"
          onClick={() => downloadTracesJSONL(runs)}
          disabled={!labeled.length}
          title={labeled.length ? 'Download judged runs as JSONL — training data for a future fine-tune' : 'Judge some runs first (👍/✏️/👎) to build training data'}
        >
          ⬇ Export traces (.jsonl)
        </button>
        <span className="dim" style={{ fontSize: 12, alignSelf: 'center' }}>
          {labeled.length} labeled / {runs.length} runs
          {labeled.length > 0 && ' — future fine-tune fuel'}
        </span>
      </div>
      {!runs.length && <p className="dim">No runs yet. Dispatch something above.</p>}
      {runs.map((r) => (
        <div key={r.id} className={`run ${r.ok ? 'okay' : 'bad'}`}>
          <div className="meta">
            {time(r.ts)} · {r.agent} · {r.task || r.kind} · {r.ok ? 'ok' : 'failed'}
            {r.model && ` · ${r.model}`}
            {r.latencyMs != null && ` · ${(r.latencyMs / 1000).toFixed(1)}s`}
          </div>
          <div className="q">{r.input}</div>
          <div className="a">{r.verdict === 'edited' && r.editedOutput ? r.editedOutput : r.output}</div>
          <div className="btn-row" style={{ marginTop: 6 }}>
            {VERDICTS.map(({ v, label, title }) => (
              <button
                key={v}
                className="btn ghost"
                style={{
                  padding: '4px 10px',
                  borderColor: r.verdict === v ? 'var(--cyan)' : undefined,
                  opacity: r.verdict && r.verdict !== v ? 0.45 : 1,
                }}
                title={title}
                onClick={() => judge(r, v)}
              >
                {label}
              </button>
            ))}
            {r.verdict && <span className="dim" style={{ fontSize: 12, alignSelf: 'center' }}>judged: {r.verdict}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
