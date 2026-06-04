import { describe, expect, it } from 'vitest';
import { HeartTempoTracker } from './HeartTempoTracker.ts';

describe('HeartTempoTracker', () => {
  it('uses a rolling one-minute median as the primary tempo source', () => {
    const tracker = new HeartTempoTracker();
    tracker.addSample({ bpm: 78, confidence: 0.8, timestamp: 0 });
    tracker.addSample({ bpm: 110, confidence: 0.8, timestamp: 10 });
    tracker.addSample({ bpm: 90, confidence: 0.8, timestamp: 20 });

    expect(tracker.getMedianBpm('free', 30)).toBe(90);
    expect(tracker.getTargetTempo('free', 30)).toBeCloseTo(91.8, 1);
  });

  it('holds the last valid heart rate through later signal gaps', () => {
    const tracker = new HeartTempoTracker();
    tracker.addSample({ bpm: 101, confidence: 0.72, timestamp: 0 });
    tracker.addSample({ bpm: null, confidence: 0, timestamp: 75 });

    expect(tracker.getMedianBpm('dogfight', 75)).toBe(101);
    expect(tracker.getTargetTempo('dogfight', 75)).toBeCloseTo(109.08, 1);
  });

  it('subdivides unusually low heart rates into audible tempo', () => {
    const tracker = new HeartTempoTracker();
    tracker.addSample({ bpm: 44, confidence: 0.8, timestamp: 0 });

    expect(tracker.getTargetTempo('zen', 1)).toBeCloseTo(86.24, 1);
  });

  it('falls back to mode defaults only before any valid BPM appears', () => {
    const tracker = new HeartTempoTracker();
    tracker.addSample({ bpm: 118, confidence: 0.02, timestamp: 0 });

    expect(tracker.getMedianBpm('zen', 10)).toBe(82);
    expect(tracker.getMedianBpm('dogfight', 10)).toBe(112);
  });
});
