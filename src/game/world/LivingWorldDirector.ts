import * as THREE from 'three';
import type { GameMode, LivingWorldConfig, LivingWorldEventConfig } from '@/game/types.ts';
import { type SkyBonusTarget, SkyTrafficSystem } from './SkyTrafficSystem.ts';

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export class LivingWorldDirector {
  private readonly rng: () => number;
  private readonly trafficSystem: SkyTrafficSystem;
  private readonly config: LivingWorldConfig | undefined;
  private readonly mode: GameMode;
  private elapsed = 0;
  private nextEventAt = 0;
  private initialEventSpawned = false;

  constructor(scene: THREE.Scene, config: LivingWorldConfig | undefined, mode: GameMode, mapId: string) {
    this.config = config;
    this.mode = mode;
    this.rng = seededRng((config?.seed ?? 7001) + this.hashString(`${mapId}:${mode}`));
    this.trafficSystem = new SkyTrafficSystem(scene);
    this.nextEventAt = config ? 1.4 : this.randomRange([10, 18]);
  }

  async load(): Promise<void> {
    await this.trafficSystem.load(this.config?.events ?? []);
  }

  update(dt: number, cameraPos: THREE.Vector3): void {
    this.elapsed += dt;
    this.trafficSystem.update(dt, cameraPos);

    if (!this.config || this.elapsed < this.nextEventAt) return;

    const event = this.pickEvent(this.config.events);
    if (event) {
      const active = this.trafficSystem.countActive(event.id);
      if (active < this.getMaxActive(event) && this.rng() <= this.getChance(event)) {
        this.trafficSystem.spawn(event, cameraPos, this.rng);
        this.initialEventSpawned = true;
      }
    }
    this.nextEventAt =
      this.elapsed + (this.initialEventSpawned ? this.randomRange(this.config.eventIntervalRange) : 1.8);
  }

  destroy(): void {
    this.trafficSystem.destroy();
  }

  getBonusTargets(): SkyBonusTarget[] {
    return this.mode === 'dogfight' ? this.trafficSystem.getBonusTargets() : [];
  }

  consumeBonusTarget(id: string): SkyBonusTarget | null {
    return this.mode === 'dogfight' ? this.trafficSystem.consumeBonusTarget(id) : null;
  }

  private pickEvent(events: LivingWorldEventConfig[]): LivingWorldEventConfig | null {
    const available = events.filter((event) => event.weight > 0);
    const total = available.reduce((sum, event) => sum + this.getWeight(event), 0);
    if (total <= 0) return null;

    let roll = this.rng() * total;
    for (const event of available) {
      roll -= this.getWeight(event);
      if (roll <= 0) return event;
    }
    return available[available.length - 1] ?? null;
  }

  private getWeight(event: LivingWorldEventConfig): number {
    if (this.mode === 'dogfight' && (event.targetable || event.behavior === 'ufo-dart')) {
      return event.weight * (event.dogfightWeightMultiplier ?? 2.8);
    }
    return event.weight;
  }

  private getChance(event: LivingWorldEventConfig): number {
    if (this.mode === 'dogfight' && (event.targetable || event.behavior === 'ufo-dart')) {
      return event.dogfightChance ?? event.chance ?? 1;
    }
    return event.chance ?? 1;
  }

  private getMaxActive(event: LivingWorldEventConfig): number {
    if (this.mode === 'dogfight' && (event.targetable || event.behavior === 'ufo-dart')) {
      return event.dogfightMaxActive ?? event.maxActive ?? 3;
    }
    return event.maxActive ?? 3;
  }

  private randomRange(range: [number, number]): number {
    return THREE.MathUtils.lerp(range[0], range[1], this.rng());
  }

  private hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 100_000);
  }
}
