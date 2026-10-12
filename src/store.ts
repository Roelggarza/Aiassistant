// Local persistence: settings, notes, run log. Keys never leave the browser
// except when calling the agent APIs directly.

const K = {
  settings: 'harness.settings.v1',
  notes: 'harness.notes.v1',
  runs: 'harness.runs.v2',
  runsV1: 'harness.runs.v1',
} as const;

/** Keep in sync with package.json version. Stamped onto every run as appVersion. */
export const APP_VERSION = '0.1.0';

/** Max runs kept locally. Traces are the future training set — keep plenty. */
export const RUN_CAP = 1000;

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
    const v2 = localStorage.getItem(K.runs);
    if (v2) return JSON.parse(v2);
    // one-time migration from v1: entries carry over, new trace fields stay unset
    const v1 = localStorage.getItem(K.runsV1);
    if (v1) {
      const runs = JSON.parse(v1) as RunEntry[];
      localStorage.setItem(K.runs, JSON.stringify(runs.slice(0, RUN_CAP)));
      return runs;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveRuns(r: RunEntry[]) {
  localStorage.setItem(K.runs, JSON.stringify(r.slice(0, RUN_CAP)));
}

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
