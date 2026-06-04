import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MissionWaypointConfig } from '@/game/types.ts';
import { MissionObjectiveSystem } from './MissionObjectiveSystem.ts';

const waypoints: MissionWaypointConfig[] = [
  {
    id: 'first',
    label: 'First Beacon',
    description: 'Fly through the first beacon.',
    kind: 'landmark',
    position: [0, 100, 0],
    radius: 80,
    score: 100,
  },
  {
    id: 'second',
    label: 'Second Beacon',
    description: 'Fly through the second beacon.',
    kind: 'landmark',
    position: [900, 140, -900],
    radius: 80,
    score: 100,
  },
];

describe('MissionObjectiveSystem navigation snapshot', () => {
  it('holds completed waypoint copy briefly before showing the next target', () => {
    const scene = new THREE.Scene();
    const system = new MissionObjectiveSystem(scene, waypoints);

    const firstState = system.update(0.016, new THREE.Vector3(0, 100, 0));
    expect(firstState.completion?.waypoint.id).toBe('first');
    expect(firstState.display?.id).toBe('first');
    expect(firstState.completionToast).toBe('First Beacon logged');

    const held = system.getNavigationSnapshot(new THREE.Vector3(0, 100, 0));
    expect(held.active?.id).toBe('second');
    expect(held.display?.id).toBe('first');

    system.update(1.4, new THREE.Vector3(0, 100, 0));
    const released = system.getNavigationSnapshot(new THREE.Vector3(0, 100, 0));
    expect(released.display?.id).toBe('second');

    system.destroy();
  });
});
