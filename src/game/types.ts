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
  displayRole?: 'default' | 'exploration' | 'speed' | 'novelty' | 'dev';
  handlingLabel?: string;
  difficulty?: 'gentle' | 'standard' | 'ace';
  available?: boolean;
  previewImage?: string;
  modelFormat?: 'gltf' | 'obj';
  modelPath: string;
  texturePath?: string;
  orientationPreset?: 'obj-z-forward' | 'obj-x-forward' | 'gltf-z-forward' | 'gltf-x-forward' | 'gltf-recon-level';
  scale: number;
  modelRotationY: number;
  modelRotationX?: number;
  modelRotationZ?: number;
  modelOffset?: [number, number, number];
  propellerBlur?: {
    offset: [number, number, number];
    radius: number;
    axis?: 'x' | 'y' | 'z';
    color?: number;
    opacity?: number;
  };
  /** Target max model dimension in world units after source model normalization. */
  targetVisualSize?: number;
  /** Hint for cameras/collision/debug views around unusually wide source models. */
  cameraSafeRadius?: number;

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
  collision?: {
    radiusMultiplier: number;
    minScale: number;
    label?: string;
  };
}

export interface GroundPlaneConfig {
  color: number;
  size: number;
  opacity?: number;
  emissive?: number;
  emissiveIntensity?: number;
  textureStyle?: 'sand-ripples' | 'water-foam';
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

export type SkyOrientationPreset =
  | 'native'
  | 'x-forward'
  | 'negative-x-forward'
  | 'z-forward'
  | 'balloon-upright'
  | 'balloon-z-up';

export interface SkyObjectLayerConfig {
  assetPath: string;
  count: number;
  radius: number;
  minDistance?: number;
  altitudeRange: [number, number];
  /** Target max model dimension in world units after source GLB normalization. */
  scaleRange: [number, number];
  behavior?: 'balloon' | 'airship' | 'cloud' | 'bird' | 'floating-island' | 'traffic' | 'ufo';
  orientationPreset?: SkyOrientationPreset;
  maintainUpright?: boolean;
  faceVelocity?: boolean;
  rotationOffset?: [number, number, number];
  bobAmplitude?: number;
  driftSpeedRange?: [number, number];
  rotationSpeedRange?: [number, number];
}

export type LivingWorldBehavior =
  | 'balloon-hover'
  | 'airship-pass'
  | 'plane-pass'
  | 'bird-pass'
  | 'ufo-dart'
  | 'kite-drift';

export interface LivingWorldEventConfig {
  id: string;
  label: string;
  assetPath: string;
  behavior: LivingWorldBehavior;
  weight: number;
  chance?: number;
  maxActive?: number;
  countRange: [number, number];
  radiusRange: [number, number];
  altitudeRange: [number, number];
  /** Target max model dimension in world units after source GLB normalization. */
  scaleRange: [number, number];
  speedRange?: [number, number];
  durationRange?: [number, number];
  orientationPreset?: SkyOrientationPreset;
  maintainUpright?: boolean;
  faceVelocity?: boolean;
  rotationOffset?: [number, number, number];
}

export interface LivingWorldConfig {
  seed?: number;
  eventIntervalRange: [number, number];
  events: LivingWorldEventConfig[];
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

export interface CloudLayerProfileConfig {
  id: string;
  count: number;
  band: 'low' | 'mid' | 'high';
  radius?: number;
  minDistance?: number;
  altitudeRange: [number, number];
  scaleRange: [number, number];
  widthMultiplierRange?: [number, number];
  heightMultiplierRange?: [number, number];
  opacityRange: [number, number];
  driftSpeedRange: [number, number];
  color?: number;
}

export interface CloudProfileConfig {
  seed?: number;
  texturePath?: string;
  cullDistance?: number;
  respawnRadius?: number;
  layers: CloudLayerProfileConfig[];
}

export type WorldLandmarkPlacementKind = 'island' | 'shoreline' | 'waterline' | 'floating';

export interface WorldLandmarkLayerConfig {
  label?: string;
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
  collisionRadius?: number;
  placementKind?: WorldLandmarkPlacementKind;
  islandBase?: {
    radius: number;
    height?: number;
    color?: number;
    flatten?: number;
  };
  placements?: Array<{
    position: [number, number, number];
    targetSize?: number;
    rotationY?: number;
    collisionRadius?: number;
    placementKind?: WorldLandmarkPlacementKind;
    islandBase?: {
      radius: number;
      height?: number;
      color?: number;
      flatten?: number;
    };
  }>;
}

export interface SeaTrafficVesselConfig {
  id: string;
  label?: string;
  type: 'sailboat' | 'cargo' | 'cruise';
  count: number;
  radius: number;
  minDistance?: number;
  scaleRange: [number, number];
  speedRange: [number, number];
  wake?: boolean;
}

export interface SeaTrafficConfig {
  seed?: number;
  waterY?: number;
  vessels: SeaTrafficVesselConfig[];
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
  musicLoops?: AudioPolishClip[];
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
  cloudProfile?: CloudProfileConfig;
  skyObjectLayers?: SkyObjectLayerConfig[];
  atmosphere?: AtmosphereVfxConfig;
  worldLandmarkLayers?: WorldLandmarkLayerConfig[];
  livingWorld?: LivingWorldConfig;
  seaTraffic?: SeaTrafficConfig;
  weatherIdentity?: WeatherIdentityConfig;
  combatVfx?: CombatVfxConfig;
  audioPolish?: AudioPolishConfig;
  landmarks?: LandmarkConfig[];
  groundPlane?: GroundPlaneConfig;
  ringBehavior: 'aheadPath' | 'arena';
}

export type GameMode = 'zen' | 'free' | 'dogfight';

export type GameDifficulty = 'rookie' | 'pilot' | 'ace';
