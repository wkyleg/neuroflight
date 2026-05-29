import * as THREE from 'three';
import type { WeatherBillboardLayerConfig, WeatherIdentityConfig } from '@/game/types.ts';

interface WeatherParticle {
  sprite: THREE.Sprite;
  layer: WeatherBillboardLayerConfig;
  velocity: THREE.Vector3;
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export class WeatherIdentitySystem {
  private readonly rng = seededRng(5011);
  private readonly scene: THREE.Scene;
  private readonly loader = new THREE.TextureLoader();
  private readonly particles: WeatherParticle[] = [];
  private readonly materials: THREE.SpriteMaterial[] = [];
  private readonly textures: THREE.Texture[] = [];
  private readonly config?: WeatherIdentityConfig;
  private lightningSprite: THREE.Sprite | null = null;
  private lightningLight: THREE.PointLight | null = null;
  private lightningTimer = 3;
  private lightningPulse = 0;

  constructor(scene: THREE.Scene, config?: WeatherIdentityConfig) {
    this.scene = scene;
    this.config = config;
    if (!config) return;

    for (const layer of config.billboardLayers) {
      this.createBillboardLayer(layer);
    }

    if (config.lightning) {
      this.createLightning();
    }
  }

  update(dt: number, cameraPos: THREE.Vector3): void {
    for (const particle of this.particles) {
      particle.sprite.position.addScaledVector(particle.velocity, dt);
      const dx = particle.sprite.position.x - cameraPos.x;
      const dz = particle.sprite.position.z - cameraPos.z;
      const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
      if (
        horizontalDistance > particle.layer.radius ||
        particle.sprite.position.y < particle.layer.altitudeRange[0] - 160
      ) {
        this.placeParticle(particle, cameraPos);
      }
    }

    this.updateLightning(dt, cameraPos);
  }

  destroy(): void {
    for (const particle of this.particles) this.scene.remove(particle.sprite);
    if (this.lightningSprite) this.scene.remove(this.lightningSprite);
    if (this.lightningLight) this.scene.remove(this.lightningLight);
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.particles.length = 0;
  }

  private createBillboardLayer(layer: WeatherBillboardLayerConfig): void {
    const texture = this.loader.load(layer.texturePath);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);

    for (let i = 0; i < layer.count; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: layer.color,
        opacity: THREE.MathUtils.lerp(layer.opacityRange[0], layer.opacityRange[1], this.rng()),
        transparent: true,
        depthWrite: false,
        fog: false,
        blending: layer.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      material.rotation = THREE.MathUtils.lerp(
        layer.rotationRange?.[0] ?? -0.08,
        layer.rotationRange?.[1] ?? 0.08,
        this.rng(),
      );
      this.materials.push(material);

      const sprite = new THREE.Sprite(material);
      sprite.renderOrder = layer.renderOrder ?? -2;

      const particle: WeatherParticle = {
        sprite,
        layer,
        velocity: this.makeVelocity(layer),
      };
      this.placeParticle(particle, new THREE.Vector3());
      this.scene.add(sprite);
      this.particles.push(particle);
    }
  }

  private createLightning(): void {
    if (!this.config?.lightning) return;

    const texture = this.loader.load(this.config.lightning.texturePath);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);

    const material = new THREE.SpriteMaterial({
      map: texture,
      color: this.config.lightning.color,
      opacity: 0,
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    this.materials.push(material);
    this.lightningSprite = new THREE.Sprite(material);
    this.lightningSprite.renderOrder = -1;
    this.lightningLight = new THREE.PointLight(this.config.lightning.color, 0, this.config.lightning.scaleRange[1] * 3);
    this.scene.add(this.lightningSprite);
    this.scene.add(this.lightningLight);
  }

  private updateLightning(dt: number, cameraPos: THREE.Vector3): void {
    const lightning = this.config?.lightning;
    if (!lightning || !this.lightningSprite || !this.lightningLight) return;

    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.lightningPulse = 1;
      this.lightningTimer = THREE.MathUtils.lerp(lightning.intervalRange[0], lightning.intervalRange[1], this.rng());
      const angle = this.rng() * Math.PI * 2;
      const distance = THREE.MathUtils.lerp(lightning.distanceRange[0], lightning.distanceRange[1], this.rng());
      const scale = THREE.MathUtils.lerp(lightning.scaleRange[0], lightning.scaleRange[1], this.rng());
      this.lightningSprite.position.set(
        cameraPos.x + Math.cos(angle) * distance,
        THREE.MathUtils.lerp(lightning.altitudeRange[0], lightning.altitudeRange[1], this.rng()),
        cameraPos.z + Math.sin(angle) * distance,
      );
      this.lightningSprite.scale.set(scale, scale, 1);
      this.lightningLight.position.copy(this.lightningSprite.position);
    }

    this.lightningPulse = Math.max(0, this.lightningPulse - dt * 3.8);
    const opacity = this.lightningPulse * this.lightningPulse;
    this.lightningSprite.material.opacity = opacity * 0.9;
    this.lightningLight.intensity = opacity * (lightning.intensity ?? 8);
  }

  private placeParticle(particle: WeatherParticle, center: THREE.Vector3): void {
    const { layer, sprite } = particle;
    const angle = this.rng() * Math.PI * 2;
    const distance = THREE.MathUtils.lerp(layer.radius * 0.2, layer.radius, Math.sqrt(this.rng()));
    const width = THREE.MathUtils.lerp(layer.widthRange[0], layer.widthRange[1], this.rng());
    const height = THREE.MathUtils.lerp(layer.heightRange?.[0] ?? width, layer.heightRange?.[1] ?? width, this.rng());

    sprite.position.set(
      center.x + Math.cos(angle) * distance,
      THREE.MathUtils.lerp(layer.altitudeRange[0], layer.altitudeRange[1], this.rng()),
      center.z + Math.sin(angle) * distance,
    );
    sprite.scale.set(width, height, 1);
    particle.velocity = this.makeVelocity(layer);
  }

  private makeVelocity(layer: WeatherBillboardLayerConfig): THREE.Vector3 {
    const angle = this.rng() * Math.PI * 2;
    const driftRange = layer.driftSpeedRange ?? [0, 0];
    const fallRange = layer.fallSpeedRange ?? [0, 0];
    const speed = THREE.MathUtils.lerp(driftRange[0], driftRange[1], this.rng());
    const fallSpeed = THREE.MathUtils.lerp(fallRange[0], fallRange[1], this.rng());
    return new THREE.Vector3(Math.cos(angle) * speed, -fallSpeed, Math.sin(angle) * speed);
  }
}
