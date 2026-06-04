import { describe, expect, it } from 'vitest';
import type { SessionSummary } from '@/stores/gameStore.ts';
import { SessionReportBuilder } from './SessionReportBuilder.ts';

function summary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    mode: 'zen',
    mapId: 'desert_expanse',
    aircraftId: 'storybook_biplane',
    difficulty: 'rookie',
    durationMs: 420_000,
    ringsPassed: 6,
    score: 1200,
    bestCombo: 5,
    averageSpeed: 150,
    maxAltitude: 800,
    minAltitude: 100,
    totalDistance: 6000,
    neuroSource: 'none',
    kills: 0,
    deaths: 0,
    shotsFired: 0,
    shotsHit: 0,
    objectivesCompleted: 6,
    objectiveGoal: 6,
    scoreLabel: 'Flow Score',
    missionTitle: 'Focus Flight over Sunspire Mesa',
    samples: [],
    events: [],
    avgCalm: null,
    avgArousal: null,
    avgBpm: null,
    peakBpm: null,
    minBpm: null,
    avgHrv: null,
    avgAlpha: null,
    avgBeta: null,
    avgTheta: null,
    dominantBrainState: null,
    calmTrend: null,
    arousalTrend: null,
    avgComposure: null,
    avgLoad: null,
    avgFlow: null,
    signalCoveragePct: 0,
    tutorial: false,
    sessionScore: 78,
    focusScore: 84,
    controlScore: 76,
    pressureScore: 70,
    recoveryBehaviorScore: 72,
    insightConfidence: 0,
    insightConfidenceLabel: 'behavior_only',
    recoveryWindows: [],
    ...overrides,
  };
}

describe('SessionReportBuilder', () => {
  it('builds a cards-first behavior-only report', () => {
    const report = SessionReportBuilder.build(summary());

    expect(report.sessionScore).toBe(78);
    expect(report.cards.map((card) => card.title)).toEqual([
      'Focus',
      'Control',
      'Pressure',
      'Recovery',
      'Signal Quality',
    ]);
    expect(report.cards.at(-1)?.value).toBe('Behavior-only');
  });

  it('keeps medical and EEG copy out of the report', () => {
    const report = SessionReportBuilder.build(
      summary({ signalCoveragePct: 82, insightConfidence: 84, insightConfidenceLabel: 'strong' }),
    );
    const copy = JSON.stringify(report).toLowerCase();

    expect(copy).toContain('camera');
    expect(copy).not.toContain('eeg');
    expect(copy).not.toContain('diagnos');
    expect(copy).not.toContain('stress detected');
    expect(copy).not.toContain('clinical');
  });
});
