import * as THREE from 'three';
import { eventBus } from '@/game/core/EventBus.ts';

const RING_RADIUS = 18;
const RING_TUBE = 0.6;
const RING_SEGMENTS = 32;
const RING_TUBE_SEGMENTS = 12;
const PASS_THRESHOLD = 22;
const SPAWN_DISTANCE = 140;
const SPAWN_SPREAD_XZ = 25;
const SPAWN_SPREAD_Y = 15;
const MAX_RINGS = 6;

export class RingManager {
  private rings: THREE.Mesh[] = [];
  private geometry: THREE.TorusGeometry;
  private material: THREE.MeshStandardMaterial;
  private glowMaterial: THREE.MeshBasicMaterial;
  private passed = new Set<THREE.Mesh>();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, RING_TUBE_SEGMENTS, RING_SEGMENTS);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffcc44,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.2,
    });
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd66,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
  }

  spawnInitial(playerPos: THREE.Vector3, playerDir: THREE.Vector3): void {
    for (let i = 0; i < MAX_RINGS; i++) {
      this.spawnRingAhead(playerPos, playerDir, SPAWN_DISTANCE * (i + 1));
    }
  }

  private spawnRingAhead(origin: THREE.Vector3, direction: THREE.Vector3, distance: number): void {
    const ring = new THREE.Mesh(this.geometry, this.material.clone());

    const pos = origin.clone().add(direction.clone().multiplyScalar(distance));
    pos.x += THREE.MathUtils.randFloatSpread(SPAWN_SPREAD_XZ);
    pos.y += THREE.MathUtils.randFloatSpread(SPAWN_SPREAD_Y);
    pos.z += THREE.MathUtils.randFloatSpread(SPAWN_SPREAD_XZ);
    pos.y = Math.max(30, pos.y);

    ring.position.copy(pos);

    const lookTarget = pos.clone().sub(direction.clone().multiplyScalar(50));
    ring.lookAt(lookTarget);

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS + 2, RING_TUBE * 3, 8, RING_SEGMENTS),
      this.glowMaterial.clone(),
    );
    ring.add(glow);

    this.scene.add(ring);
    this.rings.push(ring);
  }

  update(playerPos: THREE.Vector3, playerDir: THREE.Vector3): number {
    let ringsHit = 0;

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      const dist = ring.position.distanceTo(playerPos);

      if (dist < PASS_THRESHOLD && !this.passed.has(ring)) {
        this.passed.add(ring);
        ringsHit++;
        eventBus.emit('ring:passed');

        const mat = ring.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x44ff88);
        mat.emissiveIntensity = 2.0;

        setTimeout(() => {
          this.scene.remove(ring);
          const idx = this.rings.indexOf(ring);
          if (idx !== -1) this.rings.splice(idx, 1);
          this.passed.delete(ring);
        }, 300);

        this.spawnRingAhead(playerPos, playerDir, SPAWN_DISTANCE * (MAX_RINGS - 1));
      }

      ring.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.rotation.z += 0.015;
        }
      });
    }

    return ringsHit;
  }

  getNextRingPosition(): THREE.Vector3 | null {
    if (this.rings.length === 0) return null;
    let closest: THREE.Mesh | null = null;
    let closestDist = Infinity;
    for (const ring of this.rings) {
      if (this.passed.has(ring)) continue;
      const d = ring.position.lengthSq();
      if (!closest || d < closestDist) {
        closest = ring;
        closestDist = d;
      }
    }
    return closest?.position ?? this.rings[0].position;
  }

  clear(): void {
    for (const ring of this.rings) {
      this.scene.remove(ring);
    }
    this.rings = [];
    this.passed.clear();
  }

  destroy(): void {
    this.clear();
    this.geometry.dispose();
    this.material.dispose();
    this.glowMaterial.dispose();
  }
}
