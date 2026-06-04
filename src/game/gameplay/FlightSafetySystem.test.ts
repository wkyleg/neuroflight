import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { FlightModel } from '@/game/flight/FlightModel.ts';
import type { MapDefinition } from '@/game/types.ts';
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
    resetSpeedForRecovery() {},
  } as FlightModel;
}

const map = {
  id: 'test',
  name: 'Test',
  description: 'Test',
  environmentPresetId: 'clearSky',
  playerSpawn: [0, 90, 500],
  scatterLayers: [],
  ringBehavior: 'aheadPath',
} as MapDefinition;

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

  it('records a crash event when the plane intersects a landmark obstacle', () => {
    const flight = makeFlight(140, 80);
    flight.object.position.set(10, 140, 10);
    const safety = new FlightSafetySystem();
    safety.reset(map);
    safety.update(3, flight, map);
    const event = safety.update(0.1, flight, map, [
      { center: new THREE.Vector3(15, 140, 12), radius: 28, label: 'pyramid' },
    ]);
    expect(event?.type).toBe('crash');
    expect(event?.label).toContain('pyramid');
  });

  it('ignores landmark obstacles inside an active mission safe zone', () => {
    const flight = makeFlight(140, 80);
    flight.object.position.set(10, 140, 10);
    const safety = new FlightSafetySystem();
    safety.reset(map);
    safety.update(3, flight, map);
    const event = safety.update(
      0.1,
      flight,
      map,
      [{ center: new THREE.Vector3(15, 140, 12), radius: 28, label: 'pyramid' }],
      [{ center: new THREE.Vector3(10, 140, 10), radius: 40, label: 'mission beacon' }],
    );
    expect(event).toBeNull();
  });
});
