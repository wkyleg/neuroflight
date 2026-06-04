import { describe, expect, it } from 'vitest';
import { TutorialDirector } from './TutorialDirector.ts';

describe('TutorialDirector', () => {
  it('starts with basic controls and advances by elapsed practice time', () => {
    const director = new TutorialDirector();

    expect(director.snapshot(0)).toMatchObject({
      id: 'controls',
      title: 'Controls',
      nextTitle: 'Throttle',
    });
    expect(director.snapshot(39_000)).toMatchObject({
      id: 'gates',
      title: 'Gates',
      nextTitle: 'Route Cues',
    });
  });

  it('holds free practice open after the guided stages', () => {
    const director = new TutorialDirector();
    const snapshot = director.snapshot(260_000);

    expect(snapshot.id).toBe('free_practice');
    expect(snapshot.progress).toBe(1);
    expect(snapshot.nextTitle).toBeNull();
  });
});
