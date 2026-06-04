import { describe, expect, it } from 'vitest';
import type { FlightSample } from '@/game/gameplay/SessionRecorder.ts';
import { SessionScoreBuilder } from './SessionScoreBuilder.ts';

function sample(overrides: Partial<FlightSample> = {}): FlightSample {
  return {
    t: 0,
    phase: 'wave_1',
    rppgStatus: 'behavior_only',
    canPublish: false,
    signalCoverageTrailing: 0,
    speed: 180,
    altitude: 500,
    throttle: 0.55,
    heading: 90,
    calm: 0.5,
    arousal: 0.4,
    bpm: null,
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
    combo: 4,
    ringsPassed: 3,
    objectivesCompleted: 0,
    objectiveProgress: 0.5,
    composure: 0.5,
    neuroLoad: 0.3,
    recovery: 0.5,
    flow: 0.7,
    adaptationConfidence: 0,
    signalCoverage: 0,
    playerHealth: 100,
    aiHealth: 100,
    kills: 0,
    deaths: 0,
    ...overrides,
  };
}

describe('SessionScoreBuilder', () => {
  it('scores behavior-only sessions without signal penalty', () => {
    const scores = SessionScoreBuilder.build({
      mode: 'zen',
      difficulty: 'rookie',
      samples: [sample({ phase: 'wave_1' }), sample({ phase: 'final_wave', objectiveProgress: 1, flow: 0.8 })],
      events: [],
      ringsPassed: 6,
      objectivesCompleted: 0,
      objectiveGoal: 6,
      kills: 0,
      deaths: 0,
      shotsFired: 0,
      shotsHit: 0,
      recoveryWindows: [],
    });

    expect(scores.sessionScore).toBeGreaterThan(70);
    expect(scores.insightConfidenceLabel).toBe('behavior_only');
  });

  it('keeps rPPG coverage separate from Session Score', () => {
    const base = {
      mode: 'dogfight' as const,
      difficulty: 'pilot' as const,
      samples: [sample({ canPublish: false }), sample({ phase: 'final_wave', canPublish: false, playerHealth: 90 })],
      events: [],
      ringsPassed: 0,
      objectivesCompleted: 0,
      objectiveGoal: 3,
      kills: 2,
      deaths: 0,
      shotsFired: 10,
      shotsHit: 6,
      recoveryWindows: [],
    };

    const noSignal = SessionScoreBuilder.build(base);
    const strongSignal = SessionScoreBuilder.build({
      ...base,
      samples: base.samples.map((row) => ({ ...row, canPublish: true })),
    });

    expect(strongSignal.sessionScore).toBe(noSignal.sessionScore);
    expect(strongSignal.insightConfidence).toBeGreaterThan(noSignal.insightConfidence);
  });
});
