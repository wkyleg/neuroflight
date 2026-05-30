import { describe, expect, it } from 'vitest';
import {
  AIRCRAFT,
  DEFAULT_AIRCRAFT_ID,
  getAircraft,
  getAvailableAircraft,
  getNextAircraftId,
} from './AircraftRegistry.ts';

describe('AircraftRegistry', () => {
  it('defaults to the available storybook flyer', () => {
    const plane = getAircraft(DEFAULT_AIRCRAFT_ID);
    expect(plane.id).toBe('storybook_biplane');
    expect(plane.available).toBe(true);
    expect(plane.modelFormat).toBe('obj');
    expect(plane.targetVisualSize).toBeGreaterThan(0);
  });

  it('getAircraft("spitfire") returns the Spitfire definition', () => {
    const plane = getAircraft('spitfire');
    expect(plane.id).toBe('spitfire');
    expect(plane.name).toBe('Spitfire');
  });

  it('getNextAircraftId() cycles through the catalog', () => {
    const available = getAvailableAircraft();
    const first = available[0].id;
    const second = getNextAircraftId(first);
    expect(second).toBe(available[1].id);
    const last = available[available.length - 1].id;
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
      if (a.available !== false) {
        expect(a.modelPath).toMatch(/^\/assets\//);
      }
    }
  });
});
