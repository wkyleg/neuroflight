import type { FlightEvent, FlightSample } from '@/game/gameplay/SessionRecorder.ts';
import type { GameDifficulty, GameMode } from '@/game/types.ts';
import type { RecoveryWindowResult } from './RecoveryWindowTracker.ts';

export type InsightConfidenceLabel = 'strong' | 'partial' | 'weak' | 'behavior_only';

export interface SessionScoreBreakdown {
  focus: number;
  control: number;
  pressure: number;
  recoveryBehavior: number;
  sessionScore: number;
  insightConfidence: number;
  insightConfidenceLabel: InsightConfidenceLabel;
}

export interface SessionScoreInput {
  mode: GameMode;
  difficulty: GameDifficulty;
  samples: FlightSample[];
  events: FlightEvent[];
  ringsPassed: number;
  objectivesCompleted: number;
  objectiveGoal: number;
  kills: number;
  deaths: number;
  shotsFired: number;
  shotsHit: number;
  recoveryWindows: RecoveryWindowResult[];
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function ratio(done: number, goal: number): number {
  if (goal <= 0) return done > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, done / goal));
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function consistencyScore(values: number[], idealMeanDelta: number): number {
  if (values.length < 2) return 74;
  const deltas = values.slice(1).map((value, index) => Math.abs(value - values[index]));
  return clampScore(100 - (average(deltas) / idealMeanDelta) * 100);
}

function eventCount(events: FlightEvent[], types: FlightEvent['type'][]): number {
  return events.filter((event) => types.includes(event.type)).length;
}

function confidenceLabel(value: number): InsightConfidenceLabel {
  if (value >= 80) return 'strong';
  if (value >= 60) return 'partial';
  if (value >= 30) return 'weak';
  return 'behavior_only';
}

export class SessionScoreBuilder {
  static build(input: SessionScoreInput): SessionScoreBreakdown {
    const focus = SessionScoreBuilder.focusScore(input);
    const control = SessionScoreBuilder.controlScore(input);
    const pressure = SessionScoreBuilder.pressureScore(input);
    const recoveryBehavior =
      input.recoveryWindows.length > 0
        ? clampScore(average(input.recoveryWindows.map((window) => window.behaviorScore)))
        : 72;
    const sessionScore = clampScore(0.45 * focus + 0.25 * control + 0.2 * pressure + 0.1 * recoveryBehavior);
    const sessionCoverage = average(input.samples.map((sample) => (sample.canPublish ? 1 : 0)));
    const recoveryCoverage =
      input.recoveryWindows.length > 0
        ? average(input.recoveryWindows.map((window) => window.signalCoverage))
        : sessionCoverage;
    const sessionHealth = input.samples.length > 0 ? 1 : 0;
    const insightConfidence = clampScore(
      (0.6 * sessionCoverage + 0.25 * recoveryCoverage + 0.15 * sessionHealth) * 100,
    );

    return {
      focus,
      control,
      pressure,
      recoveryBehavior,
      sessionScore,
      insightConfidence,
      insightConfidenceLabel: confidenceLabel(insightConfidence),
    };
  }

  private static focusScore(input: SessionScoreInput): number {
    if (input.mode === 'dogfight') {
      const accuracy = input.shotsFired > 0 ? input.shotsHit / input.shotsFired : 0;
      const wins = ratio(input.kills, Math.max(1, input.objectiveGoal || 3));
      const survival = Math.max(0, 1 - input.deaths * 0.18);
      return clampScore((accuracy * 0.42 + wins * 0.42 + survival * 0.16) * 100);
    }

    const progress =
      input.mode === 'free'
        ? ratio(input.objectivesCompleted, input.objectiveGoal)
        : ratio(input.ringsPassed, input.objectiveGoal);
    const combo = input.samples.length > 0 ? ratio(Math.max(...input.samples.map((sample) => sample.combo)), 8) : 0;
    return clampScore((progress * 0.72 + combo * 0.28) * 100);
  }

  private static controlScore(input: SessionScoreInput): number {
    const speed = consistencyScore(
      input.samples.map((sample) => sample.speed),
      120,
    );
    const throttle = consistencyScore(
      input.samples.map((sample) => sample.throttle * 100),
      24,
    );
    const altitude = consistencyScore(
      input.samples.map((sample) => sample.altitude),
      160,
    );
    const incidentPenalty = eventCount(input.events, ['crash', 'hard_landing', 'near_miss', 'death']) * 8;
    return clampScore(0.35 * speed + 0.3 * throttle + 0.25 * altitude + 10 - incidentPenalty);
  }

  private static pressureScore(input: SessionScoreInput): number {
    const finalSamples = input.samples.filter((sample) => sample.phase === 'final_wave');
    if (input.mode === 'dogfight') {
      const lateAccuracy =
        input.shotsFired > 0
          ? input.shotsHit / input.shotsFired
          : finalSamples.length > 0
            ? average(finalSamples.map((sample) => (sample.aiHealth < 100 ? 1 : 0)))
            : 0;
      const health = finalSamples.length > 0 ? average(finalSamples.map((sample) => sample.playerHealth)) / 100 : 0.72;
      return clampScore((lateAccuracy * 0.54 + health * 0.46) * 100);
    }
    if (finalSamples.length === 0) return 72;
    const finalProgress = average(finalSamples.map((sample) => sample.objectiveProgress));
    const flow = average(finalSamples.map((sample) => sample.flow));
    return clampScore((finalProgress * 0.6 + flow * 0.4) * 100);
  }
}
