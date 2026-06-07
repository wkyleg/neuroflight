import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { resolveAssetUrl } from '@/game/core/assetUrl.ts';
import type { LivingWorldEventConfig, SkyOrientationPreset } from '@/game/types.ts';
import logger from '@/neuro/logger.ts';

interface LoadedTrafficAsset {
  scene: THREE.Object3D;
  sourceBounds: THREE.Box3;
  sourceCenter: THREE.Vector3;
  sourceSize: number;
}

interface SkyTrafficActor {
  id: string;
  root: THREE.Group;
  model: THREE.Object3D;
  config: LivingWorldEventConfig;
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  side: THREE.Vector3;
  age: number;
  duration: number;
  bobPhase: number;
  bobSpeed: number;
  bobAmplitude: number;
  wiggleAmplitude: number;
  rotationSpeed: number;
}

export interface SkyBonusTarget {
  id: string;
  label: string;
  position: THREE.Vector3;
  radius: number;
  points: number;
}

export class SkyTrafficSystem {
  private readonly loader = new GLTFLoader();
  private readonly scene: THREE.Scene;
  private readonly assets = new Map<string, LoadedTrafficAsset>();
  private readonly actors: SkyTrafficActor[] = [];
  private actorSequence = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async load(configs: LivingWorldEventConfig[]): Promise<void> {
    const uniquePaths = Array.from(new Set(configs.map((config) => config.assetPath)));
    await Promise.all(uniquePaths.map((path) => this.loadAsset(path)));
  }

  countActive(configId: string): number {
    return this.actors.filter((actor) => actor.config.id === configId).length;
  }

