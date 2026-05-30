import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { getAircraft } from './AircraftRegistry.ts';
import { AIController } from './AIController.ts';

describe('AIController', () => {
  it('honors attack warmup before firing at the player', () => {
    const ai = new AIController(getAircraft('spitfire'), new THREE.Vector3(0, 180, 0));
    ai.setAttackWarmup(0.8);

    ai.update(0.1, new THREE.Vector3(0, 180, -220));
    expect(ai.consumeFire()).toBe(false);

    for (let i = 0; i < 12; i++) {
      ai.update(0.1, new THREE.Vector3(0, 180, -220));
    }

    expect(ai.consumeFire()).toBe(true);
  });

  it('applies difficulty to movement speed', () => {
    const slow = new AIController(getAircraft('spitfire'), new THREE.Vector3(0, 180, 0));
    const fast = new AIController(getAircraft('spitfire'), new THREE.Vector3(0, 180, 0));
    slow.setDifficulty({ speedMultiplier: 0.7, turnRateMultiplier: 1, fireCooldownMultiplier: 1, attackRangeMultiplier: 1 });
    fast.setDifficulty({ speedMultiplier: 1.3, turnRateMultiplier: 1, fireCooldownMultiplier: 1, attackRangeMultiplier: 1 });

    const target = new THREE.Vector3(0, 180, -1000);
    slow.update(0.5, target);
    fast.update(0.5, target);

    expect(Math.abs(fast.getPosition().z)).toBeGreaterThan(Math.abs(slow.getPosition().z));
  });
});
