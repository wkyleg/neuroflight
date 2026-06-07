import { describe, expect, it } from 'vitest';
import { SessionPhaseManager } from './SessionPhaseManager.ts';

describe('SessionPhaseManager', () => {
  it('starts in readiness and advances when readiness resolves', () => {
    const manager = new SessionPhaseManager({ durationsMs: { warmup: 1000 } });

    expect(manager.snapshot().phase).toBe('readiness');
    manager.resolveReadiness();
    const events = manager.tick(16);

    expect(manager.snapshot().phase).toBe('warmup');
    expect(events.map((event) => event.type)).toEqual(['phase_started', 'phase_completed', 'phase_started']);
  });

  it('advances through timed phases into debrief', () => {
    const manager = new SessionPhaseManager({
      durationsMs: {
        readiness: 1,
        warmup: 1,
        wave_1: 1,
        recovery_1: 1,
        wave_2: 1,
        recovery_2: 1,
        final_wave: 1,
        final_recovery: 1,
      },
    });

    for (let i = 0; i < 8; i++) manager.tick(1);

    const snapshot = manager.snapshot();
    expect(snapshot.phase).toBe('debrief');
    expect(snapshot.terminal).toBe(true);
  });

  it('reports recovery and wave helpers in snapshots', () => {
    const manager = new SessionPhaseManager({
      durationsMs: { readiness: 1, warmup: 1, wave_1: 10, recovery_1: 10 },
    });

    manager.tick(1);
    manager.tick(1);
    expect(manager.snapshot()).toMatchObject({ phase: 'wave_1', isWave: true, isRecovery: false });

    manager.tick(10);
    expect(manager.snapshot()).toMatchObject({ phase: 'recovery_1', isWave: false, isRecovery: true });
  });
});