  spawn(config: LivingWorldEventConfig, center: THREE.Vector3, rng: () => number): number {
    const asset = this.assets.get(config.assetPath);
    if (!asset) return 0;

    const count = this.randomInt(config.countRange[0], config.countRange[1], rng);
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const root = new THREE.Group();
      const pivot = new THREE.Group();
      const model = asset.scene.clone(true);
      const targetSize = THREE.MathUtils.lerp(config.scaleRange[0], config.scaleRange[1], rng());
      const scale = targetSize / asset.sourceSize;
      model.scale.setScalar(scale);
      model.position.set(-asset.sourceCenter.x * scale, -asset.sourceCenter.y * scale, -asset.sourceCenter.z * scale);
      pivot.rotation.copy(this.orientationFor(config.orientationPreset, config.rotationOffset));
      pivot.add(model);
      root.add(pivot);

      const { position, velocity, side } = this.makeRoute(config, center, rng);
      root.position.copy(position);
      if (velocity.lengthSq() > 0.001 && this.shouldFaceVelocity(config)) {
        root.lookAt(position.clone().add(velocity));
      }

      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = false;
      });

      if (config.behavior === 'ufo-dart') {
        const glow = new THREE.PointLight(0x8ffcff, 1.2, 520, 2);
        glow.position.set(0, 0, 0);
        root.add(glow);
      }

      this.scene.add(root);
      this.actors.push({
        id: `${config.id}-${this.actorSequence++}`,
        root,
        model,
        config,
        basePosition: position.clone(),
        velocity,
        side,
        age: 0,
        duration: this.randomRange(config.durationRange ?? this.defaultDuration(config), rng),
        bobPhase: rng() * Math.PI * 2,
        bobSpeed: this.defaultBobSpeed(config),
        bobAmplitude: this.defaultBobAmplitude(config),
        wiggleAmplitude:
          config.behavior === 'ufo-dart' ? this.randomRange([80, 180], rng) : this.randomRange([10, 36], rng),
        rotationSpeed: this.defaultRotationSpeed(config, rng),
      });
      spawned++;
    }
    return spawned;
  }

  getBonusTargets(): SkyBonusTarget[] {
    return this.actors
      .filter((actor) => actor.config.targetable)
      .map((actor) => ({
        id: actor.id,
        label: actor.config.bonusLabel ?? actor.config.label,
        position: actor.root.position.clone(),
        radius: actor.config.bonusRadius ?? 48,
        points: actor.config.bonusPoints ?? 500,
      }));
  }

  consumeBonusTarget(id: string): SkyBonusTarget | null {
    const index = this.actors.findIndex((actor) => actor.id === id && actor.config.targetable);
    if (index < 0) return null;
    const actor = this.actors[index];
    const target: SkyBonusTarget = {
      id: actor.id,
      label: actor.config.bonusLabel ?? actor.config.label,
      position: actor.root.position.clone(),
      radius: actor.config.bonusRadius ?? 48,
      points: actor.config.bonusPoints ?? 500,
    };
    this.removeActor(index);
    return target;
  }

  update(dt: number, cameraPos: THREE.Vector3): void {
    for (let i = this.actors.length - 1; i >= 0; i--) {
      const actor = this.actors[i];
      actor.age += dt;
      actor.basePosition.addScaledVector(actor.velocity, dt);

      const bob = Math.sin(actor.age * actor.bobSpeed + actor.bobPhase) * actor.bobAmplitude;
      const wiggle =
        Math.sin(actor.age * this.defaultWiggleSpeed(actor.config) + actor.bobPhase * 0.73) * actor.wiggleAmplitude;
      actor.root.position.copy(actor.basePosition).addScaledVector(actor.side, wiggle);
      actor.root.position.y = actor.basePosition.y + bob;

      if (actor.velocity.lengthSq() > 0.001 && this.shouldFaceVelocity(actor.config)) {
        actor.root.lookAt(actor.root.position.clone().add(actor.velocity));
      }
      actor.root.rotation.y += actor.rotationSpeed * dt;
      if (actor.config.behavior === 'bird-pass') {
        actor.model.rotation.z = Math.sin(actor.age * 9 + actor.bobPhase) * 0.22;
        actor.model.rotation.x = Math.sin(actor.age * 5.5 + actor.bobPhase) * 0.08;
      }
      if (actor.config.behavior === 'ufo-dart') {
        actor.model.rotation.y += dt * 5.5;
        actor.model.rotation.z = Math.sin(actor.age * 7.5 + actor.bobPhase) * 0.18;
      }

      const distance = actor.root.position.distanceTo(cameraPos);
      const maxDistance = actor.config.radiusRange[1] * 1.9;
      if (actor.age > actor.duration || distance > maxDistance) {
        this.removeActor(i);
      }
    }
  }

  destroy(): void {
    for (let i = this.actors.length - 1; i >= 0; i--) {
      this.removeActor(i);
    }
    this.assets.clear();
  }

  private async loadAsset(path: string): Promise<void> {
    if (this.assets.has(path)) return;
    const url = resolveAssetUrl(path);
    try {
      logger.info('Assets', 'Loading sky traffic asset', { path, url });
      const gltf = await this.loader.loadAsync(url);
      const sourceBounds = new THREE.Box3().setFromObject(gltf.scene);
      const sourceSizeVec = sourceBounds.getSize(new THREE.Vector3());
      const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
      const sourceSize = Math.max(sourceSizeVec.x, sourceSizeVec.y, sourceSizeVec.z, 1);
      this.assets.set(path, {
        scene: gltf.scene,
        sourceBounds,
        sourceCenter,
        sourceSize,
      });
    } catch (error) {
      logger.warn('Assets', 'Failed to load sky traffic asset', { path, url, error });
    }
  }

  private makeRoute(
    config: LivingWorldEventConfig,
    center: THREE.Vector3,
    rng: () => number,
  ): { position: THREE.Vector3; velocity: THREE.Vector3; side: THREE.Vector3 } {
    const angle = rng() * Math.PI * 2;
    const distance = this.randomRange(config.radiusRange, rng);
    const altitude = this.randomRange(config.altitudeRange, rng);
    const position = new THREE.Vector3(
      center.x + Math.cos(angle) * distance,
      altitude,
      center.z + Math.sin(angle) * distance,
    );
    const speed = Math.max(
      this.randomRange(config.speedRange ?? this.defaultSpeed(config), rng),
      this.minSpeed(config),
    );

    let direction: THREE.Vector3;
    if (config.behavior === 'balloon-hover' || config.behavior === 'kite-drift') {
      direction = new THREE.Vector3(Math.cos(angle + Math.PI * 0.45), 0, Math.sin(angle + Math.PI * 0.45));
    } else if (config.behavior === 'ufo-dart') {
      direction = new THREE.Vector3(
        Math.cos(angle + Math.PI + (rng() - 0.5) * 1.8),
        (rng() - 0.5) * 0.14,
        Math.sin(angle + Math.PI + (rng() - 0.5) * 1.8),
      );
    } else {
      direction = new THREE.Vector3(
        Math.cos(angle + Math.PI + (rng() - 0.5) * 0.9),
        0,
        Math.sin(angle + Math.PI + (rng() - 0.5) * 0.9),
      );
    }
    direction.normalize();
    const side = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    return {
      position,
      velocity: direction.multiplyScalar(speed),
      side,
    };
  }

  private removeActor(index: number): void {
    const [actor] = this.actors.splice(index, 1);
    this.scene.remove(actor.root);
    actor.root.traverse((child) => {
      if (child instanceof THREE.PointLight) {
        child.dispose();
      }
    });
  }

  private defaultDuration(config: LivingWorldEventConfig): [number, number] {
    switch (config.behavior) {
      case 'balloon-hover':
      case 'kite-drift':
        return [45, 80];
      case 'ufo-dart':
        return [6, 12];
      case 'bird-pass':
        return [18, 34];
      default:
        return [28, 52];
    }
  }

  private defaultSpeed(config: LivingWorldEventConfig): [number, number] {
    switch (config.behavior) {
      case 'balloon-hover':
        return [2, 7];
      case 'kite-drift':
        return [6, 16];
      case 'bird-pass':
        return [55, 95];
      case 'airship-pass':
        return [18, 38];
      case 'ufo-dart':
        return [230, 380];
      default:
        return [70, 130];
    }
  }

  private defaultBobSpeed(config: LivingWorldEventConfig): number {
    switch (config.behavior) {
      case 'balloon-hover':
        return 0.62;
      case 'ufo-dart':
        return 5.8;
      case 'bird-pass':
        return 3.2;
      default:
        return 1.1;
    }
  }

  private defaultBobAmplitude(config: LivingWorldEventConfig): number {
    switch (config.behavior) {
      case 'balloon-hover':
        return 22;
      case 'airship-pass':
        return 12;
      case 'ufo-dart':
        return 36;
      case 'bird-pass':
        return 14;
      default:
        return 10;
    }
  }

  private defaultWiggleSpeed(config: LivingWorldEventConfig): number {
    return config.behavior === 'ufo-dart' ? 7.2 : 0.55;
  }

  private shouldHoverUpright(config: LivingWorldEventConfig): boolean {
    return config.maintainUpright ?? (config.behavior === 'balloon-hover' || config.behavior === 'kite-drift');
  }

  private shouldFaceVelocity(config: LivingWorldEventConfig): boolean {
    if (this.shouldHoverUpright(config)) return false;
    return config.faceVelocity ?? true;
  }

  private minSpeed(config: LivingWorldEventConfig): number {
    switch (config.behavior) {
      case 'balloon-hover':
        return 1.4;
      case 'airship-pass':
        return 10;
      case 'bird-pass':
        return 38;
      case 'ufo-dart':
        return 180;
      case 'plane-pass':
        return 50;
      default:
        return 4;
    }
  }

  private defaultRotationSpeed(config: LivingWorldEventConfig, rng: () => number): number {
    if (config.behavior === 'ufo-dart') return this.randomRange([-1.2, 1.2], rng);
    if (config.behavior === 'balloon-hover') return this.randomRange([-0.035, 0.035], rng);
    return this.randomRange([-0.08, 0.08], rng);
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

  private randomRange(range: [number, number], rng: () => number): number {
    return THREE.MathUtils.lerp(range[0], range[1], rng());
  }

  private randomInt(min: number, max: number, rng: () => number): number {
    return Math.floor(this.randomRange([min, max + 1], rng));
  }
}
