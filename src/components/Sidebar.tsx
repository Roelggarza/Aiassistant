import type { AgentId } from '../types';
import { AGENTS, agentMeta, STATUS_DOT } from '../agents/registry';

export type View = 'console' | 'jev' | 'hermes' | 'muse' | 'notes' | 'settings';

interface Props {
  view: View;
  setView: (v: View) => void;
  agentVersion: number; // bump to refresh statuses
}

export default function Sidebar({ view, setView, agentVersion }: Props) {
  void agentVersion;
  const goAgent = (id: AgentId) => setView(id as View);

  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>HARNESS</h1>
        <p>Roel's agent console</p>
      </div>

      {AGENTS.map((id) => {
        const m = agentMeta(id);
        return (
          <button
            key={id}
            className={`agent-card ${view === id ? 'active' : ''}`}
            onClick={() => goAgent(id)}
          >
            <div className="row">
              <span className="dot" style={{ background: STATUS_DOT[m.status], color: STATUS_DOT[m.status] }} />
              <span className="name">{m.name}</span>
            </div>
            <div className="tag">{m.tagline}</div>
          </button>
        );
      })}

      <div className="nav">
        <div className="sep">WORKSPACE</div>
        <button className={view === 'console' ? 'active' : ''} onClick={() => setView('console')}>Console</button>
        <button className={view === 'notes' ? 'active' : ''} onClick={() => setView('notes')}>Notes</button>
        <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>Settings</button>
      </div>

      <div className="side-foot">Keys stay in your browser.<br />Nothing is committed.</div>
    </aside>
  );
}
