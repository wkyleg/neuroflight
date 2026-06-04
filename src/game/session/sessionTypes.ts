export type SessionPhase =
  | 'readiness'
  | 'warmup'
  | 'wave_1'
  | 'recovery_1'
  | 'wave_2'
  | 'recovery_2'
  | 'final_wave'
  | 'final_recovery'
  | 'debrief';

export type SessionPhaseEventType = 'phase_started' | 'phase_completed';

export interface SessionPhaseEvent {
  type: SessionPhaseEventType;
  phase: SessionPhase;
  elapsedMs: number;
}

export interface SessionPhaseSnapshot {
  phase: SessionPhase;
  phaseElapsedMs: number;
  phaseRemainingMs: number;
  totalElapsedMs: number;
  isWave: boolean;
  isRecovery: boolean;
  index: number;
  total: number;
  terminal: boolean;
}

export const SESSION_PHASES: SessionPhase[] = [
  'readiness',
  'warmup',
  'wave_1',
  'recovery_1',
  'wave_2',
  'recovery_2',
  'final_wave',
  'final_recovery',
  'debrief',
];

export function isWavePhase(phase: SessionPhase): boolean {
  return phase === 'wave_1' || phase === 'wave_2' || phase === 'final_wave';
}

export function isRecoveryPhase(phase: SessionPhase): boolean {
  return phase === 'recovery_1' || phase === 'recovery_2' || phase === 'final_recovery';
}

export function sessionPhaseLabel(phase: SessionPhase): string {
  switch (phase) {
    case 'readiness':
      return 'Readiness';
    case 'warmup':
      return 'Warmup';
    case 'wave_1':
      return 'Wave 1';
    case 'recovery_1':
      return 'Recovery 1';
    case 'wave_2':
      return 'Wave 2';
    case 'recovery_2':
      return 'Recovery 2';
    case 'final_wave':
      return 'Final Wave';
    case 'final_recovery':
      return 'Final Recovery';
    case 'debrief':
      return 'Debrief';
  }
}
