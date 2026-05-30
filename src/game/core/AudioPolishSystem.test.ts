import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPolishSystem } from './AudioPolishSystem.ts';

describe('AudioPolishSystem music preferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults music on and persists toggles', () => {
    const system = new AudioPolishSystem({
      musicLoops: [{ path: '/assets/audio/music-jingles-preview-01.ogg', volume: 0.2 }],
    });

    expect(system.isMusicEnabled()).toBe(true);
    expect(system.toggleMusic()).toBe(false);
    expect(window.localStorage.getItem('neuroflight.audio.musicEnabled')).toBe('false');

    const restored = new AudioPolishSystem({
      musicLoops: [{ path: '/assets/audio/music-jingles-preview-01.ogg', volume: 0.2 }],
    });
    expect(restored.isMusicEnabled()).toBe(false);

    system.destroy();
    restored.destroy();
  });
});
