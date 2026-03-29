import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLogs: vi.fn(() => []),
    clear: vi.fn(),
    download: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(),
    setDebugEnabled: vi.fn(),
  },
}));

import { AutomatedBCISimulator, BCI_PRESETS, MockBCIProvider } from './bciMock';

describe('BCI_PRESETS', () => {
  it('keeps calm and arousal in 0..1', () => {
    for (const key of Object.keys(BCI_PRESETS) as (keyof typeof BCI_PRESETS)[]) {
      const { calm, arousal } = BCI_PRESETS[key];
      expect(calm).toBeGreaterThanOrEqual(0);
      expect(calm).toBeLessThanOrEqual(1);
      expect(arousal).toBeGreaterThanOrEqual(0);
      expect(arousal).toBeLessThanOrEqual(1);
    }
  });
});

describe('MockBCIProvider', () => {
  let provider: MockBCIProvider;

  beforeEach(() => {
    provider = new MockBCIProvider();
  });

  it('init connects; destroy disconnects', () => {
    expect(provider.isConnected()).toBe(false);
    provider.init();
    expect(provider.isConnected()).toBe(true);
    provider.destroy();
    expect(provider.isConnected()).toBe(false);
  });

  it('does not move state when disconnected', () => {
    provider.setNoiseEnabled(false);
    provider.setCalm(1);
    provider.setArousal(0);
    provider.update(1);
    expect(provider.getCurrentCalm()).toBe(0.5);
    expect(provider.getCurrentArousal()).toBe(0.5);
  });

  it('lerps toward targets with noise off', () => {
    provider.init();
    provider.setNoiseEnabled(false);
    provider.setCalm(1);
    provider.setArousal(0);
    provider.update(10);
    expect(provider.getCurrentCalm()).toBeCloseTo(1, 5);
    expect(provider.getCurrentArousal()).toBeCloseTo(0, 5);
  });

  it('clamps setCalm and setArousal', () => {
    provider.setCalm(-1);
    provider.setArousal(2);
    provider.init();
    provider.setNoiseEnabled(false);
    provider.update(10);
    expect(provider.getCurrentCalm()).toBeCloseTo(0, 5);
    expect(provider.getCurrentArousal()).toBeCloseTo(1, 5);
  });

  it('applyPreset sets targets', () => {
    provider.init();
    provider.setNoiseEnabled(false);
    provider.applyPreset('MEDITATION');
    provider.update(10);
    expect(provider.getCurrentCalm()).toBeCloseTo(BCI_PRESETS.MEDITATION.calm, 5);
    expect(provider.getCurrentArousal()).toBeCloseTo(BCI_PRESETS.MEDITATION.arousal, 5);
  });

  it('clamps noise amplitude to 0..1', () => {
    provider.setNoiseAmplitude(99);
    expect(() => provider.update(0)).not.toThrow();
  });

  it('enforces minimum smoothing time constant', () => {
    provider.setSmoothingTimeConstant(0.001);
    provider.init();
    provider.setNoiseEnabled(false);
    provider.setCalm(1);
    provider.update(0.05);
    expect(provider.getCurrentCalm()).toBeGreaterThan(0.5);
    expect(provider.getCurrentCalm()).toBeLessThan(1);
  });

  it('reset restores defaults', () => {
    provider.init();
    provider.setCalm(0.2);
    provider.setArousal(0.9);
    provider.update(1);
    provider.reset();
    expect(provider.getCurrentCalm()).toBe(0.5);
    expect(provider.getCurrentArousal()).toBe(0.5);
  });

  it('setConnected controls update eligibility without init', () => {
    provider.setConnected(true);
    provider.setNoiseEnabled(false);
    provider.setCalm(1);
    provider.update(5);
    expect(provider.getCurrentCalm()).toBeCloseTo(1, 5);
  });
});

describe('AutomatedBCISimulator', () => {
  it('reset clears progression so sine pattern restarts at t=0 targets', () => {
    const provider = new MockBCIProvider();
    provider.init();
    provider.setNoiseEnabled(false);
    const sim = new AutomatedBCISimulator(provider);
    sim.setPattern('sine');
    sim.update(3);
    provider.update(3);
    expect(provider.getCurrentCalm()).not.toBeCloseTo(0.5, 2);
    sim.reset();
    provider.reset();
    sim.update(0);
    provider.update(10);
    expect(provider.getCurrentCalm()).toBeCloseTo(0.5, 5);
  });

  it('preset-cycle advances presets as time grows', () => {
    const provider = new MockBCIProvider();
    provider.init();
    provider.setNoiseEnabled(false);
    const sim = new AutomatedBCISimulator(provider);
    sim.setPattern('preset-cycle');
    sim.update(0);
    provider.update(10);
    const calm0 = provider.getCurrentCalm();
    sim.update(5.1);
    provider.update(10);
    const calm1 = provider.getCurrentCalm();
    expect(calm1).not.toBe(calm0);
  });
});
