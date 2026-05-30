export class ScoreManager {
  private score = 0;
  private ringsPassed = 0;
  private objectiveCompletions = 0;
  private combo = 0;
  private bestCombo = 0;
  private elapsedMs = 0;
  private totalSpeed = 0;
  private speedSamples = 0;

  addRing(speed: number, multiplier = 1): void {
    this.ringsPassed++;
    this.combo++;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    const comboMultiplier = 1 + Math.floor(this.combo / 3) * 0.5;
    this.score += Math.round(100 * comboMultiplier * multiplier);
    this.totalSpeed += speed;
    this.speedSamples++;
  }

  addObjective(points: number, multiplier = 1): void {
    this.objectiveCompletions++;
    this.combo++;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    this.score += Math.round(points * multiplier);
  }

  addBonus(points: number): void {
    this.score += Math.round(points);
  }

  breakCombo(): void {
    this.combo = 0;
  }

  update(dt: number): void {
    this.elapsedMs += dt * 1000;
  }

  getScore(): number {
    return this.score;
  }
  getRingsPassed(): number {
    return this.ringsPassed;
  }
  getObjectiveCompletions(): number {
    return this.objectiveCompletions;
  }
  getCombo(): number {
    return this.combo;
  }
  getBestCombo(): number {
    return this.bestCombo;
  }
  getElapsedMs(): number {
    return this.elapsedMs;
  }
  getAverageSpeed(): number {
    return this.speedSamples > 0 ? this.totalSpeed / this.speedSamples : 0;
  }

  reset(): void {
    this.score = 0;
    this.ringsPassed = 0;
    this.objectiveCompletions = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.elapsedMs = 0;
    this.totalSpeed = 0;
    this.speedSamples = 0;
  }
}
