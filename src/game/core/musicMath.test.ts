import { describe, expect, it } from 'vitest';
import { euclideanRhythm, lockTempoToHeartRate, makeLcg, selectScale } from './musicMath.ts';

describe('musicMath', () => {
  it('locks low and high heart rates into a musical transport range', () => {
    expect(lockTempoToHeartRate(48, 1).transportBpm).toBe(96);
    expect(lockTempoToHeartRate(155, 1).transportBpm).toBeCloseTo(116.25, 2);
  });

  it('builds stable euclidean rhythms', () => {
    expect(euclideanRhythm(3, 8)).toEqual([0, 0, 1, 0, 0, 1, 0, 1]);
    expect(euclideanRhythm(0, 4)).toEqual([0, 0, 0, 0]);
  });

  it('produces deterministic seeded randomness', () => {
    const a = makeLcg('desert:biplane');
    const b = makeLcg('desert:biplane');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('selects only curated pleasant scales', () => {
    const selected = selectScale('ocean:spitfire', 'dogfight');
    expect(selected.name).not.toMatch(/whole|chromatic|maqam|raga|serial/i);
    expect(selected.intervals.every((interval) => interval >= 0 && interval <= 11)).toBe(true);
  });
});
