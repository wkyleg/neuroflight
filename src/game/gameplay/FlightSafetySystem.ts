import * as THREE from 'three';
import type { FlightModel } from '@/game/flight/FlightModel.ts';
import type { MapConfig } from '@/game/types.ts';

export interface FlightSafetyEvent {
  type: 'crash' | 'hard_landing';
  label: string;
  scorePenalty: number;
  respawnPosition: THREE.Vector3;
}

const GROUND_CRASH_ALTITUDE = 8;
const SAFE_ALTITUDE = 38;
const RESPAWN_INVULNERABILITY = 2.5;

export class FlightSafetySystem {
  private lastSafePosition = new THREE.Vector3();
  private hasSafePosition = false;
  private invulnerabilityTimer = 0;

  update(dt: number, flightModel: FlightModel, map: MapConfig): FlightSafetyEvent | null {
    this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - dt);

    const position = flightModel.getPosition();
    if (position.y > SAFE_ALTITUDE) {
      this.lastSafePosition.copy(position);
      this.hasSafePosition = true;
    }

    if (this.invulnerabilityTimer > 0) return null;
    if (position.y > GROUND_CRASH_ALTITUDE) return null;

    const speed = flightModel.getSpeed();
    const hardLanding = speed < 42;
    const respawnPosition = this.getRespawnPosition(map);
    return {
      type: hardLanding ? 'hard_landing' : 'crash',
      label: hardLanding ? 'Bumpy landing' : 'Crash recovery',
      scorePenalty: hardLanding ? -35 : -90,
      respawnPosition,
    };
  }

  applyRespawn(flightModel: FlightModel, event: FlightSafetyEvent): void {
    flightModel.object.position.copy(event.respawnPosition);
    flightModel.object.quaternion.identity();
    this.lastSafePosition.copy(event.respawnPosition);
    this.hasSafePosition = true;
    this.invulnerabilityTimer = RESPAWN_INVULNERABILITY;
  }

  reset(map: MapConfig): void {
    this.lastSafePosition.set(map.playerSpawn[0], Math.max(map.playerSpawn[1], 120), map.playerSpawn[2]);
    this.hasSafePosition = true;
    this.invulnerabilityTimer = RESPAWN_INVULNERABILITY;
  }

  getInvulnerabilitySeconds(): number {
    return this.invulnerabilityTimer;
  }

  private getRespawnPosition(map: MapConfig): THREE.Vector3 {
    if (this.hasSafePosition) {
      return this.lastSafePosition.clone().setY(Math.max(this.lastSafePosition.y, map.playerSpawn[1], 120));
    }
    return new THREE.Vector3(map.playerSpawn[0], Math.max(map.playerSpawn[1], 120), map.playerSpawn[2]);
  }
}
