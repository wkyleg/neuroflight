import * as THREE from 'three';
import type { AssetManager } from '@/game/core/AssetManager.ts';
import type { AircraftDefinition } from '@/game/types.ts';
import { PlaneController } from './PlaneController.ts';

type AIState = 'pursue' | 'attack' | 'strafe';

const CRUISE_SPEED = 30;
const CLOSING_SPEED = 50;
const ATTACK_RANGE = 350;
const ATTACK_ALIGNMENT = 0.6;
const FIRE_COOLDOWN = 1.5;
const STRAFE_DURATION = 6.0;
const MIN_ALTITUDE = 100;
const TURN_RATE = 1.2;
const LEASH_DISTANCE = 500;

const _toTarget = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _desiredQuat = new THREE.Quaternion();
const _lookMatrix = new THREE.Matrix4();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _strafeTarget = new THREE.Vector3();

export class AIController {
  readonly planeController: PlaneController;
  private object: THREE.Object3D;
  private state: AIState = 'pursue';
  private fireCooldown = 0;
  private wantsToFire = false;
  private lastDistance = 0;
  private lastDotForward = 0;
  private speed = CRUISE_SPEED;
  private strafeTimer = 0;

  constructor(aircraft: AircraftDefinition, spawnPos: THREE.Vector3) {
    this.planeController = new PlaneController(aircraft);
    this.object = this.planeController.flightModel.object;
    this.object.position.copy(spawnPos);
    this.state = 'pursue';
  }

  async loadModel(assetManager: AssetManager, scene: THREE.Scene): Promise<void> {
    await this.planeController.loadModel(assetManager, scene);
  }

  setHealth(_h: number): void {
    // Health is tracked by DogfightManager; kept for API compatibility
  }

  getPosition(): THREE.Vector3 {
    return this.object.position;
  }

  getQuaternion(): THREE.Quaternion {
    return this.object.quaternion;
  }

  getObject(): THREE.Object3D {
    return this.planeController.getObject();
  }

  consumeFire(): boolean {
    if (this.wantsToFire) {
      this.wantsToFire = false;
      return true;
    }
    return false;
  }

  respawn(pos: THREE.Vector3): void {
    this.object.position.copy(pos);
    this.object.quaternion.identity();
    this.state = 'pursue';
    this.strafeTimer = 0;
    this.speed = CRUISE_SPEED;
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    _toTarget.subVectors(playerPos, this.object.position);
    const distance = _toTarget.length();

    _forward.set(0, 0, -1).applyQuaternion(this.object.quaternion);
    const dotForward = distance > 0.1 ? _forward.dot(_toTarget.normalize()) : 0;

    this.lastDistance = distance;
    this.lastDotForward = dotForward;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    switch (this.state) {
      case 'pursue':
        if (distance < ATTACK_RANGE && dotForward > ATTACK_ALIGNMENT) {
          this.state = 'attack';
        }
        if (distance < 80 && dotForward < -0.2) {
          this.state = 'strafe';
          this.strafeTimer = STRAFE_DURATION;
        }
        break;
      case 'attack':
        if (distance > ATTACK_RANGE * 1.5 || dotForward < 0.3) {
          this.state = 'pursue';
        }
        if (distance < 60) {
          this.state = 'strafe';
          this.strafeTimer = STRAFE_DURATION;
        }
        break;
      case 'strafe':
        this.strafeTimer -= dt;
        if (this.strafeTimer <= 0) {
          this.state = 'pursue';
        }
        break;
    }

    this.moveDirectly(dt, playerPos, distance, dotForward);

    this.planeController.update(dt, this.speed, 200);
  }

  private moveDirectly(dt: number, playerPos: THREE.Vector3, distance: number, dotForward: number): void {
    let targetPos: THREE.Vector3;
    let turnSpeed = TURN_RATE;

    switch (this.state) {
      case 'pursue':
        targetPos = playerPos;
        this.speed = distance > 400 ? CLOSING_SPEED : CRUISE_SPEED;
        if (distance > LEASH_DISTANCE) {
          this.speed = CLOSING_SPEED * 1.3;
          turnSpeed = TURN_RATE * 1.5;
        }
        // Slow down on final approach so the player can see us coming
        if (distance < 200) {
          this.speed = CRUISE_SPEED * 0.7;
        }
        break;
      case 'attack':
        targetPos = playerPos;
        this.speed = CRUISE_SPEED * 0.75;
        if (dotForward > ATTACK_ALIGNMENT && this.fireCooldown <= 0) {
          this.wantsToFire = true;
          this.fireCooldown = FIRE_COOLDOWN;
        }
        break;
      default: {
        // Wide arc: swing out to the side and loop back
        const t = this.strafeTimer / STRAFE_DURATION;
        _strafeTarget.copy(playerPos);
        _strafeTarget.y += 80 + t * 120;
        _forward.set(0, 0, -1).applyQuaternion(this.object.quaternion);
        _strafeTarget.x += _forward.z * 600 * t;
        _strafeTarget.z -= _forward.x * 600 * t;
        targetPos = _strafeTarget;
        this.speed = CRUISE_SPEED * 0.9;
        turnSpeed = TURN_RATE * 0.7;
        break;
      }
    }

    // Rotate toward target using slerp
    if (this.object.position.distanceTo(targetPos) > 1) {
      _lookMatrix.lookAt(this.object.position, targetPos, _worldUp);
      _desiredQuat.setFromRotationMatrix(_lookMatrix);

      const slerpAlpha = 1 - Math.exp(-turnSpeed * dt);
      this.object.quaternion.slerp(_desiredQuat, slerpAlpha);
      this.object.quaternion.normalize();
    }

    // Move forward along local -Z
    _forward.set(0, 0, -1).applyQuaternion(this.object.quaternion);
    this.object.position.addScaledVector(_forward, this.speed * dt);

    // Altitude floor
    if (this.object.position.y < MIN_ALTITUDE) {
      this.object.position.y = MIN_ALTITUDE;
      // Tilt nose up if heading downward
      if (_forward.y < 0) {
        _forward.y = 0.15;
        _forward.normalize();
        _strafeTarget.copy(this.object.position).add(_forward);
        _lookMatrix.lookAt(this.object.position, _strafeTarget, _worldUp);
        _desiredQuat.setFromRotationMatrix(_lookMatrix);
        this.object.quaternion.slerp(_desiredQuat, 0.15);
        this.object.quaternion.normalize();
      }
    }
  }

  getDebugInfo(): { state: string; distance: number; dotForward: number } {
    return { state: this.state, distance: this.lastDistance, dotForward: this.lastDotForward };
  }

  removeFromScene(scene: THREE.Scene): void {
    this.planeController.removeFromScene(scene);
  }
}
