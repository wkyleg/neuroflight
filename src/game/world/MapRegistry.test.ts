import { describe, expect, it } from 'vitest';
import { getMap, MAPS } from './MapRegistry.ts';

describe('MapRegistry', () => {
  it('MAPS is non-empty', () => {
    expect(MAPS.length).toBeGreaterThan(0);
  });

  it('getMap() returns a valid map config for a known id', () => {
    const map = getMap('ocean_islands');
    expect(map.id).toBe('ocean_islands');
    expect(map.name).toBe('Ocean Islands');
  });

  it('every map has playerSpawn and environmentPresetId', () => {
    for (const m of MAPS) {
      expect(Array.isArray(m.playerSpawn)).toBe(true);
      expect(m.playerSpawn.length).toBe(3);
      expect(typeof m.environmentPresetId).toBe('string');
      expect(m.environmentPresetId.length).toBeGreaterThan(0);
    }
  });
});
