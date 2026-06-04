import type { GameMode } from '@/game/types.ts';
import type { SessionPhase } from './sessionTypes.ts';

export const SESSION_PHASE_DURATIONS_MS: Record<Exclude<SessionPhase, 'debrief'>, number> = {
  readiness: 30_000,
  warmup: 45_000,
  wave_1: 75_000,
  recovery_1: 30_000,
  wave_2: 75_000,
  recovery_2: 30_000,
  final_wave: 90_000,
  final_recovery: 45_000,
};

export type SessionPhaseIntensity = 'readiness' | 'warmup' | 'wave' | 'recovery' | 'final';

export interface ModePhaseConfig {
  intensity: SessionPhaseIntensity;
  prompt: string;
}

const SHARED_PHASE_CONFIG: Record<SessionPhase, ModePhaseConfig> = {
  readiness: { intensity: 'readiness', prompt: 'Camera optional. Behavior-only is ready.' },
  warmup: { intensity: 'warmup', prompt: 'Warmup. Settle into smooth turns.' },
  wave_1: { intensity: 'wave', prompt: 'Wave 1. Fly the route with steady control.' },
  recovery_1: { intensity: 'recovery', prompt: 'Recovery phase. Ease your breathing and hold a steady line.' },
  wave_2: { intensity: 'wave', prompt: 'Wave 2. Keep your line smooth as pace builds.' },
  recovery_2: { intensity: 'recovery', prompt: 'Recovery phase. Widen your turns and settle your rhythm.' },
  final_wave: { intensity: 'final', prompt: 'Final wave. Stay accurate through the closing run.' },
  final_recovery: { intensity: 'recovery', prompt: 'Final recovery. Settle your rhythm before the debrief.' },
  debrief: { intensity: 'final', prompt: 'Debrief ready.' },
};

export const MODE_PHASE_CONFIG: Record<GameMode, Record<SessionPhase, ModePhaseConfig>> = {
  zen: SHARED_PHASE_CONFIG,
  free: SHARED_PHASE_CONFIG,
  dogfight: {
    ...SHARED_PHASE_CONFIG,
    warmup: { intensity: 'warmup', prompt: 'Warmup. Find the patrol lane before pressure begins.' },
    wave_1: { intensity: 'wave', prompt: 'Wave 1. Track the rival and keep smooth turns.' },
    wave_2: { intensity: 'wave', prompt: 'Wave 2. Stay with the rival without overcorrecting.' },
    final_wave: { intensity: 'final', prompt: 'Final wave. Finish the duel with steady aim.' },
  },
};
