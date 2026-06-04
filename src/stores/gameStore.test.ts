import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSummary } from './gameStore';

const DEFAULT_HUD = {
  speed: 0,
  altitude: 0,
  heading: 0,
  throttle: 0.5,
  score: 0,
  ringsHit: 0,
  elapsedMs: 0,
  mode: 'zen' as const,
  paused: false,
  aircraftId: 'storybook_biplane',
  nextRingDir: null,
  playerHealth: 100,
  aiHealth: 100,
  kills: 0,
  deaths: 0,
  enemyDir: null,
  aiState: 'none',
  aiDistance: 0,
  aiDotForward: 0,
  shotsFired: 0,
  shotsHit: 0,
  missionTitle: 'Zen Flight',
  missionSubtitle: 'Route warming up',
  objectiveLabel: 'Rings',
  objectiveText: 'Find the next glowing gate',
  objectiveSubtext: 'Sensors optional',
  objectiveProgress: 0,
  objectiveGoal: 0,
  scoreLabel: 'Flow Score',
  nextObjectiveDir: null,
  composure: 0.5,
  neuroLoad: 0.35,
  recovery: 0.5,
  flow: 0.5,
  adaptationConfidence: 0,
  signalCoverage: 0,
  neuroPrompt: 'Signals optional',
  bonusNotice: null,
  sessionPhase: 'readiness',
  sessionPhaseLabel: 'Readiness',
  sessionPhaseRemainingMs: 0,
  sessionPhaseElapsedMs: 0,
  sessionPhasePrompt: 'Camera optional. Behavior-only is ready.',
  tutorial: false,
};

function minimalSession(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    mode: 'zen',
    mapId: 'test-map',
    aircraftId: 'storybook_biplane',
    difficulty: 'rookie',
    durationMs: 1000,
    ringsPassed: 0,
    score: 0,
    bestCombo: 0,
    averageSpeed: 0,
    maxAltitude: 0,
    minAltitude: 0,
    totalDistance: 0,
    neuroSource: 'none',
    kills: 0,
    deaths: 0,
    shotsFired: 0,
    shotsHit: 0,
    objectivesCompleted: 0,
    objectiveGoal: 0,
    scoreLabel: 'Flow Score',
    missionTitle: 'Test Mission',
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
    sessionScore: 0,
    focusScore: 0,
    controlScore: 0,
    pressureScore: 0,
    recoveryBehaviorScore: 0,
    insightConfidence: 0,
    insightConfidenceLabel: 'behavior_only',
    recoveryWindows: [],
    ...overrides,
  };
}

describe('gameStore', () => {
  let useGameStore: typeof import('./gameStore').useGameStore;

  beforeEach(async () => {
    sessionStorage.clear();
    vi.resetModules();
    ({ useGameStore } = await import('./gameStore'));
  });

  it('initial state has correct defaults', () => {
    const s = useGameStore.getState();
    expect(s.game).toBeNull();
    expect(s.lastSession).toBeNull();
    expect(s.hud).toEqual(DEFAULT_HUD);
  });

  it('updateHud() merges partial state', () => {
    useGameStore.getState().updateHud({ speed: 120, score: 50, paused: true });
    const hud = useGameStore.getState().hud;
    expect(hud.speed).toBe(120);
    expect(hud.score).toBe(50);
    expect(hud.paused).toBe(true);
    expect(hud.altitude).toBe(0);
    expect(hud.aircraftId).toBe('storybook_biplane');
  });

  it('updateHud() accepts structured flight notices', () => {
    useGameStore.getState().updateHud({
      bonusNotice: { id: 7, text: 'RIVAL HIT', tone: 'hit', durationMs: 1200 },
    });

    expect(useGameStore.getState().hud.bonusNotice).toEqual({
      id: 7,
      text: 'RIVAL HIT',
      tone: 'hit',
      durationMs: 1200,
    });
  });

  it('setLastSession() persists to sessionStorage', () => {
    const session = minimalSession({ score: 999, mode: 'combat' });
    useGameStore.getState().setLastSession(session);
    expect(useGameStore.getState().lastSession).toEqual(session);
    expect(sessionStorage.getItem('neuroflight_lastSession')).toBe(JSON.stringify(session));
  });
});
