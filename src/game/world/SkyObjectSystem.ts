import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { SkyObjectLayerConfig, SkyOrientationPreset } from '@/game/types.ts';

interface SkyObjectInstance {
  object: THREE.Object3D;
  layer: SkyObjectLayerConfig;
  drift: THREE.Vector3;
  rotationSpeed: number;
  baseY: number;
  bobPhase: number;
  bobSpeed: number;
  bobAmplitude: number;
}

interface SkyObjectAsset {
  scene: THREE.Object3D;
  sourceCenter: THREE.Vector3;
  sourceSize: number;
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
  private ambientBias = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async load(layers: SkyObjectLayerConfig[]): Promise<void> {
    await Promise.all(layers.map((layer) => this.loadLayer(layer)));
  }

  setAmbientBias(bias: number): void {
    this.ambientBias = THREE.MathUtils.clamp(bias, -0.09, 0.09);
  }

  update(dt: number, cameraPos: THREE.Vector3): void {
    const bobMultiplier = 1 + this.ambientBias * 0.65;
    for (const instance of this.instances) {
      instance.object.position.addScaledVector(instance.drift, dt);
      instance.object.position.y =
        instance.baseY +
        Math.sin(performance.now() * 0.001 * instance.bobSpeed + instance.bobPhase) *
          instance.bobAmplitude *
          bobMultiplier;
      if (this.shouldFaceVelocity(instance.layer) && instance.drift.lengthSq() > 0.001) {
        instance.object.lookAt(instance.object.position.clone().add(instance.drift));
      } else {
        instance.object.rotation.y += instance.rotationSpeed * dt;
      }

      const dx = instance.object.position.x - cameraPos.x;
      const dz = instance.object.position.z - cameraPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance > instance.layer.radius * 1.2) {
        instance.baseY = this.placeObject(instance.object, instance.layer, cameraPos);
        instance.drift = this.makeDrift(instance.layer);
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
      const asset = this.makeAsset(gltf.scene);
      for (let i = 0; i < layer.count; i++) {
        const object = new THREE.Group();
        const pivot = new THREE.Group();
        const model = asset.scene.clone(true);
        const targetSize = THREE.MathUtils.lerp(layer.scaleRange[0], layer.scaleRange[1], this.rng());
        const scale = targetSize / asset.sourceSize;
        model.scale.setScalar(scale);
        model.position.set(-asset.sourceCenter.x * scale, -asset.sourceCenter.y * scale, -asset.sourceCenter.z * scale);
        pivot.rotation.copy(this.orientationFor(layer.orientationPreset, layer.rotationOffset));
        pivot.add(model);
        object.add(pivot);
        const baseY = this.placeObject(object, layer, new THREE.Vector3());
        object.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = false;
          child.receiveShadow = false;
          child.frustumCulled = false;
        });
        const drift = this.makeDrift(layer);
        if (this.shouldFaceVelocity(layer) && drift.lengthSq() > 0.001) {
          object.lookAt(object.position.clone().add(drift));
        }
        this.scene.add(object);
        this.instances.push({
          object,
          layer,
          drift,
          rotationSpeed: THREE.MathUtils.lerp(
            layer.rotationSpeedRange?.[0] ?? -0.05,
            layer.rotationSpeedRange?.[1] ?? 0.05,
            this.rng(),
          ),
          baseY,
          bobPhase: this.rng() * Math.PI * 2,
          bobSpeed: THREE.MathUtils.lerp(0.2, layer.behavior === 'balloon' ? 0.45 : 0.7, this.rng()),
          bobAmplitude: layer.bobAmplitude ?? this.defaultBobAmplitude(layer),
        });
      }
    } catch (error) {
      console.warn(`[SkyObjectSystem] Failed to load ${layer.assetPath}`, error);
    }
  }

  private placeObject(object: THREE.Object3D, layer: SkyObjectLayerConfig, center: THREE.Vector3): number {
    const angle = this.rng() * Math.PI * 2;
    const minDistance = layer.minDistance ?? layer.radius * 0.35;
    const distance = THREE.MathUtils.lerp(minDistance, layer.radius, Math.sqrt(this.rng()));
    const y = THREE.MathUtils.lerp(layer.altitudeRange[0], layer.altitudeRange[1], this.rng());
    object.position.set(center.x + Math.cos(angle) * distance, y, center.z + Math.sin(angle) * distance);
    object.rotation.set(0, this.rng() * Math.PI * 2, 0);
    return y;
  }

  private makeAsset(object: THREE.Object3D): SkyObjectAsset {
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    return {
      scene: object,
      sourceCenter: bounds.getCenter(new THREE.Vector3()),
      sourceSize: Math.max(size.x, size.y, size.z, 1),
    };
  }

  private makeDrift(layer: SkyObjectLayerConfig): THREE.Vector3 {
    const angle = this.rng() * Math.PI * 2;
    const speed = THREE.MathUtils.lerp(layer.driftSpeedRange?.[0] ?? 2, layer.driftSpeedRange?.[1] ?? 12, this.rng());
    return new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
  }

  private defaultBobAmplitude(layer: SkyObjectLayerConfig): number {
    switch (layer.behavior) {
      case 'balloon':
        return 18;
      case 'airship':
        return 10;
      case 'bird':
        return 8;
      case 'cloud':
        return 6;
      case 'floating-island':
        return 5;
      default:
        return 8;
    }
  }

  private shouldFaceVelocity(layer: SkyObjectLayerConfig): boolean {
    if (layer.maintainUpright || layer.behavior === 'balloon' || layer.behavior === 'floating-island') return false;
    return layer.faceVelocity ?? ['airship', 'bird', 'traffic'].includes(layer.behavior ?? '');
  }

  private orientationFor(preset: SkyOrientationPreset | undefined, fallback?: [number, number, number]): THREE.Euler {
    switch (preset) {
      case 'x-forward':
        return new THREE.Euler(0, Math.PI / 2, 0);
      case 'negative-x-forward':
        return new THREE.Euler(0, -Math.PI / 2, 0);
      case 'z-forward':
        return new THREE.Euler(0, Math.PI, 0);
      case 'balloon-z-up':
        return new THREE.Euler(-Math.PI / 2, 0, 0);
      case 'balloon-upright':
      case 'native':
        return new THREE.Euler(0, 0, 0);
      default:
        return new THREE.Euler(...(fallback ?? [0, 0, 0]));
    }
  }
}
