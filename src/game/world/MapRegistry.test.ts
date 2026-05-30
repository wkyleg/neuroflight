import { describe, expect, it } from 'vitest';
import { getMap, MAPS } from './MapRegistry.ts';

describe('MapRegistry', () => {
  it('MAPS is non-empty', () => {
    expect(MAPS.length).toBeGreaterThan(0);
  });

  it('getMap() returns a valid map config for a known id', () => {
    const map = getMap('ocean_islands');
    expect(map.id).toBe('ocean_islands');
    expect(map.name).toBe('Stormglass Archipelago');
  });

  it('every map has playerSpawn, environmentPresetId, and mission routes', () => {
    for (const m of MAPS) {
      expect(Array.isArray(m.playerSpawn)).toBe(true);
      expect(m.playerSpawn.length).toBe(3);
      expect(typeof m.environmentPresetId).toBe('string');
      expect(m.environmentPresetId.length).toBeGreaterThan(0);
      expect(m.missionRoutes?.zen.length).toBeGreaterThan(0);
      expect(m.missionRoutes?.expedition.length).toBeGreaterThan(0);
      expect(m.missionRoutes?.dogfight.length).toBeGreaterThan(0);
    }
  });

  it('marks at least one large scatter layer per map as crash-relevant', () => {
    for (const m of MAPS) {
      const collidableLayers = m.scatterLayers.filter((layer) => layer.collision);
      expect(collidableLayers.length).toBeGreaterThan(0);
      expect(collidableLayers.every((layer) => layer.collision?.minScale && layer.collision.minScale > 0)).toBe(true);
    }
  });

  it('keeps Stormglass island composition tropical and lighthouse grounded', () => {
    const ocean = getMap('ocean_islands');
    expect(ocean.scatterLayers.some((layer) => layer.type === 'pine_tree')).toBe(false);
    expect(ocean.scatterLayers.some((layer) => layer.type === 'palm_tree' && layer.scaleRange[0] >= 18)).toBe(true);
    expect(ocean.worldLandmarkLayers?.some((layer) => layer.label === 'lighthouse' && layer.islandBase?.radius)).toBe(
      true,
    );
  });
});
