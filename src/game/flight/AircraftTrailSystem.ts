import * as THREE from 'three';
import type { AircraftDefinition } from '@/game/types.ts';

type AircraftTrailProfile = NonNullable<AircraftDefinition['trailProfile']>;

interface TrailParticle {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  baseWidth: number;
  active: boolean;
}

const POOL_SIZE = 180;
const _worldOffset = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _random = new THREE.Vector3();

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createTrailTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(255,255,255,0.92)');
  gradient.addColorStop(0.42, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class AircraftTrailSystem {
  private readonly scene: THREE.Scene;
  private readonly texture = createTrailTexture();
  private readonly particles: TrailParticle[] = [];
  private profile: AircraftTrailProfile | undefined;
  private emissionAccumulator = 0;
  private offsetCursor = 0;

  constructor(scene: THREE.Scene, profile?: AircraftTrailProfile) {
    this.scene = scene;
    this.profile = profile;

    for (let i = 0; i < POOL_SIZE; i++) {
      const material = new THREE.SpriteMaterial({
        map: this.texture ?? undefined,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.renderOrder = 5;
      this.scene.add(sprite);
      this.particles.push({
        sprite,
        material,
        velocity: new THREE.Vector3(),
        age: 0,
        lifetime: 1,
        baseWidth: 1,
        active: false,
      });
    }
  }

  setProfile(profile?: AircraftTrailProfile): void {
    this.profile = profile;
    this.emissionAccumulator = 0;
  }

  update(
    dt: number,
    aircraft: THREE.Object3D,
    speed: number,
    maxSpeed: number,
    throttle: number,
    boost: boolean,
    turnPressure: number,
  ): void {
    this.updateParticles(dt);
    if (!this.profile) return;

    const speedRatio = clamp01(speed / Math.max(1, maxSpeed));
    const boostMultiplier = boost ? (this.profile.boostMultiplier ?? 1.35) : 1;
    const intensity = clamp01((speedRatio - 0.16) / 0.84) * (0.38 + throttle * 0.62) * boostMultiplier;
    const turnLift = 1 + clamp01(turnPressure) * 0.22;
    this.emissionAccumulator += this.profile.emissionRate * intensity * turnLift * dt;

    while (this.emissionAccumulator >= 1) {
      this.emit(aircraft, speed, speedRatio, intensity);
      this.emissionAccumulator -= 1;
    }
  }

  destroy(): void {
    for (const particle of this.particles) {
      this.scene.remove(particle.sprite);
      particle.material.dispose();
    }
    this.texture?.dispose();
    this.particles.length = 0;
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      if (!particle.active) continue;
      particle.age += dt;
      if (particle.age >= particle.lifetime) {
        particle.active = false;
        particle.sprite.visible = false;
        particle.material.opacity = 0;
        continue;
      }

      particle.sprite.position.addScaledVector(particle.velocity, dt);
      const t = particle.age / particle.lifetime;
      particle.material.opacity = (1 - t) * (1 - t) * 0.42;
      const growth = 1 + t * 1.35;
      particle.sprite.scale.set(particle.baseWidth * growth, particle.baseWidth * 0.62 * growth, 1);
    }
  }

  private emit(aircraft: THREE.Object3D, speed: number, speedRatio: number, intensity: number): void {
    if (!this.profile) return;
    const particle = this.particles.find((candidate) => !candidate.active);
    if (!particle) return;

    const offset = this.profile.offsets[this.offsetCursor % this.profile.offsets.length];
    this.offsetCursor++;
    _worldOffset.set(...offset);
    aircraft.localToWorld(_worldOffset);
    _forward.set(0, 0, -1).applyQuaternion(aircraft.quaternion).normalize();
    _random.set(Math.random() - 0.5, Math.random() * 0.35, Math.random() - 0.5).multiplyScalar(this.profile.width * 0.18);

    particle.active = true;
    particle.age = 0;
    particle.lifetime = this.profile.lifetime * (0.82 + Math.random() * 0.28);
    particle.baseWidth = this.profile.width * (0.62 + speedRatio * 0.48 + intensity * 0.18);
    particle.sprite.position.copy(_worldOffset).add(_random);
    particle.velocity
      .copy(_forward)
      .multiplyScalar(-Math.max(8, speed * 0.035))
      .addScaledVector(_random, 0.45);
    particle.material.color.setHex(
      this.profile.secondaryColor && Math.random() < 0.32 ? this.profile.secondaryColor : this.profile.color,
    );
    particle.material.opacity = 0.38;
    particle.sprite.scale.set(particle.baseWidth, particle.baseWidth * 0.62, 1);
    particle.sprite.visible = true;
  }
}
