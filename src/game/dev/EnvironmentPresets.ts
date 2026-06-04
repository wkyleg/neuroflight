import * as THREE from 'three';
import type { SkyConfig } from '@/game/world/SkySystem.ts';

export interface EnvironmentPreset {
  id: string;
  name: string;
  sky: SkyConfig;
}

export const PRESETS: EnvironmentPreset[] = [
  {
    id: 'clearSky',
    name: 'Clear Day',
    sky: {
      topColor: new THREE.Color(0x3377cc),
      bottomColor: new THREE.Color(0x99ccee),
      sunColor: new THREE.Color(0xfff8f0),
      sunDirection: new THREE.Vector3(0.4, 0.55, -0.3).normalize(),
      sunIntensity: 1.5,
      ambientIntensity: 1.0,
      fogColor: new THREE.Color(0x88bbdd),
      fogNear: 12000,
      fogFar: 50000,
      useAtmosphericSky: true,
      turbidity: 2,
      rayleigh: 1,
    },
  },
  {
    id: 'tropical',
    name: 'Tropical Bright',
    sky: {
      topColor: new THREE.Color(0x2d8fe6),
      bottomColor: new THREE.Color(0xc9f7ff),
      sunColor: new THREE.Color(0xfffbdd),
      sunDirection: new THREE.Vector3(0.42, 0.68, -0.22).normalize(),
      sunIntensity: 1.85,
      ambientIntensity: 1.12,
      fogColor: new THREE.Color(0xa8ddec),
      fogNear: 12000,
      fogFar: 42000,
      fogDensity: 0.000025,
      useAtmosphericSky: true,
      turbidity: 2.5,
      rayleigh: 0.82,
    },
  },
  {
    id: 'nevada',
    name: 'Nevada Desert',
    sky: {
      topColor: new THREE.Color(0x438fd2),
      bottomColor: new THREE.Color(0xffd6a6),
      sunColor: new THREE.Color(0xfff0c8),
      sunDirection: new THREE.Vector3(0.5, 0.65, -0.2).normalize(),
      sunIntensity: 1.9,
      ambientIntensity: 1.08,
      fogColor: new THREE.Color(0xd9b978),
      fogNear: 9000,
      fogFar: 32000,
      fogDensity: 0.000034,
      useAtmosphericSky: true,
      turbidity: 3.2,
      rayleigh: 0.62,
    },
  },
  {
    id: 'cloudSea',
    name: 'Cloud Sea (Golden Hour)',
    sky: {
      topColor: new THREE.Color(0x1a2a5e),
      bottomColor: new THREE.Color(0xe89055),
      sunColor: new THREE.Color(0xffd8a0),
      sunDirection: new THREE.Vector3(0.5, 0.4, -0.5).normalize(),
      sunIntensity: 1.5,
      ambientIntensity: 0.8,
      fogColor: new THREE.Color(0x99aabb),
      fogNear: 5000,
      fogFar: 20000,
      useAtmosphericSky: true,
      turbidity: 2,
      rayleigh: 1,
    },
  },
  {
    id: 'highAtmosphere',
    name: 'High Atmosphere',
    sky: {
      topColor: new THREE.Color(0x000033),
      bottomColor: new THREE.Color(0x2244aa),
      sunColor: new THREE.Color(0xffffff),
      sunDirection: new THREE.Vector3(0.2, 0.8, -0.3).normalize(),
      sunIntensity: 1.5,
      ambientIntensity: 0.3,
      fogColor: new THREE.Color(0x334477),
      fogNear: 2000,
      fogFar: 20000,
      useAtmosphericSky: true,
      turbidity: 0.5,
      rayleigh: 2,
    },
  },
  {
    id: 'storm',
    name: 'Storm Layer',
    sky: {
      topColor: new THREE.Color(0x222222),
      bottomColor: new THREE.Color(0x445544),
      sunColor: new THREE.Color(0xccccbb),
      sunDirection: new THREE.Vector3(-0.3, 0.1, 0.5).normalize(),
      sunIntensity: 0.8,
      ambientIntensity: 0.4,
      fogColor: new THREE.Color(0x556655),
      fogNear: 1000,
      fogFar: 8000,
      useAtmosphericSky: false,
    },
  },
  {
    id: 'aether',
    name: 'Aether Field',
    sky: {
      topColor: new THREE.Color(0x220044),
      bottomColor: new THREE.Color(0x6644aa),
      sunColor: new THREE.Color(0xddbbff),
      sunDirection: new THREE.Vector3(0.0, 0.6, -0.4).normalize(),
      sunIntensity: 1.8,
      ambientIntensity: 0.7,
      fogColor: new THREE.Color(0x553388),
      fogNear: 1500,
      fogFar: 15000,
      useAtmosphericSky: false,
    },
  },
  {
    id: 'nightCity',
    name: 'Night City',
    sky: {
      topColor: new THREE.Color(0x000011),
      bottomColor: new THREE.Color(0x0a0a1e),
      sunColor: new THREE.Color(0x8888ff),
      sunDirection: new THREE.Vector3(-0.2, -0.1, 0.5).normalize(),
      sunIntensity: 0.3,
      ambientIntensity: 0.2,
      fogColor: new THREE.Color(0x0a0a18),
      fogNear: 800,
      fogFar: 10000,
      useAtmosphericSky: false,
    },
  },
];

export function getPreset(id: string): EnvironmentPreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

export function getNextPresetId(currentId: string): string {
  const idx = PRESETS.findIndex((p) => p.id === currentId);
  return PRESETS[(idx + 1) % PRESETS.length].id;
}
