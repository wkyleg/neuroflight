export type TutorialStageId = 'controls' | 'throttle' | 'gates' | 'fire' | 'dogfight_intro' | 'free_practice';

export interface TutorialProgressInput {
  dtMs: number;
  pitch: number;
  roll: number;
  throttle: number;
  speed: number;
  ringsPassed: number;
  shotsFired: number;
  shotsHit: number;
  kills: number;
  rivalDistance: number | null;
}

interface TutorialStageConfig {
  id: TutorialStageId;
  title: string;
  prompt: string;
  hint: string;
  target: number;
}

export interface TutorialSnapshot extends TutorialStageConfig {
  elapsedMs: number;
  progress: number;
  nextTitle: string | null;
  completed: boolean;
}

const TUTORIAL_STAGES: TutorialStageConfig[] = [
  {
    id: 'controls',
    title: 'Controls',
    prompt: 'Pitch and roll until the aircraft responds smoothly.',
    hint: 'Use W/S and A/D, or the touch stick.',
    target: 1.8,
  },
  {
    id: 'throttle',
    title: 'Throttle',
    prompt: 'Change speed with Shift and Ctrl.',
    hint: 'Build or reduce speed by at least 20.',
    target: 20,
  },
  {
    id: 'gates',
    title: 'Practice Gates',
    prompt: 'Fly through two bright gates.',
    hint: 'Follow the route arrow when the next gate is offscreen.',
    target: 2,
  },
  {
    id: 'fire',
    title: 'Fire Control',
    prompt: 'Fire a few bright trails.',
    hint: 'Press F, Space, Enter, or the FIRE button.',
    target: 3,
  },
  {
    id: 'dogfight_intro',
    title: 'Rival Intro',
    prompt: 'Keep the rival in view and land one hit.',
    hint: 'Close the distance, line up, then fire.',
    target: 1,
  },
  {
    id: 'free_practice',
    title: 'Free Practice',
    prompt: 'Practice gates, aim, and smooth recoveries as long as you like.',
    hint: 'This run is unscored and will not create a report.',
    target: 1,
  },
];

export class TutorialDirector {
  private stageIndex = 0;
  private elapsedMs = 0;
  private controlSeconds = 0;
  private initialThrottle: number | null = null;
  private initialSpeed: number | null = null;
  private baselineRings = 0;
  private baselineShots = 0;
  private baselineHits = 0;
  private baselineKills = 0;

  update(input: TutorialProgressInput): TutorialSnapshot {
    this.elapsedMs += Math.max(0, input.dtMs);
    const stage = this.currentStage;
    const progress = this.progressFor(stage, input);
    if (progress >= 1 && stage.id !== 'free_practice') {
      this.advance(input);
    }
    return this.snapshot();
  }

  snapshot(_elapsedMs = 0): TutorialSnapshot {
    const stage = this.currentStage;
    const nextStage = TUTORIAL_STAGES[this.stageIndex + 1] ?? null;
    return {
      ...stage,
      elapsedMs: this.elapsedMs,
      progress: stage.id === 'free_practice' ? 1 : this.lastProgress,
      nextTitle: nextStage?.title ?? null,
      completed: stage.id === 'free_practice',
    };
  }

  reset(): void {
    this.stageIndex = 0;
    this.elapsedMs = 0;
    this.controlSeconds = 0;
    this.initialThrottle = null;
    this.initialSpeed = null;
    this.baselineRings = 0;
    this.baselineShots = 0;
    this.baselineHits = 0;
    this.baselineKills = 0;
    this.lastProgress = 0;
  }

  private lastProgress = 0;

  private get currentStage(): TutorialStageConfig {
    return TUTORIAL_STAGES[this.stageIndex];
  }

  private progressFor(stage: TutorialStageConfig, input: TutorialProgressInput): number {
    switch (stage.id) {
      case 'controls':
        if (Math.abs(input.pitch) > 0.18 && Math.abs(input.roll) > 0.18) {
          this.controlSeconds += input.dtMs / 1000;
        }
        this.lastProgress = Math.min(1, this.controlSeconds / stage.target);
        return this.lastProgress;
      case 'throttle': {
        this.initialThrottle ??= input.throttle;
        this.initialSpeed ??= input.speed;
        const delta = Math.max(
          Math.abs(input.throttle - this.initialThrottle) * 100,
          Math.abs(input.speed - this.initialSpeed),
        );
        this.lastProgress = Math.min(1, delta / stage.target);
        return this.lastProgress;
      }
      case 'gates':
        this.lastProgress = Math.min(1, (input.ringsPassed - this.baselineRings) / stage.target);
        return this.lastProgress;
      case 'fire':
        this.lastProgress = Math.min(1, (input.shotsFired - this.baselineShots) / stage.target);
        return this.lastProgress;
      case 'dogfight_intro': {
        const closeBonus = input.rivalDistance !== null && input.rivalDistance < 700 ? 0.35 : 0;
        const hitProgress = input.shotsHit - this.baselineHits + (input.kills - this.baselineKills);
        this.lastProgress = Math.min(1, closeBonus + hitProgress / stage.target);
        return this.lastProgress;
      }
      case 'free_practice':
        this.lastProgress = 1;
        return 1;
    }
  }

  private advance(input: TutorialProgressInput): void {
    this.stageIndex = Math.min(TUTORIAL_STAGES.length - 1, this.stageIndex + 1);
    this.elapsedMs = 0;
    this.lastProgress = 0;
    this.baselineRings = input.ringsPassed;
    this.baselineShots = input.shotsFired;
    this.baselineHits = input.shotsHit;
    this.baselineKills = input.kills;
    this.initialThrottle = input.throttle;
    this.initialSpeed = input.speed;
  }
}
