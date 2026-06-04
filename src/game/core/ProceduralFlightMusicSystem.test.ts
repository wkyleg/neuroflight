import { beforeEach, describe, expect, it } from 'vitest';
import {
  BINAURAL_ENABLED_KEY,
  createSeededMusicProfile,
  getModeMusicProfile,
  ProceduralFlightMusicSystem,
} from './ProceduralFlightMusicSystem.ts';

describe('ProceduralFlightMusicSystem', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists the master sound toggle without requiring Tone to boot in tests', () => {
    const system = new ProceduralFlightMusicSystem('zen');

    expect(system.isMusicEnabled()).toBe(true);
    expect(system.toggleSound()).toBe(false);
    expect(window.localStorage.getItem('neuroflight.audio.masterEnabled')).toBe('false');
    expect(window.localStorage.getItem('neuroflight.audio.musicEnabled')).toBe('false');

    const restored = new ProceduralFlightMusicSystem('dogfight');
    expect(restored.isMusicEnabled()).toBe(false);

    system.destroy();
    restored.destroy();
  });

  it('uses tonal friendly mode palettes instead of atonal random notes', () => {
    const zen = getModeMusicProfile('zen');
    const expedition = getModeMusicProfile('free');
    const dogfight = getModeMusicProfile('dogfight');

    expect(zen.scale).toEqual(['D', 'E', 'F#', 'G#', 'A', 'B', 'C#']);
    expect(expedition.chords.every((chord) => chord.length >= 4)).toBe(true);
    expect(dogfight.pulsePattern.filter(Boolean).length).toBeGreaterThan(zen.pulsePattern.filter(Boolean).length);
  });

  it('creates deterministic seeded pleasant profile variation', () => {
    const a = createSeededMusicProfile('zen', 'desert:biplane');
    const b = createSeededMusicProfile('zen', 'desert:biplane');

    expect(a.scale).toEqual(b.scale);
    expect(a.chords).toEqual(b.chords);
    expect(a.scale.every((note) => /^[A-G]#?$/.test(note))).toBe(true);
  });

  it('persists the optional binaural layer toggle', () => {
    const system = new ProceduralFlightMusicSystem('zen');

    expect(system.isBinauralEnabled()).toBe(true);
    system.setBinauralEnabled(false);

    expect(window.localStorage.getItem(BINAURAL_ENABLED_KEY)).toBe('false');
    expect(new ProceduralFlightMusicSystem('free').isBinauralEnabled()).toBe(false);
  });
});
