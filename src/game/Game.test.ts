import { describe, expect, it } from 'vitest';
import { shouldStartCanvasFire } from './Game.ts';

describe('shouldStartCanvasFire', () => {
  it('only starts dogfight fire from primary clicks on the flight canvas', () => {
    const canvas = document.createElement('canvas');
    const hudButton = document.createElement('button');

    expect(shouldStartCanvasFire({ button: 0, target: canvas }, canvas, 'dogfight')).toBe(true);
    expect(shouldStartCanvasFire({ button: 0, target: hudButton }, canvas, 'dogfight')).toBe(false);
    expect(shouldStartCanvasFire({ button: 2, target: canvas }, canvas, 'dogfight')).toBe(false);
    expect(shouldStartCanvasFire({ button: 0, target: canvas }, canvas, 'zen')).toBe(false);
    expect(shouldStartCanvasFire({ button: 0, target: canvas }, canvas, 'free')).toBe(false);
  });
});
