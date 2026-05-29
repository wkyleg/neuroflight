import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { SkyObjectLayerConfig } from '@/game/types.ts';

interface SkyObjectInstance {
  object: THREE.Object3D;
  layer: SkyObjectLayerConfig;
  drift: THREE.Vector3;
  rotationSpeed: number;
  bobPhase: number;
  bobSpeed: number;
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export class SkyObjectSystem {
  private readonly loader = new GLTFLoader();
  private readonly rng = seededRng(1337);
  private readonly instances: SkyObjectInstance[] = [];
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async load(layers: SkyObjectLayerConfig[]): Promise<void> {
    await Promise.all(layers.map((layer) => this.loadLayer(layer)));
  }

  update(dt: number, cameraPos: THREE.Vector3): void {
    for (const instance of this.instances) {
      instance.object.position.addScaledVector(instance.drift, dt);
      instance.object.position.y +=
        Math.sin(performance.now() * 0.001 * instance.bobSpeed + instance.bobPhase) * dt * 1.5;
      instance.object.rotation.y += instance.rotationSpeed * dt;

      const dx = instance.object.position.x - cameraPos.x;
      const dz = instance.object.position.z - cameraPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance > instance.layer.radius * 1.2) {
        this.placeObject(instance.object, instance.layer, cameraPos);
      }
    }
  }

  destroy(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    for (const instance of this.instances) {
      this.scene.remove(instance.object);
      instance.object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        if (child.geometry) geometries.add(child.geometry);
        const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of meshMaterials) materials.add(material);
      });
    }
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    this.instances.length = 0;
  }

  private async loadLayer(layer: SkyObjectLayerConfig): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(layer.assetPath);
      const sourceSize = this.getSourceSize(gltf.scene);
      for (let i = 0; i < layer.count; i++) {
        const object = gltf.scene.clone(true);
        const targetSize = THREE.MathUtils.lerp(layer.scaleRange[0], layer.scaleRange[1], this.rng());
        object.scale.setScalar(targetSize / sourceSize);
        this.placeObject(object, layer, new THREE.Vector3());
        object.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = false;
          child.receiveShadow = false;
          child.frustumCulled = false;
        });
        this.scene.add(object);
        this.instances.push({
          object,
          layer,
          drift: this.makeDrift(layer),
          rotationSpeed: THREE.MathUtils.lerp(
            layer.rotationSpeedRange?.[0] ?? -0.05,
            layer.rotationSpeedRange?.[1] ?? 0.05,
            this.rng(),
          ),
          bobPhase: this.rng() * Math.PI * 2,
          bobSpeed: THREE.MathUtils.lerp(0.2, 0.7, this.rng()),
        });
      }
    } catch (error) {
      console.warn(`[SkyObjectSystem] Failed to load ${layer.assetPath}`, error);
    }
  }

  private placeObject(object: THREE.Object3D, layer: SkyObjectLayerConfig, center: THREE.Vector3): void {
    const angle = this.rng() * Math.PI * 2;
    const minDistance = layer.minDistance ?? layer.radius * 0.35;
    const distance = THREE.MathUtils.lerp(minDistance, layer.radius, Math.sqrt(this.rng()));
    object.position.set(
      center.x + Math.cos(angle) * distance,
      THREE.MathUtils.lerp(layer.altitudeRange[0], layer.altitudeRange[1], this.rng()),
      center.z + Math.sin(angle) * distance,
    );
    object.rotation.set(0, this.rng() * Math.PI * 2, 0);
  }

  private getSourceSize(object: THREE.Object3D): number {
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    return Math.max(size.x, size.y, size.z, 1);
  }

  private makeDrift(layer: SkyObjectLayerConfig): THREE.Vector3 {
    const angle = this.rng() * Math.PI * 2;
    const speed = THREE.MathUtils.lerp(layer.driftSpeedRange?.[0] ?? 2, layer.driftSpeedRange?.[1] ?? 12, this.rng());
    return new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
  }
}
