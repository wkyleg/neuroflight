import * as THREE from 'three';

const PLAYER_PROJECTILE_SPEED = 400;
const AI_PROJECTILE_SPEED = 250;
const PROJECTILE_LIFETIME = 2.5;
const PLAYER_HIT_RADIUS = 50;
const AI_HIT_RADIUS = 18;
const POOL_SIZE = 60;
const MAGNETISM_RANGE = 80;
const MAGNETISM_STRENGTH = 2.5;

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
  active: boolean;
  owner: 'player' | 'ai';
}

export interface HitResult {
  targetIndex: number;
  owner: 'player' | 'ai';
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

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.CylinderGeometry(0.4, 0.4, 4.0, 6);
    this.geometry.rotateX(Math.PI / 2);
    this.aiGeometry = new THREE.CylinderGeometry(0.7, 0.7, 5.0, 6);
    this.aiGeometry.rotateX(Math.PI / 2);
    this.playerMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
    this.aiMaterial = new THREE.MeshBasicMaterial({ color: 0xff2222 });

    this.muzzleLight = new THREE.PointLight(0xffcc44, 0, 30);
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

  fire(origin: THREE.Vector3, direction: THREE.Vector3, owner: 'player' | 'ai'): void {
    const proj = this.projectiles.find((p) => !p.active);
    if (!proj) {
      console.warn(`[Weapon] No free projectile for ${owner}`);
      return;
    }

    const speed = owner === 'player' ? PLAYER_PROJECTILE_SPEED : AI_PROJECTILE_SPEED;

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
      // Bullet magnetism: player projectiles curve toward AI targets
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
        if (closestTarget && closestDist < MAGNETISM_RANGE * this.aimAssistMultiplier) {
          _magnetDir.subVectors(closestTarget, proj.mesh.position).normalize();
          const currentSpeed = proj.velocity.length();
          const currentDir = proj.velocity.clone().normalize();
          currentDir.lerp(_magnetDir, MAGNETISM_STRENGTH * this.aimAssistMultiplier * dt);
          currentDir.normalize();
          proj.velocity.copy(currentDir).multiplyScalar(currentSpeed);
        }
      }
      proj.mesh.position.addScaledVector(proj.velocity, dt);
    }
  }

  checkHits(targets: { position: THREE.Vector3; owner: 'player' | 'ai' }[]): HitResult[] {
    const hits: HitResult[] = [];
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      for (let ti = 0; ti < targets.length; ti++) {
        const target = targets[ti];
        if (target.owner === proj.owner) continue;
        const dist = proj.mesh.position.distanceTo(target.position);
        // Player shooting AI gets a larger hit radius
        const hitRadius = proj.owner === 'player' ? PLAYER_HIT_RADIUS * this.aimAssistMultiplier : AI_HIT_RADIUS;
        if (dist < hitRadius) {
          hits.push({ targetIndex: ti, owner: proj.owner, position: proj.mesh.position.clone() });
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
