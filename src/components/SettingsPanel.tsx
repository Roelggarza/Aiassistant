import { useState } from 'react';
import type { Settings } from '../store';
import { loadSettings, saveSettings } from '../store';
import { probeJev } from '../agents/jev';

export default function SettingsPanel({ onChange }: { onChange: () => void }) {
  const [s, setS] = useState<Settings>(loadSettings());
  const [msg, setMsg] = useState('');
  const [testing, setTesting] = useState(false);

  const set = (patch: Partial<Settings>) => setS((prev) => ({ ...prev, ...patch }));

  const save = () => {
    saveSettings(s);
    onChange();
    setMsg('Saved. Keys live in this browser only.');
  };

  const testJev = async () => {
    setTesting(true);
    setMsg('Testing Jev…');
    try {
      const m = await probeJev(s.jevEndpoint, s.jevKey);
      setMsg(`✓ ${m}`);
    } catch (e) {
      setMsg(`✗ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <h2>Settings</h2>
      <p className="sub">Everything here is stored in this browser's localStorage. Never pasted into prompts, never committed.</p>

      <div className="panel">
        <h3>Jev — TypeSafe API</h3>
        <label className="f">API key (TYPESAFE_API_KEY — mint at console.typesafe.ai)</label>
        <input type="password" value={s.jevKey} onChange={(e) => set({ jevKey: e.target.value })} placeholder="ts_…" autoComplete="off" />
        <label className="f">Endpoint</label>
        <input type="text" value={s.jevEndpoint} onChange={(e) => set({ jevEndpoint: e.target.value })} />
        <div className="btn-row">
          <button className="btn ghost" onClick={testJev} disabled={testing}>{testing ? 'Testing…' : 'Test Jev key'}</button>
        </div>
      </div>

      <div className="panel">
        <h3>Hermes — gateway</h3>
        <label className="f">Gateway URL (set once Hermes is up on the OptiPlex)</label>
        <input type="text" value={s.hermesUrl} onChange={(e) => set({ hermesUrl: e.target.value })} placeholder="http://100.108.48.104:PORT" />
        <label className="f">Gateway key (if yours needs one)</label>
        <input type="password" value={s.hermesKey} onChange={(e) => set({ hermesKey: e.target.value })} placeholder="optional" autoComplete="off" />
      </div>

      <div className="btn-row"><button className="btn" onClick={save}>Save settings</button></div>
      {msg && <p className="status-line">{msg}</p>}
    </div>
  );
}
