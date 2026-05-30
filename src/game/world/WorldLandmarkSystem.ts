import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { WorldLandmarkLayerConfig } from '@/game/types.ts';

interface WorldLandmarkInstance {
  root: THREE.Group;
  layer: WorldLandmarkLayerConfig;
  drift: THREE.Vector3;
  rotationSpeed: number;
  collisionRadius: number | null;
  fixed: boolean;
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export class WorldLandmarkSystem {
  private readonly loader = new GLTFLoader();
  private readonly rng = seededRng(9241);
  private readonly instances: WorldLandmarkInstance[] = [];
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async load(layers: WorldLandmarkLayerConfig[]): Promise<void> {
    await Promise.all(layers.map((layer) => this.loadLayer(layer)));
  }

  update(dt: number, cameraPos: THREE.Vector3): void {
    for (const instance of this.instances) {
      instance.root.position.addScaledVector(instance.drift, dt);
      instance.root.rotation.y += instance.rotationSpeed * dt;
      if (instance.fixed) continue;

      const dx = instance.root.position.x - cameraPos.x;
      const dz = instance.root.position.z - cameraPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance > instance.layer.radius * 1.25) {
        this.placeInstance(instance, cameraPos);
      }
    }
  }

  destroy(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    for (const instance of this.instances) {
      this.scene.remove(instance.root);
      instance.root.traverse((child) => {
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

  getCollisionVolumes(): Array<{ center: THREE.Vector3; radius: number; label: string }> {
    return this.instances
      .filter((instance) => instance.collisionRadius !== null)
      .map((instance) => ({
        center: instance.root.position,
        radius: instance.collisionRadius ?? 0,
        label: instance.layer.label ?? 'landmark',
      }));
  }

  private async loadLayer(layer: WorldLandmarkLayerConfig): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(layer.assetPath);
      const sourceBounds = new THREE.Box3().setFromObject(gltf.scene);
      const sourceSize = sourceBounds.getSize(new THREE.Vector3());
      const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
      const largestDimension = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 1);

      const placements = layer.placements ?? [];
      const totalInstances = layer.count + placements.length;

      for (let i = 0; i < totalInstances; i++) {
        const placement = placements[i];
        const targetSize =
          placement?.targetSize ?? THREE.MathUtils.lerp(layer.scaleRange[0], layer.scaleRange[1], this.rng());
        const scale = targetSize / largestDimension;
        const clone = gltf.scene.clone(true);
        const root = new THREE.Group();
        root.add(clone);

        const islandBase = placement?.islandBase ?? layer.islandBase;
        if (islandBase) {
          const baseHeight = islandBase.height ?? 18;
          const baseRadius = islandBase.radius;
          const baseGeometry = new THREE.CylinderGeometry(1, 1.28, 1, 18);
          const baseMaterial = new THREE.MeshStandardMaterial({
            color: islandBase.color ?? 0xd9c294,
            roughness: 0.92,
            metalness: 0.02,
            flatShading: true,
          });
          const base = new THREE.Mesh(baseGeometry, baseMaterial);
          base.name = `${layer.label ?? 'landmark'} island base`;
          base.scale.set(baseRadius, baseHeight, baseRadius * (islandBase.flatten ?? 0.72));
          base.position.y = -baseHeight * 0.5;
          base.receiveShadow = true;
          root.add(base);
        }

        clone.scale.setScalar(scale);
        const anchorToGround = layer.groundY !== undefined || layer.altitudeRange[0] === 0;
        clone.position.set(
          -sourceCenter.x * scale,
          anchorToGround ? -sourceBounds.min.y * scale : -sourceCenter.y * scale,
          -sourceCenter.z * scale,
        );

        root.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = false;
          child.receiveShadow = false;
          child.frustumCulled = false;
        });

        const instance: WorldLandmarkInstance = {
          root,
          layer,
          drift: this.makeDrift(layer),
          rotationSpeed: THREE.MathUtils.lerp(
            layer.rotationSpeedRange?.[0] ?? -0.008,
            layer.rotationSpeedRange?.[1] ?? 0.008,
            this.rng(),
          ),
          collisionRadius: placement?.collisionRadius ?? layer.collisionRadius ?? null,
          fixed: Boolean(placement),
        };
        if (placement) {
          root.position.set(...placement.position);
          root.rotation.set(0, placement.rotationY ?? 0, 0);
        } else {
          this.placeInstance(instance, new THREE.Vector3());
        }
        this.scene.add(root);
        this.instances.push(instance);
      }
    } catch (error) {
      console.warn(`[WorldLandmarkSystem] Failed to load ${layer.assetPath}`, error);
    }
  }

  private placeInstance(instance: WorldLandmarkInstance, center: THREE.Vector3): void {
    const { layer, root } = instance;
    const angle = this.rng() * Math.PI * 2;
    const minDistance = layer.minDistance ?? layer.radius * 0.35;
    const distance = THREE.MathUtils.lerp(minDistance, layer.radius, Math.sqrt(this.rng()));
    const y = layer.groundY ?? THREE.MathUtils.lerp(layer.altitudeRange[0], layer.altitudeRange[1], this.rng());

    root.position.set(center.x + Math.cos(angle) * distance, y, center.z + Math.sin(angle) * distance);
    if (layer.faceCenter) {
      root.lookAt(center.x, root.position.y, center.z);
      root.rotateY(Math.PI);
    } else {
      root.rotation.set(0, this.rng() * Math.PI * 2, 0);
    }
  }

  private makeDrift(layer: WorldLandmarkLayerConfig): THREE.Vector3 {
    const speedRange = layer.driftSpeedRange;
    if (!speedRange) return new THREE.Vector3();

    const angle = this.rng() * Math.PI * 2;
    const speed = THREE.MathUtils.lerp(speedRange[0], speedRange[1], this.rng());
    return new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
  }
}
