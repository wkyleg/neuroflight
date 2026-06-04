import { describe, expect, it } from 'vitest';
import type { NeuroState } from '@/neuro/neuroManager.ts';
import { DEFAULT_RPPG_SIGNAL_SNAPSHOT } from '@/neuro/rppgSignalTypes.ts';
import {
  computeAmbientBiostateBias,
  type NeuroAdaptationSnapshot,
  NeuroAdaptationSystem,
} from './NeuroAdaptationSystem.ts';

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

  it('keeps ambient biostate bias signal-gated and tightly bounded', () => {
    const base: NeuroAdaptationSnapshot = {
      composure: 1,
      load: 0,
      recovery: 1,
      flow: 1,
      confidence: 1,
      coverage: 1,
      scoreMultiplier: 1,
      aimAssist: 1,
      weatherClarity: 1,
      audioIntensity: 0.5,
      prompt: 'Adaptive ambience',
    };

    expect(computeAmbientBiostateBias(base)).toBeCloseTo(0.09);
    expect(computeAmbientBiostateBias({ ...base, composure: 0 })).toBeCloseTo(-0.09);
    expect(computeAmbientBiostateBias({ ...base, confidence: 0 })).toBe(0);
    expect(computeAmbientBiostateBias({ ...base, coverage: 0 })).toBe(0);
  });
});
