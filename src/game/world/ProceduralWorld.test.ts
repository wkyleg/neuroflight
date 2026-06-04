import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { ScatterLayerConfig } from '@/game/types.ts';
import { buildScatterLayers } from './ProceduralWorld.ts';

describe('buildScatterLayers', () => {
  it('creates collision volumes for large configured scatter assets', () => {
    const scene = new THREE.Scene();
    const layers: ScatterLayerConfig[] = [
      {
        type: 'building',
        count: 4,
        radius: 500,
        minDistance: 50,
        scaleRange: [18, 18],
        collision: { radiusMultiplier: 1.4, minScale: 10, label: 'building' },
      },
    ];

    const result = buildScatterLayers(scene, layers, 12);

    expect(result.collisionVolumes.length).toBeGreaterThan(0);
    expect(result.collisionVolumes[0].label).toBe('building');
    expect(result.collisionVolumes[0].radius).toBeGreaterThan(18);
    expect(scene.children.length).toBeGreaterThan(0);

    result.dispose();
    expect(scene.children.length).toBe(0);
  });

  it('keeps undersized configured scatter forgiving', () => {
    const scene = new THREE.Scene();
    const layers: ScatterLayerConfig[] = [
      {
        type: 'rock',
        count: 4,
        radius: 500,
        minDistance: 50,
        scaleRange: [8, 8],
        collision: { radiusMultiplier: 1, minScale: 20, label: 'small rock' },
      },
    ];

    const result = buildScatterLayers(scene, layers, 14);

    expect(result.collisionVolumes).toHaveLength(0);

    result.dispose();
  });
});
