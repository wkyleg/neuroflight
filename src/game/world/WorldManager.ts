import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { FlightObstacle } from '@/game/gameplay/FlightSafetySystem.ts';
import type { GroundPlaneConfig, MapDefinition } from '@/game/types.ts';
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

  private createGroundPlane(config: GroundPlaneConfig): void {
    const geo = new THREE.PlaneGeometry(config.size, config.size);
    const texture = this.createGroundTexture(config);
    const mat = new THREE.MeshStandardMaterial({
      color: config.color,
      map: texture ?? null,
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
      const material = this.groundMesh.material as THREE.MeshStandardMaterial;
      material.map?.dispose();
      material.dispose();
      this.groundMesh = null;
    }
  }

  private createGroundTexture(config: GroundPlaneConfig): THREE.CanvasTexture | null {
    if (!config.textureStyle || typeof document === 'undefined') return null;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const base = new THREE.Color(config.color);
    ctx.fillStyle = `#${base.getHexString()}`;
    ctx.fillRect(0, 0, size, size);

    if (config.textureStyle === 'sand-ripples') {
      for (let i = 0; i < 36; i++) {
        const y = (i / 36) * size + Math.sin(i * 1.7) * 10;
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,236,178,0.16)' : 'rgba(142,85,34,0.11)';
        ctx.lineWidth = 2 + (i % 4);
        ctx.beginPath();
        for (let x = -20; x <= size + 20; x += 24) {
          const wave = Math.sin(x * 0.025 + i * 0.8) * 9;
          if (x === -20) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 42; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const w = 50 + Math.random() * 140;
        const h = 8 + Math.random() * 26;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, w);
        gradient.addColorStop(0, 'rgba(214,252,255,0.18)');
        gradient.addColorStop(0.52, 'rgba(214,252,255,0.08)');
        gradient.addColorStop(1, 'rgba(214,252,255,0)');
        ctx.fillStyle = gradient;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, h / w);
        ctx.beginPath();
        ctx.arc(0, 0, w, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(
      config.textureStyle === 'sand-ripples' ? 42 : 24,
      config.textureStyle === 'sand-ripples' ? 42 : 24,
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  getCollisionVolumes(): FlightObstacle[] {
    return this.scatterResult?.collisionVolumes ?? [];
  }

  destroy(): void {
    this.clear();
  }
}
