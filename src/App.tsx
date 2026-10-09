import { useState } from 'react';
import type { RunEntry } from './types';
import { loadRuns, saveRuns } from './store';
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

  const addRun = (r: RunEntry) =>
    setRuns((prev) => {
      const next = [r, ...prev].slice(0, 200);
      saveRuns(next);
      return next;
    });

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} agentVersion={agentVersion} />
      <main className="main">
        {view === 'console' && <ConsolePanel runs={runs} addRun={addRun} />}
        {view === 'jev' && <JevPanel addRun={addRun} />}
        {view === 'hermes' && <HermesPanel addRun={addRun} />}
        {view === 'muse' && <MusePanel addRun={addRun} />}
        {view === 'notes' && <NotesPanel />}
        {view === 'settings' && <SettingsPanel onChange={() => setAgentVersion((v) => v + 1)} />}
      </main>
    </div>
  );
}
