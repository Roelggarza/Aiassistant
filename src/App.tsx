import { useMemo, useState } from 'react';
import type { RunEntry } from './types';
import { APP_VERSION, RUN_CAP, loadRuns, saveRuns, uid } from './store';
import Sidebar, { type View } from './components/Sidebar';
import ConsolePanel from './components/ConsolePanel';
import JevPanel from './components/JevPanel';
import HermesPanel from './components/HermesPanel';
import MusePanel from './components/MusePanel';
import NotesPanel from './components/NotesPanel';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [view, setView] = useState<View>('console');
  const [runs, setRuns] = useState<RunEntry[]>(loadRuns());
  const [agentVersion, setAgentVersion] = useState(0);
  // one id per app session — groups traces for the future dataset
  const sessionId = useMemo(() => uid(), []);

  const addRun = (r: RunEntry) =>
    setRuns((prev) => {
      const stamped: RunEntry = { sessionId, appVersion: APP_VERSION, ...r };
      // explicit fields win over the stamp when a panel sets them
      if (r.sessionId) stamped.sessionId = r.sessionId;
      if (r.appVersion) stamped.appVersion = r.appVersion;
      const next = [stamped, ...prev].slice(0, RUN_CAP);
      saveRuns(next);
      return next;
    });

  const updateRun = (id: string, patch: Partial<RunEntry>) =>
    setRuns((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      saveRuns(next);
      return next;
    });

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} agentVersion={agentVersion} />
      <main className="main">
        {view === 'console' && <ConsolePanel runs={runs} addRun={addRun} updateRun={updateRun} />}
        {view === 'jev' && <JevPanel runs={runs} addRun={addRun} />}
        {view === 'hermes' && <HermesPanel addRun={addRun} />}
        {view === 'muse' && <MusePanel addRun={addRun} />}
        {view === 'notes' && <NotesPanel />}
        {view === 'settings' && <SettingsPanel onChange={() => setAgentVersion((v) => v + 1)} />}
      </main>
    </div>
  );
}
