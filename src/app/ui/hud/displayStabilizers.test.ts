import { describe, expect, it } from 'vitest';
import { nextStableNumber } from './displayStabilizers.ts';

describe('nextStableNumber', () => {
  it('eases toward normal value changes', () => {
    expect(nextStableNumber(100, 130, { maxStep: 80, smoothing: 0.5 })).toBe(115);
  });

  it('rejects one-frame implausible display jumps by clamping the step', () => {
    expect(nextStableNumber(100, 520, { maxStep: 55, smoothing: 0.5 })).toBe(155);
  });

  it('can animate score deltas without snapping to the final value', () => {
    expect(nextStableNumber(900, 1650, { maxStep: 140, smoothing: 0.42 })).toBe(1040);
  });

  it('can ease small throttle values without jumping the display', () => {
    expect(nextStableNumber(0.6, 1, { maxStep: 0.035, smoothing: 0.28, deadband: 0.006 })).toBeCloseTo(0.635);
  });
});
