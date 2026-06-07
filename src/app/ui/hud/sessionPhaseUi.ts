import type { SessionPhase } from '@/game/session/sessionTypes.ts';

export function phaseTone(phase: SessionPhase): 'readiness' | 'warmup' | 'wave' | 'recovery' | 'final' {
  if (phase === 'readiness') return 'readiness';
  if (phase === 'warmup') return 'warmup';
  if (phase === 'final_wave' || phase === 'final_recovery') return 'final';
  if (phase.includes('recovery')) return 'recovery';
  return 'wave';
}

export function phasePosition(phase: SessionPhase): string {
  switch (phase) {
    case 'readiness':
      return 'Setup';
    case 'warmup':
      return '1 of 8';
    case 'wave_1':
      return 'Wave 1 of 3';
    case 'recovery_1':
      return 'Recovery 1 of 3';
    case 'wave_2':
      return 'Wave 2 of 3';
    case 'recovery_2':
      return 'Recovery 2 of 3';
    case 'final_wave':
      return 'Wave 3 of 3';
    case 'final_recovery':
      return 'Recovery 3 of 3';
    case 'debrief':
      return 'Complete';
  }
}

export function phaseAccent(phase: SessionPhase): string {
  switch (phaseTone(phase)) {
    case 'wave':
      return '#ffb86b';
    case 'recovery':
      return '#5eead4';
    case 'final':
      return '#facc15';
    case 'warmup':
      return '#93c5fd';
    default:
      return 'var(--color-accent-gold)';
  }
}
