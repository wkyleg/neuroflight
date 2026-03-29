import { describe, expect, it } from 'vitest';
import {
  asChannelMajor,
  averageBands,
  computeBandPowersFallback,
  computeChunkBands,
  extractBandsFromWasmResult,
} from './eegUtils';

describe('averageBands', () => {
  it('returns null for empty input', () => {
    expect(averageBands([])).toBeNull();
  });

  it('averages multiple channel band structs', () => {
    const a = averageBands([
      { delta: 2, theta: 4, alpha: 6, beta: 8, gamma: 10 },
      { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
    ]);
    expect(a).toEqual({
      delta: 1,
      theta: 2,
      alpha: 3,
      beta: 4,
      gamma: 5,
    });
  });
});

describe('extractBandsFromWasmResult', () => {
  it('reads numeric fields and defaults bad values to 0', () => {
    expect(
      extractBandsFromWasmResult({
        delta: 1.5,
        theta: NaN,
        alpha: 'x',
        beta: Infinity,
        gamma: -2,
      }),
    ).toEqual({
      delta: 1.5,
      theta: 0,
      alpha: 0,
      beta: 0,
      gamma: -2,
    });
  });

  it('returns zeros for missing keys', () => {
    expect(extractBandsFromWasmResult({})).toEqual({
      delta: 0,
      theta: 0,
      alpha: 0,
      beta: 0,
      gamma: 0,
    });
  });
});

describe('computeBandPowersFallback', () => {
  it('returns zero bands for empty samples', () => {
    expect(computeBandPowersFallback([], 256)).toEqual({
      delta: 0,
      theta: 0,
      alpha: 0,
      beta: 0,
      gamma: 0,
    });
  });

  it('produces non-negative bands for a short sine at known rate', () => {
    const n = 64;
    const sr = 128;
    const samples = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 10 * i) / sr));
    const bands = computeBandPowersFallback(samples, sr);
    expect(bands.delta).toBeGreaterThanOrEqual(0);
    expect(bands.theta).toBeGreaterThanOrEqual(0);
    expect(bands.alpha).toBeGreaterThanOrEqual(0);
    expect(bands.beta).toBeGreaterThanOrEqual(0);
    expect(bands.gamma).toBeGreaterThanOrEqual(0);
    const sum = bands.delta + bands.theta + bands.alpha + bands.beta + bands.gamma;
    expect(sum).toBeGreaterThan(0);
  });
});

describe('asChannelMajor', () => {
  it('returns [] for non-array or empty', () => {
    expect(asChannelMajor([])).toEqual([]);
    expect(asChannelMajor(null as unknown as number[][])).toEqual([]);
  });

  it('transposes when inner length matches expectedChannels', () => {
    // sample-major: 2 samples x 2 channels
    const sampleMajor = [
      [1, 2],
      [3, 4],
    ];
    const ch = asChannelMajor(sampleMajor, 2);
    expect(ch).toHaveLength(2);
    expect(ch[0]).toEqual([1, 3]);
    expect(ch[1]).toEqual([2, 4]);
  });

  it('returns data unchanged when outer length matches expectedChannels', () => {
    const channelMajor = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    expect(asChannelMajor(channelMajor, 2)).toBe(channelMajor);
  });

  it('infers sample-major when inner is small and outer is larger', () => {
    const rows = 5;
    const cols = 2;
    const sampleMajor = Array.from({ length: rows }, (_, s) => Array.from({ length: cols }, (_, c) => s * 10 + c));
    const ch = asChannelMajor(sampleMajor);
    expect(ch).toHaveLength(cols);
    expect(ch[0]).toEqual([0, 10, 20, 30, 40]);
    expect(ch[1]).toEqual([1, 11, 21, 31, 41]);
  });
});

describe('computeChunkBands', () => {
  it('returns null when no channels', () => {
    expect(computeChunkBands([], 256)).toBeNull();
  });

  it('filters empty channel arrays and averages the rest', () => {
    const bands = computeChunkBands([[1, 0, -1, 0], [], [0, 1, 0, -1]], 32);
    expect(bands).not.toBeNull();
    expect(bands?.delta).toBeGreaterThanOrEqual(0);
  });
});
