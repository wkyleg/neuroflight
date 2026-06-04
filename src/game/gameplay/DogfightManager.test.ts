import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eventBus } from '@/game/core/EventBus.ts';
import { DogfightManager } from './DogfightManager.ts';

describe('DogfightManager', () => {
  let dogfight: DogfightManager;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dogfight = new DogfightManager();
    emitSpy = vi.spyOn(eventBus, 'emit').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with player and AI at full health', () => {
    const s = dogfight.getState();
    expect(s.playerHealth).toBe(100);
    expect(s.aiHealth).toBe(100);
  });

  it('applyDamage("ai") reduces AI health and counts hits', () => {
    dogfight.applyDamage('ai');
    expect(dogfight.getState().aiHealth).toBe(75);
    expect(dogfight.getState().shotsHit).toBe(1);
    expect(emitSpy).toHaveBeenCalledWith('dogfight:ai_hit');
  });

  it('applyDamage("player") reduces player health', () => {
    dogfight.applyDamage('player');
    expect(dogfight.getState().playerHealth).toBe(90);
    expect(emitSpy).toHaveBeenCalledWith('dogfight:player_hit');
  });

  it('AI death sets respawn timer and revives after update consumes delay', () => {
    for (let i = 0; i < 4; i++) dogfight.applyDamage('ai');
    expect(dogfight.getState().kills).toBe(1);
    expect(dogfight.isAiDead()).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith('dogfight:ai_kill');

    dogfight.update(2.0);
    expect(dogfight.isAiDead()).toBe(false);
    expect(dogfight.getState().aiHealth).toBe(100);
  });

  it('player death increments deaths and restores health immediately', () => {
    for (let i = 0; i < 10; i++) dogfight.applyDamage('player');
    const s = dogfight.getState();
    expect(s.deaths).toBe(1);
    expect(s.playerHealth).toBe(100);
    expect(emitSpy).toHaveBeenCalledWith('dogfight:player_death');
  });

  it('player crashes count as losses', () => {
    dogfight.recordPlayerCrash();
    const s = dogfight.getState();
    expect(s.deaths).toBe(1);
    expect(s.playerHealth).toBe(100);
    expect(emitSpy).toHaveBeenCalledWith('dogfight:player_death');
  });

  it('rival crashes count as wins and trigger respawn', () => {
    dogfight.recordRivalCrash();
    const s = dogfight.getState();
    expect(s.kills).toBe(1);
    expect(s.aiHealth).toBe(0);
    expect(dogfight.isAiDead()).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith('dogfight:ai_kill');
  });

  it('reset() restores health and counters', () => {
    dogfight.applyDamage('ai');
    dogfight.recordPlayerShot();
    dogfight.reset();
    const s = dogfight.getState();
    expect(s.playerHealth).toBe(100);
    expect(s.aiHealth).toBe(100);
    expect(s.shotsFired).toBe(0);
    expect(s.shotsHit).toBe(0);
    expect(s.kills).toBe(0);
    expect(s.deaths).toBe(0);
  });

  it('recordPlayerShot() increments shots fired without affecting hits', () => {
    dogfight.recordPlayerShot();
    dogfight.recordPlayerShot();
    expect(dogfight.getState().shotsFired).toBe(2);
    expect(dogfight.getState().shotsHit).toBe(0);
  });
});
