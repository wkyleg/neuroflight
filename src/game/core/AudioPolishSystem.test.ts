import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPolishSystem } from './AudioPolishSystem.ts';

describe('AudioPolishSystem', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps ambient and one-shot polish separate from procedural music', () => {
    const system = new AudioPolishSystem({
      ambientLoops: [{ path: '/assets/audio/engine-low-01.ogg', volume: 0.02 }],
      uiOneShots: [{ path: '/assets/audio/radio-switch-01.ogg', volume: 0.05 }],
    });

    system.destroy();
    expect(window.localStorage.getItem('neuroflight.audio.musicEnabled')).toBeNull();
  });
});
