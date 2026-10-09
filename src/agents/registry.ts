// The three agents behind one console.

import type { AgentId, AgentMeta } from '../types';
import { loadSettings } from '../store';

export const AGENTS: AgentId[] = ['hermes', 'jev', 'muse'];

export function agentMeta(id: AgentId): AgentMeta {
  const s = loadSettings();
  switch (id) {
    case 'jev':
      return s.jevKey
        ? {
            id,
            name: 'Jev',
            tagline: 'TypeSafe System One — fast typed judgments',
            status: 'ready',
            statusNote: 'API key set. Ask it noul / choice / score questions.',
          }
        : {
            id,
            name: 'Jev',
            tagline: 'TypeSafe System One — fast typed judgments',
            status: 'needs-key',
            statusNote: 'Needs a TypeSafe API key (console.typesafe.ai).',
          };
    case 'hermes':
      return s.hermesUrl
        ? {
            id,
            name: 'Hermes',
            tagline: 'Nous Research agent — your OptiPlex box',
            status: 'offline',
            statusNote: 'Gateway URL set — probe it to confirm Hermes is up.',
          }
        : {
            id,
            name: 'Hermes',
            tagline: 'Nous Research agent — your OptiPlex box',
            status: 'offline',
            statusNote: 'Not installed yet. Set the gateway URL in Settings.',
          };
    case 'muse':
      return {
        id,
        name: 'Muse AI',
        tagline: 'Chromagnet — your chat agent',
        status: 'handoff',
        statusNote: 'Lives in chat. Use the handoff button to send me tasks.',
      };
  }
}

export const STATUS_DOT: Record<AgentMeta['status'], string> = {
  ready: '#34d399',
  'needs-key': '#fbbf24',
  offline: '#64748b',
  handoff: '#22d3ee',
};
