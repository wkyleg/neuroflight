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
