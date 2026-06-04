import type { GameMode } from '@/game/types.ts';

export interface LockedTempo {
  transportBpm: number;
  subdivision: number;
}

export function lockTempoToHeartRate(
  heartBpm: number,
  modeFactor: number,
  minTransport = 60,
  maxTransport = 140,
): LockedTempo {
  const scaled = heartBpm * modeFactor;
  const candidates = [0.5, 0.75, 1, 1.25, 1.5, 2]
    .map((subdivision) => ({ subdivision, transportBpm: scaled * subdivision }))
    .filter((candidate) => candidate.transportBpm >= minTransport && candidate.transportBpm <= maxTransport);
  if (candidates.length === 0) {
    const clamped = Math.max(minTransport, Math.min(maxTransport, scaled));
    return { transportBpm: clamped, subdivision: clamped / Math.max(1, scaled) };
  }
  return candidates.reduce((best, candidate) => {
    const bestSweet = best.transportBpm >= 72 && best.transportBpm <= 128;
    const candidateSweet = candidate.transportBpm >= 72 && candidate.transportBpm <= 128;
    if (candidateSweet !== bestSweet) return candidateSweet ? candidate : best;
    if (candidateSweet && bestSweet && scaled < minTransport) {
      return Math.abs(candidate.transportBpm - 96) < Math.abs(best.transportBpm - 96) ? candidate : best;
    }
    return Math.abs(candidate.subdivision - 1) < Math.abs(best.subdivision - 1) ? candidate : best;
  });
}

export function euclideanRhythm(hits: number, steps: number): number[] {
  if (steps <= 0) return [];
  const safeHits = Math.max(0, Math.min(steps, Math.round(hits)));
  if (safeHits === 0) return Array.from({ length: steps }, () => 0);
  return Array.from({ length: steps }, (_, index) =>
    Math.floor(((index + 1) * safeHits) / steps) !== Math.floor((index * safeHits) / steps) ? 1 : 0,
  );
}

export function makeLcg(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state = Math.imul(state, 1664525) + 1013904223;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

export interface ScaleCatalogueEntry {
  name: string;
  intervals: number[];
  modeBias: Partial<Record<GameMode, number>>;
}

export const PLEASANT_SCALE_CATALOGUE: ScaleCatalogueEntry[] = [
  { name: 'major', intervals: [0, 2, 4, 5, 7, 9, 11], modeBias: { free: 0.2 } },
  { name: 'minor', intervals: [0, 2, 3, 5, 7, 8, 10], modeBias: { dogfight: 0.12 } },
  { name: 'dorian', intervals: [0, 2, 3, 5, 7, 9, 10], modeBias: { free: 0.16 } },
  { name: 'lydian', intervals: [0, 2, 4, 6, 7, 9, 11], modeBias: { zen: 0.2 } },
  { name: 'mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], modeBias: { dogfight: 0.1 } },
  { name: 'major pentatonic', intervals: [0, 2, 4, 7, 9], modeBias: { zen: 0.14 } },
  { name: 'minor pentatonic', intervals: [0, 3, 5, 7, 10], modeBias: { dogfight: 0.12 } },
];

export function selectScale(seed: string, mode: GameMode): ScaleCatalogueEntry {
  const rng = makeLcg(`${seed}:${mode}`);
  const weights = PLEASANT_SCALE_CATALOGUE.map((entry) => 1 + (entry.modeBias[mode] ?? 0));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = rng() * total;
  for (let i = 0; i < PLEASANT_SCALE_CATALOGUE.length; i++) {
    cursor -= weights[i];
    if (cursor <= 0) return PLEASANT_SCALE_CATALOGUE[i];
  }
  return PLEASANT_SCALE_CATALOGUE[0];
}
