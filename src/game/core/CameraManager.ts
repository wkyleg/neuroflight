import * as THREE from 'three';

export interface CameraConfig {
  chaseDistance: number;
  chaseHeight: number;
  lookAhead: number;
  fov: number;
  damping: number;
  speedFovScale: number;
}

const DEFAULT_CONFIG: CameraConfig = {
  chaseDistance: 14,
  chaseHeight: 5,
  lookAhead: 10,
  fov: 65,
  damping: 4.0,
  speedFovScale: 0.03,
};

const _back = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _planeUp = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _blendedUp = new THREE.Vector3();

export class CameraManager {
  readonly camera: THREE.PerspectiveCamera;
  private config: CameraConfig;
  private idealOffset = new THREE.Vector3();
  private idealLookAt = new THREE.Vector3();
  private currentOffset = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private initialized = false;

  constructor(config?: Partial<CameraConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.camera = new THREE.PerspectiveCamera(this.config.fov, window.innerWidth / window.innerHeight, 0.1, 20000);
    this.camera.position.set(0, 210, 20);

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  };

  setConfig(config: Partial<CameraConfig>): void {
    Object.assign(this.config, config);
    this.camera.fov = this.config.fov;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, target: THREE.Object3D, speed: number): void {
    const q = target.quaternion;

    _back.set(0, 0, 1).applyQuaternion(q);
    _forward.set(0, 0, -1).applyQuaternion(q);
    _planeUp.set(0, 1, 0).applyQuaternion(q);

    // Blend between plane's up and world up for stable camera during rolls
    _blendedUp.copy(_planeUp).lerp(_worldUp, 0.7).normalize();

    this.idealOffset
      .copy(target.position)
      .add(_back.multiplyScalar(this.config.chaseDistance))
      .add(_blendedUp.multiplyScalar(this.config.chaseHeight));

    this.idealLookAt.copy(target.position).add(_forward.multiplyScalar(this.config.lookAhead));

    if (!this.initialized) {
      this.currentOffset.copy(this.idealOffset);
      this.currentLookAt.copy(this.idealLookAt);
      this.initialized = true;
    }

    const t = 1 - Math.exp(-this.config.damping * dt);
    this.currentOffset.lerp(this.idealOffset, t);
    this.currentLookAt.lerp(this.idealLookAt, t);

    this.camera.position.copy(this.currentOffset);
    this.camera.lookAt(this.currentLookAt);

    const speedFov = this.config.fov + speed * this.config.speedFovScale;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, speedFov, t * 0.5);
    this.camera.updateProjectionMatrix();
  }

  snapTo(target: THREE.Object3D): void {
    const q = target.quaternion;
    _back.set(0, 0, 1).applyQuaternion(q);
    _forward.set(0, 0, -1).applyQuaternion(q);

    this.currentOffset
      .copy(target.position)
      .add(_back.multiplyScalar(this.config.chaseDistance))
      .addScaledVector(_worldUp, this.config.chaseHeight);
    this.currentLookAt.copy(target.position).add(_forward.multiplyScalar(this.config.lookAhead));

    this.camera.position.copy(this.currentOffset);
    this.camera.lookAt(this.currentLookAt);
    this.initialized = true;
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
  }
}
