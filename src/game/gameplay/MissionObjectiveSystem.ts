import * as THREE from 'three';
import type { MissionWaypointConfig } from '@/game/types.ts';

interface ObjectiveVisual {
  group: THREE.Group;
  rings: THREE.Mesh[];
  beam: THREE.Mesh;
  light: THREE.PointLight;
  baseColor: THREE.Color;
}

export interface MissionObjectiveCompletion {
  waypoint: MissionWaypointConfig;
  score: number;
}

export interface MissionObjectiveState {
  active: MissionWaypointConfig | null;
  completedCount: number;
  totalCount: number;
  distanceToActive: number | null;
  completion: MissionObjectiveCompletion | null;
}

const BEAM_GEOMETRY = new THREE.CylinderGeometry(4, 12, 180, 16, 1, true);
const SPHERE_GEOMETRY = new THREE.SphereGeometry(16, 16, 10);
const RING_GEOMETRY = new THREE.TorusGeometry(72, 2.4, 10, 48);

export class MissionObjectiveSystem {
  private readonly scene: THREE.Scene;
  private readonly waypoints: MissionWaypointConfig[];
  private readonly visuals: ObjectiveVisual[] = [];
  private readonly completed = new Set<string>();
  private activeIndex = 0;
  private pulse = 0;
  private disposed = false;

  constructor(scene: THREE.Scene, waypoints: MissionWaypointConfig[]) {
    this.scene = scene;
    this.waypoints = waypoints;
    for (const waypoint of waypoints) {
      const visual = this.createVisual(waypoint);
      this.visuals.push(visual);
      this.scene.add(visual.group);
    }
    this.updateVisualStates();
  }

  update(dt: number, playerPos: THREE.Vector3): MissionObjectiveState {
    this.pulse += dt;
    let completion: MissionObjectiveCompletion | null = null;
    const active = this.getActiveWaypoint();
    let distanceToActive: number | null = null;

    if (active) {
      const activePos = new THREE.Vector3(...active.position);
      distanceToActive = activePos.distanceTo(playerPos);
      const radius = active.radius ?? 160;
      const altitudePass =
        active.kind === 'low_pass'
          ? playerPos.y <= active.position[1] + 120
          : active.kind === 'climb'
            ? playerPos.y >= active.position[1] - 120
            : true;

      if (distanceToActive <= radius && altitudePass) {
        this.completed.add(active.id);
        completion = {
          waypoint: active,
          score: active.score ?? 300,
        };
        this.activeIndex++;
        this.updateVisualStates();
      }
    }

    this.animateVisuals(dt);

    return {
      active: this.getActiveWaypoint(),
      completedCount: this.completed.size,
      totalCount: this.waypoints.length,
      distanceToActive,
      completion,
    };
  }

  getActiveWaypoint(): MissionWaypointConfig | null {
    while (this.activeIndex < this.waypoints.length && this.completed.has(this.waypoints[this.activeIndex].id)) {
      this.activeIndex++;
    }
    return this.waypoints[this.activeIndex] ?? null;
  }

  getCompletedCount(): number {
    return this.completed.size;
  }

  getTotalCount(): number {
    return this.waypoints.length;
  }

  reset(): void {
    this.completed.clear();
    this.activeIndex = 0;
    this.updateVisualStates();
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    const materials = new Set<THREE.Material>();
    for (const visual of this.visuals) {
      this.scene.remove(visual.group);
      visual.group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of meshMaterials) materials.add(material);
      });
    }
    for (const material of materials) material.dispose();
    this.visuals.length = 0;
  }

  private createVisual(waypoint: MissionWaypointConfig): ObjectiveVisual {
    const color = new THREE.Color(waypoint.color ?? 0xffcc44);
    const group = new THREE.Group();
    group.position.set(...waypoint.position);

    const beamMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(BEAM_GEOMETRY, beamMaterial);
    beam.position.y = 20;
    group.add(beam);

    const orbMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
    });
    const orb = new THREE.Mesh(SPHERE_GEOMETRY, orbMaterial);
    group.add(orb);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ringA = new THREE.Mesh(RING_GEOMETRY, ringMaterial.clone());
    const ringB = new THREE.Mesh(RING_GEOMETRY, ringMaterial.clone());
    ringA.rotation.x = Math.PI / 2;
    ringB.rotation.y = Math.PI / 2;
    group.add(ringA);
    group.add(ringB);

    const light = new THREE.PointLight(color, 1.2, 420);
    light.position.set(0, 20, 0);
    group.add(light);

    return { group, rings: [ringA, ringB], beam, light, baseColor: color };
  }

  private animateVisuals(dt: number): void {
    for (let i = 0; i < this.visuals.length; i++) {
      const visual = this.visuals[i];
      const waypoint = this.waypoints[i];
      const active = this.getActiveWaypoint()?.id === waypoint.id;
      const done = this.completed.has(waypoint.id);
      const pulse = active ? 0.76 + Math.sin(this.pulse * 3.4) * 0.2 : done ? 0.24 : 0.42;

      visual.rings[0].rotation.z += dt * (active ? 0.9 : 0.28);
      visual.rings[1].rotation.x += dt * (active ? 0.65 : 0.22);
      visual.light.intensity = active ? 2.4 + pulse : done ? 0.15 : 0.5;

      const beamMaterial = visual.beam.material as THREE.MeshBasicMaterial;
      beamMaterial.opacity = active ? 0.12 + pulse * 0.08 : done ? 0.025 : 0.06;

      for (const ring of visual.rings) {
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = active ? 0.62 + pulse * 0.22 : done ? 0.16 : 0.28;
      }
    }
  }

  private updateVisualStates(): void {
    for (let i = 0; i < this.visuals.length; i++) {
      const visual = this.visuals[i];
      const waypoint = this.waypoints[i];
      const done = this.completed.has(waypoint.id);
      const active = this.getActiveWaypoint()?.id === waypoint.id;
      visual.group.visible = active || done || i <= this.activeIndex + 2;
      visual.group.scale.setScalar(active ? 1.2 : done ? 0.74 : 0.92);
    }
  }
}
