import type { FlightSample } from '@/game/gameplay/SessionRecorder.ts';
import { isRecoveryPhase, type SessionPhase, sessionPhaseLabel } from './sessionTypes.ts';

export type RecoveryTrendLabel = 'settled' | 'stable' | 'elevated' | 'unclear';
export type RecoverySignalLabel = 'strong' | 'partial' | 'weak' | 'behavior_only';

export interface RecoveryWindowResult {
  phase: SessionPhase;
  label: string;
  behaviorScore: number;
  signalCoverage: number;
  signalLabel: RecoverySignalLabel;
  bpmStart: number | null;
  bpmEnd: number | null;
  bpmDelta: number | null;
  trendLabel: RecoveryTrendLabel;
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function signalLabel(coverage: number): RecoverySignalLabel {
  if (coverage >= 0.8) return 'strong';
  if (coverage >= 0.6) return 'partial';
  if (coverage >= 0.3) return 'weak';
  return 'behavior_only';
}

function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function varianceScore(values: number[], idealVariance: number): number {
  if (values.length < 2) return 76;
  const avg = average(values) ?? 0;
  const variance = average(values.map((value) => Math.abs(value - avg))) ?? 0;
  return clampScore(100 - (variance / idealVariance) * 100);
}

export class RecoveryWindowTracker {
  build(samples: FlightSample[]): RecoveryWindowResult[] {
    const phases = Array.from(new Set(samples.map((sample) => sample.phase))).filter(isRecoveryPhase);
    return phases.map((phase) =>
      this.buildWindow(
        phase,
        samples.filter((sample) => sample.phase === phase),
      ),
    );
  }

  private buildWindow(phase: SessionPhase, samples: FlightSample[]): RecoveryWindowResult {
    const publishable = samples.filter((sample) => sample.canPublish && sample.bpm !== null);
    const coverage = samples.length > 0 ? publishable.length / samples.length : 0;
    const validSignalSeconds = publishable.length;
    const signal = signalLabel(coverage);
    const speeds = samples.map((sample) => sample.speed);
    const throttle = samples.map((sample) => sample.throttle * 100);
    const crashPenalty = samples.some((sample) => sample.playerHealth < 40) ? 12 : 0;
    const behaviorScore = clampScore(
      0.55 * varianceScore(speeds, 85) + 0.45 * varianceScore(throttle, 18) - crashPenalty,
    );

    if (coverage < 0.6 || validSignalSeconds < 15 || publishable.length < 2) {
      return {
        phase,
        label: sessionPhaseLabel(phase),
        behaviorScore,
        signalCoverage: coverage,
        signalLabel: signal,
        bpmStart: null,
        bpmEnd: null,
        bpmDelta: null,
        trendLabel: 'unclear',
      };
    }

    const startWindow = publishable.slice(0, Math.min(5, publishable.length));
    const endWindow = publishable.slice(-Math.min(5, publishable.length));
    const bpmStart = Math.round(average(startWindow.map((sample) => sample.bpm ?? 0)) ?? 0);
    const bpmEnd = Math.round(average(endWindow.map((sample) => sample.bpm ?? 0)) ?? 0);
    const bpmDelta = bpmEnd - bpmStart;
    const trendLabel: RecoveryTrendLabel = bpmDelta <= -3 ? 'settled' : bpmDelta >= 4 ? 'elevated' : 'stable';

    return {
      phase,
      label: sessionPhaseLabel(phase),
      behaviorScore,
      signalCoverage: coverage,
      signalLabel: signal,
      bpmStart,
      bpmEnd,
      bpmDelta,
      trendLabel,
    };
  }
}
