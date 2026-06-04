import type { GameMode } from '@/game/types.ts';
import type { NeuroState } from '@/neuro/neuroManager.ts';

export interface NeuroAdaptationSnapshot {
  composure: number;
  load: number;
  recovery: number;
  flow: number;
  confidence: number;
  coverage: number;
  scoreMultiplier: number;
  aimAssist: number;
  weatherClarity: number;
  audioIntensity: number;
  prompt: string;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class NeuroAdaptationSystem {
  private snapshot: NeuroAdaptationSnapshot = {
    composure: 0.5,
    load: 0.35,
    recovery: 0.5,
    flow: 0.5,
    confidence: 0,
    coverage: 0,
    scoreMultiplier: 1,
    aimAssist: 1,
    weatherClarity: 1,
    audioIntensity: 0.65,
    prompt: 'Signals optional',
  };
  private coveredSeconds = 0;
  private totalSeconds = 0;
  private previousArousal = 0;

  update(dt: number, neuro: NeuroState, mode: GameMode, speedRatio: number, ringOrObjectiveProgress: number): void {
    this.totalSeconds += dt;
    const hasSignal = neuro.source !== 'none';
    if (hasSignal) this.coveredSeconds += dt;

    const signalQuality = Math.max(neuro.signalQuality, neuro.bpmQuality);
    const confidence = hasSignal ? clamp01(signalQuality || (neuro.source === 'mock' ? 1 : 0.35)) : 0;
    const calm = hasSignal ? clamp01(neuro.calm) : 0.5;
    const arousal = hasSignal ? clamp01(neuro.arousal) : 0.42;
    const arousalDrop = Math.max(0, this.previousArousal - arousal);
    const load = clamp01(arousal * 0.72 + speedRatio * 0.18 + (mode === 'dogfight' ? 0.12 : 0));
    const recovery = clamp01(calm * 0.72 + arousalDrop * 1.7 + (1 - load) * 0.16);
    const flow = clamp01(calm * 0.45 + ringOrObjectiveProgress * 0.38 + (1 - Math.abs(speedRatio - 0.62)) * 0.17);
    const composure = clamp01(calm * 0.62 + recovery * 0.22 + (1 - load) * 0.16);
    const coverage = this.totalSeconds > 0 ? clamp01(this.coveredSeconds / this.totalSeconds) : 0;
    const gate = confidence * Math.max(0.25, coverage);

    const prompt = this.makePrompt(hasSignal, confidence, composure, load, recovery, mode);

    this.snapshot = {
      composure: lerp(this.snapshot.composure, composure, 0.08),
      load: lerp(this.snapshot.load, load, 0.08),
      recovery: lerp(this.snapshot.recovery, recovery, 0.08),
      flow: lerp(this.snapshot.flow, flow, 0.08),
      confidence: lerp(this.snapshot.confidence, confidence, 0.12),
      coverage,
      scoreMultiplier: 1,
      aimAssist: 1,
      weatherClarity: 1 - gate * composure * 0.24,
      audioIntensity: clamp01(0.55 + load * 0.28 - composure * 0.1),
      prompt,
    };
    this.previousArousal = arousal;
  }

  getSnapshot(): NeuroAdaptationSnapshot {
    return this.snapshot;
  }

  reset(): void {
    this.coveredSeconds = 0;
    this.totalSeconds = 0;
    this.previousArousal = 0;
    this.snapshot = {
      composure: 0.5,
      load: 0.35,
      recovery: 0.5,
      flow: 0.5,
      confidence: 0,
      coverage: 0,
      scoreMultiplier: 1,
      aimAssist: 1,
      weatherClarity: 1,
      audioIntensity: 0.65,
      prompt: 'Signals optional',
    };
  }

  private makePrompt(
    hasSignal: boolean,
    confidence: number,
    composure: number,
    load: number,
    recovery: number,
    mode: GameMode,
  ): string {
    if (!hasSignal) return 'Fly normally; sensors are optional';
    if (confidence < 0.28) return 'Signal is faint; keep the camera/headband steady';
    if (recovery > 0.68)
      return mode === 'dogfight' ? 'Recovery window: steady the line' : 'Recovery window: smoother air';
    if (composure > 0.66)
      return mode === 'free' ? 'Composed flight softens the ambience' : 'Composed flight is shaping ambience';
    if (load > 0.72) return 'High load: widen turns and breathe into the next marker';
    return 'Adaptive ambience is tracking your flight';
  }
}
