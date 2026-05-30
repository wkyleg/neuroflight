import * as THREE from 'three';

const CLOUD_COUNT = 52;
const CLOUD_SPREAD = 7600;
const CLOUD_MIN_SCALE = 150;
const CLOUD_MAX_SCALE = 780;
const CULL_DISTANCE = 5600;
const RESPAWN_DISTANCE = 5000;

interface CloudBillboard {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  drift: THREE.Vector3;
  band: 'low' | 'mid' | 'high';
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
  private cloudTexture: THREE.CanvasTexture;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
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

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const band = i % 5 === 0 ? 'high' : i % 3 === 0 ? 'low' : 'mid';
      const cloud = new THREE.Mesh(this.geometry, this.material.clone());
      this.placeCloud(cloud, new THREE.Vector3(), band, CLOUD_SPREAD);
      (cloud.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.randFloat(0.12, 0.34);
      cloud.renderOrder = -1;
      this.scene.add(cloud);
      this.clouds.push({
        mesh: cloud,
        drift: this.makeDrift(band),
        band,
      });
    }
  }

  update(dt: number, cameraPos: THREE.Vector3): void {
    for (const cloud of this.clouds) {
      cloud.mesh.position.addScaledVector(cloud.drift, dt);
      cloud.mesh.lookAt(cameraPos);

      const dx = cloud.mesh.position.x - cameraPos.x;
      const dz = cloud.mesh.position.z - cameraPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > CULL_DISTANCE) {
        this.placeCloud(cloud.mesh, cameraPos, cloud.band, RESPAWN_DISTANCE);
        cloud.drift = this.makeDrift(cloud.band);
      }
    }
  }

  private placeCloud(
    cloud: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>,
    center: THREE.Vector3,
    band: CloudBillboard['band'],
    radius: number,
  ): void {
    const angle = Math.random() * Math.PI * 2;
    const distance = THREE.MathUtils.randFloat(radius * 0.25, radius);
    const scale = THREE.MathUtils.randFloat(CLOUD_MIN_SCALE, CLOUD_MAX_SCALE) * (band === 'high' ? 1.25 : 1);
    const altitude =
      band === 'low'
        ? THREE.MathUtils.randFloat(360, 760)
        : band === 'high'
          ? THREE.MathUtils.randFloat(1550, 2750)
          : THREE.MathUtils.randFloat(820, 1650);
    cloud.scale.set(scale * THREE.MathUtils.randFloat(1.45, 2.9), scale * THREE.MathUtils.randFloat(0.24, 0.5), 1);
    cloud.position.set(center.x + Math.cos(angle) * distance, altitude, center.z + Math.sin(angle) * distance);
  }

  private makeDrift(band: CloudBillboard['band']): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const speed = band === 'high' ? THREE.MathUtils.randFloat(4, 10) : THREE.MathUtils.randFloat(1.5, 5.5);
    return new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
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
