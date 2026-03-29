import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FlightSample, SessionRecorder } from './SessionRecorder';

function samplePayload(overrides: Partial<Omit<FlightSample, 't'>> = {}): Omit<FlightSample, 't'> {
  return {
    speed: 1,
    altitude: 2,
    throttle: 0.5,
    heading: 90,
    calm: 0.5,
    arousal: 0.5,
    bpm: 70,
    hrv: 50,
    alpha: 0.1,
    beta: 0.2,
    theta: 0.3,
    delta: 0.4,
    gamma: 0.5,
    calmnessState: 'calm',
    respirationRate: 12,
    alphaPeakFreq: 10,
    score: 100,
    combo: 2,
    ringsPassed: 3,
    playerHealth: 80,
    aiHealth: 60,
    kills: 1,
    deaths: 0,
    ...overrides,
  };
}

describe('SessionRecorder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('start() begins recording', () => {
    const recorder = new SessionRecorder();
    recorder.sample(1, samplePayload());
    expect(recorder.stop().samples).toHaveLength(0);

    recorder.start();
    recorder.sample(1, samplePayload({ speed: 42 }));
    const { samples } = recorder.stop();
    expect(samples).toHaveLength(1);
    expect(samples[0].speed).toBe(42);
  });

  it('sample() records data points with correct structure after interval', () => {
    const recorder = new SessionRecorder();
    recorder.start();
    recorder.sample(0.5, samplePayload());
    expect(recorder.stop().samples).toHaveLength(0);

    recorder.start();
    recorder.sample(0.5, samplePayload());
    recorder.sample(0.5, samplePayload({ score: 7 }));
    const { samples } = recorder.stop();
    expect(samples).toHaveLength(1);
    const row = samples[0];
    expect(row).toMatchObject({
      t: 0,
      score: 7,
      speed: 1,
      combo: 2,
      bpm: 70,
      calmnessState: 'calm',
    });
    expect(typeof row.t).toBe('number');
  });

  it('recordEvent() adds timestamped events', () => {
    const recorder = new SessionRecorder();
    recorder.start();
    vi.advanceTimersByTime(2000);
    recorder.recordEvent('ring_hit');
    recorder.recordEvent('kill');
    const { events } = recorder.stop();
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ t: 2, type: 'ring_hit' });
    expect(events[1]).toEqual({ t: 2, type: 'kill' });
  });

  it('stop() returns collected samples and events', () => {
    const recorder = new SessionRecorder();
    recorder.start();
    recorder.sample(1, samplePayload({ kills: 5 }));
    recorder.recordEvent('shot_fired');
    const out = recorder.stop();
    expect(out.samples).toHaveLength(1);
    expect(out.events).toHaveLength(1);
    expect(out.samples[0].kills).toBe(5);
    expect(out.events[0].type).toBe('shot_fired');
  });

  it('reset() clears data', () => {
    const recorder = new SessionRecorder();
    recorder.start();
    recorder.sample(1, samplePayload());
    recorder.recordEvent('death');
    recorder.reset();
    const { samples, events } = recorder.stop();
    expect(samples).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it('ignores sample and recordEvent when not active', () => {
    const recorder = new SessionRecorder();
    recorder.sample(1, samplePayload());
    recorder.recordEvent('respawn');
    const { samples, events } = recorder.stop();
    expect(samples).toHaveLength(0);
    expect(events).toHaveLength(0);
  });
});
