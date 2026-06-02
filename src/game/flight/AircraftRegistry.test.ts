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

  it('available aircraft declare explicit orientation metadata', () => {
    for (const aircraft of getAvailableAircraft()) {
      expect(aircraft.orientationPreset).toBeDefined();
      expect(Number.isFinite(aircraft.modelRotationY)).toBe(true);
      if (aircraft.modelRotationX !== undefined) expect(Number.isFinite(aircraft.modelRotationX)).toBe(true);
      if (aircraft.modelRotationZ !== undefined) expect(Number.isFinite(aircraft.modelRotationZ)).toBe(true);
    }
  });

  it('available aircraft expose player-facing handling identity', () => {
    for (const aircraft of getAvailableAircraft()) {
      expect(aircraft.handlingLabel).toBeTruthy();
      expect(aircraft.bestFor).toBeTruthy();
      expect(aircraft.strengths?.length).toBeGreaterThanOrEqual(2);
      expect(aircraft.audioProfile).toBeTruthy();
      expect(aircraft.statBars).toBeDefined();
      for (const value of Object.values(aircraft.statBars ?? {})) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(5);
      }
    }
  });

  it('keeps propeller blur only on propeller aircraft', () => {
    expect(getAircraft('storybook_biplane').propellerBlur).toBeDefined();
    expect(getAircraft('wright_flyer').propellerBlur).toBeDefined();
    expect(getAircraft('spitfire').propellerBlur).toBeDefined();
    expect(getAircraft('il28').propellerBlur).toBeUndefined();
  });

  it('defines distinct movement trail profiles for available aircraft', () => {
    expect(getAircraft('storybook_biplane').trailProfile?.kind).toBe('prop-wash');
    expect(getAircraft('wright_flyer').trailProfile?.kind).toBe('prop-wash');
    expect(getAircraft('spitfire').trailProfile?.kind).toBe('speed-line');
    expect(getAircraft('il28').trailProfile?.kind).toBe('jet-exhaust');
    for (const aircraft of getAvailableAircraft()) {
      expect(aircraft.trailProfile?.emissionRate).toBeGreaterThan(0);
      expect(aircraft.trailProfile?.offsets.length).toBeGreaterThan(0);
    }
  });

  it('corrects side-axis propeller planes to face the flight path', () => {
    const biplane = getAircraft('storybook_biplane');
    const wright = getAircraft('wright_flyer');
    const spitfire = getAircraft('spitfire');

    expect(biplane.orientationPreset).toBe('obj-x-forward');
    expect(biplane.modelRotationY).toBeCloseTo(-Math.PI / 2);
    expect(biplane.propellerBlur?.offset[2]).toBeLessThan(0);
    expect(biplane.trailProfile?.offsets.every((offset) => offset[2] > 0)).toBe(true);
    expect(wright.available).toBe(true);
    expect(wright.modelFormat).toBe('gltf');
    expect(wright.orientationPreset).toBe('gltf-z-forward');
    expect(wright.audioProfile).toBe('vintage-prop');
    expect(spitfire.orientationPreset).toBe('gltf-x-forward');
    expect(spitfire.modelRotationY).toBeCloseTo(Math.PI / 2);
  });

  it('levels the recon jet without the old nose-down compensation', () => {
    const recon = getAircraft('il28');
    expect(recon.orientationPreset).toBe('gltf-recon-level');
    expect(recon.modelRotationX).toBe(0);
    expect(recon.modelRotationZ).toBe(0);
  });
});
