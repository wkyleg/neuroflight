import * as THREE from 'three';
import { type GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AssetManager {
  private loader = new GLTFLoader();
  private cache = new Map<string, GLTF>();
  private pending = new Map<string, Promise<GLTF>>();
  private textureLoader = new THREE.TextureLoader();

  async loadGLTF(path: string): Promise<GLTF> {
    const cached = this.cache.get(path);
    if (cached) return cached;

    const inflight = this.pending.get(path);
    if (inflight) return inflight;

    const promise = new Promise<GLTF>((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          this.normalizeGLTF(gltf);
          this.cache.set(path, gltf);
          this.pending.delete(path);
          resolve(gltf);
        },
        undefined,
        (err) => {
          this.pending.delete(path);
          reject(err);
        },
      );
    });

    this.pending.set(path, promise);
    return promise;
  }

  async loadTexture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(path, resolve, undefined, reject);
    });
  }

  getFromCache(path: string): GLTF | undefined {
    return this.cache.get(path);
  }

  private normalizeGLTF(gltf: GLTF): void {
    gltf.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = false;
      obj.receiveShadow = false;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        this.normalizeMaterial(material);
      }
    });
  }

  private normalizeMaterial(material: THREE.Material | undefined): void {
    if (!material) return;
    material.toneMapped = true;
    if ('map' in material) {
      const map = material.map as THREE.Texture | null | undefined;
      if (map) map.colorSpace = THREE.SRGBColorSpace;
    }
    if ('emissiveMap' in material) {
      const map = material.emissiveMap as THREE.Texture | null | undefined;
      if (map) map.colorSpace = THREE.SRGBColorSpace;
    }
    if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
      material.roughness = Math.max(material.roughness ?? 0.72, 0.48);
      material.metalness = Math.min(material.metalness ?? 0.02, 0.72);
      material.envMapIntensity = Math.max(material.envMapIntensity ?? 1, 0.75);
    }
    material.needsUpdate = true;
  }

  dispose(): void {
    this.cache.forEach((gltf) => {
      gltf.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    });
    this.cache.clear();
    this.pending.clear();
  }
}
