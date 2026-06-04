import { describe, expect, it } from 'vitest';
import { getBiofeedbackDisplayState } from './NeuroCockpit.tsx';

const baseInput = {
  source: 'none',
  cameraActive: false,
  eegConnected: false,
  mockEnabled: false,
  signalQuality: 0,
  bpmQuality: 0,
  cameraError: null,
};

describe('getBiofeedbackDisplayState', () => {
  it('treats no device as an optional flight-only state', () => {
    const state = getBiofeedbackDisplayState(baseInput);

    expect(state.state).toBe('none');
    expect(state.primaryLabel).toBe('OPTIONAL');
    expect(state.guidance).toBe('Signals optional');
    expect(state.showCameraMetrics).toBe(false);
    expect(state.showEegAdvanced).toBe(false);
  });

  it('surfaces camera permission failures without making sensors required', () => {
    const state = getBiofeedbackDisplayState({
      ...baseInput,
      cameraError: 'Camera permission denied - check browser settings',
    });

    expect(state.state).toBe('permission-denied');
    expect(state.primaryLabel).toBe('CAMERA BLOCKED');
    expect(state.guidance).toContain('Camera blocked');
    expect(state.detail).toContain('still fly');
  });

  it('uses a warming state for partial camera signal', () => {
    const state = getBiofeedbackDisplayState({
      ...baseInput,
      source: 'rppg',
      cameraActive: true,
      signalQuality: 0.42,
    });

    expect(state.state).toBe('warming');
    expect(state.primaryLabel).toBe('CAMERA');
    expect(state.showCameraMetrics).toBe(true);
  });

  it('uses a ready state for high-confidence camera signal', () => {
    const state = getBiofeedbackDisplayState({
      ...baseInput,
      source: 'rppg',
      cameraActive: true,
      signalQuality: 0.8,
    });

    expect(state.state).toBe('ready');
    expect(state.guidance).toBe('Signal ready');
    expect(state.tone).toBe('ready');
  });

  it('prioritizes simulated signals when mock mode is enabled', () => {
    const state = getBiofeedbackDisplayState({
      ...baseInput,
      source: 'mock',
      mockEnabled: true,
      signalQuality: 1,
    });

    expect(state.state).toBe('simulated');
    expect(state.primaryLabel).toBe('SIM');
    expect(state.showEegAdvanced).toBe(false);
  });

  it('keeps EEG in the advanced path when it is active', () => {
    const state = getBiofeedbackDisplayState({
      ...baseInput,
      source: 'eeg',
      eegConnected: true,
      signalQuality: 0.9,
    });

    expect(state.state).toBe('eeg-active');
    expect(state.primaryLabel).toBe('EEG');
    expect(state.showEegAdvanced).toBe(true);
    expect(state.showCameraMetrics).toBe(false);
  });
});
