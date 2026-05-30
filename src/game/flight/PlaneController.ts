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
      scene.add(this.flightModel.object);
    } catch (err) {
      console.warn(`Failed to load aircraft model: ${this.aircraft.modelPath}`, err);
      const geo = new THREE.ConeGeometry(1, 4, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
      const fallback = new THREE.Mesh(geo, mat);
      fallback.rotation.x = Math.PI / 2;
      this.modelObject = fallback;
      this.flightModel.object.add(this.modelObject);
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
    for (const prop of this.propellers) {
      prop.rotation.z += spinRate * dt;
    }
  }

  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.flightModel.object);
  }

  getObject(): THREE.Object3D {
    return this.flightModel.object;
  }
}
