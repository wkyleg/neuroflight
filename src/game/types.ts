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

export interface MapDefinition {
  id: string;
  name: string;
  description: string;
  environmentPresetId: string;
  playerSpawn: [number, number, number];
  scatterLayers: ScatterLayerConfig[];
  landmarks?: LandmarkConfig[];
  groundPlane?: GroundPlaneConfig;
  ringBehavior: 'aheadPath' | 'arena';
}

export type GameMode = 'zen' | 'free' | 'dogfight';
