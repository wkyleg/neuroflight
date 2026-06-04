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
  warmup: { intensity: 'warmup', prompt: 'Warmup - find a comfortable cruise. Training target: smooth hands.' },
  wave_1: {
    intensity: 'wave',
    prompt: 'Focus - fly through the bright gates. Training target: steady line, small corrections.',
  },
  recovery_1: {
    intensity: 'recovery',
    prompt: 'Recovery - ease off the controls. Breathe in for 4, out for 6, and let your pulse settle.',
  },
  wave_2: {
    intensity: 'wave',
    prompt: 'Focus - keep the route flowing. Training target: accurate turns without overcorrecting.',
  },
  recovery_2: {
    intensity: 'recovery',
    prompt: 'Recovery - widen your turns. Long exhale, loose shoulders, calm the cockpit.',
  },
  final_wave: {
    intensity: 'final',
    prompt: 'Final focus - finish the route cleanly. Training target: accuracy under pressure.',
  },
  final_recovery: {
    intensity: 'recovery',
    prompt: 'Final recovery - last one. Long, slow exhale. Settle before your debrief.',
  },
  debrief: { intensity: 'final', prompt: 'Debrief ready.' },
};

export const MODE_PHASE_CONFIG: Record<GameMode, Record<SessionPhase, ModePhaseConfig>> = {
  zen: {
    ...SHARED_PHASE_CONFIG,
    wave_1: {
      intensity: 'wave',
      prompt: 'Focus - fly through the bright gates. Training target: smooth turns and steady breathing.',
    },
    wave_2: {
      intensity: 'wave',
      prompt: 'Focus - keep the gate rhythm. Training target: precise, calm corrections.',
    },
    final_wave: {
      intensity: 'final',
      prompt: 'Final focus - finish the gate route cleanly. Training target: accuracy without rushing.',
    },
  },
  free: {
    ...SHARED_PHASE_CONFIG,
    wave_1: {
      intensity: 'wave',
      prompt: 'Focus - reach the lit beacon ahead. Training target: steady line to the landmark.',
    },
    wave_2: {
      intensity: 'wave',
      prompt: 'Focus - scan, choose the route, and hold course. Training target: engaged exploration.',
    },
    final_wave: {
      intensity: 'final',
      prompt: 'Final focus - complete the expedition leg. Training target: confident navigation.',
    },
  },
  dogfight: {
    ...SHARED_PHASE_CONFIG,
    warmup: {
      intensity: 'warmup',
      prompt: 'Warmup - find the patrol lane. Training target: calm setup before pressure.',
    },
    wave_1: {
      intensity: 'wave',
      prompt: 'Focus - keep the rival centered and fire when lined up. Training target: steady aim.',
    },
    wave_2: {
      intensity: 'wave',
      prompt: 'Focus - stay with the rival without overcorrecting. Training target: controlled pursuit.',
    },
    final_wave: {
      intensity: 'final',
      prompt: 'Final focus - finish the duel with steady aim. Training target: pressure control.',
    },
  },
};
