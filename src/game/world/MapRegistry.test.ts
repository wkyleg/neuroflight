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
    expect(
      ocean.worldLandmarkLayers?.some(
        (layer) => layer.label === 'lighthouse' && layer.placementKind === 'island' && layer.islandBase?.radius,
      ),
    ).toBe(true);
  });

  it('keeps ships in the water instead of on island bases', () => {
    const ocean = getMap('ocean_islands');
    const cruise = ocean.worldLandmarkLayers?.find((layer) => layer.label === 'cruise ship');
    const shipwreck = ocean.worldLandmarkLayers?.find((layer) => layer.label === 'shipwreck');
    const dock = ocean.worldLandmarkLayers?.find((layer) => layer.label === 'dock island');

    expect(cruise?.placementKind).toBe('waterline');
    expect(cruise?.islandBase).toBeUndefined();
    expect(shipwreck?.placementKind).toBe('waterline');
    expect(shipwreck?.islandBase).toBeUndefined();
    expect(shipwreck?.placements?.every((placement) => placement.placementKind === 'waterline')).toBe(true);
    expect(dock?.placementKind).toBe('island');
    expect(dock?.islandBase).toBeDefined();
  });

  it('adds seeded moving sea traffic for Stormglass open water', () => {
    const ocean = getMap('ocean_islands');
    expect(ocean.seaTraffic?.vessels.map((vessel) => vessel.type)).toEqual(['sailboat', 'cargo', 'cruise']);
    expect(ocean.seaTraffic?.vessels.every((vessel) => vessel.wake && vessel.speedRange[1] > 0)).toBe(true);
  });

  it('authors hero landmarks near mission route set pieces', () => {
    const desert = getMap('desert_expanse');
    const ocean = getMap('ocean_islands');
    expect(desert.worldLandmarkLayers?.some((layer) => layer.label === 'stone arch' && layer.placements?.length)).toBe(
      true,
    );
    expect(ocean.worldLandmarkLayers?.some((layer) => layer.label === 'shipwreck' && layer.placements?.length)).toBe(
      true,
    );
  });

  it('uses distant ocean mist curtains instead of near falling rain streaks', () => {
    const ocean = getMap('ocean_islands');
    expect(ocean.atmosphere?.rainCount).toBe(0);
    expect(ocean.weatherIdentity?.billboardLayers.some((layer) => layer.texturePath.includes('rain-streak'))).toBe(
      false,
    );
  });

  it('keeps balloon assets upright in static and living sky configs', () => {
    for (const map of MAPS) {
      const staticBalloons = map.skyObjectLayers?.filter((layer) => layer.behavior === 'balloon') ?? [];
      const livingBalloons = map.livingWorld?.events.filter((event) => event.behavior === 'balloon-hover') ?? [];
      expect(staticBalloons.every((layer) => layer.maintainUpright && layer.faceVelocity === false)).toBe(true);
      expect(livingBalloons.every((event) => event.maintainUpright && event.faceVelocity === false)).toBe(true);
      expect(
        [...staticBalloons, ...livingBalloons].every((entry) => entry.orientationPreset?.startsWith('balloon')),
      ).toBe(true);
    }
  });

  it('marks moving sky traffic to face its path', () => {
    for (const map of MAPS) {
      const movingStatic =
        map.skyObjectLayers?.filter((layer) => ['airship', 'bird', 'traffic'].includes(layer.behavior ?? '')) ?? [];
      const movingEvents =
        map.livingWorld?.events.filter((event) =>
          ['airship-pass', 'plane-pass', 'bird-pass', 'ufo-dart'].includes(event.behavior),
        ) ?? [];
      expect([...movingStatic, ...movingEvents].every((entry) => entry.faceVelocity !== false)).toBe(true);
    }
  });
});
