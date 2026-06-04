import { describe, expect, it } from 'vitest';
import type { FlightSample } from '@/game/gameplay/SessionRecorder.ts';
import type { SessionSummary } from '@/stores/gameStore.ts';
import { buildDebriefInsights } from './summaryInsights.ts';

function sample(t: number, flow = 0.5): FlightSample {
  return {
    t,
    phase: 'wave_1',
    rppgStatus: 'ready',
    canPublish: true,
    signalCoverageTrailing: 0.8,
    speed: 120,
    altitude: 240,
    throttle: 0.75,
    heading: 180,
    calm: 0.55,
    arousal: 0.35,
    bpm: 82,
    hrv: 42,
    alpha: 0,
    beta: 0,
    theta: 0,
    delta: 0,
    gamma: 0,
    calmnessState: null,
    respirationRate: 7.8,
    alphaPeakFreq: null,
    score: 0,
    combo: 0,
    ringsPassed: 0,
    objectivesCompleted: 0,
    objectiveProgress: 0,
    composure: 0.6,
    neuroLoad: 0.35,
    recovery: 0.5,
    flow,
    adaptationConfidence: 0.8,
    signalCoverage: 0.8,
    playerHealth: 100,
    aiHealth: 100,
    kills: 0,
    deaths: 0,
  };
}

function summary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    mode: 'zen',
    mapId: 'desert_expanse',
    aircraftId: 'storybook_biplane',
    difficulty: 'rookie',
    durationMs: 90_000,
    ringsPassed: 3,
    score: 450,
    bestCombo: 3,
    averageSpeed: 110,
    maxAltitude: 800,
    minAltitude: 90,
    totalDistance: 3800,
    neuroSource: 'none',
    kills: 0,
    deaths: 0,
    shotsFired: 0,
    shotsHit: 0,
    objectivesCompleted: 3,
    objectiveGoal: 6,
    scoreLabel: 'Flow Score',
    missionTitle: 'Zen Flight over Sunspire Mesa',
    samples: [sample(1), sample(14, 0.66), sample(24, 0.7)],
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
    sessionScore: 72,
    focusScore: 70,
    controlScore: 74,
    pressureScore: 68,
    recoveryBehaviorScore: 76,
    insightConfidence: 0,
    insightConfidenceLabel: 'behavior_only',
    recoveryWindows: [],
    ...overrides,
  };
}

describe('buildDebriefInsights', () => {
  it('keeps no-sensor sessions useful with flight-only copy', () => {
    const insights = buildDebriefInsights(summary());

    expect(insights.some((insight) => insight.title === 'Flight-only debrief')).toBe(true);
    expect(insights.map((insight) => insight.body).join(' ')).toContain('route progress');
  });

  it('explains low signal coverage without overclaiming', () => {
    const insights = buildDebriefInsights(
      summary({
        neuroSource: 'rppg',
        signalCoveragePct: 18,
      }),
    );

    expect(insights.some((insight) => insight.title === 'Limited signal coverage')).toBe(true);
    expect(insights.map((insight) => insight.body).join(' ')).toContain('confidence was usable');
  });

  it('summarizes expedition discoveries', () => {
    const insights = buildDebriefInsights(
      summary({
        mode: 'free',
        scoreLabel: 'Discovery Score',
        objectivesCompleted: 4,
        objectiveGoal: 5,
        events: [{ t: 28, type: 'postcard', phase: 'wave_1', label: 'Lighthouse postcard', score: 500 }],
      }),
    );

    expect(insights[0].title).toBe('Expedition log');
    expect(insights[0].body).toContain('4/5 discoveries');
    expect(insights.some((insight) => insight.title === 'Lighthouse postcard')).toBe(true);
  });

  it('uses wins and rival-down language for dogfight sessions', () => {
    const insights = buildDebriefInsights(
      summary({
        mode: 'dogfight',
        scoreLabel: 'Ace Score',
        neuroSource: 'rppg',
        signalCoveragePct: 76,
        kills: 2,
        deaths: 1,
        objectivesCompleted: 2,
        objectiveGoal: 3,
        events: [{ t: 18, type: 'kill', phase: 'wave_1', score: 550 }],
      }),
    );
    const visibleCopy = insights.map((insight) => `${insight.title} ${insight.body}`).join(' ');

    expect(visibleCopy).toContain('wins');
    expect(visibleCopy).toContain('Rival down');
    expect(visibleCopy.toLowerCase()).not.toContain('tag');
    expect(visibleCopy.toLowerCase()).not.toContain('kill');
  });

  it('adds an event-window insight when signal coverage is strong enough', () => {
    const insights = buildDebriefInsights(
      summary({
        neuroSource: 'rppg',
        signalCoveragePct: 82,
        samples: [sample(1), sample(10, 0.5), sample(14, 0.66), sample(24, 0.7)],
        events: [{ t: 14, type: 'ring_hit', phase: 'wave_1', label: 'Sun gate', score: 120 }],
      }),
    );

    expect(insights.some((insight) => insight.id === 'event-window')).toBe(true);
  });

  it('treats full route completion as a reward moment', () => {
    const insights = buildDebriefInsights(
      summary({
        ringsPassed: 6,
        objectivesCompleted: 6,
        objectiveGoal: 6,
        events: [{ t: 52, type: 'route_complete', phase: 'wave_1', label: 'Glowing route complete', score: 650 }],
      }),
    );

    expect(insights.some((insight) => insight.title === 'Glowing route complete')).toBe(true);
    expect(insights.map((insight) => insight.body).join(' ')).toContain('Worth 650 points');
  });
});
