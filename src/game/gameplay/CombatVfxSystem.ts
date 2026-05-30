import * as THREE from 'three';
import type { CombatVfxConfig } from '@/game/types.ts';

interface SpriteFx {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  age: number;
  lifetime: number;
  startScale: number;
  endScale: number;
  velocity: THREE.Vector3;
}

interface TracerFx {
  mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  age: number;
  lifetime: number;
}

export class CombatVfxSystem {
  private readonly scene: THREE.Scene;
  private readonly loader = new THREE.TextureLoader();
  private readonly spriteFx: SpriteFx[] = [];
  private readonly tracerFx: TracerFx[] = [];
  private readonly textures: THREE.Texture[] = [];
  private readonly tracerGeometry: THREE.CylinderGeometry;
  private readonly config?: CombatVfxConfig;

  constructor(scene: THREE.Scene, config?: CombatVfxConfig) {
    this.scene = scene;
    this.config = config;
    this.tracerGeometry = new THREE.CylinderGeometry(0.32, 0.32, 1, 8);

    if (config) {
      for (const texturePath of [
        config.muzzleTexturePath,
        config.hitTexturePath,
        config.explosionTexturePath,
        config.smokeTexturePath,
      ]) {
        const texture = this.loader.load(texturePath);
        texture.colorSpace = THREE.SRGBColorSpace;
        this.textures.push(texture);
      }
    }
  }

  spawnShot(origin: THREE.Vector3, direction: THREE.Vector3, owner: 'player' | 'ai'): void {
    if (!this.config) return;
    const dir = direction.clone().normalize();
    const color = owner === 'player' ? this.config.tracerColor : this.config.aiTracerColor;
    const muzzleTexture = this.textures[0];
    const smokeTexture = this.textures[3];

    this.spawnSprite(muzzleTexture, origin.clone().addScaledVector(dir, 5), 0.12, 8, 28, color, true);
    this.spawnSprite(
      smokeTexture,
      origin.clone().addScaledVector(dir, -3),
      0.32,
      4,
      18,
      owner === 'player' ? 0xcffdf2 : 0xffd7c2,
      false,
      dir.clone().multiplyScalar(-8),
    );

    const length = owner === 'player' ? 74 : 54;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: owner === 'player' ? 0.62 : 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.tracerGeometry, material);
    mesh.position.copy(origin).addScaledVector(dir, length * 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    mesh.scale.set(owner === 'player' ? 1 : 1.3, length, owner === 'player' ? 1 : 1.3);
    mesh.renderOrder = 8;
    this.scene.add(mesh);
    this.tracerFx.push({ mesh, age: 0, lifetime: 0.14 });
  }

  spawnHit(position: THREE.Vector3): void {
    if (!this.config) return;
    this.spawnSprite(this.textures[1], position, 0.28, 18, 54, 0xfff1ba, true);
    this.spawnSprite(this.textures[3], position, 0.62, 12, 46, 0x9ef2ff, false);
  }

  spawnExplosion(position: THREE.Vector3): void {
    if (!this.config) return;
    this.spawnSprite(this.textures[2], position, 0.72, 34, 126, 0xffe5a3, true);
    this.spawnSprite(this.textures[3], position, 1.2, 36, 154, 0xbdeaff, false);
  }

  update(dt: number): void {
    for (let i = this.spriteFx.length - 1; i >= 0; i--) {
      const fx = this.spriteFx[i];
      fx.age += dt;
      fx.sprite.position.addScaledVector(fx.velocity, dt);
      const progress = Math.min(1, fx.age / fx.lifetime);
      const scale = THREE.MathUtils.lerp(fx.startScale, fx.endScale, progress);
      fx.sprite.scale.set(scale, scale, 1);
      fx.material.opacity = Math.max(0, 1 - progress);
      if (progress >= 1) {
        this.scene.remove(fx.sprite);
        fx.material.dispose();
        this.spriteFx.splice(i, 1);
      }
    }

    for (let i = this.tracerFx.length - 1; i >= 0; i--) {
      const fx = this.tracerFx[i];
      fx.age += dt;
      const progress = Math.min(1, fx.age / fx.lifetime);
      fx.mesh.material.opacity = Math.max(0, 1 - progress);
      if (progress >= 1) {
        this.scene.remove(fx.mesh);
        fx.mesh.material.dispose();
        this.tracerFx.splice(i, 1);
      }
    }
  }

  destroy(): void {
    for (const fx of this.spriteFx) {
      this.scene.remove(fx.sprite);
      fx.material.dispose();
    }
    for (const fx of this.tracerFx) {
      this.scene.remove(fx.mesh);
      fx.mesh.material.dispose();
    }
    for (const texture of this.textures) texture.dispose();
    this.tracerGeometry.dispose();
    this.spriteFx.length = 0;
    this.tracerFx.length = 0;
  }

  private spawnSprite(
    texture: THREE.Texture,
    position: THREE.Vector3,
    lifetime: number,
    startScale: number,
    endScale: number,
    color: number,
    additive: boolean,
    velocity = new THREE.Vector3(),
  ): void {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      fog: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(startScale, startScale, 1);
    sprite.renderOrder = 9;
    this.scene.add(sprite);
    this.spriteFx.push({
      sprite,
      material,
      age: 0,
      lifetime,
      startScale,
      endScale,
      velocity,
    });
  }
}
