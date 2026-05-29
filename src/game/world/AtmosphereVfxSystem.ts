import * as THREE from 'three';
import type { AtmosphereVfxConfig } from '@/game/types.ts';

interface SpriteParticle {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  scaleRange: [number, number];
  altitudeRange: [number, number];
  radius: number;
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export class AtmosphereVfxSystem {
  private readonly rng = seededRng(7331);
  private readonly scene: THREE.Scene;
  private readonly loader = new THREE.TextureLoader();
  private readonly particles: SpriteParticle[] = [];
  private readonly materials: THREE.SpriteMaterial[] = [];
  private readonly textures: THREE.Texture[] = [];
  private lightningSprite: THREE.Sprite | null = null;
  private lightningLight: THREE.PointLight | null = null;
  private lightningTimer = 4;
  private lightningPulse = 0;

  constructor(scene: THREE.Scene, config?: AtmosphereVfxConfig) {
    this.scene = scene;
    if (!config) return;

    if (config.hazeCount > 0) {
      this.createSpriteField({
        texturePath: config.hazeTexturePath,
        count: config.hazeCount,
        color: config.hazeColor,
        opacityRange: config.hazeOpacityRange,
        scaleRange: config.hazeScaleRange,
        altitudeRange: config.hazeAltitudeRange,
        radius: config.radius,
        velocityY: 0,
        horizontalSpeed: config.hazeDriftSpeed,
      });
    }

    if (config.rainCount > 0 && config.rainTexturePath) {
      this.createSpriteField({
        texturePath: config.rainTexturePath,
        count: config.rainCount,
        color: config.rainColor,
        opacityRange: config.rainOpacityRange,
        scaleRange: config.rainScaleRange,
        altitudeRange: config.rainAltitudeRange,
        radius: config.radius * 0.55,
        velocityY: -config.rainFallSpeed,
        horizontalSpeed: config.rainDriftSpeed,
        rotation: -0.25,
      });
    }

    if (config.lightning) {
      this.createLightning(config);
    }
  }

  update(dt: number, cameraPos: THREE.Vector3): void {
    for (const particle of this.particles) {
      particle.sprite.position.addScaledVector(particle.velocity, dt);
      const dx = particle.sprite.position.x - cameraPos.x;
      const dz = particle.sprite.position.z - cameraPos.z;
      const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
      if (horizontalDistance > particle.radius || particle.sprite.position.y < particle.altitudeRange[0] - 100) {
        this.placeParticle(particle, cameraPos);
      }
    }

    if (this.lightningSprite && this.lightningLight) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningPulse = 1;
        this.lightningTimer = THREE.MathUtils.lerp(7, 15, this.rng());
        const angle = this.rng() * Math.PI * 2;
        const distance = THREE.MathUtils.lerp(2500, 4200, this.rng());
        this.lightningSprite.position.set(
          cameraPos.x + Math.cos(angle) * distance,
          THREE.MathUtils.lerp(900, 1800, this.rng()),
          cameraPos.z + Math.sin(angle) * distance,
        );
        this.lightningLight.position.copy(this.lightningSprite.position);
      }

      this.lightningPulse = Math.max(0, this.lightningPulse - dt * 3.5);
      const opacity = this.lightningPulse * this.lightningPulse;
      this.lightningSprite.material.opacity = opacity * 0.8;
      this.lightningLight.intensity = opacity * 8;
    }
  }

  destroy(): void {
    for (const particle of this.particles) this.scene.remove(particle.sprite);
    if (this.lightningSprite) this.scene.remove(this.lightningSprite);
    if (this.lightningLight) this.scene.remove(this.lightningLight);
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.particles.length = 0;
  }

  private createSpriteField(config: {
    texturePath: string;
    count: number;
    color: number;
    opacityRange: [number, number];
    scaleRange: [number, number];
    altitudeRange: [number, number];
    radius: number;
    velocityY: number;
    horizontalSpeed: number;
    rotation?: number;
  }): void {
    const texture = this.loader.load(config.texturePath);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);

    for (let i = 0; i < config.count; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: config.color,
        opacity: THREE.MathUtils.lerp(config.opacityRange[0], config.opacityRange[1], this.rng()),
        transparent: true,
        depthWrite: false,
        fog: false,
      });
      material.rotation = config.rotation ?? 0;
      this.materials.push(material);
      const sprite = new THREE.Sprite(material);
      sprite.renderOrder = -2;
      const particle: SpriteParticle = {
        sprite,
        velocity: this.makeVelocity(config.horizontalSpeed, config.velocityY),
        scaleRange: config.scaleRange,
        altitudeRange: config.altitudeRange,
        radius: config.radius,
      };
      this.placeParticle(particle, new THREE.Vector3());
      this.scene.add(sprite);
      this.particles.push(particle);
    }
  }

  private createLightning(config: AtmosphereVfxConfig): void {
    const texture = this.loader.load(config.lightningTexturePath);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);

    const material = new THREE.SpriteMaterial({
      map: texture,
      color: config.lightningColor,
      opacity: 0,
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    this.materials.push(material);
    this.lightningSprite = new THREE.Sprite(material);
    this.lightningSprite.scale.set(700, 700, 1);
    this.lightningSprite.renderOrder = -1;
    this.lightningLight = new THREE.PointLight(config.lightningColor, 0, 2600);
    this.scene.add(this.lightningSprite);
    this.scene.add(this.lightningLight);
  }

  private placeParticle(particle: SpriteParticle, center: THREE.Vector3): void {
    const angle = this.rng() * Math.PI * 2;
    const distance = THREE.MathUtils.lerp(particle.radius * 0.25, particle.radius, Math.sqrt(this.rng()));
    const scale = THREE.MathUtils.lerp(particle.scaleRange[0], particle.scaleRange[1], this.rng());
    particle.sprite.position.set(
      center.x + Math.cos(angle) * distance,
      THREE.MathUtils.lerp(particle.altitudeRange[0], particle.altitudeRange[1], this.rng()),
      center.z + Math.sin(angle) * distance,
    );
    particle.sprite.scale.set(scale, scale, 1);
  }

  private makeVelocity(horizontalSpeed: number, velocityY: number): THREE.Vector3 {
    const angle = this.rng() * Math.PI * 2;
    const speed = THREE.MathUtils.lerp(horizontalSpeed * 0.35, horizontalSpeed, this.rng());
    return new THREE.Vector3(Math.cos(angle) * speed, velocityY, Math.sin(angle) * speed);
  }
}
