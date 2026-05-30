import type { GameMode } from './types.ts';

export interface ModeMeta {
  id: GameMode;
  title: string;
  shortTitle: string;
  scoreLabel: string;
  objectiveLabel: string;
  menuDescription: string;
  loadingLine: string;
  summaryTitle: string;
  summaryLead: string;
  accent: string;
}

export const MODE_META: Record<GameMode, ModeMeta> = {
  zen: {
    id: 'zen',
    title: 'Zen Flight',
    shortTitle: 'Zen',
    scoreLabel: 'Flow Score',
    objectiveLabel: 'Rings',
    menuDescription: 'Trace a calm route through landmarks, cloud banks, and glowing gates.',
    loadingLine: 'A quiet route is being marked through the sky.',
    summaryTitle: 'Zen Flight Debrief',
    summaryLead: 'A look at route flow, smooth flying, signal coverage, and recovery moments.',
    accent: '#5eead4',
  },
  free: {
    id: 'free',
    title: 'Expedition',
    shortTitle: 'Expedition',
    scoreLabel: 'Discovery Score',
    objectiveLabel: 'Discoveries',
    menuDescription: 'Visit story landmarks, skim low-pass gates, and collect postcard moments.',
    loadingLine: 'Expedition beacons are being lit across the map.',
    summaryTitle: 'Expedition Log',
    summaryLead: 'A record of discovered landmarks, altitude choices, and signal-aligned moments.',
    accent: '#facc15',
  },
  dogfight: {
    id: 'dogfight',
    title: 'Dogfight',
    shortTitle: 'Dogfight',
    scoreLabel: 'Ace Score',
    objectiveLabel: 'Wins',
    menuDescription: 'Play aerial tag above the same storybook world with glowing ribbons and quick recoveries.',
    loadingLine: 'The patrol route is opening around the landmarks.',
    summaryTitle: 'Dogfight Debrief',
    summaryLead: 'A review of tag timing, flight control, and composure under playful pressure.',
    accent: '#fb7185',
  },
};

export function getModeMeta(mode: GameMode): ModeMeta {
  return MODE_META[mode] ?? MODE_META.zen;
}

export function getModeTitle(mode: string): string {
  if (mode === 'free') return MODE_META.free.title;
  if (mode === 'dogfight') return MODE_META.dogfight.title;
  return MODE_META.zen.title;
}
