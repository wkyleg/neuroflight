import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('three', () => {
  class Vector3 {
    x = 0;
    y = 0;
    z = 0;

    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    clone() {
      return new Vector3(this.x, this.y, this.z);
    }

    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }

    copy(v: Vector3) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }

    add(v: Vector3) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }

    addScaledVector(v: Vector3, s: number) {
      this.x += v.x * s;
      this.y += v.y * s;
      this.z += v.z * s;
      return this;
    }

    distanceTo(v: Vector3) {
      const dx = v.x - this.x;
      const dy = v.y - this.y;
      const dz = v.z - this.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    subVectors(a: Vector3, b: Vector3) {
      this.x = a.x - b.x;
      this.y = a.y - b.y;
      this.z = a.z - b.z;
      return this;
    }

    normalize() {
      const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z) || 1;
      this.x /= len;
      this.y /= len;
      this.z /= len;
      return this;
    }

    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    lerp(v: Vector3, t: number) {
      this.x += (v.x - this.x) * t;
      this.y += (v.y - this.y) * t;
      this.z += (v.z - this.z) * t;
      return this;
    }

    multiplyScalar(s: number) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }
  }

  class Scene {
    add() {}
    remove() {}
  }

  class Mesh {
    position = new Vector3();
    visible = false;
    geometry: unknown;
    material: unknown;
    lookAt() {}
  }

  class CylinderGeometry {
    rotateX() {
      return this;
    }
    dispose() {}
  }

  class MeshBasicMaterial {
    dispose() {}
  }

  class PointLight {
    position = new Vector3();
    intensity = 0;
  }

  return { Vector3, Scene, Mesh, CylinderGeometry, MeshBasicMaterial, PointLight };
});

import * as THREE from 'three';
import { WeaponSystem } from './WeaponSystem';

describe('WeaponSystem', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  function getVisibleProjectileMesh(weapons: WeaponSystem): THREE.Mesh {
    const projectile = (weapons as unknown as { projectiles: { mesh: THREE.Mesh }[] }).projectiles.find(
      (p) => p.mesh.visible,
    );
    if (!projectile) throw new Error('Expected a visible projectile');
    return projectile.mesh;
  }

  it('fire() creates a visible projectile', () => {
    const weapons = new WeaponSystem(scene);
    const origin = new THREE.Vector3(0, 0, 0);
    const dir = new THREE.Vector3(0, 0, -1);
    weapons.fire(origin, dir, 'player');
    const active = (weapons as unknown as { projectiles: { active: boolean; mesh: THREE.Mesh }[] }).projectiles.filter(
      (p) => p.active,
    );
    expect(active).toHaveLength(1);
    expect(active[0].mesh.visible).toBe(true);
    weapons.destroy();
  });

  it('update() moves projectiles', () => {
    const weapons = new WeaponSystem(scene);
    const origin = new THREE.Vector3(0, 0, 0);
    weapons.fire(origin, new THREE.Vector3(1, 0, 0), 'player');
    const mesh = getVisibleProjectileMesh(weapons);
    const x0 = mesh.position.x;
    weapons.update(0.1);
    expect(mesh.position.x).toBeGreaterThan(x0);
    weapons.destroy();
  });

  it('checkHits() returns hit info for opposing owner in range', () => {
    const weapons = new WeaponSystem(scene);
    weapons.fire(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 'player');
    const mesh = getVisibleProjectileMesh(weapons);
    mesh.position.set(0, 0, 0);
    const aiPos = new THREE.Vector3(40, 0, 0);
    const hits = weapons.checkHits([{ position: aiPos, owner: 'ai' }]);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ targetIndex: 0, owner: 'player' });
    expect(hits[0].position).toEqual(new THREE.Vector3(0, 0, 0));
    weapons.destroy();
  });

  it('uses larger hit radius for player projectiles than AI projectiles', () => {
    const weapons = new WeaponSystem(scene);
    const aiAtPlayerRange = new THREE.Vector3(40, 0, 0);

    weapons.fire(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 'player');
    const playerMesh = getVisibleProjectileMesh(weapons);
    playerMesh.position.set(0, 0, 0);
    expect(weapons.checkHits([{ position: aiAtPlayerRange, owner: 'ai' }])).toHaveLength(1);

    weapons.fire(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 'ai');
    const aiMesh = getVisibleProjectileMesh(weapons);
    aiMesh.position.set(0, 0, 0);
    expect(weapons.checkHits([{ position: aiAtPlayerRange, owner: 'player' }])).toHaveLength(0);

    const playerClose = new THREE.Vector3(10, 0, 0);
    const hits = weapons.checkHits([{ position: playerClose, owner: 'player' }]);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ targetIndex: 0, owner: 'ai' });
    expect(hits[0].position).toEqual(new THREE.Vector3(0, 0, 0));
    weapons.destroy();
  });

  it('applies difficulty hit radius and cooldown settings', () => {
    const weapons = new WeaponSystem(scene);
    weapons.setDifficulty({
      playerHitRadius: 24,
      rivalHitRadius: 32,
      playerFireCooldown: 0.22,
    });

    expect(weapons.getPlayerFireCooldown()).toBe(0.22);

    weapons.fire(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 'player');
    const playerMesh = getVisibleProjectileMesh(weapons);
    playerMesh.position.set(0, 0, 0);
    expect(weapons.checkHits([{ position: new THREE.Vector3(28, 0, 0), owner: 'ai' }])).toHaveLength(0);

    weapons.fire(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 'ai');
    const aiMesh = getVisibleProjectileMesh(weapons);
    aiMesh.position.set(0, 0, 0);
    expect(weapons.checkHits([{ position: new THREE.Vector3(28, 0, 0), owner: 'player' }])).toHaveLength(1);

    weapons.destroy();
  });

  it('supports neutral bonus targets with explicit hit radii', () => {
    const weapons = new WeaponSystem(scene);
    weapons.fire(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 'player');
    const mesh = getVisibleProjectileMesh(weapons);
    mesh.position.set(0, 0, 0);

    const hits = weapons.checkHits([
      { position: new THREE.Vector3(70, 0, 0), owner: 'neutral', id: 'ufo-1', kind: 'bonus', radius: 80 },
    ]);

    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      targetIndex: 0,
      owner: 'player',
      targetOwner: 'neutral',
      targetId: 'ufo-1',
      targetKind: 'bonus',
    });
    weapons.destroy();
  });

  it('setAiTargets() accepts positions for magnetism path', () => {
    const weapons = new WeaponSystem(scene);
    const t1 = new THREE.Vector3(100, 0, 0);
    const t2 = new THREE.Vector3(0, 100, 0);
    weapons.setAiTargets([t1, t2]);
    weapons.fire(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 'player');
    weapons.update(0.05);
    weapons.destroy();
  });
});
