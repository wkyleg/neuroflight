import * as THREE from 'three';
import type { FlightInput } from '@/game/core/InputManager.ts';
import type { AircraftDefinition } from '@/game/types.ts';

const _forward = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _tmpQ = new THREE.Quaternion();
const _identityQ = new THREE.Quaternion();

const MAX_BANK_ANGLE = Math.PI / 3; // 60 degrees

export class FlightModel {
  readonly object = new THREE.Object3D();

  private speed: number;
  private tuning: AircraftDefinition['tuning'];

  constructor(aircraft: AircraftDefinition) {
    this.tuning = { ...aircraft.tuning };
    this.speed = (aircraft.tuning.minSpeed + aircraft.tuning.maxSpeed) * 0.45;
    this.object.position.set(0, 200, 0);
  }

  setTuning(tuning: AircraftDefinition['tuning']): void {
    this.tuning = { ...tuning };
  }

  update(dt: number, input: FlightInput): void {
    const t = this.tuning;

    // --- Speed with drag ---
    const targetSpeed = THREE.MathUtils.lerp(t.minSpeed, t.maxSpeed, input.throttle);
    const dragForce = t.drag * this.speed * this.speed * 0.00005;
    const accelAlpha = 1 - Math.exp(-t.acceleration * 0.02 * dt);
    this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, accelAlpha);
    this.speed = Math.max(t.minSpeed * 0.3, this.speed - dragForce * dt);

    if (input.boost) {
      this.speed = Math.min(this.speed + t.acceleration * 2 * dt, t.maxSpeed * 1.3);
    }
    if (input.brake) {
      this.speed = Math.max(t.minSpeed * 0.5, this.speed - t.acceleration * 3 * dt);
    }

    // --- Bank angle limit: clamp roll input when near max bank ---
    _right.set(1, 0, 0).applyQuaternion(this.object.quaternion);
    const currentBank = Math.asin(THREE.MathUtils.clamp(-_right.y, -1, 1));
    let effectiveRoll = input.roll;
    if (Math.abs(currentBank) > MAX_BANK_ANGLE * 0.85) {
      const overBank = (Math.abs(currentBank) - MAX_BANK_ANGLE * 0.85) / (MAX_BANK_ANGLE * 0.15);
      const clampFactor = 1 - THREE.MathUtils.clamp(overBank, 0, 1);
      if (Math.sign(effectiveRoll) === Math.sign(currentBank)) {
        effectiveRoll *= clampFactor;
      }
    }

    // --- Rotation from player input ---
    const pitchDelta = input.pitch * t.pitchRate * dt;
    const rollDelta = effectiveRoll * t.rollRate * dt;
    const assistedYaw = input.yaw + effectiveRoll * 0.42;
    const yawDelta = assistedYaw * t.yawRate * dt;

    if (Math.abs(pitchDelta) > 1e-6) {
      _tmpQ.setFromAxisAngle(_right.set(1, 0, 0), pitchDelta);
      this.object.quaternion.multiply(_tmpQ);
    }
    if (Math.abs(rollDelta) > 1e-6) {
      _tmpQ.setFromAxisAngle(_forward.set(0, 0, -1), rollDelta);
      this.object.quaternion.multiply(_tmpQ);
    }
    if (Math.abs(yawDelta) > 1e-6) {
      _tmpQ.setFromAxisAngle(_up.set(0, 1, 0), -yawDelta);
      this.object.quaternion.multiply(_tmpQ);
    }

    // --- Banking turn: roll causes automatic yaw (coordinated turn) ---
    _right.set(1, 0, 0).applyQuaternion(this.object.quaternion);
    const bankAngle = Math.asin(THREE.MathUtils.clamp(-_right.y, -1, 1));
    const bankYaw = bankAngle * 0.35 * dt;
    if (Math.abs(bankYaw) > 1e-6) {
      _tmpQ.setFromAxisAngle(_up.set(0, 1, 0).applyQuaternion(this.object.quaternion), -bankYaw);
      this.object.quaternion.premultiply(_tmpQ);
    }

    // --- Auto-level: ALWAYS active, scaled down by player input ---
    if (t.autoLevelStrength > 0) {
      const inputMag = Math.max(Math.abs(input.pitch), Math.abs(input.roll));
      const levelWeight = (1 - inputMag) * (1 - inputMag);

      _up.set(0, 1, 0).applyQuaternion(this.object.quaternion);
      _tmpQ.setFromUnitVectors(_up, _worldUp);
      const levelAlpha = 1 - Math.exp(-t.autoLevelStrength * 2.0 * levelWeight * dt);
      _tmpQ.slerp(_identityQ, 1 - levelAlpha);
      this.object.quaternion.premultiply(_tmpQ);
    }

    // --- Pitch dampening: resist steep nose angles when not pitching ---
    if (Math.abs(input.pitch) < 0.15) {
      _forward.set(0, 0, -1).applyQuaternion(this.object.quaternion);
      const pitchAngle = Math.asin(THREE.MathUtils.clamp(_forward.y, -1, 1));
      const absPitch = Math.abs(pitchAngle);
      if (absPitch > 0.3) {
        const correction = -pitchAngle * 1.2 * dt;
        _tmpQ.setFromAxisAngle(_right.set(1, 0, 0).applyQuaternion(this.object.quaternion), correction);
        this.object.quaternion.premultiply(_tmpQ);
      }
    }

    this.object.quaternion.normalize();

    // --- Position: move forward in local -Z direction ---
    _forward.set(0, 0, -1).applyQuaternion(this.object.quaternion);

    const speedRatio = this.speed / t.maxSpeed;
    const liftForce = t.liftFactor * speedRatio;
    const gravityEffect = 3.5 * Math.max(0, 1 - liftForce * 1.5) * dt;

    this.object.position.x += _forward.x * this.speed * dt;
    this.object.position.y += _forward.y * this.speed * dt - gravityEffect;
    this.object.position.z += _forward.z * this.speed * dt;

    if (this.object.position.y < 5) {
      this.object.position.y = 5;
    }
  }

  getSpeed(): number {
    return this.speed;
  }

  getAltitude(): number {
    return this.object.position.y;
  }

  getHeading(): number {
    _forward.set(0, 0, -1).applyQuaternion(this.object.quaternion);
    return ((Math.atan2(_forward.x, _forward.z) * 180) / Math.PI + 360) % 360;
  }

  getPosition(): THREE.Vector3 {
    return this.object.position;
  }

  getQuaternion(): THREE.Quaternion {
    return this.object.quaternion;
  }
}
