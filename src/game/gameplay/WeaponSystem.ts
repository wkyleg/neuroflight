import * as THREE from 'three';

const PROJECTILE_LIFETIME = 2.5;
const POOL_SIZE = 60;

export interface WeaponDifficultySettings {
  playerProjectileSpeed: number;
  rivalProjectileSpeed: number;
  playerHitRadius: number;
  rivalHitRadius: number;
  magnetismRange: number;
  magnetismStrength: number;
  playerFireCooldown: number;
}

const DEFAULT_WEAPON_SETTINGS: WeaponDifficultySettings = {
  playerProjectileSpeed: 400,
  rivalProjectileSpeed: 250,
  playerHitRadius: 50,
  rivalHitRadius: 18,
  magnetismRange: 80,
  magnetismStrength: 2.5,
  playerFireCooldown: 0.15,
};

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
  active: boolean;
  owner: 'player' | 'ai';
}

export interface WeaponTarget {
  position: THREE.Vector3;
  owner: 'player' | 'ai' | 'neutral';
  id?: string;
  kind?: 'aircraft' | 'bonus';
  radius?: number;
}

export interface HitResult {
  targetIndex: number;
  owner: 'player' | 'ai';
  targetOwner: 'player' | 'ai' | 'neutral';
  targetId?: string;
  targetKind?: 'aircraft' | 'bonus';
  position: THREE.Vector3;
}

const _magnetDir = new THREE.Vector3();

export class WeaponSystem {
  private projectiles: Projectile[] = [];
  private scene: THREE.Scene;
  private geometry: THREE.CylinderGeometry;
  private playerMaterial: THREE.MeshBasicMaterial;
  private aiMaterial: THREE.MeshBasicMaterial;
  private aiGeometry: THREE.CylinderGeometry;
  private muzzleLight: THREE.PointLight;
  private muzzleFadeTimer = 0;
  private aiTargets: THREE.Vector3[] = [];
  private aimAssistMultiplier = 1;
  private difficulty: WeaponDifficultySettings = DEFAULT_WEAPON_SETTINGS;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.CylinderGeometry(0.32, 0.32, 4.0, 8);
    this.geometry.rotateX(Math.PI / 2);
    this.aiGeometry = new THREE.CylinderGeometry(0.46, 0.46, 5.0, 8);
    this.aiGeometry.rotateX(Math.PI / 2);
    this.playerMaterial = new THREE.MeshBasicMaterial({ color: 0x8bf8ff });
    this.aiMaterial = new THREE.MeshBasicMaterial({ color: 0xff9c7a });

    this.muzzleLight = new THREE.PointLight(0xffdc7a, 0, 30);
    scene.add(this.muzzleLight);

    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.playerMaterial);
      mesh.visible = false;
      scene.add(mesh);
      this.projectiles.push({
        mesh,
        velocity: new THREE.Vector3(),
        age: 0,
        active: false,
        owner: 'player',
      });
    }
  }

  setAiTargets(positions: THREE.Vector3[]): void {
    this.aiTargets = positions;
  }

  setAimAssist(multiplier: number): void {
    this.aimAssistMultiplier = THREE.MathUtils.clamp(multiplier, 0.8, 1.45);
  }

  setDifficulty(settings: Partial<WeaponDifficultySettings>): void {
    this.difficulty = { ...DEFAULT_WEAPON_SETTINGS, ...settings };
  }

  getPlayerFireCooldown(): number {
    return this.difficulty.playerFireCooldown;
  }

  fire(origin: THREE.Vector3, direction: THREE.Vector3, owner: 'player' | 'ai'): void {
    const proj = this.projectiles.find((p) => !p.active);
    if (!proj) {
      console.warn(`[Weapon] No free projectile for ${owner}`);
      return;
    }

    const speed = owner === 'player' ? this.difficulty.playerProjectileSpeed : this.difficulty.rivalProjectileSpeed;

    proj.active = true;
    proj.age = 0;
    proj.owner = owner;

    if (owner === 'ai') {
      proj.mesh.geometry = this.aiGeometry;
      proj.mesh.material = this.aiMaterial;
    } else {
      proj.mesh.geometry = this.geometry;
      proj.mesh.material = this.playerMaterial;
    }
    proj.mesh.visible = true;
    proj.mesh.position.copy(origin);
    proj.mesh.lookAt(origin.clone().add(direction));
    proj.velocity.copy(direction).normalize().multiplyScalar(speed);

    this.muzzleLight.position.copy(origin);
    this.muzzleLight.intensity = 3;
    this.muzzleFadeTimer = 0.05;
  }

  update(dt: number): void {
    if (this.muzzleFadeTimer > 0) {
      this.muzzleFadeTimer -= dt;
      if (this.muzzleFadeTimer <= 0) {
        this.muzzleLight.intensity = 0;
      }
    }

    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      proj.age += dt;
      if (proj.age > PROJECTILE_LIFETIME) {
        proj.active = false;
        proj.mesh.visible = false;
        continue;
      }
      // Aim assist: player fire trails curve gently toward rival targets.
      if (proj.owner === 'player' && this.aiTargets.length > 0) {
        let closestDist = Infinity;
        let closestTarget: THREE.Vector3 | null = null;
        for (const t of this.aiTargets) {
          const d = proj.mesh.position.distanceTo(t);
          if (d < closestDist) {
            closestDist = d;
            closestTarget = t;
          }
        }
        if (closestTarget && closestDist < this.difficulty.magnetismRange * this.aimAssistMultiplier) {
          _magnetDir.subVectors(closestTarget, proj.mesh.position).normalize();
          const currentSpeed = proj.velocity.length();
          const currentDir = proj.velocity.clone().normalize();
          currentDir.lerp(_magnetDir, this.difficulty.magnetismStrength * this.aimAssistMultiplier * dt);
          currentDir.normalize();
          proj.velocity.copy(currentDir).multiplyScalar(currentSpeed);
        }
      }
      proj.mesh.position.addScaledVector(proj.velocity, dt);
    }
  }

  checkHits(targets: WeaponTarget[]): HitResult[] {
    const hits: HitResult[] = [];
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      for (let ti = 0; ti < targets.length; ti++) {
        const target = targets[ti];
        if (target.owner !== 'neutral' && target.owner === proj.owner) continue;
        const dist = proj.mesh.position.distanceTo(target.position);
        const hitRadius =
          target.radius ??
          (proj.owner === 'player'
            ? this.difficulty.playerHitRadius * this.aimAssistMultiplier
            : this.difficulty.rivalHitRadius);
        if (dist < hitRadius) {
          hits.push({
            targetIndex: ti,
            owner: proj.owner,
            targetOwner: target.owner,
            targetId: target.id,
            targetKind: target.kind,
            position: proj.mesh.position.clone(),
          });
          proj.active = false;
          proj.mesh.visible = false;
          break;
        }
      }
    }
    return hits;
  }

  destroy(): void {
    for (const proj of this.projectiles) {
      this.scene.remove(proj.mesh);
    }
    this.scene.remove(this.muzzleLight);
    this.geometry.dispose();
    this.aiGeometry.dispose();
    this.playerMaterial.dispose();
    this.aiMaterial.dispose();
  }
}
