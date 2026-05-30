import * as THREE from 'three';

const CLOUD_COUNT = 30;
const CLOUD_SPREAD = 6000;
const CLOUD_MIN_Y = 500;
const CLOUD_MAX_Y = 1200;
const CLOUD_MIN_SCALE = 60;
const CLOUD_MAX_SCALE = 300;
const CULL_DISTANCE = 4500;
const RESPAWN_DISTANCE = 3800;

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

  const blobs = [
    { x: cx, y: cy, r: size * 0.38, a: 0.55 },
    { x: cx - size * 0.2, y: cy + size * 0.05, r: size * 0.3, a: 0.45 },
    { x: cx + size * 0.22, y: cy - size * 0.03, r: size * 0.32, a: 0.45 },
    { x: cx - size * 0.1, y: cy - size * 0.14, r: size * 0.24, a: 0.35 },
    { x: cx + size * 0.14, y: cy + size * 0.12, r: size * 0.27, a: 0.4 },
    { x: cx - size * 0.25, y: cy - size * 0.06, r: size * 0.2, a: 0.3 },
    { x: cx + size * 0.08, y: cy - size * 0.18, r: size * 0.18, a: 0.25 },
  ];

  for (const blob of blobs) {
    const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${blob.a})`);
    gradient.addColorStop(0.4, `rgba(255, 255, 255, ${blob.a * 0.6})`);
    gradient.addColorStop(0.7, `rgba(255, 255, 255, ${blob.a * 0.2})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class CloudSystem {
  private clouds: THREE.Mesh[] = [];
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
      const cloud = new THREE.Mesh(this.geometry, this.material.clone());
      const scale = THREE.MathUtils.randFloat(CLOUD_MIN_SCALE, CLOUD_MAX_SCALE);
      cloud.scale.set(scale * (1.5 + Math.random()), scale * (0.5 + Math.random() * 0.3), 1);
      cloud.position.set(
        THREE.MathUtils.randFloatSpread(CLOUD_SPREAD),
        THREE.MathUtils.randFloat(CLOUD_MIN_Y, CLOUD_MAX_Y),
        THREE.MathUtils.randFloatSpread(CLOUD_SPREAD),
      );
      (cloud.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.randFloat(0.15, 0.35);
      cloud.renderOrder = -1;
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  update(cameraPos: THREE.Vector3): void {
    for (const cloud of this.clouds) {
      cloud.lookAt(cameraPos);

      const dx = cloud.position.x - cameraPos.x;
      const dz = cloud.position.z - cameraPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > CULL_DISTANCE) {
        const angle = Math.random() * Math.PI * 2;
        cloud.position.x = cameraPos.x + Math.cos(angle) * RESPAWN_DISTANCE * 0.5;
        cloud.position.z = cameraPos.z + Math.sin(angle) * RESPAWN_DISTANCE * 0.5;
        cloud.position.y = THREE.MathUtils.randFloat(CLOUD_MIN_Y, CLOUD_MAX_Y);
      }
    }
  }

  destroy(): void {
    for (const cloud of this.clouds) {
      this.scene.remove(cloud);
      (cloud.material as THREE.Material).dispose();
    }
    this.geometry.dispose();
    this.material.dispose();
    this.cloudTexture.dispose();
    this.clouds = [];
  }
}
