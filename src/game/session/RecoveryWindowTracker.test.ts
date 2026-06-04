import { describe, expect, it } from 'vitest';
import type { FlightSample } from '@/game/gameplay/SessionRecorder.ts';
import { RecoveryWindowTracker } from './RecoveryWindowTracker.ts';

function recoverySample(index: number, overrides: Partial<FlightSample> = {}): FlightSample {
  return {
    t: index,
    phase: 'final_recovery',
    rppgStatus: 'ready',
    canPublish: true,
    signalCoverageTrailing: 1,
    speed: 160 + (index % 2),
    altitude: 600,
    throttle: 0.5,
    heading: 0,
    calm: 0.5,
    arousal: 0.4,
    bpm: 80 - index * 0.3,
    hrv: null,
    alpha: 0,
    beta: 0,
    theta: 0,
    delta: 0,
    gamma: 0,
    calmnessState: null,
    respirationRate: null,
    alphaPeakFreq: null,
    score: 0,
    combo: 0,
    ringsPassed: 0,
    objectivesCompleted: 0,
    objectiveProgress: 0,
    composure: 0.5,
    neuroLoad: 0.3,
    recovery: 0.5,
    flow: 0.6,
    adaptationConfidence: 0,
    signalCoverage: 1,
    playerHealth: 100,
    aiHealth: 100,
    kills: 0,
    deaths: 0,
    ...overrides,
  };
}

describe('RecoveryWindowTracker', () => {
  it('reports settled trend when coverage and valid time are sufficient', () => {
    const samples = Array.from({ length: 30 }, (_, index) => recoverySample(index));
    const [window] = new RecoveryWindowTracker().build(samples);

    expect(window.signalLabel).toBe('strong');
    expect(window.trendLabel).toBe('settled');
    expect(window.bpmDelta).toBeLessThan(0);
  });

  it('hides BPM trend for weak recovery coverage', () => {
    const samples = Array.from({ length: 30 }, (_, index) =>
      recoverySample(index, { canPublish: index < 5, bpm: index < 5 ? 80 : null }),
    );
    const [window] = new RecoveryWindowTracker().build(samples);

    expect(window.signalLabel).toBe('behavior_only');
    expect(window.trendLabel).toBe('unclear');
    expect(window.bpmDelta).toBeNull();
  });
});
