import { describe, expect, it } from 'vitest';
import { AIRCRAFT, getAircraft, getNextAircraftId } from './AircraftRegistry.ts';

describe('AircraftRegistry', () => {
  it('getAircraft("spitfire") returns the Spitfire definition', () => {
    const plane = getAircraft('spitfire');
    expect(plane.id).toBe('spitfire');
    expect(plane.name).toBe('Spitfire');
  });

  it('getNextAircraftId() cycles through the catalog', () => {
    const first = AIRCRAFT[0].id;
    const second = getNextAircraftId(first);
    expect(second).toBe(AIRCRAFT[1].id);
    const last = AIRCRAFT[AIRCRAFT.length - 1].id;
    expect(getNextAircraftId(last)).toBe(first);
  });

  it('every aircraft has name, scale, and tuning fields', () => {
    for (const a of AIRCRAFT) {
      expect(typeof a.name).toBe('string');
      expect(a.name.length).toBeGreaterThan(0);
      expect(typeof a.scale).toBe('number');
      expect(Number.isFinite(a.scale)).toBe(true);
      expect(a.tuning).toBeDefined();
      expect(typeof a.tuning.minSpeed).toBe('number');
      expect(typeof a.tuning.maxSpeed).toBe('number');
    }
  });
});
