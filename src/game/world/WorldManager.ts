import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { FlightObstacle } from '@/game/gameplay/FlightSafetySystem.ts';
import type { MapDefinition } from '@/game/types.ts';
import { buildScatterLayers, type ScatterResult } from './ProceduralWorld.ts';

export class WorldManager {
  private scatterResult: ScatterResult | null = null;
  private groundMesh: THREE.Mesh | null = null;
  private landmarkObjects: THREE.Object3D[] = [];
  private gltfLoader = new GLTFLoader();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  loadMap(map: MapDefinition): void {
    this.clear();

    if (map.groundPlane) {
      this.createGroundPlane(map.groundPlane);
    }

    if (map.scatterLayers.length > 0) {
      try {
        this.scatterResult = buildScatterLayers(this.scene, map.scatterLayers);
      } catch (err) {
        console.error('[WorldManager] buildScatterLayers failed:', err);
      }
    }

    if (map.landmarks && map.landmarks.length > 0) {
      for (const lm of map.landmarks) {
        this.gltfLoader.load(
          lm.assetPath,
          (gltf) => {
            const obj = gltf.scene;
            obj.scale.setScalar(lm.scale);
            obj.position.set(...lm.position);
            if (lm.rotationY) obj.rotation.y = lm.rotationY;
            this.scene.add(obj);
            this.landmarkObjects.push(obj);
          },
          undefined,
          (err) => console.warn(`Failed to load landmark ${lm.assetPath}`, err),
        );
      }
    }
  }

  private createGroundPlane(config: {
    color: number;
    size: number;
    opacity?: number;
    emissive?: number;
    emissiveIntensity?: number;
  }): void {
    const geo = new THREE.PlaneGeometry(config.size, config.size);
    const mat = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.9,
      metalness: 0.0,
      transparent: (config.opacity ?? 1) < 1,
      opacity: config.opacity ?? 1,
      emissive: config.emissive ?? config.color,
      emissiveIntensity: config.emissiveIntensity ?? 0.16,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    mat.toneMapped = false;
    this.groundMesh = new THREE.Mesh(geo, mat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  clear(): void {
    if (this.scatterResult) {
      this.scatterResult.dispose();
      this.scatterResult = null;
    }

    for (const obj of this.landmarkObjects) {
      this.scene.remove(obj);
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    }
    this.landmarkObjects = [];

    if (this.groundMesh) {
      this.scene.remove(this.groundMesh);
      this.groundMesh.geometry.dispose();
      (this.groundMesh.material as THREE.Material).dispose();
      this.groundMesh = null;
    }
  }

  getCollisionVolumes(): FlightObstacle[] {
    return this.scatterResult?.collisionVolumes ?? [];
  }

  destroy(): void {
    this.clear();
  }
}
