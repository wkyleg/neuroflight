import { beforeEach, describe, expect, it } from 'vitest';
import { ScoreManager } from './ScoreManager.ts';

describe('ScoreManager', () => {
  let scores: ScoreManager;

  beforeEach(() => {
    scores = new ScoreManager();
  });

  it('starts at zero score, rings, and elapsed time', () => {
    expect(scores.getScore()).toBe(0);
    expect(scores.getRingsPassed()).toBe(0);
    expect(scores.getCombo()).toBe(0);
    expect(scores.getBestCombo()).toBe(0);
    expect(scores.getElapsedMs()).toBe(0);
    expect(scores.getAverageSpeed()).toBe(0);
  });

  it('addRing() increments rings, score, and combo; tracks average speed', () => {
    scores.addRing(50);
    expect(scores.getRingsPassed()).toBe(1);
    expect(scores.getCombo()).toBe(1);
    expect(scores.getScore()).toBe(100);
    expect(scores.getAverageSpeed()).toBe(50);

    scores.addRing(70);
    expect(scores.getRingsPassed()).toBe(2);
    expect(scores.getCombo()).toBe(2);
    expect(scores.getAverageSpeed()).toBe(60);
  });

  it('applies combo multiplier every third ring', () => {
    scores.addRing(0);
    scores.addRing(0);
    expect(scores.getScore()).toBe(200);
    scores.addRing(0);
    expect(scores.getCombo()).toBe(3);
    expect(scores.getScore()).toBe(350);
  });

  it('breakCombo() resets combo without clearing rings or score', () => {
    scores.addRing(10);
    scores.addRing(20);
    scores.breakCombo();
    expect(scores.getCombo()).toBe(0);
    expect(scores.getRingsPassed()).toBe(2);
    expect(scores.getBestCombo()).toBe(2);
    scores.addRing(30);
    expect(scores.getCombo()).toBe(1);
  });

  it('reset() clears all tracked state', () => {
    scores.addRing(40);
    scores.update(1);
    scores.reset();
    expect(scores.getScore()).toBe(0);
    expect(scores.getRingsPassed()).toBe(0);
    expect(scores.getCombo()).toBe(0);
    expect(scores.getBestCombo()).toBe(0);
    expect(scores.getElapsedMs()).toBe(0);
    expect(scores.getAverageSpeed()).toBe(0);
  });

  it('getElapsedMs() accumulates from update(dt) in seconds', () => {
    scores.update(0.5);
    scores.update(0.25);
    expect(scores.getElapsedMs()).toBe(750);
  });
});
