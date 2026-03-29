import type { MapDefinition } from '@/game/types.ts';

export const MAPS: MapDefinition[] = [
  {
    id: 'desert_expanse',
    name: 'Desert Expanse',
    description: 'Vast sunbaked desert dotted with mesas, ruins, and outposts. Fly low and fast.',
    environmentPresetId: 'nevada',
    playerSpawn: [0, 150, 500],
    scatterLayers: [
      { type: 'rock', count: 250, radius: 8000, minDistance: 50, scaleRange: [6, 30] },
      { type: 'cactus', count: 100, radius: 7000, minDistance: 35, scaleRange: [5, 16] },
      { type: 'building', count: 18, radius: 5000, minDistance: 300, scaleRange: [8, 20] },
      { type: 'tower', count: 8, radius: 5000, minDistance: 500, scaleRange: [10, 18] },
      { type: 'mesa', count: 10, radius: 7000, minDistance: 700, scaleRange: [35, 80] },
      { type: 'sand_dune', count: 40, radius: 8000, minDistance: 250, scaleRange: [18, 45] },
      { type: 'ruins', count: 6, radius: 5000, minDistance: 600, scaleRange: [10, 20] },
      { type: 'wreck', count: 5, radius: 6000, minDistance: 700, scaleRange: [6, 12] },
    ],
    groundPlane: {
      color: 0xc8a96e,
      size: 22000,
    },
    ringBehavior: 'aheadPath',
  },
  {
    id: 'ocean_islands',
    name: 'Ocean Islands',
    description: 'Tropical archipelago with boats, lighthouses, and marine life. Circle the islands and explore.',
    environmentPresetId: 'clearSky',
    playerSpawn: [0, 250, 400],
    scatterLayers: [
      { type: 'rock', count: 45, radius: 7000, minDistance: 100, scaleRange: [15, 50] },
      { type: 'palm_tree', count: 65, radius: 6000, minDistance: 28, scaleRange: [7, 18] },
      { type: 'pine_tree', count: 45, radius: 6000, minDistance: 32, scaleRange: [9, 22] },
      { type: 'sailboat', count: 18, radius: 7000, minDistance: 250, scaleRange: [4, 10] },
      { type: 'cargo_ship', count: 5, radius: 8000, minDistance: 900, scaleRange: [14, 22] },
      { type: 'whale', count: 6, radius: 7000, minDistance: 600, scaleRange: [10, 18] },
      { type: 'buoy', count: 20, radius: 7000, minDistance: 180, scaleRange: [3, 6] },
      { type: 'lighthouse', count: 4, radius: 5000, minDistance: 1200, scaleRange: [12, 16] },
    ],
    groundPlane: {
      color: 0x1478aa,
      size: 22000,
      opacity: 1.0,
      emissive: 0x0a5580,
      emissiveIntensity: 0.3,
    },
    ringBehavior: 'arena',
  },
];

export function getMap(id: string): MapDefinition {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}
