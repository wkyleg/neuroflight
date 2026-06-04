import { describe, expect, it } from 'vitest';
import type { NeuroState } from '@/neuro/neuroManager.ts';
import { DEFAULT_RPPG_SIGNAL_SNAPSHOT } from '@/neuro/rppgSignalTypes.ts';
import { NeuroAdaptationSystem } from './NeuroAdaptationSystem.ts';

const neuroState: NeuroState = {
  source: 'rppg',
  calm: 0.92,
  arousal: 0.2,
  bpm: 72,
  bpmQuality: 1,
  signalQuality: 1,
  eegConnected: false,
  cameraActive: true,
  alphaPower: null,
  betaPower: null,
  thetaPower: null,
  deltaPower: null,
  gammaPower: null,
  alphaBump: false,
  hrvRmssd: null,
  respirationRate: null,
  baselineBpm: null,
  baselineDelta: null,
  calmnessState: null,
  alphaPeakFreq: null,
  alphaBumpState: null,
  rppgSignal: DEFAULT_RPPG_SIGNAL_SNAPSHOT,
};

describe('NeuroAdaptationSystem', () => {
  it('keeps physiology out of fairness outputs while preserving ambient outputs', () => {
    const system = new NeuroAdaptationSystem();

    for (let i = 0; i < 120; i++) {
      system.update(1 / 60, neuroState, 'zen', 0.6, 0.8);
    }

    const snapshot = system.getSnapshot();
    expect(snapshot.scoreMultiplier).toBe(1);
    expect(snapshot.aimAssist).toBe(1);
    expect(snapshot.weatherClarity).toBeLessThan(1);
    expect(snapshot.audioIntensity).toBeGreaterThan(0);
  });
});
