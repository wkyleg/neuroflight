import type { RppgAppSnapshot } from '@elata-biosciences/rppg-web';
import { describe, expect, it } from 'vitest';
import { RppgSignalGate } from './rppgSignalGate.ts';

function snapshot(overrides: Partial<RppgAppSnapshot> = {}): RppgAppSnapshot {
  return {
    status: 'running',
    ready: false,
    canPublish: false,
    publishBpm: null,
    message: '',
    guidance: { code: 'finding_pulse', message: '' },
    metrics: {},
    diagnostics: null,
    trace: { samples: [] },
    normalizedError: null,
    sessionState: null,
    managedState: null,
    gating: { state: 'waiting', canPublish: false, reasons: [], guidance: { code: 'finding_pulse', message: '' } },
    debug: {
      backendMode: 'wasm',
      faceTrackingMode: 'video_frame',
      issues: [],
      processorFailure: null,
      retryCount: 0,
      nextRetryAtMs: null,
      totalSamplesReceived: 0,
      windowSampleCount: 0,
      estimationAvailable: true,
      gatingState: 'waiting',
      gatingReasons: [],
    },
    ...overrides,
  } as RppgAppSnapshot;
}

describe('RppgSignalGate', () => {
  it('surfaces permission-needed when camera access is blocked', () => {
    const gate = new RppgSignalGate();
    const result = gate.update(1000, null, { cameraActive: false, cameraError: 'Camera permission denied' });

    expect(result.status).toBe('permission_needed');
    expect(result.displayBpm).toBeNull();
  });

  it('requires stable publishable signal before showing BPM', () => {
    const gate = new RppgSignalGate();
    let result = gate.update(1000, snapshot({ canPublish: true, publishBpm: 72 }), {
      cameraActive: true,
      nowMs: 1000,
    });
    expect(result.status).toBe('warming');
    expect(result.displayBpm).toBeNull();

    for (let i = 2; i <= 6; i++) {
      result = gate.update(1000, snapshot({ canPublish: true, publishBpm: 74 }), {
        cameraActive: true,
        nowMs: i * 1000,
      });
    }

    expect(result.status).toBe('ready');
    expect(result.displayBpm).toBe(74);
    expect(result.bpmFresh).toBe(true);
  });

  it('suppresses BPM when the app snapshot cannot publish', () => {
    const gate = new RppgSignalGate();
    const result = gate.update(1000, snapshot({ canPublish: false, publishBpm: 80 }), {
      cameraActive: true,
      nowMs: 1000,
    });

    expect(result.status).toBe('warming');
    expect(result.canPublish).toBe(false);
    expect(result.displayBpm).toBeNull();
  });

  it('turns backend failure into failed behavior-only messaging', () => {
    const gate = new RppgSignalGate();
    const result = gate.update(
      1000,
      snapshot({
        debug: {
          ...snapshot().debug,
          backendMode: 'unavailable',
          issues: ['backend_unavailable'],
        },
      }),
      { cameraActive: true, nowMs: 1000 },
    );

    expect(result.status).toBe('failed');
    expect(result.backendUnavailable).toBe(true);
    expect(result.userMessage).toContain('Biofeedback unavailable');
  });

  it('resolves no-publish sessions to behavior-only after the bounded timeout', () => {
    const gate = new RppgSignalGate();
    const result = gate.update(21_000, snapshot(), {
      cameraActive: true,
      activeMs: 21_000,
      nowMs: 21_000,
    });

    expect(result.status).toBe('behavior_only');
    expect(result.coverageLabel).toBe('behavior_only');
  });
});
