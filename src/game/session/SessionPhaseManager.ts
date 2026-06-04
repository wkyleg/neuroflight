import { SESSION_PHASE_DURATIONS_MS } from './sessionConfig.ts';
import {
  isRecoveryPhase,
  isWavePhase,
  SESSION_PHASES,
  type SessionPhase,
  type SessionPhaseEvent,
  type SessionPhaseSnapshot,
} from './sessionTypes.ts';

export interface SessionPhaseManagerOptions {
  durationsMs?: Partial<Record<Exclude<SessionPhase, 'debrief'>, number>>;
}

export class SessionPhaseManager {
  private phaseIndex = 0;
  private phaseElapsedMs = 0;
  private totalElapsedMs = 0;
  private readinessResolved = false;
  private pendingEvents: SessionPhaseEvent[] = [{ type: 'phase_started', phase: 'readiness', elapsedMs: 0 }];
  private durationsMs: Record<Exclude<SessionPhase, 'debrief'>, number>;

  constructor(options: SessionPhaseManagerOptions = {}) {
    this.durationsMs = { ...SESSION_PHASE_DURATIONS_MS, ...options.durationsMs };
  }

  resolveReadiness(): void {
    this.readinessResolved = true;
  }

  tick(dtMs: number): SessionPhaseEvent[] {
    if (this.currentPhase === 'debrief') return this.consumeEvents();
    const stepMs = Math.max(0, dtMs);
    this.phaseElapsedMs += stepMs;
    this.totalElapsedMs += stepMs;

    while (this.shouldAdvance()) {
      const completedPhase = this.currentPhase;
      this.pendingEvents.push({
        type: 'phase_completed',
        phase: completedPhase,
        elapsedMs: this.phaseElapsedMs,
      });
      this.phaseIndex = Math.min(SESSION_PHASES.length - 1, this.phaseIndex + 1);
      this.phaseElapsedMs = 0;
      this.pendingEvents.push({
        type: 'phase_started',
        phase: this.currentPhase,
        elapsedMs: this.totalElapsedMs,
      });
      if (this.phaseIndex === SESSION_PHASES.length - 1) break;
    }

    return this.consumeEvents();
  }

  snapshot(): SessionPhaseSnapshot {
    const phase = this.currentPhase;
    const duration = phase === 'debrief' ? 0 : this.durationsMs[phase];
    return {
      phase,
      phaseElapsedMs: this.phaseElapsedMs,
      phaseRemainingMs: phase === 'debrief' ? 0 : Math.max(0, duration - this.phaseElapsedMs),
      totalElapsedMs: this.totalElapsedMs,
      isWave: isWavePhase(phase),
      isRecovery: isRecoveryPhase(phase),
      index: this.phaseIndex + 1,
      total: SESSION_PHASES.length,
      terminal: phase === 'debrief',
    };
  }

  reset(): void {
    this.phaseIndex = 0;
    this.phaseElapsedMs = 0;
    this.totalElapsedMs = 0;
    this.readinessResolved = false;
    this.pendingEvents = [{ type: 'phase_started', phase: 'readiness', elapsedMs: 0 }];
  }

  get currentPhase(): SessionPhase {
    return SESSION_PHASES[this.phaseIndex];
  }

  private shouldAdvance(): boolean {
    const phase = this.currentPhase;
    if (phase === 'debrief') return false;
    if (phase === 'readiness') return this.readinessResolved || this.phaseElapsedMs >= this.durationsMs.readiness;
    return this.phaseElapsedMs >= this.durationsMs[phase];
  }

  private consumeEvents(): SessionPhaseEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }
}
