import * as THREE from 'three';
import type { AssetManager } from '@/game/core/AssetManager.ts';
import type { AircraftDefinition } from '@/game/types.ts';
import { FlightModel } from './FlightModel.ts';

export class PlaneController {
  readonly flightModel: FlightModel;
  private modelObject: THREE.Object3D | null = null;
  private aircraft: AircraftDefinition;
  private propellers: THREE.Object3D[] = [];

  constructor(aircraft: AircraftDefinition) {
    this.aircraft = aircraft;
    this.flightModel = new FlightModel(aircraft);
  }

  async loadModel(assetManager: AssetManager, scene: THREE.Scene): Promise<void> {
    try {
      const gltf = await assetManager.loadGLTF(this.aircraft.modelPath);
      this.modelObject = gltf.scene.clone();
      this.modelObject.scale.setScalar(this.aircraft.scale);
      this.modelObject.rotation.y = this.aircraft.modelRotationY;
      if (this.aircraft.modelRotationX) {
        this.modelObject.rotation.x = this.aircraft.modelRotationX;
      }

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
