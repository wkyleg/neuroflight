import { beforeEach, describe, expect, it } from 'vitest';
import { getModeMusicProfile, ProceduralFlightMusicSystem } from './ProceduralFlightMusicSystem.ts';

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
});
