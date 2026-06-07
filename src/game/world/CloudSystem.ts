import * as THREE from 'three';
import { resolveAssetUrl } from '@/game/core/assetUrl.ts';
import type { CloudLayerProfileConfig, CloudProfileConfig } from '@/game/types.ts';
import logger from '@/neuro/logger.ts';

const DEFAULT_CULL_DISTANCE = 6200;
const DEFAULT_RESPAWN_RADIUS = 5400;

const DEFAULT_PROFILE: CloudProfileConfig = {
  seed: 1907,
  layers: [
    {
      id: 'low-wisps',
      count: 22,
      band: 'low',
      radius: 7200,
      minDistance: 1400,
      altitudeRange: [320, 780],
      scaleRange: [220, 540],
      widthMultiplierRange: [2.4, 4.2],
      heightMultiplierRange: [0.2, 0.4],
      opacityRange: [0.08, 0.18],
      driftSpeedRange: [1.5, 4.5],
      color: 0xfff7df,
    },
    {
      id: 'puffy-mid',
      count: 34,
      band: 'mid',
      radius: 7600,
      minDistance: 1600,
      altitudeRange: [760, 1600],
      scaleRange: [180, 660],
      widthMultiplierRange: [1.7, 3.3],
      heightMultiplierRange: [0.36, 0.72],
      opacityRange: [0.12, 0.32],
      driftSpeedRange: [2.5, 7],
      color: 0xffffff,
    },
    {
      id: 'high-sheets',
      count: 18,
      band: 'high',
      radius: 8800,
      minDistance: 2600,
      altitudeRange: [1650, 2950],
      scaleRange: [360, 980],
      widthMultiplierRange: [2.8, 5.2],
      heightMultiplierRange: [0.18, 0.36],
      opacityRange: [0.08, 0.22],
      driftSpeedRange: [5, 12],
      color: 0xeaf8ff,
    },
  ],
};

interface CloudBillboard {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  drift: THREE.Vector3;
  layer: CloudLayerProfileConfig;
}

function seededRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createCloudTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  const blobs = Array.from({ length: 18 }, (_, i) => {
    const t = i / 17;
    return {
      x: cx + Math.cos(t * Math.PI * 4.8) * size * (0.08 + t * 0.22),
      y: cy + Math.sin(t * Math.PI * 3.4) * size * 0.16,
      r: size * (0.18 + Math.sin(t * Math.PI) * 0.22),
      a: 0.18 + Math.sin(t * Math.PI) * 0.34,
    };
  });

  for (const blob of blobs) {
    const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${blob.a})`);
    gradient.addColorStop(0.35, `rgba(255, 255, 255, ${blob.a * 0.62})`);
    gradient.addColorStop(0.72, `rgba(255, 255, 255, ${blob.a * 0.18})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class CloudSystem {
  private clouds: CloudBillboard[] = [];
  private material: THREE.MeshBasicMaterial;
  private geometry: THREE.PlaneGeometry;
  private cloudTexture: THREE.Texture;
  private scene: THREE.Scene;
  private readonly profile: CloudProfileConfig;
  private readonly rng: () => number;

  constructor(scene: THREE.Scene, profile?: CloudProfileConfig) {
    this.scene = scene;
    this.profile = profile ?? DEFAULT_PROFILE;
    this.rng = seededRng(this.profile.seed ?? DEFAULT_PROFILE.seed ?? 1907);
    this.cloudTexture = createCloudTexture();
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.MeshBasicMaterial({
      map: this.cloudTexture,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });

    this.loadRuntimeTexture(this.profile.texturePath);

    for (const layer of this.profile.layers) {
      for (let i = 0; i < layer.count; i++) {
        const cloud = new THREE.Mesh(this.geometry, this.material.clone());
        this.placeCloud(cloud, new THREE.Vector3(), layer, layer.radius ?? DEFAULT_RESPAWN_RADIUS);
        const material = cloud.material as THREE.MeshBasicMaterial;
        material.opacity = this.randomRange(layer.opacityRange);
        material.color = new THREE.Color(layer.color ?? 0xffffff);
        cloud.renderOrder = -1;
        this.scene.add(cloud);
        this.clouds.push({
          mesh: cloud,
          drift: this.makeDrift(layer),
          layer,
        });
      }
    }
  }

  update(dt: number, cameraPos: THREE.Vector3): void {
    for (const cloud of this.clouds) {
      cloud.mesh.position.addScaledVector(cloud.drift, dt);
      cloud.mesh.lookAt(cameraPos);

      const dx = cloud.mesh.position.x - cameraPos.x;
      const dz = cloud.mesh.position.z - cameraPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > (this.profile.cullDistance ?? DEFAULT_CULL_DISTANCE)) {
        this.placeCloud(cloud.mesh, cameraPos, cloud.layer, this.profile.respawnRadius ?? DEFAULT_RESPAWN_RADIUS);
        cloud.drift = this.makeDrift(cloud.layer);
      }
    }
  }

  private loadRuntimeTexture(texturePath?: string): void {
    if (!texturePath) return;
    const loader = new THREE.TextureLoader();
    const url = resolveAssetUrl(texturePath);
    logger.info('Assets', 'Loading cloud texture', { path: texturePath, url });
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        this.cloudTexture.dispose();
        this.cloudTexture = texture;
        for (const cloud of this.clouds) {
          cloud.mesh.material.map = texture;
          cloud.mesh.material.needsUpdate = true;
        }
        logger.info('Assets', 'Loaded cloud texture', { path: texturePath, url });
      },
      undefined,
      (error) =>
        logger.warn('Assets', 'Failed to load cloud texture; using procedural fallback', {
          path: texturePath,
          url,
          error,
        }),
    );
  }

  private placeCloud(
    cloud: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>,
    center: THREE.Vector3,
    layer: CloudLayerProfileConfig,
    radius: number,
  ): void {
    const angle = this.rng() * Math.PI * 2;
    const minDistance = layer.minDistance ?? radius * 0.25;
    const distance = THREE.MathUtils.lerp(minDistance, radius, Math.sqrt(this.rng()));
    const scale = this.randomRange(layer.scaleRange);
    const altitude = this.randomRange(layer.altitudeRange);
    cloud.scale.set(
      scale * this.randomRange(layer.widthMultiplierRange ?? [1.45, 2.9]),
      scale * this.randomRange(layer.heightMultiplierRange ?? [0.24, 0.5]),
      1,
    );
    cloud.position.set(center.x + Math.cos(angle) * distance, altitude, center.z + Math.sin(angle) * distance);
  }

  private makeDrift(layer: CloudLayerProfileConfig): THREE.Vector3 {
    const angle = this.rng() * Math.PI * 2;
    const speed = this.randomRange(layer.driftSpeedRange);
    return new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
  }

  private randomRange(range: [number, number]): number {
    return THREE.MathUtils.lerp(range[0], range[1], this.rng());
  }

  destroy(): void {
    for (const cloud of this.clouds) {
      this.scene.remove(cloud.mesh);
      cloud.mesh.material.dispose();
    }
    this.geometry.dispose();
    this.material.dispose();
    this.cloudTexture.dispose();
    this.clouds = [];
  }
}
