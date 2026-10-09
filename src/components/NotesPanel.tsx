import { useState } from 'react';
import type { Note } from '../store';
import { loadNotes, saveNotes, uid } from '../store';

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>(loadNotes());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const persist = (n: Note[]) => { setNotes(n); saveNotes(n); };

  const add = () => {
    if (!title.trim() && !body.trim()) return;
    persist([{ id: uid(), ts: Date.now(), title: title.trim() || 'Untitled', body: body.trim() }, ...notes]);
    setTitle(''); setBody('');
  };

  const del = (id: string) => persist(notes.filter((n) => n.id !== id));

  return (
    <div>
      <h2>Notes</h2>
      <p className="sub">Resurrected from the original Aiassistant app. Stored in this browser — no account needed.</p>

      <div className="panel">
        <h3>New note</h3>
        <label className="f">Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" />
        <label className="f">Body</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write it down…" />
        <div className="btn-row"><button className="btn" onClick={add}>Save note</button></div>
      </div>

      {notes.map((n) => (
        <div key={n.id} className="note">
          <h4>{n.title}</h4>
          <p>{n.body}</p>
          <div className="meta">
            <span>{new Date(n.ts).toLocaleString()}</span>
            <button onClick={() => del(n.id)}>delete</button>
          </div>
        </div>
      ))}
      {!notes.length && <p className="dim">No notes yet.</p>}
    </div>
  );
}
