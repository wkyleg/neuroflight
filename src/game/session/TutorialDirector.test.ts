import { describe, expect, it } from 'vitest';
import { TutorialDirector, type TutorialProgressInput } from './TutorialDirector.ts';

function input(overrides: Partial<TutorialProgressInput> = {}): TutorialProgressInput {
  return {
    dtMs: 100,
    pitch: 0,
    roll: 0,
    throttle: 0.6,
    speed: 120,
    ringsPassed: 0,
    shotsFired: 0,
    shotsHit: 0,
    kills: 0,
    rivalDistance: null,
    ...overrides,
  };
}

describe('TutorialDirector', () => {
  it('starts at controls and advances only after sustained pitch and roll', () => {
    const director = new TutorialDirector();

    expect(director.snapshot().id).toBe('controls');
    director.update(input({ pitch: 0.5, roll: 0 }));
    expect(director.snapshot().id).toBe('controls');

    for (let i = 0; i < 20; i++) {
      director.update(input({ pitch: 0.5, roll: -0.5 }));
    }

    expect(director.snapshot().id).toBe('throttle');
  });

  it('advances through gates and fire from real counters', () => {
    const director = new TutorialDirector();
    for (let i = 0; i < 20; i++) director.update(input({ pitch: 0.5, roll: 0.5 }));
    director.update(input({ throttle: 0.9, speed: 145 }));

    expect(director.snapshot().id).toBe('gates');
    director.update(input({ throttle: 0.9, speed: 145, ringsPassed: 1 }));
    expect(director.snapshot().id).toBe('gates');
    director.update(input({ throttle: 0.9, speed: 145, ringsPassed: 2 }));
    expect(director.snapshot().id).toBe('fire');

    director.update(input({ throttle: 0.9, speed: 145, ringsPassed: 2, shotsFired: 3 }));
    expect(director.snapshot().id).toBe('dogfight_intro');
  });

  it('requires dogfight contact before free practice', () => {
    const director = new TutorialDirector();
    for (let i = 0; i < 20; i++) director.update(input({ pitch: 0.5, roll: 0.5 }));
    director.update(input({ throttle: 0.9, speed: 145 }));
    director.update(input({ throttle: 0.9, speed: 145, ringsPassed: 2 }));
    director.update(input({ throttle: 0.9, speed: 145, ringsPassed: 2, shotsFired: 3 }));

    director.update(input({ throttle: 0.9, speed: 145, ringsPassed: 2, shotsFired: 3, rivalDistance: 500 }));
    expect(director.snapshot().id).toBe('dogfight_intro');

    director.update(
      input({ throttle: 0.9, speed: 145, ringsPassed: 2, shotsFired: 3, shotsHit: 1, rivalDistance: 500 }),
    );
    expect(director.snapshot()).toMatchObject({ id: 'free_practice', completed: true });
  });
});
