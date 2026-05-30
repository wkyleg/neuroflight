import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { FlightModel } from '@/game/flight/FlightModel.ts';
import type { MapConfig } from '@/game/types.ts';
import { FlightSafetySystem } from './FlightSafetySystem.ts';

function makeFlight(y: number, speed = 70): FlightModel {
  const object = new THREE.Object3D();
  object.position.y = y;
  return {
    object,
    getPosition() {
      return this.object.position;
    },
    getSpeed() {
      return speed;
    },
  } as FlightModel;
}

const map = {
  playerSpawn: [0, 90, 500],
} as MapConfig;

describe('FlightSafetySystem', () => {
  it('records a crash event below the ground threshold', () => {
    const flight = makeFlight(5, 80);
    const safety = new FlightSafetySystem();
    safety.reset(map);
    safety.update(3, flight, map);
    const event = safety.update(0.1, flight, map);
    expect(event?.type).toBe('crash');
    expect(event?.scorePenalty).toBeLessThan(0);
  });

  it('respawns to the last safe position above the map spawn floor', () => {
    const flight = makeFlight(120, 70);
    flight.object.position.set(10, 120, -30);
    const safety = new FlightSafetySystem();
    safety.reset(map);
    safety.update(3, flight, map);
    flight.object.position.y = 5;
    const event = safety.update(0.1, flight, map);
    if (!event) throw new Error('expected crash event');
    safety.applyRespawn(flight, event);
    expect(flight.object.position.y).toBeGreaterThanOrEqual(120);
    expect(safety.getInvulnerabilitySeconds()).toBeGreaterThan(0);
  });
});
