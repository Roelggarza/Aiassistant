// Local persistence: settings, notes, run log. Keys never leave the browser
// except when calling the agent APIs directly.

const K = {
  settings: 'harness.settings.v1',
  notes: 'harness.notes.v1',
  runs: 'harness.runs.v1',
} as const;

export interface Settings {
  jevKey: string;
  jevEndpoint: string;
  hermesUrl: string;
  hermesKey: string;
}

export const defaultSettings: Settings = {
  jevKey: '',
  jevEndpoint: 'https://api.typesafe.ai/v1/systemone',
  hermesUrl: '',
  hermesKey: '',
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(K.settings);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(K.settings, JSON.stringify(s));
}

export interface Note {
  id: string;
  ts: number;
  title: string;
  body: string;
}

export function loadNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(K.notes) || '[]');
  } catch {
    return [];
  }
}

export function saveNotes(n: Note[]) {
  localStorage.setItem(K.notes, JSON.stringify(n));
}

import type { RunEntry } from './types';

export function loadRuns(): RunEntry[] {
  try {
    return JSON.parse(localStorage.getItem(K.runs) || '[]');
  } catch {
    return [];
  }
}

export function saveRuns(r: RunEntry[]) {
  // keep the last 200
  localStorage.setItem(K.runs, JSON.stringify(r.slice(0, 200)));
}

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
