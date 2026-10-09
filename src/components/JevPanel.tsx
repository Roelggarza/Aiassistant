import { useState } from 'react';
import type { JevQuestion, JevQuestionType, RunEntry } from '../types';
import { askJev, formatAnswer } from '../agents/jev';
import { loadSettings, uid } from '../store';

interface Draft {
  id: string;
  type: JevQuestionType;
  instructions: string;
  criteria: string; // raw text; parsed per type
}

const newDraft = (): Draft => ({
  id: `q${Math.floor(Math.random() * 10000)}`,
  type: 'noul',
  instructions: '',
  criteria: '',
});

function parseCriteria(d: Draft): JevQuestion['criteria'] | undefined {
  const t = d.criteria.trim();
  if (d.type === 'choice') {
    if (!t) return undefined;
    const map: Record<string, string> = {};
    t.split('\n').forEach((line, i) => {
      const m = line.match(/^\s*([^:]+)\s*:\s*(.+)\s*$/);
      if (m) map[m[1].trim()] = m[2].trim();
      else if (line.trim()) map[`opt${i + 1}`] = line.trim();
    });
    return map;
  }
  if (d.type === 'score') {
    if (!t) return undefined;
    return t.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

export default function JevPanel({ addRun }: { addRun: (r: RunEntry) => void }) {
  const [state, setState] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([newDraft()]);
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);

  const setDraft = (i: number, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const run = async () => {
    const s = loadSettings();
    const questions: Record<string, JevQuestion> = {};
    for (const d of drafts) {
      if (!d.instructions.trim()) continue;
      questions[d.id || `q${drafts.indexOf(d)}`] = {
        type: d.type,
        instructions: d.instructions.trim(),
        criteria: parseCriteria(d),
      };
    }
    if (!state.trim() || !Object.keys(questions).length) {
      setOut('Give me a state and at least one question with instructions.');
      return;
    }
    setBusy(true);
    setOut('Asking Jev…');
    try {
      const r = await askJev({ endpoint: s.jevEndpoint, apiKey: s.jevKey, state: state.trim(), questions });
      const lines = Object.entries(r.answers).map(([id, a]) => formatAnswer(id, a));
      const usage = r.usage?.input_tokens ? ` · ${r.usage.input_tokens} in-tokens` : '';
      const text = `model ${r.model}${usage}\n` + lines.join('\n');
      setOut(text);
      addRun({ id: uid(), ts: Date.now(), agent: 'jev', kind: 'ask', input: state.trim().slice(0, 300), output: text, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOut(msg);
      addRun({ id: uid(), ts: Date.now(), agent: 'jev', kind: 'ask', input: state.trim().slice(0, 300), output: msg, ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>Jev — judgment workbench</h2>
      <p className="sub">TypeSafe System One. State in, typed answers out — noul, choice, score. No chat, no prose.</p>

      <div className="panel">
        <h3>State</h3>
        <label className="f">The text (or JSON) Jev should judge</label>
        <textarea value={state} onChange={(e) => setState(e.target.value)} placeholder="Paste the decision, message, log line, or situation here…" />
      </div>

      <div className="panel">
        <h3>Questions</h3>
        {drafts.map((d, i) => (
          <div key={i} className="qrow">
            <div>
              <select value={d.type} onChange={(e) => setDraft(i, { type: e.target.value as JevQuestionType })}>
                <option value="noul">noul (yes/no)</option>
                <option value="choice">choice (pick)</option>
                <option value="score">score (scale)</option>
              </select>
            </div>
            <div className="grow">
              <input
                type="text"
                value={d.instructions}
                onChange={(e) => setDraft(i, { instructions: e.target.value })}
                placeholder={d.type === 'noul' ? 'e.g. Does this convey urgency?' : d.type === 'choice' ? 'e.g. Which bucket does this belong in?' : 'e.g. How severe is this, 0–4?'}
                style={{ marginBottom: 6 }}
              />
              {d.type !== 'noul' && (
                <textarea
                  value={d.criteria}
                  onChange={(e) => setDraft(i, { criteria: e.target.value })}
                  placeholder={d.type === 'choice' ? 'one per line — key: label, e.g.&#10;spam: unsolicited bulk&#10;ham: legitimate' : 'one level per line, worst first, e.g.&#10;critical&#10;high&#10;medium&#10;low&#10;none'}
                  style={{ minHeight: 56 }}
                />
              )}
            </div>
            <button className="rm" onClick={() => setDrafts((ds) => ds.filter((_, j) => j !== i))} title="remove">✕</button>
          </div>
        ))}
        <div className="btn-row">
          <button className="btn ghost" onClick={() => setDrafts((ds) => [...ds, newDraft()])}>+ question</button>
          <button className="btn" onClick={run} disabled={busy}>{busy ? 'Asking…' : 'Ask Jev'}</button>
        </div>
        {out && <pre className="out">{out}</pre>}
      </div>
    </div>
  );
}
