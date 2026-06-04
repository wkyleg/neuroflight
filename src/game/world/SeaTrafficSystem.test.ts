import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { SeaTrafficConfig } from '@/game/types.ts';
import { SeaTrafficSystem } from './SeaTrafficSystem.ts';

const config: SeaTrafficConfig = {
  seed: 12,
  waterY: 0,
  vessels: [
    {
      id: 'test-sailboats',
      type: 'sailboat',
      count: 2,
      radius: 1000,
      minDistance: 100,
      scaleRange: [10, 10],
      speedRange: [5, 5],
      wake: true,
    },
    {
      id: 'test-cargo',
      type: 'cargo',
      count: 1,
      radius: 1000,
      minDistance: 100,
      scaleRange: [20, 20],
      speedRange: [3, 3],
      wake: true,
    },
  ],
};

describe('SeaTrafficSystem', () => {
  it('spawns moving vessels with waterline speed', () => {
    const scene = new THREE.Scene();
    const system = new SeaTrafficSystem(scene, config);
    const before = system.getDebugSnapshot();

    expect(before).toHaveLength(3);
    expect(before.every((actor) => actor.speed > 0)).toBe(true);

    system.update(1, new THREE.Vector3());
    const after = system.getDebugSnapshot();
    expect(after.some((actor, index) => actor.position[0] !== before[index].position[0])).toBe(true);

    system.destroy();
    expect(scene.children).toHaveLength(0);
  });
});
