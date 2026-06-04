import type { GameMode } from '@/game/types.ts';

export interface HeartTempoSample {
  bpm: number | null;
  confidence?: number;
  timestamp: number;
}

export const MODE_TEMPO_DEFAULTS: Record<GameMode, number> = {
  zen: 82,
  free: 94,
  dogfight: 112,
};

export const MODE_TEMPO_FACTORS: Record<GameMode, number> = {
  zen: 0.98,
  free: 1.02,
  dogfight: 1.08,
};

const SAMPLE_WINDOW_SECONDS = 60;
const MIN_VALID_BPM = 35;
const MAX_VALID_BPM = 220;
const MIN_CONFIDENCE = 0.08;
const MIN_TRANSPORT_BPM = 72;
const MAX_TRANSPORT_BPM = 152;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

export class HeartTempoTracker {
  private readonly samples: HeartTempoSample[] = [];
  private lastValidBpm: number | null = null;

  addSample(sample: HeartTempoSample): void {
    const confidence = sample.confidence ?? 1;
    if (
      sample.bpm !== null &&
      Number.isFinite(sample.bpm) &&
      sample.bpm >= MIN_VALID_BPM &&
      sample.bpm <= MAX_VALID_BPM &&
      confidence >= MIN_CONFIDENCE
    ) {
      this.samples.push({ bpm: sample.bpm, confidence, timestamp: sample.timestamp });
      this.lastValidBpm = sample.bpm;
    }
    this.prune(sample.timestamp);
  }

  getMedianBpm(mode: GameMode, now: number): number {
    this.prune(now);
    const recent = this.samples
      .filter((sample) => now - sample.timestamp <= SAMPLE_WINDOW_SECONDS && sample.bpm !== null)
      .map((sample) => sample.bpm as number);
    return median(recent) ?? this.lastValidBpm ?? MODE_TEMPO_DEFAULTS[mode];
  }

  getTargetTempo(mode: GameMode, now: number): number {
    return clamp(this.getMedianBpm(mode, now) * MODE_TEMPO_FACTORS[mode], MIN_TRANSPORT_BPM, MAX_TRANSPORT_BPM);
  }

  getLastValidBpm(): number | null {
    return this.lastValidBpm;
  }

  reset(): void {
    this.samples.length = 0;
    this.lastValidBpm = null;
  }

  private prune(now: number): void {
    const firstValidIndex = this.samples.findIndex((sample) => now - sample.timestamp <= SAMPLE_WINDOW_SECONDS);
    if (firstValidIndex > 0) {
      this.samples.splice(0, firstValidIndex);
    } else if (firstValidIndex === -1) {
      this.samples.length = 0;
    }
  }
}
