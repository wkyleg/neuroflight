import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import type { AssetManager } from '@/game/core/AssetManager.ts';
import type { AircraftDefinition } from '@/game/types.ts';
import { FlightModel } from './FlightModel.ts';

export class PlaneController {
  readonly flightModel: FlightModel;
  private modelObject: THREE.Object3D | null = null;
  private aircraft: AircraftDefinition;
  private propellers: THREE.Object3D[] = [];
  private syntheticPropellers: THREE.Object3D[] = [];
  private objLoader = new OBJLoader();

  constructor(aircraft: AircraftDefinition) {
    this.aircraft = aircraft;
    this.flightModel = new FlightModel(aircraft);
  }

  async loadModel(assetManager: AssetManager, scene: THREE.Scene): Promise<void> {
    try {
      this.modelObject =
        this.aircraft.modelFormat === 'obj'
          ? await this.loadObjModel(assetManager)
          : (await assetManager.loadGLTF(this.aircraft.modelPath)).scene.clone();

      this.applyModelTransform();

      this.propellers = [];
      this.modelObject.traverse((child) => {
        if (child.name.toLowerCase().includes('prop')) {
          this.propellers.push(child);
        }
      });

      this.flightModel.object.add(this.modelObject);
      this.addSyntheticPropellerBlur();
      scene.add(this.flightModel.object);
    } catch (err) {
      console.warn(`Failed to load aircraft model: ${this.aircraft.modelPath}`, err);
      const geo = new THREE.ConeGeometry(1, 4, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
      const fallback = new THREE.Mesh(geo, mat);
      fallback.rotation.x = Math.PI / 2;
      this.modelObject = fallback;
      this.flightModel.object.add(this.modelObject);
      this.addSyntheticPropellerBlur();
      scene.add(this.flightModel.object);
    }
  }

  private async loadObjModel(assetManager: AssetManager): Promise<THREE.Object3D> {
    const object = await this.objLoader.loadAsync(this.aircraft.modelPath);
    if (this.aircraft.texturePath) {
      const texture = await assetManager.loadTexture(this.aircraft.texturePath);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.72,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });
    }
    return object;
  }

  private applyModelTransform(): void {
    if (!this.modelObject) return;

    this.modelObject.rotation.set(
      this.aircraft.modelRotationX ?? 0,
      this.aircraft.modelRotationY,
      this.aircraft.modelRotationZ ?? 0,
    );

    if (this.aircraft.targetVisualSize) {
      this.modelObject.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(this.modelObject);
      const size = bounds.getSize(new THREE.Vector3());
      const sourceSize = Math.max(size.x, size.y, size.z, 1);
      const center = bounds.getCenter(new THREE.Vector3());
      const normalizedScale = this.aircraft.targetVisualSize / sourceSize;
      this.modelObject.scale.setScalar(normalizedScale);
      this.modelObject.position.addScaledVector(center, -normalizedScale);
    } else {
      this.modelObject.scale.setScalar(this.aircraft.scale);
    }

    if (this.aircraft.modelOffset) {
      this.modelObject.position.add(new THREE.Vector3(...this.aircraft.modelOffset));
    }
  }

  update(dt: number, speed: number, maxSpeed: number): void {
    const spinRate = 5 + (speed / maxSpeed) * 40;
    for (const prop of [...this.propellers, ...this.syntheticPropellers]) {
      prop.rotation.z += spinRate * dt;
    }
  }

  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.flightModel.object);
  }

  getObject(): THREE.Object3D {
    return this.flightModel.object;
  }

  private addSyntheticPropellerBlur(): void {
    this.syntheticPropellers = [];
    const blur = this.aircraft.propellerBlur;
    if (!blur || this.propellers.length > 0) return;

    const group = new THREE.Group();
    group.name = `${this.aircraft.id}-synthetic-propeller-blur`;
    group.position.set(...blur.offset);
    switch (blur.axis ?? 'z') {
      case 'x':
        group.rotation.y = Math.PI / 2;
        break;
      case 'y':
        group.rotation.x = Math.PI / 2;
        break;
      case 'z':
      default:
        break;
    }

    const material = new THREE.MeshBasicMaterial({
      color: blur.color ?? 0xfff2b8,
      transparent: true,
      opacity: blur.opacity ?? 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(blur.radius, 48), material);
    disc.name = `${this.aircraft.id}-propeller-disc`;

    const bladeMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff8dc,
      transparent: true,
      opacity: Math.min(0.52, (blur.opacity ?? 0.3) + 0.16),
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(blur.radius * 1.85, blur.radius * 0.16), bladeMaterial);
    blade.name = `${this.aircraft.id}-propeller-blade-a`;
    const bladeCross = blade.clone();
    bladeCross.name = `${this.aircraft.id}-propeller-blade-b`;
    bladeCross.rotation.z = Math.PI / 2;

    const hub = new THREE.Mesh(
      new THREE.CircleGeometry(Math.max(0.12, blur.radius * 0.12), 24),
      new THREE.MeshBasicMaterial({ color: 0xfff8dc, transparent: true, opacity: 0.8, depthWrite: false }),
    );
    hub.name = `${this.aircraft.id}-synthetic-propeller-hub`;

    group.add(disc);
    group.add(blade);
    group.add(bladeCross);
    group.add(hub);
    this.syntheticPropellers.push(group);
    this.flightModel.object.add(group);
  }
}
