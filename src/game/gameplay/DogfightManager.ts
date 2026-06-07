import { eventBus } from '@/game/core/EventBus.ts';

const AI_DAMAGE_PER_HIT = 25;
const PLAYER_DAMAGE_PER_HIT = 10;
const MAX_HEALTH = 100;
const RESPAWN_DELAY = 2.0;

export interface DogfightDifficultySettings {
  playerDamageMultiplier: number;
  rivalDamageMultiplier: number;
  respawnDelayMultiplier: number;
}

export interface DogfightState {
  playerHealth: number;
  aiHealth: number;
  kills: number;
  deaths: number;
  shotsFired: number;
  shotsHit: number;
}

export class DogfightManager {
  private playerHealth = MAX_HEALTH;
  private aiHealth = MAX_HEALTH;
  private kills = 0;
  private deaths = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private aiRespawnTimer = 0;
  private aiDead = false;
  private readonly difficulty: DogfightDifficultySettings;

  constructor(
    difficulty: DogfightDifficultySettings = {
      playerDamageMultiplier: 1,
      rivalDamageMultiplier: 1,
      respawnDelayMultiplier: 1,
    },
  ) {
    this.difficulty = difficulty;
  }

  recordPlayerShot(): void {
    this.shotsFired++;
  }

  recordPlayerCrash(): void {
    this.deaths++;
    this.playerHealth = MAX_HEALTH;
    console.warn(`[Dogfight] Player crash counted as loss — losses: ${this.deaths}`);
    eventBus.emit('dogfight:player_death');
  }

  recordRivalCrash(): void {
    if (this.aiDead) return;
    this.kills++;
    this.aiHealth = 0;
    this.aiDead = true;
    this.aiRespawnTimer = RESPAWN_DELAY * this.difficulty.respawnDelayMultiplier;
    console.warn(`[Dogfight] Rival crash counted as win — wins: ${this.kills}`);
    eventBus.emit('dogfight:ai_kill');
  }

  applyDamage(target: 'player' | 'ai'): void {
    this.shotsHit++;
    if (target === 'player') {
      this.playerHealth = Math.max(
        0,
        this.playerHealth - PLAYER_DAMAGE_PER_HIT * this.difficulty.rivalDamageMultiplier,
      );
      eventBus.emit('dogfight:player_hit');
      if (this.playerHealth <= 0) {
        this.deaths++;
        this.playerHealth = MAX_HEALTH;
        console.warn(`[Dogfight] Player reset — losses: ${this.deaths}`);
        eventBus.emit('dogfight:player_death');
      }
    } else {
      this.aiHealth = Math.max(0, this.aiHealth - AI_DAMAGE_PER_HIT * this.difficulty.playerDamageMultiplier);
      eventBus.emit('dogfight:ai_hit');
      if (this.aiHealth <= 0) {
        this.kills++;
        this.aiDead = true;
        this.aiRespawnTimer = RESPAWN_DELAY * this.difficulty.respawnDelayMultiplier;
        console.warn(`[Dogfight] Rival down — wins: ${this.kills}`);
        eventBus.emit('dogfight:ai_kill');
      }
    }
  }

  update(dt: number): boolean {
    if (this.aiDead) {
      this.aiRespawnTimer -= dt;
      if (this.aiRespawnTimer <= 0) {
        this.aiDead = false;
        this.aiHealth = MAX_HEALTH;
        return true;
      }
    }
    return false;
  }

  isAiDead(): boolean {
    return this.aiDead;
  }

  getAiHealthFraction(): number {
    return this.aiHealth / MAX_HEALTH;
  }

  getState(): DogfightState {
    return {
      playerHealth: this.playerHealth,
      aiHealth: this.aiHealth,
      kills: this.kills,
      deaths: this.deaths,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
    };
  }

  reset(): void {
    this.playerHealth = MAX_HEALTH;
    this.aiHealth = MAX_HEALTH;
    this.kills = 0;
    this.deaths = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.aiRespawnTimer = 0;
    this.aiDead = false;
  }
}
