import * as THREE from 'three';
import type { SeaTrafficConfig, SeaTrafficVesselConfig } from '@/game/types.ts';

interface SeaTrafficActor {
  root: THREE.Group;
  config: SeaTrafficVesselConfig;
  velocity: THREE.Vector3;
  radius: number;
  wake: THREE.Mesh | null;
  bobPhase: number;
  bobSpeed: number;
  bobAmplitude: number;
}

function seededRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class SeaTrafficSystem {
  private readonly scene: THREE.Scene;
  private readonly config: SeaTrafficConfig | undefined;
  private readonly rng: () => number;
  private readonly actors: SeaTrafficActor[] = [];
  private readonly waterY: number;

  constructor(scene: THREE.Scene, config?: SeaTrafficConfig) {
    this.scene = scene;
    this.config = config;
    this.rng = seededRng(config?.seed ?? 51299);
    this.waterY = config?.waterY ?? 0;
    this.spawnInitial();
  }

  update(dt: number, cameraPos: THREE.Vector3): void {
    for (const actor of this.actors) {
      actor.root.position.addScaledVector(actor.velocity, dt);
      actor.root.position.y =
        this.waterY + Math.sin(performance.now() * 0.001 * actor.bobSpeed + actor.bobPhase) * actor.bobAmplitude;

      const target = actor.root.position.clone().add(actor.velocity);
      actor.root.lookAt(target.x, actor.root.position.y, target.z);
      actor.root.rotateY(Math.PI);

      if (actor.wake) {
        const pulse = 0.84 + Math.sin(performance.now() * 0.0018 + actor.bobPhase) * 0.08;
        (actor.wake.material as THREE.MeshBasicMaterial).opacity =
          actor.config.type === 'cruise' ? 0.18 * pulse : 0.13 * pulse;
      }

      const dx = actor.root.position.x - cameraPos.x;
      const dz = actor.root.position.z - cameraPos.z;
      if (Math.sqrt(dx * dx + dz * dz) > actor.radius * 1.25) {
        this.placeActor(actor, cameraPos);
      }
    }
  }

  destroy(): void {
    for (const actor of this.actors) {
      this.scene.remove(actor.root);
      this.disposeObject(actor.root);
    }
    this.actors.length = 0;
  }

  getDebugSnapshot(): Array<{ id: string; type: string; position: [number, number, number]; speed: number }> {
    return this.actors.map((actor) => ({
      id: actor.config.id,
      type: actor.config.type,
      position: [actor.root.position.x, actor.root.position.y, actor.root.position.z],
      speed: actor.velocity.length(),
    }));
  }

  private spawnInitial(): void {
    if (!this.config) return;
    for (const vesselConfig of this.config.vessels) {
      for (let i = 0; i < vesselConfig.count; i++) {
        const root = this.createVessel(vesselConfig);
        const wakeObject = root.getObjectByName('wake');
        const actor: SeaTrafficActor = {
          root,
          config: vesselConfig,
          velocity: new THREE.Vector3(),
          radius: vesselConfig.radius,
          wake: wakeObject instanceof THREE.Mesh ? wakeObject : null,
          bobPhase: this.rng() * Math.PI * 2,
          bobSpeed: THREE.MathUtils.lerp(0.45, 0.9, this.rng()),
          bobAmplitude: vesselConfig.type === 'cruise' ? 0.7 : 1.5,
        };
        this.placeActor(actor, new THREE.Vector3());
        this.scene.add(root);
        this.actors.push(actor);
      }
    }
  }

  private placeActor(actor: SeaTrafficActor, center: THREE.Vector3): void {
    const minDistance = actor.config.minDistance ?? actor.config.radius * 0.28;
    const distance = THREE.MathUtils.lerp(minDistance, actor.config.radius, Math.sqrt(this.rng()));
    const angle = this.rng() * Math.PI * 2;
    const pathAngle = angle + Math.PI * 0.5 + (this.rng() - 0.5) * 0.9;
    const speed = THREE.MathUtils.lerp(actor.config.speedRange[0], actor.config.speedRange[1], this.rng());
    actor.root.position.set(center.x + Math.cos(angle) * distance, this.waterY, center.z + Math.sin(angle) * distance);
    actor.velocity.set(Math.cos(pathAngle) * speed, 0, Math.sin(pathAngle) * speed);
  }

  private createVessel(config: SeaTrafficVesselConfig): THREE.Group {
    const root = new THREE.Group();
    root.name = config.label ?? config.id;
    const size = THREE.MathUtils.lerp(config.scaleRange[0], config.scaleRange[1], this.rng());
    const base = this.makeVesselMesh(config.type);
    base.scale.setScalar(size);
    root.add(base);

    if (config.wake) {
      const wake = this.makeWake(config.type, size);
      wake.name = 'wake';
      wake.position.set(0, 0.08, -size * 0.78);
      root.add(wake);
    }

    return root;
  }

  private makeVesselMesh(type: SeaTrafficVesselConfig['type']): THREE.Group {
    switch (type) {
      case 'cargo':
        return this.makeCargoShip();
      case 'cruise':
        return this.makeCruiseShip();
      default:
        return this.makeSailboat();
    }
  }

  private makeSailboat(): THREE.Group {
    const group = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x9b5e33, roughness: 0.72, metalness: 0.02 });
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xfff2cf,
      roughness: 0.6,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 1.8), hullMat);
    hull.position.y = 0.12;
    group.add(hull);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8), hullMat);
    mast.position.set(0, 0.62, 0.05);
    group.add(mast);

    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 0);
    sailShape.lineTo(0.52, 0.12);
    sailShape.lineTo(0, 0.8);
    sailShape.lineTo(0, 0);
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), sailMat);
    sail.position.set(0.03, 0.34, 0.05);
    sail.rotation.y = Math.PI / 2;
    group.add(sail);

    return group;
  }

  private makeCargoShip(): THREE.Group {
    const group = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x2f7d88, roughness: 0.68, metalness: 0.08 });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0xffe0a8, roughness: 0.62, metalness: 0.02 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 2.8), hullMat);
    hull.position.y = 0.14;
    group.add(hull);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.46, 0.62), cabinMat);
    cabin.position.set(0, 0.5, -0.58);
    group.add(cabin);

    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.44, 10), hullMat);
    stack.position.set(0.32, 0.82, -0.58);
    group.add(stack);

    return group;
  }

  private makeCruiseShip(): THREE.Group {
    const group = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.58, metalness: 0.05 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x91d2eb, roughness: 0.5, metalness: 0.04 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xf5bd55, roughness: 0.54, metalness: 0.02 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.22, 3.2), hullMat);
    hull.position.y = 0.12;
    group.add(hull);

    for (let i = 0; i < 3; i++) {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(1.05 - i * 0.16, 0.18, 1.95 - i * 0.32), deckMat);
      deck.position.y = 0.34 + i * 0.2;
      deck.position.z = -0.08 - i * 0.08;
      group.add(deck);
    }

    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.46, 12), accentMat);
    funnel.position.set(0.28, 0.98, -0.58);
    group.add(funnel);

    return group;
  }

  private makeWake(type: SeaTrafficVesselConfig['type'], size: number): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(type === 'cruise' ? 1.25 : 0.75, type === 'cruise' ? 2.6 : 1.55);
    const material = new THREE.MeshBasicMaterial({
      color: 0xf1fbff,
      transparent: true,
      opacity: type === 'cruise' ? 0.18 : 0.13,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const wake = new THREE.Mesh(geometry, material);
    wake.scale.set(size, size, size);
    wake.rotation.x = -Math.PI / 2;
    return wake;
  }

  private disposeObject(root: THREE.Object3D): void {
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) material.dispose();
    });
  }
}
