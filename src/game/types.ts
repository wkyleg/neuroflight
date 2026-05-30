import type * as THREE from 'three';

export interface PlaneState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;

  speed: number;
  throttle: number;

  pitchInput: number;
  rollInput: number;
  yawInput: number;
}

export interface AircraftDefinition {
  id: string;
  name: string;
  era: 'ww1' | 'ww2' | 'coldwar' | 'modern' | 'experimental' | 'scifi';
  modelPath: string;
  scale: number;
  modelRotationY: number;
  modelRotationX?: number;

  tuning: {
    minSpeed: number;
    maxSpeed: number;
    acceleration: number;
    drag: number;
    pitchRate: number;
    rollRate: number;
    yawRate: number;
    liftFactor: number;
    stability: number;
    autoLevelStrength: number;
    stallSpeed?: number;
  };

  camera: {
    chaseDistance: number;
    chaseHeight: number;
    lookAhead: number;
    fov: number;
  };
}

export type ProceduralAssetType =
  | 'rock'
  | 'pine_tree'
  | 'palm_tree'
  | 'building'
  | 'cactus'
  | 'tower'
  | 'mesa'
  | 'sand_dune'
  | 'ruins'
  | 'wreck'
  | 'sailboat'
  | 'cargo_ship'
  | 'whale'
  | 'buoy'
  | 'lighthouse';

export interface ScatterLayerConfig {
  type: ProceduralAssetType;
  count: number;
  radius: number;
  minDistance: number;
  scaleRange: [number, number];
  yOffset?: number;
}

export interface GroundPlaneConfig {
  color: number;
  size: number;
  opacity?: number;
  emissive?: number;
  emissiveIntensity?: number;
}

export interface LandmarkConfig {
  assetPath: string;
  position: [number, number, number];
  scale: number;
  rotationY?: number;
}

export type MissionWaypointKind = 'ring' | 'landmark' | 'low_pass' | 'climb' | 'postcard' | 'combat_anchor';

export interface MissionWaypointConfig {
  id: string;
  label: string;
  description: string;
  kind: MissionWaypointKind;
  position: [number, number, number];
  radius?: number;
  score?: number;
  color?: number;
}

export interface MapMissionRoutes {
  zen: MissionWaypointConfig[];
  expedition: MissionWaypointConfig[];
  dogfight: MissionWaypointConfig[];
}

export interface SkyObjectLayerConfig {
  assetPath: string;
  count: number;
  radius: number;
  minDistance?: number;
  altitudeRange: [number, number];
  /** Target max model dimension in world units after source GLB normalization. */
  scaleRange: [number, number];
  driftSpeedRange?: [number, number];
  rotationSpeedRange?: [number, number];
}

export interface AtmosphereVfxConfig {
  radius: number;
  hazeTexturePath: string;
  hazeCount: number;
  hazeColor: number;
  hazeOpacityRange: [number, number];
  hazeScaleRange: [number, number];
  hazeAltitudeRange: [number, number];
  hazeDriftSpeed: number;
  rainTexturePath?: string;
  rainCount: number;
  rainColor: number;
  rainOpacityRange: [number, number];
  rainScaleRange: [number, number];
  rainAltitudeRange: [number, number];
  rainFallSpeed: number;
  rainDriftSpeed: number;
  lightning?: boolean;
  lightningTexturePath: string;
  lightningColor: number;
}

export interface WorldLandmarkLayerConfig {
  assetPath: string;
  count: number;
  radius: number;
  minDistance?: number;
  altitudeRange: [number, number];
  /** Target max model dimension in world units after source GLB normalization. */
  scaleRange: [number, number];
  driftSpeedRange?: [number, number];
  rotationSpeedRange?: [number, number];
  groundY?: number;
  faceCenter?: boolean;
}

export interface WeatherBillboardLayerConfig {
  texturePath: string;
  count: number;
  radius: number;
  altitudeRange: [number, number];
  widthRange: [number, number];
  heightRange?: [number, number];
  opacityRange: [number, number];
  color: number;
  driftSpeedRange?: [number, number];
  fallSpeedRange?: [number, number];
  rotationRange?: [number, number];
  additive?: boolean;
  renderOrder?: number;
}

export interface WeatherIdentityConfig {
  billboardLayers: WeatherBillboardLayerConfig[];
  lightning?: {
    texturePath: string;
    color: number;
    distanceRange: [number, number];
    altitudeRange: [number, number];
    scaleRange: [number, number];
    intervalRange: [number, number];
    intensity?: number;
  };
}

export interface CombatVfxConfig {
  muzzleTexturePath: string;
  hitTexturePath: string;
  explosionTexturePath: string;
  smokeTexturePath: string;
  tracerColor: number;
  aiTracerColor: number;
}

export interface AudioPolishClip {
  path: string;
  volume?: number;
  rateRange?: [number, number];
}

export interface AudioPolishConfig {
  ambientLoops?: AudioPolishClip[];
  weaponOneShots?: AudioPolishClip[];
  impactOneShots?: AudioPolishClip[];
  explosionOneShots?: AudioPolishClip[];
  uiOneShots?: AudioPolishClip[];
}

export interface MapDefinition {
  id: string;
  name: string;
  description: string;
  storyName?: string;
  storyDescription?: string;
  storyTagline?: string;
  missionRoutes?: MapMissionRoutes;
  environmentPresetId: string;
  playerSpawn: [number, number, number];
  scatterLayers: ScatterLayerConfig[];
  skyObjectLayers?: SkyObjectLayerConfig[];
  atmosphere?: AtmosphereVfxConfig;
  worldLandmarkLayers?: WorldLandmarkLayerConfig[];
  weatherIdentity?: WeatherIdentityConfig;
  combatVfx?: CombatVfxConfig;
  audioPolish?: AudioPolishConfig;
  landmarks?: LandmarkConfig[];
  groundPlane?: GroundPlaneConfig;
  ringBehavior: 'aheadPath' | 'arena';
}

export type GameMode = 'zen' | 'free' | 'dogfight';
